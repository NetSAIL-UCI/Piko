# Streaming Benchmark

Measure video streaming QoE (DASH & WebRTC) under emulated network conditions.

## Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start all services (DASH server, WebRTC server, network shaper)
docker compose up -d
```

## Run Benchmarks

### Single trace

```bash
# DASH with a specific network trace
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv

# WebRTC with a specific network trace
python3 benchmark.py -p webrtc --trace traces/trace_12743_3g_tc.csv
```

### All traces in a folder

```bash
# DASH — run every *_tc.csv trace in the folder
python3 benchmark.py --trace-dir traces/

# WebRTC — run every trace in the folder
python3 benchmark.py -p webrtc --trace-dir traces/
```

### Direct (no network shaping)

```bash
# DASH direct
python3 benchmark.py

# WebRTC direct (60 s)
python3 benchmark.py -p webrtc --duration 60
```

### Shaped (no trace file, uses default shaper config)

```bash
python3 benchmark.py --shaped
python3 benchmark.py -p webrtc --shaped
```

### Custom options

```bash
# Limit test duration to 30 seconds
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv --duration 30

# Save to a specific output file
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv -o my_result.json

# Use a custom server URL
python3 benchmark.py --url http://192.168.1.10:8080
```

## Download Traces

```bash
# Download all available network traces (3G + FCC broadband)
python3 download_traces.py --all

# List available trace sets
python3 download_traces.py --list
```

## CLI Reference

```
python3 benchmark.py [OPTIONS]

--protocol, -p   dash | webrtc           (default: dash)
--trace FILE     Single trace file       (auto-enables shaping)
--trace-dir DIR  Folder of traces        (runs all *_tc.csv files)
--shaped         Use shaped ports        (9080 for DASH, 9030 for WebRTC)
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
