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
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
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

// Global state
let worker = null;
let router = null;
let producerTransport = null;
let videoProducer = null;
let audioProducer = null;
let ffmpegProcess = null;
const consumers = new Map(); // clientId -> { transport, videoConsumer, audioConsumer }

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
    producerActive: videoProducer !== null,
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

// Get available quality levels
app.get('/qualities', (req, res) => {
  // WebRTC uses simulcast/SVC for adaptive quality
  // Return available bitrate tiers
  res.json({
    qualities: [
      { id: 'low', maxBitrate: 500000, description: '500 kbps' },
      { id: 'medium', maxBitrate: 1500000, description: '1.5 Mbps' },
      { id: 'high', maxBitrate: 3000000, description: '3 Mbps' },
      { id: 'max', maxBitrate: 4500000, description: '4.5 Mbps' },
    ],
    currentProducer: videoProducer ? {
      id: videoProducer.id,
      kind: videoProducer.kind,
      paused: videoProducer.paused,
    } : null,
  });
});

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
    
    // Store transport for this client
    if (!consumers.has(clientId)) {
      consumers.set(clientId, { transport: null, videoConsumer: null, audioConsumer: null });
    }
    consumers.get(clientId).transport = transport;
    
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
  
  if (!videoProducer) {
    return res.status(503).json({ error: 'No video producer available' });
  }
  
  const client = consumers.get(clientId);
  if (!client || !client.transport) {
    return res.status(404).json({ error: 'Transport not found, call createTransport first' });
  }

  try {
    // Check if client can consume the producer
    if (!router.canConsume({ producerId: videoProducer.id, rtpCapabilities })) {
      return res.status(400).json({ error: 'Cannot consume, incompatible RTP capabilities' });
    }
    
    const consumer = await client.transport.consume({
      producerId: videoProducer.id,
      rtpCapabilities,
      paused: false,
    });
    
    client.videoConsumer = consumer;
    
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

// Set preferred layers (for simulcast quality control)
app.post('/setPreferredLayers', async (req, res) => {
  const { clientId, spatialLayer, temporalLayer } = req.body;
  
  const client = consumers.get(clientId);
  if (!client || !client.videoConsumer) {
    return res.status(404).json({ error: 'Consumer not found' });
  }

  try {
    await client.videoConsumer.setPreferredLayers({ 
      spatialLayer: spatialLayer || 2, 
      temporalLayer: temporalLayer || 2 
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting preferred layers:', error);
    res.status(500).json({ error: error.message });
  }
});

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
    }
    // Include producer stats so we can see FFmpeg → SFU bitrate
    if (videoProducer) {
      stats.producer = await videoProducer.getStats();
    }
    if (producerTransport && producerTransport.video) {
      stats.producerTransport = await producerTransport.video.getStats();
    }
    
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
    if (client.audioConsumer) {
      client.audioConsumer.close();
    }
    if (client.transport) {
      client.transport.close();
    }
    consumers.delete(clientId);
    console.log(`Cleaned up client ${clientId}`);
  }
}

function killFFmpeg() {
  if (ffmpegProcess) {
    console.log('Killing existing FFmpeg process');
    ffmpegProcess.removeAllListeners('close');
    ffmpegProcess.kill('SIGKILL');
    ffmpegProcess = null;
  }
}

// Start FFmpeg to produce video into mediasoup
async function startProducer() {
  killFFmpeg();
  // Find video file
  const videoFile = findVideoFile();
  if (!videoFile) {
    console.error('No video file found in content directory');
    return;
  }
  
  console.log(`Starting producer from: ${videoFile}`);
  
  // Create plain RTP transport for FFmpeg
  const videoTransport = await router.createPlainTransport(plainTransportOptions);
  const audioTransport = await router.createPlainTransport(plainTransportOptions);
  
  // Get ports
  const videoRtpPort = videoTransport.tuple.localPort;
  const videoRtcpPort = videoTransport.rtcpTuple.localPort;
  const audioRtpPort = audioTransport.tuple.localPort;
  const audioRtcpPort = audioTransport.rtcpTuple.localPort;
  
  console.log(`Video RTP: ${videoRtpPort}, RTCP: ${videoRtcpPort}`);
  console.log(`Audio RTP: ${audioRtpPort}, RTCP: ${audioRtcpPort}`);
  
  // Create video producer -- payloadType must NOT collide with the
  // router's auto-assigned rtx payloadTypes.  The router assigns VP8
  // at pt=100 and video/rtx at pt=101, so the producer must use 100.
  videoProducer = await videoTransport.produce({
    kind: 'video',
    rtpParameters: {
      codecs: [
        {
          mimeType: 'video/VP8',
          payloadType: 100,
          clockRate: 90000,
        },
      ],
      encodings: [{ ssrc: 22222222 }],
    },
  });
  
  // audio/opus is at pt=106 in the router codec table
  audioProducer = await audioTransport.produce({
    kind: 'audio',
    rtpParameters: {
      codecs: [
        {
          mimeType: 'audio/opus',
          payloadType: 106,
          clockRate: 48000,
          channels: 2,
        },
      ],
      encodings: [{ ssrc: 11111111 }],
    },
  });
  
  producerTransport = { video: videoTransport, audio: audioTransport };
  
  console.log(`Video producer created: ${videoProducer.id}`);
  console.log(`Audio producer created: ${audioProducer.id}`);
  
  // Start FFmpeg
  startFFmpeg(videoFile, videoRtpPort, audioRtpPort);
}

function findVideoFile() {
  // Look for video file in content directory
  const extensions = ['.mp4', '.mkv', '.webm', '.avi'];
  
  // First check for original video file
  for (const ext of extensions) {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith(ext));
    if (files.length > 0) {
      return path.join(CONTENT_DIR, files[0]);
    }
  }
  
  // Check parent for source video
  const parentDir = path.dirname(CONTENT_DIR);
  for (const ext of extensions) {
    const files = fs.readdirSync(parentDir).filter(f => f.endsWith(ext) && !f.includes('segment'));
    if (files.length > 0) {
      return path.join(parentDir, files[0]);
    }
  }
  
  return null;
}

function startFFmpeg(videoFile, videoRtpPort, audioRtpPort) {
  const ffmpegArgs = [
    '-re',
    '-stream_loop', '-1',
    '-i', videoFile,
    '-map', '0:v:0',
    '-vf', 'scale=1280:720',
    '-c:v', 'libvpx',
    '-b:v', '4500k',
    '-minrate', '500k',
    '-maxrate', '4500k',
    '-bufsize', '9000k',
    '-deadline', 'realtime',
    '-cpu-used', '4',
    '-g', '96',
    '-keyint_min', '96',
    '-payload_type', '100',
    '-ssrc', '22222222',
    '-f', 'rtp',
    `rtp://127.0.0.1:${videoRtpPort}?pkt_size=1200`,
    '-map', '0:a:0?',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-payload_type', '106',
    '-ssrc', '11111111',
    '-f', 'rtp',
    `rtp://127.0.0.1:${audioRtpPort}?pkt_size=1200`,
  ];
  
  console.log('Starting FFmpeg:', 'ffmpeg', ffmpegArgs.join(' '));
  
  ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  ffmpegProcess.stdout.on('data', (data) => {
    // FFmpeg info output
  });
  
  ffmpegProcess.stderr.on('data', (data) => {
    const line = data.toString();
    // Only log errors, not progress
    if (line.includes('Error') || line.includes('error')) {
      console.error('FFmpeg:', line.trim());
    }
  });
  
  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
    ffmpegProcess = null;
    // Only restart FFmpeg (not new transports/producers) after delay
    setTimeout(() => {
      if (router && !ffmpegProcess && producerTransport) {
        const vPort = producerTransport.video.tuple.localPort;
        const aPort = producerTransport.audio.tuple.localPort;
        console.log(`Restarting FFmpeg on ports ${vPort}/${aPort}`);
        const vFile = findVideoFile();
        if (vFile) startFFmpeg(vFile, vPort, aPort);
      }
    }, 2000);
  });
  
  ffmpegProcess.on('error', (error) => {
    console.error('FFmpeg error:', error);
  });
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
  
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM');
  }
  
  consumers.forEach((client, id) => {
    cleanupClient(id);
  });
  
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
