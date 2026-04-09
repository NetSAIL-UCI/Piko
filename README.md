# Streaming Benchmark

Measure video streaming QoE (HLS, DASH & WebRTC) under emulated network conditions.
[View the NetSAIL System Diagram (PDF)](./Netsail%20diagram.pdf)
## Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start all services (HLS/DASH server, WebRTC server, network shaper)
docker compose up -d
```

## Run Benchmarks

### HLS Benchmarks

```bash
# HLS with a specific network trace
python3 benchmark.py -p hls --trace traces/trace_12743_3g_tc.csv

# HLS direct (no shaping)
python3 benchmark.py -p hls

# HLS with all traces in a folder
python3 benchmark.py -p hls --trace-dir traces/
```

### DASH Benchmarks

```bash
# DASH with a specific network trace
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv

# DASH direct (no shaping)
python3 benchmark.py

# DASH with all traces in a folder
python3 benchmark.py --trace-dir traces/
```

### WebRTC Benchmarks

```bash
# WebRTC with a specific network trace
python3 benchmark.py -p webrtc --trace traces/trace_12743_3g_tc.csv

# WebRTC direct (60s)
python3 benchmark.py -p webrtc --duration 60

# WebRTC with all traces in a folder
python3 benchmark.py -p webrtc --trace-dir traces/
```

### Protocol Comparison

```bash
# Run same trace on all three protocols
python3 benchmark.py -p hls --trace traces/trace_12743_3g_tc.csv -o hls.json
python3 benchmark.py -p dash --trace traces/trace_12743_3g_tc.csv -o dash.json
python3 benchmark.py -p webrtc --trace traces/trace_12743_3g_tc.csv -o webrtc.json
```

### Custom Options

```bash
# Limit test duration to 30 seconds
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv --duration 30

# Save to a specific output file
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv -o my_result.json

# Use a custom server URL
python3 benchmark.py --url http://192.168.1.10:8080

# Use shaped ports without trace file
python3 benchmark.py --shaped
```

## Download Traces

```bash
# Download all available network traces (3G + FCC broadband)
python3 scripts/download_traces.py --all

# List available trace sets
python3 scripts/download_traces.py --list
```

## CLI Reference

```
python3 benchmark.py [OPTIONS]

--protocol, -p   hls | dash | webrtc     (default: dash)
--trace FILE     Single trace file       (auto-enables shaping)
--trace-dir DIR  Folder of traces        (runs all *_tc.csv files)
--shaped         Use shaped ports        (9080 for HLS/DASH, 9030 for WebRTC)
--duration N     Limit test to N seconds
-o FILE          Output JSON filename
--url URL        Custom server URL
```

## Docker

```bash
docker compose up -d            # Start services
docker compose down             # Stop services
docker compose logs -f          # View logs
docker compose restart shaper   # Restart shaper after config change
```

## Ports

| Service | Direct | Shaped |
|---------|--------|--------|
| HLS/DASH Server | 8080 | 9080 |
| LL-DASH Server | 8081 | 9081 |
| WebRTC Server | 3000 | 9030 |

## LL-DASH Service

The repository now includes a dedicated LL-DASH module under `lldash-server/`.

- Direct player URL: `http://localhost:8081`
- Shaped player URL: `http://localhost:9081`
- Default manifest path in the LL player: `/manifest_ll.mpd`
- Override manifest from URL: `http://localhost:8081/?mpd=/manifest.mpd`
