# NetSail Streaming Benchmark

## Purpose
Measure video streaming quality (QoE) under realistic network conditions. Compare HLS, DASH, and WebRTC protocols.

## Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Network                           │
│                      192.168.100.0/24                            │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │  Traffic Shaper  │     │     HLS/DASH Server              │  │
│  │  (192.168.100.10)│────▶│     (192.168.100.20)             │  │
│  │                  │     │                                   │  │
│  │  - tc/netem      │     │  - Python HTTP server            │  │
│  │  - nginx proxy   │     │  - Serves .m3u8 / .mpd           │  │
│  │  - trace replay  │     │  - Serves .ts / .m4s segments    │  │
│  │                  │     │                                   │  │
│  │  Port 9080 ──────┼─────┼▶ Port 8080                       │  │
│  └──────────────────┘     └──────────────────────────────────┘  │
│           │                                                      │
│           │               ┌──────────────────────────────────┐  │
│           │               │     WebRTC Server                │  │
│           └──────────────▶│     (192.168.100.30)             │  │
│                           │                                   │  │
│  Port 9030 ───────────────│  - Node.js + mediasoup           │  │
│                           │  - RTP/UDP streaming             │  │
│                           │  - Server-side ABR               │  │
│                           │                                   │  │
│                           │  Port 3000                       │  │
│                           └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │   benchmark.py    │
                    │   (Client)        │
                    │                   │
                    │  - Fetches video  │
                    │  - Measures QoE   │
                    │  - Simulates ABR  │
                    └───────────────────┘
```

## Components
- **HLS/DASH Server**: Python HTTP server serving video segments (.m3u8/.mpd manifests + .ts/.m4s files)
- **WebRTC Server**: Node.js mediasoup server for real-time streaming
- **Traffic Shaper**: Linux tc/netem applying network traces (delay, loss, bandwidth limits)
- **Benchmark Client**: Downloads segments, simulates playback, measures metrics

## Key Metrics
- **Bitrate**: Average video quality (kbps)
- **Rebuffering**: Stall count, duration, ratio
- **Switches**: Quality level changes (up/down)
- **Throughput**: Measured network capacity

## How It Works
1. Client fetches video manifest (HLS .m3u8 or DASH .mpd)
2. ABR algorithm selects quality based on throughput + buffer level
3. Client downloads segments through shaper (network conditions applied)
4. Playback is simulated, stalls detected when buffer empties
5. Metrics collected and saved to JSON

## Network Traces
Real-world traces from 3G mobile and broadband networks replay through tc/netem.
