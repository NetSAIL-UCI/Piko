#!/usr/bin/env node
/**
 * WebRTC Streaming Server using mediasoup
 * 
 * Provides WebRTC-based video streaming for comparison with DASH.
 * Uses mediasoup as the SFU to stream pre-encoded video content.
 */

const express = require('express');
const cors = require('cors');
const mediasoup = require('mediasoup');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CONTENT_DIR = process.env.CONTENT_DIR || '/app/content';
const ANNOUNCED_IP = process.env.ANNOUNCED_IP || '127.0.0.1';

// Port range is the range of users that can be supported
const workerSettings = {
  logLevel: 'warn',
  rtcMinPort: 10000,
  rtcMaxPort: 10100,
};

// mediasoup Router (room) settings - video codecs
const routerOptions = {
  mediaCodecs: [
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {},
    },
    {
      kind: 'video',
      mimeType: 'video/VP9',
      clockRate: 90000,
      parameters: {
        'profile-id': 2,
      },
    },
    {
      kind: 'video',
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1,
      },
    },
  ],
};

// WebRTC transport options
const webRtcTransportOptions = {
  listenIps: [
    {
      ip: '0.0.0.0',
      announcedIp: ANNOUNCED_IP,
    },
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: 4500000, // 4.5 Mbps initial (matches DASH top ladder)
};

// Plain RTP transport options (for FFmpeg producer)
const plainTransportOptions = {
  listenIp: { ip: '0.0.0.0', announcedIp: '127.0.0.1' },
  rtcpMux: false,
  comedia: true,
};

// Simulcast layer definitions (low → high = spatialLayer 0 → 2)
const SIMULCAST_LAYERS = [
  { ssrc: 22222220, resolution: '320x180',  bitrate: '500k',  maxBitrate: '500k',  bufsize: '1000k', label: 'low' },
  { ssrc: 22222221, resolution: '640x360',  bitrate: '1500k', maxBitrate: '1500k', bufsize: '3000k', label: 'mid' },
  { ssrc: 22222222, resolution: '1280x720', bitrate: '4500k', maxBitrate: '4500k', bufsize: '9000k', label: 'high' },
];

// Global state
let worker = null;
let router = null;

// One producer per simulcast layer
// producers[i] = { transport, producer, ffmpeg } for SIMULCAST_LAYERS[i]
const producers = [];
const ffmpegProcesses = []; // one per simulcast layer
const consumers = new Map(); // clientId -> { transport, videoConsumer, currentLayer }
let layerSelectionInterval = null;

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    protocol: 'webrtc',
    producerActive: producers.length > 0 && producers.some(p => p.producer !== null),
    activeProducers: producers.filter(p => p.producer !== null).length,
    consumers: consumers.size,
  });
});

// Get router RTP capabilities (client needs this to create device)
app.get('/rtpCapabilities', (req, res) => {
  if (!router) {
    return res.status(503).json({ error: 'Router not ready' });
  }
  res.json(router.rtpCapabilities);
});

// Get available quality levels (simulcast layers)
app.get('/qualities', (req, res) => {
  res.json({
    simulcast: true,
    layers: SIMULCAST_LAYERS.map((l, i) => ({
      spatialLayer: i,
      label: l.label,
      resolution: l.resolution,
      maxBitrate: parseInt(l.maxBitrate) * 1000,
      producerActive: producers[i] ? producers[i].producer !== null : false,
    })),
  });
});

// Get the best available producer matching the requested layer (or highest active)
function getBestProducer(preferredLayer) {
  // Try preferred layer first, then fall back to the highest active layer
  if (preferredLayer !== undefined && producers[preferredLayer] && producers[preferredLayer].producer) {
    return { producer: producers[preferredLayer].producer, layer: preferredLayer };
  }
  // Fallback: highest active layer
  for (let i = producers.length - 1; i >= 0; i--) {
    if (producers[i] && producers[i].producer) {
      return { producer: producers[i].producer, layer: i };
    }
  }
  return null;
}

// Select the best simulcast layer for a given BWE (bps)
function selectLayerForBandwidth(bweBps) {
  // Pick the highest layer whose maxBitrate fits within the BWE
  // Use 90% of BWE as headroom
  const usable = bweBps * 0.9;
  let best = 0;
  for (let i = 0; i < SIMULCAST_LAYERS.length; i++) {
    const layerBitrate = parseInt(SIMULCAST_LAYERS[i].maxBitrate) * 1000;
    if (layerBitrate <= usable && producers[i] && producers[i].producer) {
      best = i;
    }
  }
  return best;
}

// Create WebRTC transport for a consumer client
app.post('/createTransport', async (req, res) => {
  const { clientId } = req.body;
  
  if (!clientId) {
    return res.status(400).json({ error: 'clientId required' });
  }
  
  if (!router) {
    return res.status(503).json({ error: 'Router not ready' });
  }

  try {
    const transport = await router.createWebRtcTransport(webRtcTransportOptions);
    
    // Store transport for this client (close old transport if re-created)
    if (consumers.has(clientId)) {
      const existing = consumers.get(clientId);
      if (existing.transport) {
        existing.transport.close();
      }
    }
    consumers.set(clientId, { transport, videoConsumer: null });
    
    // Handle transport close
    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        cleanupClient(clientId);
      }
    });
    
    res.json({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  } catch (error) {
    console.error('Error creating transport:', error);
    res.status(500).json({ error: error.message });
  }
});

// Connect transport (DTLS handshake)
app.post('/connectTransport', async (req, res) => {
  const { clientId, dtlsParameters } = req.body;
  
  if (!clientId || !dtlsParameters) {
    return res.status(400).json({ error: 'clientId and dtlsParameters required' });
  }
  
  const client = consumers.get(clientId);
  if (!client || !client.transport) {
    return res.status(404).json({ error: 'Transport not found' });
  }

  try {
    await client.transport.connect({ dtlsParameters });
    res.json({ connected: true });
  } catch (error) {
    console.error('Error connecting transport:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start consuming the video stream
app.post('/consume', async (req, res) => {
  const { clientId, rtpCapabilities } = req.body;
  
  if (!clientId || !rtpCapabilities) {
    return res.status(400).json({ error: 'clientId and rtpCapabilities required' });
  }
  
  // Find the highest-layer active producer
  const best = getBestProducer(SIMULCAST_LAYERS.length - 1);
  if (!best) {
    return res.status(503).json({ error: 'No video producer available' });
  }
  
  const client = consumers.get(clientId);
  if (!client || !client.transport) {
    return res.status(404).json({ error: 'Transport not found, call createTransport first' });
  }

  try {
    // Check if client can consume the producer
    if (!router.canConsume({ producerId: best.producer.id, rtpCapabilities })) {
      return res.status(400).json({ error: 'Cannot consume, incompatible RTP capabilities' });
    }
    
    const consumer = await client.transport.consume({
      producerId: best.producer.id,
      rtpCapabilities,
      paused: false,
    });
    
    client.videoConsumer = consumer;
    client.currentLayer = best.layer;
    client.rtpCapabilities = rtpCapabilities; // Store for layer switching
    
    console.log(`Consumer ${consumer.id} consuming layer ${best.layer} (${SIMULCAST_LAYERS[best.layer].label})`);
    
    // Handle consumer events
    consumer.on('transportclose', () => {
      console.log(`Consumer transport closed for client ${clientId}`);
    });
    
    consumer.on('producerclose', () => {
      console.log(`Producer closed for client ${clientId}`);
      client.videoConsumer = null;
    });
    
    res.json({
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      layer: best.layer,
      layerLabel: SIMULCAST_LAYERS[best.layer].label,
    });
  } catch (error) {
    console.error('Error creating consumer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resume consumer (after ICE/DTLS completes)
app.post('/resumeConsumer', async (req, res) => {
  const { clientId } = req.body;
  
  const client = consumers.get(clientId);
  if (!client || !client.videoConsumer) {
    return res.status(404).json({ error: 'Consumer not found' });
  }

  try {
    await client.videoConsumer.resume();
    res.json({ resumed: true });
  } catch (error) {
    console.error('Error resuming consumer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Switch consumer to a different simulcast layer (producer)
app.post('/setPreferredLayers', async (req, res) => {
  const { clientId, spatialLayer } = req.body;
  
  const client = consumers.get(clientId);
  if (!client || !client.videoConsumer) {
    return res.status(404).json({ error: 'Consumer not found' });
  }
  
  const targetLayer = spatialLayer !== undefined ? spatialLayer : SIMULCAST_LAYERS.length - 1;
  
  try {
    await switchConsumerLayer(clientId, client, targetLayer);
    res.json({ success: true, layer: client.currentLayer, label: SIMULCAST_LAYERS[client.currentLayer].label });
  } catch (error) {
    console.error('Error switching layer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Switch a consumer to a different layer by re-consuming from a different producer
async function switchConsumerLayer(clientId, client, targetLayer) {
  if (targetLayer === client.currentLayer) return;
  
  const best = getBestProducer(targetLayer);
  if (!best) return;
  if (best.layer === client.currentLayer) return;
  
  // Close old consumer
  if (client.videoConsumer) {
    client.videoConsumer.close();
  }
  
  // Create new consumer on the new producer
  const consumer = await client.transport.consume({
    producerId: best.producer.id,
    rtpCapabilities: client.rtpCapabilities,
    paused: false,
  });
  
  client.videoConsumer = consumer;
  client.currentLayer = best.layer;
  
  consumer.on('transportclose', () => {
    console.log(`Consumer transport closed for client ${clientId}`);
  });
  consumer.on('producerclose', () => {
    client.videoConsumer = null;
  });
  
  console.log(`Client ${clientId} switched to layer ${best.layer} (${SIMULCAST_LAYERS[best.layer].label})`);
}

// Request keyframe
app.post('/requestKeyFrame', async (req, res) => {
  const { clientId } = req.body;
  
  const client = consumers.get(clientId);
  if (!client || !client.videoConsumer) {
    return res.status(404).json({ error: 'Consumer not found' });
  }

  try {
    await client.videoConsumer.requestKeyFrame();
    res.json({ success: true });
  } catch (error) {
    console.error('Error requesting keyframe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get consumer stats
app.get('/stats/:clientId', async (req, res) => {
  const { clientId } = req.params;
  
  const client = consumers.get(clientId);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  try {
    const stats = {};
    
    if (client.transport) {
      stats.transport = await client.transport.getStats();
    }
    if (client.videoConsumer) {
      stats.consumer = await client.videoConsumer.getStats();
      stats.currentLayer = client.currentLayer;
      stats.currentLayerLabel = SIMULCAST_LAYERS[client.currentLayer] ? SIMULCAST_LAYERS[client.currentLayer].label : 'unknown';
    }
    // Include producer stats for the current layer
    if (producers[client.currentLayer] && producers[client.currentLayer].producer) {
      stats.producer = await producers[client.currentLayer].producer.getStats();
    }
    // All producer scores
    stats.producerScores = producers.map((p, i) => ({
      layer: i,
      label: SIMULCAST_LAYERS[i].label,
      score: p.producer ? p.producer.score : null,
    }));
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup client resources
app.post('/disconnect', async (req, res) => {
  const { clientId } = req.body;
  cleanupClient(clientId);
  res.json({ disconnected: true });
});

function cleanupClient(clientId) {
  const client = consumers.get(clientId);
  if (client) {
    if (client.videoConsumer) {
      client.videoConsumer.close();
    }
    if (client.transport) {
      client.transport.close();
    }
    consumers.delete(clientId);
    console.log(`Cleaned up client ${clientId}`);
  }
}

function killFFmpeg() {
  if (ffmpegProcesses.length > 0) {
    console.log(`Killing ${ffmpegProcesses.length} FFmpeg process(es)`);
    for (const proc of ffmpegProcesses) {
      proc.removeAllListeners('close');
      proc.kill('SIGKILL');
    }
    ffmpegProcesses.length = 0;
  }
}

// Start one PlainTransport + producer + FFmpeg per simulcast layer
async function startProducer() {
  killFFmpeg();
  // Close old producers/transports
  for (const p of producers) {
    if (p.producer) p.producer.close();
    if (p.transport) p.transport.close();
  }
  producers.length = 0;
  
  const videoFile = findVideoFile();
  if (!videoFile) {
    console.error('No video file found in content directory');
    return;
  }
  
  console.log(`Starting producers from: ${videoFile}`);
  console.log(`  Layers: ${SIMULCAST_LAYERS.map(l => `${l.label}(${l.resolution}@${l.bitrate})`).join(', ')}`);
  
  // Create one PlainTransport + producer per layer
  for (let i = 0; i < SIMULCAST_LAYERS.length; i++) {
    const layer = SIMULCAST_LAYERS[i];
    
    const transport = await router.createPlainTransport(plainTransportOptions);
    const rtpPort = transport.tuple.localPort;
    const rtcpPort = transport.rtcpTuple.localPort;
    
    console.log(`  [${layer.label}] RTP: ${rtpPort}, RTCP: ${rtcpPort}`);
    
    const producer = await transport.produce({
      kind: 'video',
      rtpParameters: {
        codecs: [
          {
            mimeType: 'video/VP8',
            payloadType: 100,
            clockRate: 90000,
          },
        ],
        encodings: [{ ssrc: layer.ssrc }],
      },
    });
    
    console.log(`  [${layer.label}] Producer: ${producer.id}`);
    
    producers.push({ transport, producer, rtpPort });
    
    // Start FFmpeg for this layer
    startLayerFFmpeg(videoFile, rtpPort, layer);
  }
  
  console.log(`All ${SIMULCAST_LAYERS.length} producers created and FFmpeg started`);
  
  // Start server-side BWE-driven layer selection loop
  startLayerSelectionLoop();
}

function findVideoFile() {
  // Look for video file in content directory
  const extensions = ['.mp4', '.mkv', '.webm', '.avi'];
  
  // First check for original video file
  try {
    for (const ext of extensions) {
      const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith(ext));
      if (files.length > 0) {
        return path.join(CONTENT_DIR, files[0]);
      }
    }
  } catch (err) {
    console.warn(`Cannot read content directory ${CONTENT_DIR}: ${err.message}`);
  }
  
  // Check parent for source video
  const parentDir = path.dirname(CONTENT_DIR);
  try {
    for (const ext of extensions) {
      const files = fs.readdirSync(parentDir).filter(f => f.endsWith(ext) && !f.includes('segment'));
      if (files.length > 0) {
        return path.join(parentDir, files[0]);
      }
    }
  } catch (err) {
    console.warn(`Cannot read parent directory ${parentDir}: ${err.message}`);
  }
  
  return null;
}

function startLayerFFmpeg(videoFile, rtpPort, layer) {
  const ffmpegArgs = [
    '-re',
    '-stream_loop', '-1',
    '-i', videoFile,
    '-an',
    '-map', '0:v:0',
    '-vf', `scale=${layer.resolution.replace('x', ':')}`,
    '-c:v', 'libvpx',
    '-b:v', layer.bitrate,
    '-minrate', layer.bitrate,
    '-maxrate', layer.maxBitrate,
    '-bufsize', layer.bufsize,
    '-deadline', 'realtime',
    '-cpu-used', '4',
    '-g', '96',
    '-keyint_min', '96',
    '-payload_type', '100',
    '-ssrc', String(layer.ssrc),
    '-f', 'rtp',
    `rtp://127.0.0.1:${rtpPort}?pkt_size=1200`,
  ];
  
  console.log(`Starting FFmpeg [${layer.label}]:`, 'ffmpeg', ffmpegArgs.join(' '));
  
  const proc = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  proc._layerLabel = layer.label;
  proc._rtpPort = rtpPort;
  
  proc.stdout.on('data', () => {});
  
  proc.stderr.on('data', (data) => {
    const line = data.toString();
    if (line.includes('Error') || line.includes('error')) {
      console.error(`FFmpeg [${layer.label}]:`, line.trim());
    }
  });
  
  proc.on('close', (code) => {
    console.log(`FFmpeg [${layer.label}] exited with code ${code}`);
    const idx = ffmpegProcesses.indexOf(proc);
    if (idx !== -1) ffmpegProcesses.splice(idx, 1);
    
    // Restart this layer's FFmpeg after a delay
    setTimeout(() => {
      if (router) {
        const vFile = findVideoFile();
        if (vFile) startLayerFFmpeg(vFile, rtpPort, layer);
      }
    }, 2000);
  });
  
  proc.on('error', (error) => {
    console.error(`FFmpeg [${layer.label}] error:`, error);
  });
  
  ffmpegProcesses.push(proc);
}

// Periodically check each consumer's transport BWE and switch layers
function startLayerSelectionLoop() {
  if (layerSelectionInterval) clearInterval(layerSelectionInterval);
  
  layerSelectionInterval = setInterval(async () => {
    for (const [clientId, client] of consumers) {
      if (!client.transport || !client.videoConsumer) continue;
      
      try {
        const stats = await client.transport.getStats();
        let bwe = 0;
        for (const entry of stats) {
          if (entry.availableOutgoingBitrate) {
            bwe = entry.availableOutgoingBitrate;
            break;
          }
        }
        
        if (bwe > 0) {
          const targetLayer = selectLayerForBandwidth(bwe);
          if (targetLayer !== client.currentLayer) {
            console.log(`BWE ${(bwe/1000).toFixed(0)}kbps -> switching ${clientId.slice(0,8)} from layer ${client.currentLayer} to ${targetLayer}`);
            await switchConsumerLayer(clientId, client, targetLayer);
          }
        }
      } catch (err) {
        // Transport may have been closed
      }
    }
  }, 2000); // Check every 2 seconds
}

// Initialize mediasoup
async function init() {
  console.log('='.repeat(50));
  console.log('NetSail WebRTC Streaming Server (mediasoup)');
  console.log('='.repeat(50));
  
  // Create mediasoup worker
  worker = await mediasoup.createWorker(workerSettings);
  console.log(`Worker created [pid:${worker.pid}]`);
  
  worker.on('died', (error) => {
    console.error('Worker died:', error);
    process.exit(1);
  });
  
  // Create router
  router = await worker.createRouter(routerOptions);
  console.log(`Router created [id:${router.id}]`);
  
  // Start HTTP server
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log('  GET  /health           - Health check');
    console.log('  GET  /rtpCapabilities  - Get router capabilities');
    console.log('  GET  /qualities        - Get quality levels');
    console.log('  POST /createTransport  - Create WebRTC transport');
    console.log('  POST /connectTransport - Connect transport (DTLS)');
    console.log('  POST /consume          - Start consuming video');
    console.log('  POST /resumeConsumer   - Resume consumer');
    console.log('  POST /setPreferredLayers - Set simulcast layers');
    console.log('  POST /requestKeyFrame  - Request keyframe');
    console.log('  GET  /stats/:clientId  - Get consumer stats');
    console.log('  POST /disconnect       - Disconnect client');
    console.log('='.repeat(50));
    
    // Start producer after server is ready
    setTimeout(() => {
      startProducer().catch((err) => {
        console.error('Failed to start producer:', err);
        console.log('Waiting for video content...');
      });
    }, 1000);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  
  if (layerSelectionInterval) clearInterval(layerSelectionInterval);
  
  for (const proc of ffmpegProcesses) {
    proc.kill('SIGTERM');
  }
  ffmpegProcesses.length = 0;
  
  consumers.forEach((client, id) => {
    cleanupClient(id);
  });
  
  for (const p of producers) {
    if (p.producer) p.producer.close();
    if (p.transport) p.transport.close();
  }
  
  if (router) {
    router.close();
  }
  
  if (worker) {
    worker.close();
  }
  
  process.exit(0);
});

// Start server
init().catch((error) => {
  console.error('Failed to initialize:', error);
  process.exit(1);
});
