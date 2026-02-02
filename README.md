# Streaming Benchmark (DASH + WebRTC)

Measure video streaming QoE under emulated network conditions. Compare DASH and WebRTC protocols.

## Quick Start

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start services
docker compose up -d

# Run DASH benchmark with network trace
python3 benchmark.py --protocol dash --trace traces/trace_12743_3g_tc.csv

# Run WebRTC benchmark
python3 benchmark.py --protocol webrtc --duration 60
```

## Usage

```bash
python3 benchmark.py [OPTIONS]

--protocol, -p   Protocol to benchmark: dash or webrtc (default: dash)
--trace FILE     Use network trace (auto-enables shaping)
--shaped         Use traffic-shaped ports (9080/9030)
--duration N     Limit test to N seconds
-o FILE          Save results to JSON file
--url URL        Custom server URL
```

## Protocol Comparison

```bash
# Run both protocols with same trace for comparison
python3 benchmark.py -p dash --trace traces/trace_12743_3g_tc.csv -o dash.json
python3 benchmark.py -p webrtc --trace traces/trace_12743_3g_tc.csv -o webrtc.json
```

## Examples

```bash
# DASH Streaming
benchmark.py                                          # Direct (no shaping)
benchmark.py --shaped                                 # Shaped (default settings)
benchmark.py --trace traces/trace_12743_3g_tc.csv    # 3G mobile trace

# WebRTC Streaming
benchmark.py -p webrtc                               # Direct WebRTC
benchmark.py -p webrtc --shaped                      # Shaped WebRTC
benchmark.py -p webrtc --duration 60 -o webrtc.json  # 60s test
```

## Metrics Output

### DASH Metrics
**Bitrate**: avg, min, max, std_dev, percentiles  
**Switching**: count, up/down, magnitude  
**Rebuffering**: count, time, ratio, frequency  
**Throughput**: avg, min, max  
**Buffer**: avg, min levels  

### WebRTC Metrics
**Bitrate**: avg, min, max, std_dev  
**Quality Switches**: count, up/down  
**Jitter**: avg, min, max (ms)  
**Packet Loss**: avg, max (%)  
**RTT**: avg, min, max (ms)  
**Throughput**: avg, min, max  

## Network Traces

```bash
python3 download_traces.py --all     # Download HSDPA 3G + FCC traces
python3 download_traces.py --list    # List available
```

| Type | Files | Source |
|------|-------|--------|
| 3G Mobile | `*_3g_tc.csv` | [Riiser, IMC 2013](https://dl.acm.org/doi/10.1145/2483977.2483991) |
| Broadband | `*_http-*_tc.csv` | [FCC/GitHub](https://github.com/confiwent/Real-world-bandwidth-traces) |

## Ports

| Service | Direct | Shaped |
|---------|--------|--------|
| DASH Server | 8080 | 9080 |
| WebRTC Server | 3000 | 9030 |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Network Shaper                          │
│                  (tc/netem on Linux)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              nginx reverse proxy                      │   │
│  │         :80 → DASH    :8030 → WebRTC                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│      DASH Server        │   │     WebRTC Server       │
│   (Python HTTP/DASH)    │   │   (Node.js/mediasoup)   │
│        :8080            │   │        :3000            │
└─────────────────────────┘   └─────────────────────────┘
```

## Files

```
benchmark.py             Main CLI tool
requirements.txt         Python dependencies
docker-compose.yaml      Service definitions
server/                  DASH streaming server
webrtc-server/           WebRTC server (mediasoup)
shaper/                  Network emulator
traces/                  Network traces (*_tc.csv)
results/                 Output JSON files
```

## Docker Commands

```bash
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose build --no-cache   # Rebuild images
docker compose logs -f            # View all logs
docker logs -f netsail-shaper     # View shaper logs
docker logs -f netsail-webrtc     # View WebRTC logs
```

## Requirements

- Docker & Docker Compose
- Python 3.8+
- Linux host (required for traffic shaping with tc/netem)

### Python Dependencies

```bash
pip install -r requirements.txt
```

For WebRTC benchmarking:
- `aiortc` - Python WebRTC implementation
- `requests` - HTTP client
- `tqdm` - Progress bars (optional)