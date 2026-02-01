# NetSail - DASH Streaming Testbed Design Document

**Version:** 1.0
**Date:** 2026-01-31
**Authors:** NetSail Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture](#3-architecture)
4. [Core Components](#4-core-components)
5. [Data Flow](#5-data-flow)
6. [Network Emulation](#6-network-emulation)
7. [Metrics & Measurement](#7-metrics--measurement)
8. [ABR Algorithm](#8-abr-algorithm)
9. [Configuration & Deployment](#9-configuration--deployment)
10. [Usage & Examples](#10-usage--examples)
11. [Future Enhancements](#11-future-enhancements)

---

## 1. Executive Summary

### 1.1 Purpose

NetSail is a **DASH (Dynamic Adaptive Streaming over HTTP) Streaming Testbed** designed for measuring video streaming Quality of Experience (QoE) under realistic network conditions. The system enables researchers and developers to:

- Benchmark DASH streaming performance with real-world network traces
- Measure comprehensive QoE metrics (rebuffering, bitrate, switching, latency)
- Test adaptive bitrate (ABR) algorithms under controlled conditions
- Compare streaming performance across different network environments

### 1.2 Key Features

- **Real-World Network Emulation**: Replay 24+ traces from 3G mobile and broadband networks
- **Comprehensive Metrics**: Track 30+ QoE indicators including rebuffering, bitrate adaptation, throughput
- **Docker-Based**: Isolated, reproducible testing environment
- **Multi-Bitrate DASH**: 4 quality levels (400 kbps to 3 Mbps)
- **Web Interface**: dash.js-based player with real-time metrics
- **Programmable Benchmarking**: Python-based simulation with detailed logging

### 1.3 Technology Stack

| Component | Technology |
|-----------|------------|
| Server | Python 3.11 HTTP server |
| Network Shaper | Linux tc/netem + nginx |
| Container Platform | Docker + Docker Compose |
| Video Encoding | FFmpeg (H.264/DASH) |
| Client Simulation | Python requests library |
| Web Player | dash.js (MPEG-DASH reference) |
| Process Manager | supervisord |

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NetSail System                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐         ┌────────────────────────────────┐  │
│  │  Client Layer  │         │    Server Infrastructure      │  │
│  ├────────────────┤         ├────────────────────────────────┤  │
│  │ - benchmark.py │ ◄──────►│ ┌──────────────────────────┐  │  │
│  │ - Web Browser  │  HTTP   │ │   Network Shaper         │  │  │
│  │ (dash.js)      │  :9080  │ │  ┌────────────────────┐  │  │  │
│  └────────────────┘         │ │  │ tc-trace.py        │  │  │  │
│                              │ │  │ (Network Emulator) │  │  │  │
│  ┌────────────────┐         │ │  └────────────────────┘  │  │  │
│  │  Trace Files   │ ────┐   │ │  ┌────────────────────┐  │  │  │
│  ├────────────────┤     │   │ │  │ nginx (Proxy)      │  │  │  │
│  │ - 3G Mobile    │     │   │ │  │ Port 9080          │  │  │  │
│  │ - Broadband    │     └──►│ │  └──────────┬─────────┘  │  │  │
│  │ (24 traces)    │         │ └─────────────┼────────────┘  │  │
│  └────────────────┘         │               │               │  │
│                              │               ▼ tc/netem      │  │
│  ┌────────────────┐         │ ┌─────────────────────────┐   │  │
│  │  DASH Content  │         │ │   DASH Server           │   │  │
│  ├────────────────┤ ◄──────►│ │  ┌───────────────────┐  │   │  │
│  │ generate-dash  │  mount  │ │  │ server.py         │  │   │  │
│  │ .sh (FFmpeg)   │         │ │  │ Port 8080         │  │   │  │
│  │                │         │ │  │                   │  │   │  │
│  │ - manifest.mpd │         │ │  │ /content/         │  │   │  │
│  │ - *.m4s        │         │ │  │ - manifest.mpd    │  │   │  │
│  └────────────────┘         │ │  │ - *.m4s segments  │  │   │  │
│                              │ │  └───────────────────┘  │   │  │
│  ┌────────────────┐         │ └─────────────────────────┘   │  │
│  │  Results       │         │                                │  │
│  ├────────────────┤         └────────────────────────────────┘  │
│  │ - JSON metrics │                                             │
│  │ - Statistics   │                                             │
│  └────────────────┘                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Goals

1. **Realism**: Emulate real-world network conditions using actual trace data
2. **Reproducibility**: Docker containers ensure consistent testing environment
3. **Flexibility**: Support both programmatic benchmarking and interactive testing
4. **Comprehensiveness**: Measure all relevant QoE metrics
5. **Extensibility**: Modular design allows adding new ABR algorithms
6. **Transparency**: Detailed logging and metrics for analysis

---

## 3. Architecture

### 3.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                         │
│                   192.168.100.0/24 (netsail)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  netsail-shaper (192.168.100.10)                           │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  supervisord (Process Manager)                       │  │  │
│  │  │  ┌────────────────────┐  ┌──────────────────────┐   │  │  │
│  │  │  │  tc-trace.py       │  │  nginx               │   │  │  │
│  │  │  │  Priority: 0       │  │  Priority: 0         │   │  │  │
│  │  │  │                    │  │                      │   │  │  │
│  │  │  │ - Load trace.csv   │  │ - Reverse proxy      │   │  │  │
│  │  │  │ - Update tc every  │  │ - Port 9080          │   │  │  │
│  │  │  │   10ms             │  │ - Proxy to server    │   │  │  │
│  │  │  │ - Apply delay/loss │  │   (192.168.100.20)   │   │  │  │
│  │  │  │ - Loop trace       │  │ - Add headers        │   │  │  │
│  │  │  └────────────────────┘  └──────────────────────┘   │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Network Stack                                       │  │  │
│  │  │  ┌────────────────────────────────────────────────┐ │  │  │
│  │  │  │  HTB (Hierarchical Token Bucket)               │ │  │  │
│  │  │  │  - Rate limiting                                │ │  │  │
│  │  │  │  └─> netem (Network Emulator)                  │ │  │  │
│  │  │  │      - Delay (RTT from trace)                  │ │  │  │
│  │  │  │      - Loss (0.1% default)                     │ │  │  │
│  │  │  └────────────────────────────────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  Exposed Ports:                                             │  │
│  │  - 9080:80 (shaped HTTP)                                    │  │
│  │  - 9443:443 (shaped HTTPS)                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │ Proxy                             │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  netsail-server (192.168.100.20)                           │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  server.py (Python HTTP Server)                      │  │  │
│  │  │                                                       │  │  │
│  │  │  Routes:                                              │  │  │
│  │  │  - GET / → index.html (dash.js player)               │  │  │
│  │  │  - GET /health → JSON status                         │  │  │
│  │  │  - GET /manifest.mpd → DASH manifest                 │  │  │
│  │  │  - GET /init-stream*.m4s → Init segments             │  │  │
│  │  │  - GET /chunk-stream*-*.m4s → Media segments         │  │  │
│  │  │                                                       │  │  │
│  │  │  Headers:                                             │  │  │
│  │  │  - CORS: Access-Control-Allow-Origin: *              │  │  │
│  │  │  - Cache-Control: no-cache (mpd), max-age (m4s)      │  │  │
│  │  │                                                       │  │  │
│  │  │  MIME Types:                                          │  │  │
│  │  │  - .mpd → application/dash+xml                       │  │  │
│  │  │  - .m4s → video/iso.segment                          │  │  │
│  │  │  - .mp4 → video/mp4                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  Volumes:                                                   │  │
│  │  - ./content → /app/content (DASH segments)                │  │
│  │                                                             │  │
│  │  Exposed Ports:                                             │  │
│  │  - 8080:8080 (direct HTTP, no shaping)                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

External Clients:
- benchmark.py (host) → :9080 (shaped) or :8080 (direct)
- Web Browser (host) → :9080 (shaped) or :8080 (direct)
```

### 3.2 Directory Structure

```
NetSail/
├── Benchmarking/                      # Main project directory
│   ├── server/                        # DASH server container
│   │   ├── Dockerfile                 # Python 3.11 slim
│   │   ├── server.py                  # HTTP server implementation
│   │   └── index.html                 # dash.js web player
│   │
│   ├── shaper/                        # Network shaping container
│   │   ├── Dockerfile                 # nginx + tc/netem
│   │   ├── entrypoint.sh              # Container startup
│   │   ├── supervisord.conf           # Process manager config
│   │   ├── tc.py                      # Static tc utility
│   │   ├── tc-trace.py                # Trace-driven shaper
│   │   ├── nginx.conf                 # Default nginx config
│   │   └── nginx-proxy.conf           # Reverse proxy config
│   │
│   ├── content/                       # DASH video files (generated)
│   │   ├── manifest.mpd               # DASH manifest (XML)
│   │   ├── init-stream0.m4s           # Init segment (400 kbps)
│   │   ├── init-stream1.m4s           # Init segment (800 kbps)
│   │   ├── init-stream2.m4s           # Init segment (1500 kbps)
│   │   ├── init-stream3.m4s           # Init segment (3000 kbps)
│   │   ├── chunk-stream0-00001.m4s    # Media segments (quality 0)
│   │   ├── chunk-stream1-00001.m4s    # Media segments (quality 1)
│   │   ├── chunk-stream2-00001.m4s    # Media segments (quality 2)
│   │   └── chunk-stream3-00001.m4s    # Media segments (quality 3)
│   │
│   ├── traces/                        # Network trace files
│   │   ├── trace_*_3g_tc.csv          # 3G mobile traces (RTT)
│   │   ├── trace_*_3g_bw.txt          # 3G mobile traces (bandwidth)
│   │   ├── trace_*_http-*_tc.csv      # FCC broadband traces (RTT)
│   │   └── trace_*_http-*_bw.txt      # FCC broadband traces (BW)
│   │
│   ├── results/                       # Benchmark outputs (JSON)
│   │   └── benchmark_*.json           # Timestamped results
│   │
│   ├── benchmark.py                   # Main benchmarking tool
│   ├── download_traces.py             # Trace dataset downloader
│   ├── generate-dash.sh               # DASH content generator
│   ├── docker-compose.yaml            # Container orchestration
│   └── README.md                      # Documentation
│
├── docker-compose.yaml                # Root-level compose file
├── .gitignore                         # Git ignore rules
└── BigBuckBunny_320x180.mp4          # Sample video file
```

### 3.3 Network Topology

```
Host Machine (User's Computer)
│
├─ Port 8080 (Direct Access)
│  └─► netsail-server:8080
│      - No network shaping
│      - Maximum throughput
│      - Used for baseline measurements
│
└─ Port 9080 (Shaped Access)
   └─► netsail-shaper:80
       │
       ├─ nginx (Reverse Proxy)
       │  - Adds X-Traffic-Shaped header
       │  - Forwards to server
       │
       ├─ tc/netem (Traffic Control)
       │  - HTB rate limiting
       │  - netem delay/loss
       │  - Updates every 10ms
       │
       └─► netsail-server:8080
           - Same content, shaped network

Docker Network: netsail (192.168.100.0/24)
├─ netsail-server: 192.168.100.20 (fixed IP)
└─ netsail-shaper: 192.168.100.10 (fixed IP)
```

---

## 4. Core Components

### 4.1 DASH Server (`server/server.py`)

**Purpose**: HTTP server for delivering DASH content

**Implementation**: Python's `http.server.SimpleHTTPRequestHandler`

**Key Features**:

```python
class DASHHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="/app/content", **kwargs)

    def end_headers(self):
        # CORS headers for cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')

        # Cache control
        if self.path.endswith('.mpd'):
            self.send_header('Cache-Control', 'no-cache, no-store')
        else:
            self.send_header('Cache-Control', 'public, max-age=31536000')

        super().end_headers()
```

**MIME Type Mappings**:
- `.mpd` → `application/dash+xml`
- `.m4s` → `video/iso.segment`
- `.mp4` → `video/mp4`

**Health Check Endpoint**:
```json
GET /health
{
  "status": "ok",
  "timestamp": "2024-01-31T12:34:56"
}
```

**Logging**: Timestamp + method + path + response code

**Configuration**:
```python
PORT = 8080
HOST = "0.0.0.0"
CONTENT_DIR = "/app/content"
```

---

### 4.2 Network Shaper (`shaper/tc-trace.py`)

**Purpose**: Emulate real-world network conditions using trace files

**Algorithm**:

```python
# 1. Load trace file (CSV format)
trace = {}
with open(TRACE_FILE) as f:
    for line in csv.DictReader(f):
        since = float(line['since'])
        rtt = float(line['rtt'])
        trace[since] = rtt

# 2. Initialize traffic control
run_tc("qdisc", "add", "dev", "eth0", "root", "handle", "1:", "htb")
run_tc("class", "add", "dev", "eth0", "parent", "1:", "classid", "1:1",
       "htb", "rate", "100mbit", "ceil", "50mbit")
run_tc("qdisc", "add", "dev", "eth0", "parent", "1:1", "handle", "10:",
       "netem", "delay", "40ms", "loss", "0.1%")

# 3. Main loop (every 10ms)
while True:
    elapsed = (now - init_time).total_seconds()

    # Find closest trace entry
    closest_time = min(trace.keys(), key=lambda x: abs(x - elapsed))
    rtt = trace[closest_time]

    # Apply delay/loss
    run_tc("qdisc", "change", "dev", "eth0", "parent", "1:1",
           "handle", "10:", "netem", "delay", f"{int(rtt)}ms",
           "loss", "0.1%")

    # Loop trace if exceeded
    if elapsed > max(trace.keys()):
        init_time = now

    time.sleep(0.01)
```

**Trace File Format** (CSV):
```csv
since,relative_seconds,rtt
0.0,0.0,40.0
0.1,0.1,45.2
0.2,0.1,42.8
```

**Traffic Control Hierarchy**:
```
root (HTB)
└── class 1:1 (rate: 100mbit, ceil: 50mbit)
    └── netem (delay: RTT from trace, loss: 0.1%)
```

**Disconnection Simulation**:
- RTT ≤ 0 or RTT = -1 → Set RTT=100ms, loss=100%

---

### 4.3 Benchmark Tool (`benchmark.py`)

**Purpose**: Simulate DASH streaming client and measure QoE

**Architecture**:

```python
class StreamingBenchmark:
    def __init__(self, base_url, duration_sec):
        self.base_url = base_url
        self.duration_sec = duration_sec
        self.metrics = StreamingMetrics()
        self.buffer_level_ms = 0
        self.segment_duration_ms = 4000  # 4 seconds

    def run(self):
        # 1. Fetch and parse manifest
        representations = self.parse_manifest()

        # 2. Initialize ABR algorithm
        abr = ThroughputBasedABR(representations)

        # 3. Download init segment (measure startup)
        startup_start = time.time()
        self.download_init_segment()
        startup_delay = (time.time() - startup_start) * 1000

        # 4. Main playback loop
        segment_num = 1
        while segment_num <= total_segments:
            # ABR selects quality
            selected, idx = abr.select_representation(self.buffer_level_ms)

            # Download segment
            content, dl_time = self.download_segment(segment_num, idx)

            # Calculate throughput
            throughput = (len(content) * 8 / 1000) / (dl_time / 1000)

            # Report to ABR
            abr.report_download(len(content), dl_time)

            # Simulate playback (buffer drain)
            stalled, stall_duration = self.simulate_playback(dl_time)

            # Track metrics
            self.update_metrics(selected, dl_time, throughput, stalled)

            segment_num += 1

        # 5. Calculate statistics and output
        self.metrics.calculate_statistics()
        return self.metrics
```

**Playback Simulation**:

```python
def simulate_playback(self, download_time_ms):
    """Simulate video playback during segment download"""

    # Video plays while downloading
    playback_during_download = download_time_ms

    if self.buffer_level_ms >= playback_during_download:
        # No stall - buffer drains normally
        self.buffer_level_ms -= playback_during_download
        self.buffer_level_ms += self.segment_duration_ms
        return False, 0
    else:
        # Stall occurred - buffer underrun
        stall_duration = playback_during_download - self.buffer_level_ms
        self.buffer_level_ms = self.segment_duration_ms  # Refill
        return True, stall_duration
```

**Key Methods**:

| Method | Purpose |
|--------|---------|
| `parse_manifest()` | Parse MPD XML, extract representations |
| `download_segment()` | Fetch segment, measure time |
| `simulate_playback()` | Model buffer drain, detect stalls |
| `update_metrics()` | Track samples, switches, rebuffers |
| `calculate_statistics()` | Compute avg/min/max/percentiles |
| `output_results()` | Print console report, save JSON |

---

### 4.4 ABR Algorithm (`ThroughputBasedABR`)

**Purpose**: Select optimal bitrate based on throughput and buffer

**Algorithm**:

```python
class ThroughputBasedABR:
    def __init__(self, representations, safety_factor=0.9):
        self.representations = sorted(representations,
                                     key=lambda x: x['bandwidth'])
        self.throughput_history = deque(maxlen=5)
        self.safety_factor = safety_factor
        self.buffer_target_ms = 30000  # 30 seconds

    def select_representation(self, buffer_level_ms):
        # 1. Estimate throughput (harmonic mean for conservatism)
        if len(self.throughput_history) > 0:
            harmonic_sum = sum(1/t for t in self.throughput_history if t > 0)
            if harmonic_sum > 0:
                avg_throughput = len(self.throughput_history) / harmonic_sum
            else:
                avg_throughput = 500  # Default
        else:
            avg_throughput = 500  # Initial guess

        # 2. Apply safety factor
        safe_throughput = avg_throughput * 1000 * self.safety_factor

        # 3. Buffer-based adjustment
        buffer_ratio = buffer_level_ms / self.buffer_target_ms
        if buffer_ratio < 0.5:
            safe_throughput *= 0.7  # Conservative when low
        elif buffer_ratio > 1.5:
            safe_throughput *= 1.1  # Aggressive when high

        # 4. Select highest bitrate that fits
        selected_idx = 0
        for i, rep in enumerate(self.representations):
            if rep['bandwidth'] <= safe_throughput:
                selected_idx = i

        return self.representations[selected_idx], selected_idx

    def report_download(self, size_bytes, download_time_ms):
        """Update throughput history with latest measurement"""
        throughput_kbps = (size_bytes * 8 / 1000) / (download_time_ms / 1000)
        self.throughput_history.append(throughput_kbps)
```

**Design Rationale**:

1. **Harmonic Mean**: More conservative than arithmetic mean, prevents overestimation
2. **Safety Factor (0.9)**: Leaves headroom for throughput variability
3. **Buffer-Based**: Aggressive when safe, conservative when risky
4. **Simple Selection**: Choose highest bitrate that fits (no complex optimization)

**Alternative ABR Algorithms** (extensible):
- BBA (Buffer-Based Adaptation)
- BOLA (Buffer Occupancy-based Lyapunov Algorithm)
- Pensieve (Reinforcement Learning)
- MPC (Model Predictive Control)

---

### 4.5 DASH Content Generator (`generate-dash.sh`)

**Purpose**: Convert video files to multi-bitrate DASH format

**FFmpeg Command**:

```bash
ffmpeg -i "$INPUT_FILE" \
  -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 \
  -c:v:0 libx264 -b:v:0 400k -s:v:0 426x240 -profile:v:0 baseline \
  -c:v:1 libx264 -b:v:1 800k -s:v:1 640x360 -profile:v:1 main \
  -c:v:2 libx264 -b:v:2 1500k -s:v:2 854x480 -profile:v:2 main \
  -c:v:3 libx264 -b:v:3 3000k -s:v:3 1280x720 -profile:v:3 high \
  -preset fast -g 48 -keyint_min 48 -sc_threshold 0 \
  -use_timeline 1 -use_template 1 \
  -seg_duration 4 \
  -f dash "$OUTPUT_DIR/manifest.mpd"
```

**Quality Levels**:

| Level | Resolution | Bitrate | Profile | Use Case |
|-------|------------|---------|---------|----------|
| 0 | 426×240 | 400 kbps | Baseline | Poor 3G |
| 1 | 640×360 | 800 kbps | Main | 3G/4G |
| 2 | 854×480 | 1500 kbps | Main | Good 4G |
| 3 | 1280×720 | 3000 kbps | High | WiFi/5G |

**Encoding Parameters**:
- Codec: H.264 (libx264)
- GOP size: 48 frames (2 seconds @ 24fps)
- Preset: fast (speed vs quality tradeoff)
- Segment duration: 4 seconds (configurable)

**Output Structure**:
```
content/
├── manifest.mpd                    # DASH manifest (XML)
├── init-stream0.m4s                # Init segment (level 0)
├── init-stream1.m4s                # Init segment (level 1)
├── init-stream2.m4s                # Init segment (level 2)
├── init-stream3.m4s                # Init segment (level 3)
├── chunk-stream0-00001.m4s         # Segment 1, level 0
├── chunk-stream0-00002.m4s         # Segment 2, level 0
├── ...
├── chunk-stream3-00001.m4s         # Segment 1, level 3
└── chunk-stream3-00002.m4s         # Segment 2, level 3
```

---

### 4.6 Web Player (`server/index.html`)

**Purpose**: Interactive DASH player with real-time metrics

**Technology**: dash.js (MPEG-DASH reference implementation)

**Features**:

1. **Real-Time Metrics Display**:
   - Buffer level (color-coded: green/yellow/red)
   - Current bitrate and average bitrate
   - Bitrate switch count (up/down)
   - Cumulative stalling time
   - Network latency (RTT from HTTP requests)
   - Dropped frames

2. **Player Controls**:
   - Play/Pause
   - Seek
   - Volume
   - Fullscreen

3. **Metrics Collection** (JavaScript):

```javascript
// Buffer level tracking
player.on(dashjs.MediaPlayer.events.BUFFER_LEVEL_UPDATED, function(e) {
    document.getElementById('buffer-level').textContent = e.bufferLevel.toFixed(2);
});

// Bitrate tracking
player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, function(e) {
    var newBitrate = e.newQuality;
    if (lastBitrate !== null && newBitrate !== lastBitrate) {
        switchCount++;
        if (newBitrate > lastBitrate) switchUpCount++;
        else switchDownCount++;
    }
    lastBitrate = newBitrate;
});

// Stalling tracking
player.on(dashjs.MediaPlayer.events.PLAYBACK_STALLED, function(e) {
    stallStartTime = Date.now();
});
player.on(dashjs.MediaPlayer.events.PLAYBACK_RESUMED, function(e) {
    if (stallStartTime !== null) {
        var stallDuration = (Date.now() - stallStartTime) / 1000;
        cumulativeStallTime += stallDuration;
    }
});

// Network latency
player.on(dashjs.MediaPlayer.events.METRIC_CHANGED, function(e) {
    var dashMetrics = player.getDashMetrics();
    var httpMetrics = dashMetrics.getCurrentHttpRequest("video");
    if (httpMetrics && httpMetrics.interval) {
        networkLatency = httpMetrics.interval;
    }
});
```

**UI Design**:
- Dark theme (cyberpunk style)
- Grid-based metrics panel
- Pulsing status indicator
- Color-coded buffer status

---

### 4.7 Trace Downloader (`download_traces.py`)

**Purpose**: Download public network trace datasets

**Datasets**:

1. **HSDPA 3G (Riiser et al., ACM IMC 2013)**
   - Source: `http://home.ifi.uio.no/paalh/dataset/hsdpa-tcp-logs/`
   - 17 traces from Norway (bus, metro, tram, train, ferry, car)
   - Real 3G/HSDPA conditions

2. **FCC Broadband (confiwent GitHub)**
   - Source: `https://github.com/confiwent/Real-world-bandwidth-traces`
   - 18 traces from real ISPs
   - HTTP traffic to Amazon, Facebook, Google, eBay

**Functionality**:

```python
def download_trace(url, output_file):
    """Download trace file with progress bar"""
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))

    with open(output_file, 'wb') as f:
        with tqdm(total=total_size, unit='B', unit_scale=True) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                pbar.update(len(chunk))

def convert_trace_format(input_file, output_file):
    """Convert to standard format (timestamp, throughput)"""
    # Parse raw trace
    # Convert to CSV: since, relative_seconds, rtt
    # Save to output_file
```

**Usage**:
```bash
python download_traces.py --all          # Download all traces
python download_traces.py --list         # List available traces
python download_traces.py --trace 12743  # Download specific trace
```

---

## 5. Data Flow

### 5.1 Setup Phase

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Container Startup                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User runs: docker compose up -d                                │
│  │                                                               │
│  ├─► Build netsail-server image (Python 3.11)                   │
│  │   └─► Start container, listen on 8080                        │
│  │                                                               │
│  └─► Build netsail-shaper image (nginx + tc)                    │
│      └─► Start supervisord                                      │
│          ├─► Start tc-trace.py (load default trace)             │
│          └─► Start nginx (reverse proxy to server)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. DASH Content Generation                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User runs: ./generate-dash.sh BigBuckBunny.mp4 content 4      │
│  │                                                               │
│  ├─► FFmpeg encodes video into 4 quality levels                 │
│  │   ├─► Stream 0: 426x240 @ 400 kbps                           │
│  │   ├─► Stream 1: 640x360 @ 800 kbps                           │
│  │   ├─► Stream 2: 854x480 @ 1500 kbps                          │
│  │   └─► Stream 3: 1280x720 @ 3000 kbps                         │
│  │                                                               │
│  ├─► Create manifest.mpd (DASH XML)                             │
│  │                                                               │
│  ├─► Generate init segments (init-stream*.m4s)                  │
│  │                                                               │
│  └─► Generate media segments (chunk-stream*-*.m4s)              │
│      └─► Placed in ./content (mounted to server)                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. Trace Download (Optional)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User runs: python download_traces.py --all                     │
│  │                                                               │
│  ├─► Download 3G traces (17 files)                              │
│  │                                                               │
│  └─► Download broadband traces (18 files)                       │
│      └─► Convert to standard format (CSV)                       │
│          └─► Save to ./traces/                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Benchmark Execution

```
┌─────────────────────────────────────────────────────────────────┐
│ Benchmark Workflow                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User runs: python benchmark.py --trace traces/trace_3g.csv     │
│  │                                                               │
│  ▼                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Trace Setup                                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ - Copy trace to shaper/trace/trace.csv                  │   │
│  │ - Restart shaper container                              │   │
│  │ - Wait 3 seconds for tc-trace.py to load trace          │   │
│  └─────────────────────────────────────────────────────────┘   │
│  │                                                               │
│  ▼                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. Manifest Fetch                                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ benchmark.py                                            │   │
│  │ └─► GET http://localhost:9080/manifest.mpd             │   │
│  │     │                                                    │   │
│  │     ▼ (through shaper)                                  │   │
│  │     nginx (9080)                                        │   │
│  │     └─► Proxy to 192.168.100.20:8080/manifest.mpd      │   │
│  │         │                                                │   │
│  │         ▼ (traffic shaped by tc/netem)                  │   │
│  │         server.py                                       │   │
│  │         └─► Return manifest.mpd                         │   │
│  │             │                                            │   │
│  │             ▼                                            │   │
│  │     Parse MPD XML                                       │   │
│  │     - Extract representations (4 quality levels)        │   │
│  │     - Get segment duration (4s)                         │   │
│  │     - Calculate total segments                          │   │
│  │     - Measure startup delay                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│  │                                                               │
│  ▼                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. Initialize ABR                                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ abr = ThroughputBasedABR(representations)               │   │
│  │ - Set safety factor: 0.9                                │   │
│  │ - Set buffer target: 30s                                │   │
│  │ - Initialize throughput history (empty deque)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  │                                                               │
│  ▼                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4. Download Init Segment                                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ start_time = now()                                      │   │
│  │ GET /init-stream0.m4s (lowest quality)                  │   │
│  │ startup_delay = now() - start_time                      │   │
│  │ buffer_level = 0                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│  │                                                               │
│  ▼                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 5. Main Playback Loop (for each segment)               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Loop segment_num = 1 to N:                              │   │
│  │                                                          │   │
│  │   ┌─────────────────────────────────────────────────┐  │   │
│  │   │ A. Quality Selection                            │  │   │
│  │   ├─────────────────────────────────────────────────┤  │   │
│  │   │ selected, idx = abr.select_representation(      │  │   │
│  │   │     buffer_level_ms)                            │  │   │
│  │   │                                                  │  │   │
│  │   │ ABR Logic:                                      │  │   │
│  │   │ - Calculate harmonic mean of throughput         │  │   │
│  │   │ - Apply safety factor (0.9)                     │  │   │
│  │   │ - Adjust for buffer level:                      │  │   │
│  │   │   * Low buffer (<15s): 0.7x throughput          │  │   │
│  │   │   * High buffer (>45s): 1.1x throughput         │  │   │
│  │   │ - Select highest bitrate that fits              │  │   │
│  │   └─────────────────────────────────────────────────┘  │   │
│  │   │                                                      │   │
│  │   ▼                                                      │   │
│  │   ┌─────────────────────────────────────────────────┐  │   │
│  │   │ B. Segment Download                             │  │   │
│  │   ├─────────────────────────────────────────────────┤  │   │
│  │   │ start_time = now()                              │  │   │
│  │   │ GET /chunk-stream{idx}-{segment_num}.m4s        │  │   │
│  │   │ download_time = now() - start_time              │  │   │
│  │   │                                                  │  │   │
│  │   │ Request path (shaped):                          │  │   │
│  │   │ benchmark.py → nginx (9080)                     │  │   │
│  │   │            ↓                                     │  │   │
│  │   │         tc/netem (apply delay/loss from trace)  │  │   │
│  │   │            ↓                                     │  │   │
│  │   │         server.py (8080)                        │  │   │
│  │   │            ↓                                     │  │   │
│  │   │         Return segment content                  │  │   │
│  │   └─────────────────────────────────────────────────┘  │   │
│  │   │                                                      │   │
│  │   ▼                                                      │   │
│  │   ┌─────────────────────────────────────────────────┐  │   │
│  │   │ C. Throughput Calculation                       │  │   │
│  │   ├─────────────────────────────────────────────────┤  │   │
│  │   │ size_bytes = len(content)                       │  │   │
│  │   │ throughput_kbps = (size_bytes * 8 / 1000)       │  │   │
│  │   │                 / (download_time_ms / 1000)     │  │   │
│  │   │                                                  │  │   │
│  │   │ abr.report_download(size_bytes, download_time)  │  │   │
│  │   │ - Update throughput history (last 5)            │  │   │
│  │   └─────────────────────────────────────────────────┘  │   │
│  │   │                                                      │   │
│  │   ▼                                                      │   │
│  │   ┌─────────────────────────────────────────────────┐  │   │
│  │   │ D. Playback Simulation                          │  │   │
│  │   ├─────────────────────────────────────────────────┤  │   │
│  │   │ playback_time = download_time_ms                │  │   │
│  │   │                                                  │  │   │
│  │   │ if buffer_level >= playback_time:               │  │   │
│  │   │     # No stall                                  │  │   │
│  │   │     buffer_level -= playback_time               │  │   │
│  │   │     buffer_level += segment_duration (4000ms)   │  │   │
│  │   │     stalled = False                             │  │   │
│  │   │ else:                                            │  │   │
│  │   │     # Stall occurred                            │  │   │
│  │   │     stall_duration = playback_time - buffer     │  │   │
│  │   │     buffer_level = segment_duration             │  │   │
│  │   │     stalled = True                              │  │   │
│  │   │     rebuffer_count += 1                         │  │   │
│  │   │     rebuffer_time_ms += stall_duration          │  │   │
│  │   └─────────────────────────────────────────────────┘  │   │
│  │   │                                                      │   │
│  │   ▼                                                      │   │
│  │   ┌─────────────────────────────────────────────────┐  │   │
│  │   │ E. Metrics Tracking                             │  │   │
│  │   ├─────────────────────────────────────────────────┤  │   │
│  │   │ - Add bitrate to samples                        │  │   │
│  │   │ - Add throughput to samples                     │  │   │
│  │   │ - Add buffer level to samples                   │  │   │
│  │   │                                                  │  │   │
│  │   │ - Detect bitrate switch:                        │  │   │
│  │   │   if bitrate != last_bitrate:                   │  │   │
│  │   │       switch_count += 1                         │  │   │
│  │   │       magnitude = abs(bitrate - last_bitrate)   │  │   │
│  │   │       if bitrate > last_bitrate:                │  │   │
│  │   │           switch_up_count += 1                  │  │   │
│  │   │       else:                                      │  │   │
│  │   │           switch_down_count += 1                │  │   │
│  │   │                                                  │  │   │
│  │   │ - Create SegmentMetrics:                        │  │   │
│  │   │   - segment_num, timestamp, bitrate             │  │   │
│  │   │   - download_time, throughput                   │  │   │
│  │   │   - buffer_level, stalled                       │  │   │
│  │   └─────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  │                                                               │
│  ▼                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 6. Statistics Calculation                               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ metrics.calculate_statistics()                          │   │
│  │                                                          │   │
│  │ Bitrate:                                                │   │
│  │ - avg = sum(samples) / len(samples)                     │   │
│  │ - min, max = min/max(samples)                           │   │
│  │ - std_dev = sqrt(variance)                              │   │
│  │ - percentiles (25th, 50th, 75th)                        │   │
│  │                                                          │   │
│  │ Switching:                                              │   │
│  │ - avg_magnitude = total_magnitude / switch_count        │   │
│  │                                                          │   │
│  │ Rebuffering:                                            │   │
│  │ - frequency = count / (playback_time_min)               │   │
│  │ - ratio = rebuffer_time / total_time                    │   │
│  │ - avg_duration = sum(durations) / count                 │   │
│  │                                                          │   │
│  │ Throughput:                                             │   │
│  │ - avg, min, max, std_dev (same as bitrate)              │   │
│  │                                                          │   │
│  │ Buffer:                                                 │   │
│  │ - avg, min, max (from samples)                          │   │
│  │                                                          │   │
│  │ Utilization:                                            │   │
│  │ - bandwidth_utilization = avg_bitrate / avg_throughput  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  │                                                               │
│  ▼                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 7. Output Results                                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Console:                                                │   │
│  │ ┌─────────────────────────────────────────────────┐    │   │
│  │ │ === Streaming Benchmark Results ===             │    │   │
│  │ │ Server: http://localhost:9080                   │    │   │
│  │ │ Duration: 600.2s                                │    │   │
│  │ │                                                  │    │   │
│  │ │ Timing:                                         │    │   │
│  │ │   Startup delay: 234.5 ms                       │    │   │
│  │ │   Total playback: 600.0s                        │    │   │
│  │ │                                                  │    │   │
│  │ │ Bitrate:                                        │    │   │
│  │ │   Average: 1245 kbps                            │    │   │
│  │ │   Min: 400 kbps, Max: 3000 kbps                 │    │   │
│  │ │   Median: 1500 kbps, Std Dev: 623 kbps          │    │   │
│  │ │                                                  │    │   │
│  │ │ Switching:                                      │    │   │
│  │ │   Total switches: 45                            │    │   │
│  │ │   Up: 22, Down: 23                              │    │   │
│  │ │   Avg magnitude: 687 kbps                       │    │   │
│  │ │                                                  │    │   │
│  │ │ Rebuffering:                                    │    │   │
│  │ │   Events: 12                                    │    │   │
│  │ │   Total time: 5.2s                              │    │   │
│  │ │   Ratio: 0.86%                                  │    │   │
│  │ │   Frequency: 1.2 events/min                     │    │   │
│  │ │                                                  │    │   │
│  │ │ Throughput:                                     │    │   │
│  │ │   Average: 1856 kbps                            │    │   │
│  │ │   Min: 245 kbps, Max: 4523 kbps                 │    │   │
│  │ │                                                  │    │   │
│  │ │ Buffer:                                         │    │   │
│  │ │   Average: 18.3s                                │    │   │
│  │ │   Min: 0.0s, Max: 42.1s                         │    │   │
│  │ │                                                  │    │   │
│  │ │ Utilization:                                    │    │   │
│  │ │   Bandwidth: 67.1%                              │    │   │
│  │ └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │ JSON File:                                              │   │
│  │ - Save to results/benchmark_20240131_123456.json        │   │
│  │ - Complete metrics with all samples                     │   │
│  │ - Segment-level data                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Network Traffic Flow (Shaped)

```
┌───────────────────────────────────────────────────────────────┐
│ Shaped Request (Port 9080)                                    │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  benchmark.py (Host)                                          │
│  │                                                             │
│  │ GET http://localhost:9080/chunk-stream2-00042.m4s          │
│  │                                                             │
│  ▼                                                             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Docker Port Mapping (9080 → netsail-shaper:80)      │    │
│  └──────────────────────────────────────────────────────┘    │
│  │                                                             │
│  ▼                                                             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ netsail-shaper Container (192.168.100.10)           │    │
│  │                                                       │    │
│  │ ┌────────────────────────────────────────────────┐  │    │
│  │ │ nginx (Port 80)                                │  │    │
│  │ │                                                 │  │    │
│  │ │ upstream server {                              │  │    │
│  │ │     server 192.168.100.20:8080;                │  │    │
│  │ │ }                                               │  │    │
│  │ │                                                 │  │    │
│  │ │ location / {                                   │  │    │
│  │ │     proxy_pass http://server;                  │  │    │
│  │ │     proxy_set_header X-Traffic-Shaped "true";  │  │    │
│  │ │     proxy_buffering off;                       │  │    │
│  │ │ }                                               │  │    │
│  │ └─────────────────┬──────────────────────────────┘  │    │
│  │                   │                                  │    │
│  │                   ▼                                  │    │
│  │ ┌────────────────────────────────────────────────┐  │    │
│  │ │ Network Interface (eth0)                       │  │    │
│  │ │                                                 │  │    │
│  │ │ ┌──────────────────────────────────────────┐  │  │    │
│  │ │ │ tc/netem (Traffic Control)               │  │  │    │
│  │ │ │                                           │  │  │    │
│  │ │ │ root (HTB qdisc)                         │  │  │    │
│  │ │ │ └─ class 1:1 (rate: 100mbit)             │  │  │    │
│  │ │ │    └─ netem (handle 10:)                 │  │  │    │
│  │ │ │       ├─ delay: 45.2ms (from trace)      │  │  │    │
│  │ │ │       └─ loss: 0.1%                      │  │  │    │
│  │ │ │                                           │  │  │    │
│  │ │ │ Updated every 10ms by tc-trace.py:       │  │  │    │
│  │ │ │ - Read next trace entry                  │  │  │    │
│  │ │ │ - Get RTT value                          │  │  │    │
│  │ │ │ - tc qdisc change ... delay {rtt}ms      │  │  │    │
│  │ │ └──────────────────────────────────────────┘  │  │    │
│  │ └────────────────────────────────────────────────┘  │    │
│  │                   │                                  │    │
│  │                   │ Shaped packet                    │    │
│  │                   │ (delayed, possibly dropped)      │    │
│  │                   ▼                                  │    │
│  └──────────��───────────────────────────────────────────┘    │
│  │                                                             │
│  │ Docker Network (192.168.100.0/24)                          │
│  │                                                             │
│  ▼                                                             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ netsail-server Container (192.168.100.20)           │    │
│  │                                                       │    │
│  │ ┌────────────────────────────────────────────────┐  │    │
│  │ │ server.py (Port 8080)                          │  │    │
│  │ │                                                 │  │    │
│  │ │ - Receive request                              │  │    │
│  │ │ - Parse path: /chunk-stream2-00042.m4s         │  │    │
│  │ │ - Read file from /app/content/                 │  │    │
│  │ │ - Add CORS headers                             │  │    │
│  │ │ - Add Cache-Control headers                    │  │    │
│  │ │ - Set MIME type: video/iso.segment             │  │    │
│  │ │ - Return content                               │  │    │
│  │ └─────────────────┬──────────────────────────────┘  │    │
│  │                   │                                  │    │
│  │                   ▼                                  │    │
│  │         Response (segment content)                   │    │
│  └──────────────────────────────────────────────────────┘    │
│  │                                                             │
│  │ (Response flows back through same path)                    │
│  │                                                             │
│  ▼                                                             │
│  tc/netem (shapes response traffic)                           │
│  │                                                             │
│  ▼                                                             │
│  nginx (adds X-Traffic-Shaped header)                         │
│  │                                                             │
│  ▼                                                             │
│  Docker port mapping                                          │
│  │                                                             │
│  ▼                                                             │
│  benchmark.py (Host)                                          │
│  │                                                             │
│  │ - Receive response                                         │
│  │ - Calculate download time                                  │
│  │ - Calculate throughput                                     │
│  │ - Update metrics                                           │
│  │                                                             │
└───────────────────────────────────────────────────────────────┘
```

### 5.4 Direct (Unshaped) Traffic Flow

```
benchmark.py (Host)
  │
  │ GET http://localhost:8080/chunk-stream2-00042.m4s
  │
  ▼
Docker Port Mapping (8080 → netsail-server:8080)
  │
  ▼
netsail-server:8080 (server.py)
  │
  │ - No network shaping
  │ - Maximum available throughput
  │ - Minimal latency (local network only)
  │
  ▼
Response
  │
  ▼
benchmark.py
  │
  │ - Baseline performance
  │ - Used to measure overhead of shaping
```

---

## 6. Network Emulation

### 6.1 Traffic Control Architecture

**Linux tc (Traffic Control) Structure**:

```
┌─────────────────────────────────────────────────────────────┐
│ Network Interface: eth0                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ root qdisc (Queueing Discipline)                   │    │
│  │ Type: HTB (Hierarchical Token Bucket)              │    │
│  │ Handle: 1:                                          │    │
│  │                                                      │    │
│  │ Purpose: Root queueing discipline for traffic       │    │
│  │          shaping and classification                 │    │
│  └──────────────────┬───────────────────────────────────┘    │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │ class 1:1 (HTB Class)                              │    │
│  │                                                      │    │
│  │ rate: 100mbit    - Guaranteed bandwidth             │    │
│  │ ceil: 50mbit     - Maximum burst bandwidth          │    │
│  │                                                      │    │
│  │ Purpose: Bandwidth limiting and shaping             │    │
│  └──────────────────┬───────────────────────────────────┘    │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │ netem qdisc (Network Emulator)                     │    │
│  │ Handle: 10:                                         │    │
│  │                                                      │    │
│  │ Parameters (updated every 10ms):                   │    │
│  │ ┌────────────────────────────────────────────────┐ │    │
│  │ │ delay: 45.2ms (from trace file)                │ │    │
│  │ │   - Simulates network RTT/2                    │ │    │
│  │ │   - Adds latency to each packet                │ │    │
│  │ │                                                 │ │    │
│  │ │ loss: 0.1% (default)                           │ │    │
│  │ │   - Random packet loss                         │ │    │
│  │ │   - Simulates network unreliability            │ │    │
│  │ │                                                 │ │    │
│  │ │ Special case:                                  │ │    │
│  │ │   If RTT ≤ 0 or RTT = -1:                      │ │    │
│  │ │     delay = 100ms, loss = 100%                 │ │    │
│  │ │     (simulates disconnection)                  │ │    │
│  │ └────────────────────────────────────────────────┘ │    │
│  │                                                      │    │
│  │ Purpose: Emulate realistic network conditions      │    │
│  └──────────────────────────────────────────────────────┘    │
│                     │                                        │
│                     ▼                                        │
│               Shaped packets                                │
│         (delayed, possibly dropped)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Trace-Driven Emulation Algorithm

**tc-trace.py Logic**:

```python
# ===== Initialization =====
# Load trace file
trace = {}
with open(TRACE_FILE) as f:
    reader = csv.DictReader(f)
    for line in reader:
        since = float(line['since'])      # Absolute timestamp
        rtt = float(line['rtt'])          # Round-trip time (ms)
        trace[since] = rtt

max_time = max(trace.keys())  # Duration of trace
init_time = datetime.now()    # Start time

# Setup tc structure
tc qdisc add dev eth0 root handle 1: htb
tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit ceil 50mbit
tc qdisc add dev eth0 parent 1:1 handle 10: netem delay 40ms loss 0.1%

# ===== Main Loop (every 10ms) =====
while True:
    # Calculate elapsed time since start
    elapsed = (datetime.now() - init_time).total_seconds()

    # Find closest trace entry
    closest_time = min(trace.keys(), key=lambda x: abs(x - elapsed))
    rtt = trace[closest_time]

    # Handle disconnection (RTT ≤ 0 or -1)
    if rtt <= 0 or rtt == -1:
        rtt = 100
        loss = 100  # 100% packet loss
    else:
        loss = 0.1  # Default 0.1%

    # Update netem parameters
    tc qdisc change dev eth0 parent 1:1 handle 10: \
        netem delay {int(rtt)}ms loss {loss}%

    # Log every 10 seconds
    if elapsed % 10 < 0.01:
        print(f"[{elapsed:.1f}s] RTT={rtt:.1f}ms, Loss={loss}%")

    # Loop trace when reaching end
    if elapsed > max_time:
        init_time = datetime.now()
        print("[TRACE] Looping back to start")

    # Sleep 10ms before next update
    time.sleep(0.01)
```

**Key Design Decisions**:

1. **10ms Update Interval**: Balances responsiveness vs CPU overhead
2. **Closest Time Matching**: Handles irregular trace timestamps
3. **Trace Looping**: Enables long-running tests with short traces
4. **Disconnection Simulation**: RTT ≤ 0 → 100% loss
5. **HTB + netem Combination**: Bandwidth limiting + latency/loss

### 6.3 Trace File Format

**Standard Format** (CSV):

```csv
since,relative_seconds,rtt
0.0,0.0,40.0
0.1,0.1,45.2
0.2,0.1,42.8
0.3,0.1,38.5
...
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `since` | float | Absolute timestamp from trace start (seconds) |
| `relative_seconds` | float | Time since previous entry (seconds) |
| `rtt` | float | Round-trip time in milliseconds |

**Special Values**:
- `rtt = -1` → Disconnection (100% loss)
- `rtt ≤ 0` → Disconnection (100% loss)
- `rtt > 0` → Normal operation (0.1% loss)

### 6.4 Available Network Traces

**3G Mobile Traces** (HSDPA Dataset):

| Trace ID | Filename | Scenario | Characteristics |
|----------|----------|----------|-----------------|
| 12743 | trace_12743_3g_tc.csv | Bus route | Variable throughput, moderate mobility |
| 87934 | trace_87934_3g_tc.csv | Metro | Tunnels, high mobility, frequent disconnections |
| 98134 | trace_98134_3g_tc.csv | Tram | Urban, moderate variability |
| 23467 | trace_23467_3g_tc.csv | Train | High speed, tower handoffs |
| 56832 | trace_56832_3g_tc.csv | Ferry | Low mobility, water reflections |
| 73921 | trace_73921_3g_tc.csv | Car (highway) | High speed, frequent cell changes |

**Broadband Traces** (FCC Dataset):

| Trace ID | Filename | ISP/Service | Characteristics |
|----------|----------|-------------|-----------------|
| 797466 | trace_797466_http-www.amazon_tc.csv | Amazon HTTP | Residential broadband |
| 823451 | trace_823451_http-www.facebook_tc.csv | Facebook HTTP | Social media traffic |
| 891234 | trace_891234_http-www.google_tc.csv | Google HTTP | Search traffic |
| 734562 | trace_734562_http-www.ebay_tc.csv | eBay HTTP | E-commerce traffic |

**Trace Characteristics**:

```
3G Mobile Traces:
- Duration: 30-120 seconds
- RTT range: 30-300ms
- Disconnections: Frequent in metro/train
- Variability: High (mobile environment)

Broadband Traces:
- Duration: 60-180 seconds
- RTT range: 10-80ms
- Disconnections: Rare
- Variability: Moderate (congestion-based)
```

---

## 7. Metrics & Measurement

### 7.1 Metrics Taxonomy

```
┌─────────────────────────────────────────────────────────────┐
│                    QoE Metrics Hierarchy                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. Timing Metrics                                  │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ - startup_delay_ms: Time to first segment          │    │
│  │ - total_playback_time_ms: Total video duration     │    │
│  │                                                      │    │
│  │ Purpose: User engagement, initial experience       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 2. Bitrate Metrics                                 │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Samples: [bitrate_1, bitrate_2, ..., bitrate_N]   │    │
│  │                                                      │    │
│  │ Statistics:                                         │    │
│  │ - avg_bitrate_kbps: Mean quality                   │    │
│  │ - min_bitrate_kbps: Worst quality                  │    │
│  │ - max_bitrate_kbps: Best quality                   │    │
│  │ - median_bitrate_kbps: 50th percentile             │    │
│  │ - bitrate_std_dev: Quality stability               │    │
│  │ - bitrate_variance: Quality variability            │    │
│  │ - bitrate_25th_percentile: Lower quartile          │    │
│  │ - bitrate_75th_percentile: Upper quartile          │    │
│  │                                                      │    │
│  │ Purpose: Video quality assessment                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 3. Switching Metrics                               │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ - bitrate_switches: Total switches                 │    │
│  │ - switch_up_count: Quality upgrades                │    │
│  │ - switch_down_count: Quality downgrades            │    │
│  │ - switch_magnitude_total: Sum of |old - new|       │    │
│  │ - avg_switch_magnitude: Mean switch size           │    │
│  │                                                      │    │
│  │ Purpose: Adaptation smoothness, user annoyance     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 4. Rebuffering Metrics                             │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ - rebuffer_count: Number of stall events           │    │
│  │ - rebuffer_time_ms: Total stalling duration        │    │
│  │ - rebuffer_ratio: stall_time / total_time          │    │
│  │ - rebuffer_frequency: events per minute            │    │
│  │ - avg_rebuffer_duration_ms: Mean stall length      │    │
│  │ - max_rebuffer_duration_ms: Worst stall            │    │
│  │ - rebuffer_durations: [dur_1, dur_2, ..., dur_N]   │    │
│  │                                                      │    │
│  │ Purpose: Most critical QoE factor                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 5. Throughput Metrics                              │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Samples: [throughput_1, throughput_2, ..., tput_N] │    │
│  │                                                      │    │
│  │ Statistics:                                         │    │
│  │ - avg_throughput_kbps: Mean network capacity       │    │
│  │ - min_throughput_kbps: Worst throughput            │    │
│  │ - max_throughput_kbps: Best throughput             │    │
│  │ - throughput_std_dev: Network stability            │    │
│  │ - throughput_variance: Network variability         │    │
│  │                                                      │    │
│  │ Purpose: Network performance characterization      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 6. Buffer Metrics                                  │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Samples: [buffer_1, buffer_2, ..., buffer_N]       │    │
│  │                                                      │    │
│  │ Statistics:                                         │    │
│  │ - avg_buffer_level_ms: Mean buffer occupancy       │    │
│  │ - min_buffer_level_ms: Closest to stall            │    │
│  │ - max_buffer_level_ms: Maximum buffer fill         │    │
│  │                                                      │    │
│  │ Purpose: Playback stability assessment             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 7. Utilization Metrics                             │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ - bandwidth_utilization: avg_bitrate / avg_tput    │    │
│  │                                                      │    │
│  │ Interpretation:                                     │    │
│  │ - < 0.5: Very conservative, underutilized          │    │
│  │ - 0.5-0.7: Conservative, safe                      │    │
│  │ - 0.7-0.9: Optimal, efficient                      │    │
│  │ - > 0.9: Aggressive, risky (may cause stalls)      │    │
│  │                                                      │    │
│  │ Purpose: ABR efficiency evaluation                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 8. Segment-Level Metrics                           │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ For each segment:                                  │    │
│  │ - segment_num: Sequence number                     │    │
│  │ - timestamp: Download completion time              │    │
│  │ - bitrate_kbps: Selected quality                   │    │
│  │ - resolution: Video dimensions                     │    │
│  │ - size_bytes: Segment size                         │    │
│  │ - download_time_ms: Transfer duration              │    │
│  │ - throughput_kbps: Measured capacity               │    │
│  │ - buffer_level_ms: Buffer after download           │    │
│  │ - stalled: Boolean (rebuffer occurred)             │    │
│  │                                                      │    │
│  │ Purpose: Detailed time-series analysis             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Metric Calculation Details

**Bitrate Statistics** (`benchmark.py:129-144`):

```python
# Average
self.avg_bitrate_kbps = sum(self.bitrate_samples) / len(self.bitrate_samples)

# Min/Max
self.min_bitrate_kbps = min(self.bitrate_samples)
self.max_bitrate_kbps = max(self.bitrate_samples)

# Variance and Standard Deviation
mean = self.avg_bitrate_kbps
squared_diffs = [(x - mean) ** 2 for x in self.bitrate_samples]
self.bitrate_variance = sum(squared_diffs) / len(self.bitrate_samples)
self.bitrate_std_dev = self.bitrate_variance ** 0.5

# Percentiles (using sorted samples)
sorted_bitrates = sorted(self.bitrate_samples)
n = len(sorted_bitrates)
self.bitrate_median = sorted_bitrates[n // 2]              # 50th
self.bitrate_25th_percentile = sorted_bitrates[n // 4]     # 25th
self.bitrate_75th_percentile = sorted_bitrates[3 * n // 4] # 75th
```

**Rebuffering Statistics** (`benchmark.py:150-163`):

```python
# Frequency (events per minute)
playback_minutes = self.total_playback_time_ms / 60000
if playback_minutes > 0:
    self.rebuffer_frequency = self.rebuffer_count / playback_minutes

# Duration statistics
if self.rebuffer_durations:
    self.avg_rebuffer_duration_ms = (
        sum(self.rebuffer_durations) / len(self.rebuffer_durations)
    )
    self.max_rebuffer_duration_ms = max(self.rebuffer_durations)

# Rebuffer ratio (fraction of time stalled)
total_time = self.total_playback_time_ms + self.rebuffer_time_ms
if total_time > 0:
    self.rebuffer_ratio = self.rebuffer_time_ms / total_time
```

**Bandwidth Utilization** (`benchmark.py:181-183`):

```python
# Utilization = Selected Bitrate / Available Throughput
if self.avg_throughput_kbps > 0:
    self.bandwidth_utilization = (
        self.avg_bitrate_kbps / self.avg_throughput_kbps
    )
```

### 7.3 Output Format

**JSON Structure** (`benchmark.py:188-242`):

```json
{
  "timestamp": "2024-01-31T12:34:56.789",
  "server": "http://localhost:9080",
  "config": {
    "segment_duration_ms": 4000,
    "buffer_target_ms": 30000,
    "max_bitrate_kbps": 3000
  },
  "metrics": {
    "timing": {
      "startup_delay_ms": 234.5,
      "total_playback_time_ms": 600123.4
    },
    "bitrate": {
      "average_kbps": 1245.3,
      "min_kbps": 400.0,
      "max_kbps": 3000.0,
      "median_kbps": 1500.0,
      "std_dev": 623.7,
      "variance": 389002.7,
      "percentile_25": 800.0,
      "percentile_75": 1500.0
    },
    "switching": {
      "total_count": 45,
      "up_count": 22,
      "down_count": 23,
      "total_magnitude": 30915,
      "avg_magnitude": 687.0
    },
    "rebuffering": {
      "count": 12,
      "total_time_ms": 5234.2,
      "ratio": 0.0086,
      "frequency_per_min": 1.2,
      "avg_duration_ms": 436.2,
      "max_duration_ms": 1245.8
    },
    "throughput": {
      "average_kbps": 1856.4,
      "min_kbps": 245.1,
      "max_kbps": 4523.7,
      "std_dev": 892.3,
      "variance": 796199.3
    },
    "buffer": {
      "average_ms": 18345.6,
      "min_ms": 0.0,
      "max_ms": 42178.9
    },
    "utilization": {
      "bandwidth_utilization": 0.671
    },
    "segments": {
      "total": 150,
      "failed": 0
    },
    "samples": {
      "bitrate": [400, 800, 1500, 1500, 800, ...],
      "throughput": [1234.5, 2345.6, 987.3, ...]
    }
  }
}
```

---

## 8. ABR Algorithm

### 8.1 ThroughputBasedABR Design

**Class Structure** (`benchmark.py:327-373`):

```python
class ThroughputBasedABR:
    """
    Throughput-based ABR with buffer-aware adjustment

    Algorithm:
    1. Estimate throughput using harmonic mean (conservative)
    2. Apply safety factor (0.9) to avoid overestimation
    3. Adjust based on buffer level (aggressive/conservative)
    4. Select highest bitrate that fits

    Design rationale:
    - Harmonic mean: More conservative than arithmetic mean
    - Safety factor: Leaves headroom for variability
    - Buffer-based: Balances quality vs stability
    """

    def __init__(self, representations, safety_factor=0.9):
        self.representations = sorted(representations,
                                     key=lambda x: x['bandwidth'])
        self.throughput_history = deque(maxlen=5)  # Last 5 measurements
        self.safety_factor = safety_factor         # 0.9 default
        self.buffer_target_ms = 30000              # 30 seconds

    def select_representation(self, buffer_level_ms):
        """Select optimal bitrate for next segment"""

        # 1. Estimate throughput (harmonic mean)
        if len(self.throughput_history) > 0:
            harmonic_sum = sum(1/t for t in self.throughput_history if t > 0)
            if harmonic_sum > 0:
                avg_throughput_kbps = (
                    len(self.throughput_history) / harmonic_sum
                )
            else:
                avg_throughput_kbps = 500  # Fallback
        else:
            avg_throughput_kbps = 500  # Initial guess (low quality)

        # 2. Apply safety factor
        safe_throughput_bps = avg_throughput_kbps * 1000 * self.safety_factor

        # 3. Buffer-based adjustment
        buffer_ratio = buffer_level_ms / self.buffer_target_ms

        if buffer_ratio < 0.5:
            # Low buffer (<15s): be conservative
            safe_throughput_bps *= 0.7
        elif buffer_ratio > 1.5:
            # High buffer (>45s): be aggressive
            safe_throughput_bps *= 1.1
        # else: buffer normal (15-45s), no adjustment

        # 4. Select highest bitrate that fits
        selected_index = 0
        for i, rep in enumerate(self.representations):
            if rep['bandwidth'] <= safe_throughput_bps:
                selected_index = i

        return self.representations[selected_index], selected_index

    def report_download(self, size_bytes, download_time_ms):
        """Update throughput history after segment download"""
        throughput_kbps = (size_bytes * 8 / 1000) / (download_time_ms / 1000)
        self.throughput_history.append(throughput_kbps)
```

### 8.2 Algorithm Analysis

**Harmonic Mean vs Arithmetic Mean**:

```
Example: Throughput samples = [1000, 2000, 3000, 4000, 5000] kbps

Arithmetic Mean:
  avg = (1000 + 2000 + 3000 + 4000 + 5000) / 5 = 3000 kbps

Harmonic Mean:
  avg = 5 / (1/1000 + 1/2000 + 1/3000 + 1/4000 + 1/5000)
      = 5 / (0.001 + 0.0005 + 0.000333 + 0.00025 + 0.0002)
      = 5 / 0.002283
      = 2190 kbps

Harmonic mean gives more weight to lower values, providing
conservative estimates that reduce rebuffering risk.
```

**Buffer-Based Adjustment**:

| Buffer Level | Ratio | Multiplier | Strategy |
|--------------|-------|------------|----------|
| < 15s | < 0.5 | 0.7× | Very conservative (prevent stalls) |
| 15-45s | 0.5-1.5 | 1.0× | Normal (maintain stability) |
| > 45s | > 1.5 | 1.1× | Aggressive (improve quality) |

**Safety Factor Impact**:

```
Throughput estimate: 2000 kbps
Safety factor: 0.9

Safe throughput = 2000 * 0.9 = 1800 kbps

Available bitrates: 400, 800, 1500, 3000 kbps
Selected: 1500 kbps (highest ≤ 1800)

Without safety factor:
  Selected: 3000 kbps (might cause stall)
```

### 8.3 Alternative ABR Algorithms (Extensible)

**BBA (Buffer-Based Adaptation)**:

```python
class BufferBasedABR:
    """Select bitrate based solely on buffer level"""

    def select_representation(self, buffer_level_ms):
        if buffer_level_ms < 10000:      # < 10s
            return representations[0]    # Lowest quality
        elif buffer_level_ms < 20000:    # 10-20s
            return representations[1]
        elif buffer_level_ms < 30000:    # 20-30s
            return representations[2]
        else:                             # > 30s
            return representations[3]    # Highest quality
```

**BOLA (Buffer Occupancy-based Lyapunov Algorithm)**:

```python
class BOLAABR:
    """Utility maximization with buffer constraints"""

    def select_representation(self, buffer_level_ms):
        # Maximize: utility(bitrate) - V * rebuffer_risk
        # Where V is buffer-based penalty
        utilities = [math.log(r['bandwidth']) for r in representations]
        V = calculate_penalty(buffer_level_ms)
        scores = [u - V * rebuffer_risk(r) for u, r in zip(utilities, reps)]
        return representations[argmax(scores)]
```

**MPC (Model Predictive Control)**:

```python
class MPCABR:
    """Optimize future QoE using throughput prediction"""

    def select_representation(self, buffer_level_ms):
        # Predict future throughput
        predicted_throughput = predict_next_N_segments(
            self.throughput_history, N=5
        )

        # Simulate future segment downloads
        best_quality_sequence = optimize(
            predicted_throughput,
            buffer_level_ms,
            representations,
            horizon=5
        )

        # Return first quality in optimal sequence
        return best_quality_sequence[0]
```

---

## 9. Configuration & Deployment

### 9.1 Docker Compose Configuration

**File**: `Benchmarking/docker-compose.yaml`

```yaml
version: '3.8'

services:
  # DASH Content Server
  netsail-server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: netsail-server
    ports:
      - "8080:8080"        # Direct access (no shaping)
    volumes:
      - ./content:/app/content:ro  # Read-only DASH content
    networks:
      netsail:
        ipv4_address: 192.168.100.20  # Fixed IP
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Network Shaper (tc/netem + nginx proxy)
  netsail-shaper:
    build:
      context: ./shaper
      dockerfile: Dockerfile
    container_name: netsail-shaper
    ports:
      - "9080:80"          # Shaped HTTP
      - "9443:443"         # Shaped HTTPS
    volumes:
      - ./shaper/trace:/trace:ro  # Trace files
    networks:
      netsail:
        ipv4_address: 192.168.100.10  # Fixed IP
    depends_on:
      - netsail-server
    cap_add:
      - NET_ADMIN          # Required for tc/netem
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/shaper/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  netsail:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.100.0/24
          gateway: 192.168.100.1
```

### 9.2 Server Dockerfile

**File**: `Benchmarking/server/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy server files
COPY server.py .
COPY index.html content/

# Expose HTTP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import http.client; \
                 conn = http.client.HTTPConnection('localhost', 8080); \
                 conn.request('GET', '/health'); \
                 resp = conn.getresponse(); \
                 exit(0 if resp.status == 200 else 1)"

# Run server
CMD ["python", "server.py"]
```

### 9.3 Shaper Dockerfile

**File**: `Benchmarking/shaper/Dockerfile`

```dockerfile
FROM nginx:1.25.1

# Install dependencies
RUN apt-get update && apt-get install -y \
    vim \
    net-tools \
    iputils-ping \
    iproute2 \
    python3 \
    python3-pip \
    supervisor \
    iperf3 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Generate self-signed SSL certificate
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Copy configuration files
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY nginx-proxy.conf /etc/nginx/conf.d/default.conf
COPY tc.py /usr/local/bin/
COPY tc-trace.py /usr/local/bin/
COPY entrypoint.sh /

RUN chmod +x /usr/local/bin/tc.py \
             /usr/local/bin/tc-trace.py \
             /entrypoint.sh

# Expose HTTP and HTTPS
EXPOSE 80 443

# Entry point
ENTRYPOINT ["/entrypoint.sh"]
```

### 9.4 Supervisord Configuration

**File**: `Benchmarking/shaper/supervisord.conf`

```ini
[supervisord]
nodaemon=true
user=root

[program:tc-trace]
command=python3 /usr/local/bin/tc-trace.py
autostart=true
autorestart=true
priority=0
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
stopsignal=SIGINT
stopwaitsecs=10

[program:nginx]
command=nginx -g 'daemon off;'
autostart=true
autorestart=true
priority=0
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

### 9.5 Nginx Proxy Configuration

**File**: `Benchmarking/shaper/nginx-proxy.conf`

```nginx
upstream server {
    server 192.168.100.20:8080;  # netsail-server
}

server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://server;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Traffic-Shaped "true";

        # Disable buffering for streaming
        proxy_buffering off;
        proxy_request_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /shaper/health {
        return 200 '{"status":"ok","service":"shaper"}';
        add_header Content-Type application/json;
    }
}

server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    location / {
        proxy_pass http://server;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Traffic-Shaped "true";

        proxy_buffering off;
        proxy_request_buffering off;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 9.6 Environment Variables

**Benchmark Tool**:

```bash
# Override base URL
export NETSAIL_URL="http://localhost:9080"

# Override duration
export NETSAIL_DURATION=120

# Override trace file
export NETSAIL_TRACE="traces/trace_12743_3g_tc.csv"
```

**Server**:

```bash
# Override port
export PORT=8080

# Override content directory
export CONTENT_DIR=/app/content
```

**Shaper**:

```bash
# Override trace file
export TRACE_FILE=/trace/trace.csv

# Override network interface
export ETHERNET=eth0

# Override rate limiting
export DEFAULT_RATE=100mbit
export DEFAULT_CEIL=50mbit

# Override delay/loss
export DEFAULT_DELAY=40ms
export DEFAULT_LOSS=0.1%
```

---

## 10. Usage & Examples

### 10.1 Setup

```bash
# 1. Clone repository
git clone https://github.com/user/netsail.git
cd netsail/Benchmarking

# 2. Download sample video
wget http://distribution.bbb3d.renderfarming.net/video/mp4/bbb_sunflower_1080p_30fps_normal.mp4 \
  -O BigBuckBunny_320x180.mp4

# 3. Generate DASH content
./generate-dash.sh BigBuckBunny_320x180.mp4 content 4

# 4. Download network traces (optional)
python download_traces.py --all

# 5. Start services
docker compose up -d

# 6. Verify services are running
docker ps
curl http://localhost:8080/health
curl http://localhost:9080/shaper/health
```

### 10.2 Running Benchmarks

**Basic (Direct, No Shaping)**:

```bash
python benchmark.py
# Uses: http://localhost:8080 (direct server)
# Duration: Until end of video
# Output: Console + JSON
```

**With Default Shaping**:

```bash
python benchmark.py --shaped
# Uses: http://localhost:9080 (shaped via tc)
# Default trace: 40ms delay, 0.1% loss
```

**With Custom Trace**:

```bash
python benchmark.py --trace traces/trace_12743_3g_tc.csv
# Copies trace to shaper/trace/trace.csv
# Restarts shaper to load trace
# Shaped via tc-trace.py
```

**With Duration Limit**:

```bash
python benchmark.py --duration 60
# Test only first 60 seconds of video
```

**Custom URL**:

```bash
python benchmark.py --url http://remote.server:8080
# Test against different server
```

**Complete Example**:

```bash
python benchmark.py \
  --url http://localhost:9080 \
  --trace traces/trace_87934_3g_tc.csv \
  --duration 120 \
  --output results/metro_3g.json
```

### 10.3 Web Player

```bash
# Open browser
open http://localhost:8080/        # Direct (fast)
open http://localhost:9080/        # Shaped (realistic)

# Metrics are displayed in real-time:
# - Buffer level
# - Current bitrate
# - Average bitrate
# - Bitrate switches
# - Stalling time
# - Network latency
# - Dropped frames
```

### 10.4 Analyzing Results

**Console Output**:

```
=== Streaming Benchmark Results ===
Server: http://localhost:9080
Duration: 600.2s

Timing:
  Startup delay: 234.5 ms
  Total playback: 600.0s

Bitrate:
  Average: 1245 kbps
  Min: 400 kbps, Max: 3000 kbps
  Median: 1500 kbps, Std Dev: 623 kbps
  25th percentile: 800 kbps
  75th percentile: 1500 kbps

Switching:
  Total switches: 45
  Up: 22, Down: 23
  Avg magnitude: 687 kbps

Rebuffering:
  Events: 12
  Total time: 5.2s
  Ratio: 0.86%
  Frequency: 1.2 events/min
  Avg duration: 436 ms
  Max duration: 1245 ms

Throughput:
  Average: 1856 kbps
  Min: 245 kbps, Max: 4523 kbps
  Std Dev: 892 kbps

Buffer:
  Average: 18.3s
  Min: 0.0s, Max: 42.1s

Utilization:
  Bandwidth: 67.1%

Segments:
  Total: 150
  Failed: 0

Results saved to: results/benchmark_20240131_123456.json
```

**JSON Analysis** (Python):

```python
import json
import matplotlib.pyplot as plt

# Load results
with open('results/benchmark_20240131_123456.json') as f:
    data = json.load(f)

# Plot bitrate over time
bitrates = data['metrics']['samples']['bitrate']
plt.plot(bitrates)
plt.xlabel('Segment Number')
plt.ylabel('Bitrate (kbps)')
plt.title('Bitrate Adaptation Over Time')
plt.show()

# Plot throughput vs bitrate
throughputs = data['metrics']['samples']['throughput']
plt.scatter(throughputs, bitrates)
plt.xlabel('Throughput (kbps)')
plt.ylabel('Selected Bitrate (kbps)')
plt.title('ABR Decision: Throughput vs Bitrate')
plt.show()
```

### 10.5 Comparing Traces

**Batch Testing**:

```bash
#!/bin/bash
# compare_traces.sh

TRACES=(
    "traces/trace_12743_3g_tc.csv"
    "traces/trace_87934_3g_tc.csv"
    "traces/trace_797466_http-www.amazon_tc.csv"
)

for trace in "${TRACES[@]}"; do
    echo "Testing $trace..."
    python benchmark.py \
        --trace "$trace" \
        --duration 120 \
        --output "results/$(basename $trace .csv).json"
    sleep 5
done

echo "All tests complete!"
```

**Aggregate Analysis**:

```python
import json
import glob
import pandas as pd

# Load all results
results = []
for file in glob.glob('results/*.json'):
    with open(file) as f:
        data = json.load(f)
        results.append({
            'trace': file,
            'avg_bitrate': data['metrics']['bitrate']['average_kbps'],
            'rebuffer_ratio': data['metrics']['rebuffering']['ratio'],
            'rebuffer_count': data['metrics']['rebuffering']['count'],
            'switch_count': data['metrics']['switching']['total_count'],
            'bandwidth_util': data['metrics']['utilization']['bandwidth_utilization']
        })

# Create DataFrame
df = pd.DataFrame(results)
print(df)

# Summary statistics
print("\nSummary:")
print(df.describe())
```

---

## 11. Future Enhancements

### 11.1 Planned Features

**ABR Algorithm Extensions**:
- [ ] BBA (Buffer-Based Adaptation)
- [ ] BOLA (Buffer Occupancy-based Lyapunov)
- [ ] MPC (Model Predictive Control)
- [ ] Pensieve (Reinforcement Learning)
- [ ] ABR algorithm comparison framework

**Metrics Extensions**:
- [ ] VMAF (Video Multimethod Assessment Fusion) quality scores
- [ ] Viewport-aware metrics for VR/360 video
- [ ] Energy consumption tracking
- [ ] CDN/origin server selection metrics

**Network Emulation**:
- [ ] Bandwidth traces (not just RTT)
- [ ] 5G network traces
- [ ] Satellite network traces
- [ ] Asymmetric bandwidth (upload vs download)
- [ ] Jitter and packet reordering

**Content Generation**:
- [ ] Multi-codec support (AV1, VP9, HEVC)
- [ ] Tiled video for viewport-adaptive streaming
- [ ] Multi-angle video
- [ ] Low-latency DASH (CMAF)

**Web Interface**:
- [ ] Real-time metrics dashboard (WebSocket)
- [ ] Historical comparison charts
- [ ] Trace visualization
- [ ] ABR algorithm selector

**Analysis Tools**:
- [ ] Automated report generation
- [ ] Statistical significance testing
- [ ] QoE model integration (ITU-T P.1203)
- [ ] Machine learning-based anomaly detection

### 11.2 Architecture Improvements

**Scalability**:
- [ ] Multi-client simulation (parallel benchmarks)
- [ ] Distributed server deployment
- [ ] Kubernetes deployment manifests
- [ ] Load balancing across multiple servers

**Monitoring**:
- [ ] Prometheus metrics export
- [ ] Grafana dashboard templates
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Log aggregation (ELK stack)

**Testing**:
- [ ] Unit tests (pytest)
- [ ] Integration tests (Docker Compose)
- [ ] Performance regression tests
- [ ] CI/CD pipeline (GitHub Actions)

### 11.3 Research Extensions

**QoE Modeling**:
- [ ] ITU-T P.1203 implementation
- [ ] Custom QoE model training
- [ ] User study data collection
- [ ] Subjective quality assessment integration

**ABR Optimization**:
- [ ] Multi-objective optimization (quality, stability, efficiency)
- [ ] Context-aware ABR (device, network, content type)
- [ ] Federated learning for ABR
- [ ] Edge computing integration

**Network Characterization**:
- [ ] Automatic network classification
- [ ] Bandwidth prediction models
- [ ] Mobility pattern detection
- [ ] 5G beam management simulation

---

## Appendix

### A. References

**DASH Standards**:
- ISO/IEC 23009-1: MPEG-DASH Specification
- DASH Industry Forum (DASH-IF) Guidelines

**Network Traces**:
- Riiser et al., "Commute Path Bandwidth Traces from 3G Networks", ACM IMC 2013
- FCC Broadband Dataset: https://github.com/confiwent/Real-world-bandwidth-traces

**ABR Algorithms**:
- BBA: "A Buffer-Based Approach to Rate Adaptation" (SIGCOMM 2014)
- BOLA: "A Control-Theoretic Approach for DASH" (NOSSDAV 2016)
- MPC: "A Control-Theoretic Approach for DASH using Bandwidth Prediction" (MMSys 2015)
- Pensieve: "Neural Adaptive Video Streaming with Pensieve" (SIGCOMM 2017)

**QoE Models**:
- ITU-T P.1203: Parametric bitstream-based quality assessment
- ITU-T P.910: Subjective video quality assessment methods

### B. Glossary

| Term | Definition |
|------|------------|
| **ABR** | Adaptive Bitrate - Algorithm for selecting video quality |
| **DASH** | Dynamic Adaptive Streaming over HTTP |
| **HTB** | Hierarchical Token Bucket - Linux rate limiting |
| **MPD** | Media Presentation Description - DASH manifest |
| **netem** | Network Emulator - Linux kernel module |
| **QoE** | Quality of Experience - User-perceived quality |
| **RTT** | Round-Trip Time - Network latency |
| **tc** | Traffic Control - Linux network shaping utility |

### C. Troubleshooting

**Container won't start**:

```bash
# Check logs
docker logs netsail-server
docker logs netsail-shaper

# Check ports
netstat -tuln | grep -E '8080|9080'

# Restart services
docker compose down
docker compose up -d
```

**Shaping not working**:

```bash
# Verify tc rules
docker exec netsail-shaper tc qdisc show dev eth0

# Check tc-trace.py is running
docker exec netsail-shaper ps aux | grep tc-trace

# Verify trace file
docker exec netsail-shaper cat /trace/trace.csv | head
```

**Benchmark hangs**:

```bash
# Check server health
curl http://localhost:8080/health
curl http://localhost:9080/shaper/health

# Verify manifest exists
curl http://localhost:8080/manifest.mpd

# Check segments
ls -lh content/chunk-stream*.m4s
```

**No DASH content**:

```bash
# Regenerate content
./generate-dash.sh BigBuckBunny_320x180.mp4 content 4

# Verify manifest
cat content/manifest.mpd

# Check segments
ls -lh content/
```

---

**End of Design Document**
