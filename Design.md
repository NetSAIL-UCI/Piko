# NetSail Streaming Benchmark

## Purpose
Measure video streaming quality (QoE) under realistic network conditions. Compare DASH vs WebRTC protocols.

## Architecture
```
Client (benchmark.py) → Traffic Shaper → Server (DASH/WebRTC)
```

## Components
- **DASH Server**: Python HTTP server serving video segments (manifest.mpd + .m4s files)
- **WebRTC Server**: Node.js mediasoup server for real-time streaming
- **Traffic Shaper**: Linux tc/netem applying network traces (delay, loss, bandwidth limits)
- **Benchmark Client**: Downloads segments, simulates playback, measures metrics

## Key Metrics
- **Bitrate**: Average video quality (kbps)
- **Rebuffering**: Stall count, duration, ratio
- **Switches**: Quality level changes (up/down)
- **Throughput**: Measured network capacity

## How It Works
1. Client fetches video manifest
2. ABR algorithm selects quality based on throughput + buffer level
3. Client downloads segments through shaper (network conditions applied)
4. Playback is simulated, stalls detected when buffer empties
5. Metrics collected and saved to JSON

## Network Traces
Real-world traces from 3G mobile and broadband networks replay through tc/netem.
