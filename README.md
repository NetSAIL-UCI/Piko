# DASH Streaming Benchmark

Testbed for measuring video streaming performance under network emulation.

## Structure

```
├── benchmark.py          # Main benchmark tool
├── download_traces.py    # Download network traces
├── generate-dash.sh      # Generate DASH content from video
├── docker-compose.yaml   # Docker services config
├── content/              # DASH video segments (generated)
├── traces/               # Network bandwidth traces
├── results/              # Benchmark output files
├── server/               # DASH streaming server (Docker)
└── shaper/               # Traffic shaper with tc/netem (Docker)
```

## Quick Start

```bash
# 1. Start services (Linux required for traffic shaping)
docker compose up -d

# 2. Generate DASH content (first time only)
./generate-dash.sh <input.mp4> ./content 4

# 3. Run benchmark
python3 benchmark.py                    # Direct server (port 8080)
python3 benchmark.py --shaped           # Through traffic shaper (port 9080)
python3 benchmark.py --duration 60      # Limit to 60 seconds
```

## Ports

| Port | Description |
|------|-------------|
| `8080` | Direct DASH server (no shaping) |
| `9080` | Traffic-shaped connection (tc/netem) |

## Benchmark Options

```bash
python3 benchmark.py [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--url URL` | Server URL (default: localhost:8080) |
| `--shaped` | Use shaped port 9080 |
| `--duration N` | Test N seconds (default: full video) |
| `-o FILE` | Output JSON file |

## Metrics

| Category | Metrics |
|----------|---------|
| **Bitrate** | avg, min, max, std_dev, percentiles |
| **Switching** | count, up/down, magnitude |
| **Rebuffering** | count, time, ratio, frequency |
| **Throughput** | avg, min, max |
| **Buffer** | avg, min, max levels |
| **Utilization** | bitrate / throughput |

## Network Traces

Download real-world bandwidth traces:

```bash
python3 download_traces.py --all        # Download all datasets
python3 download_traces.py --hsdpa      # HSDPA 3G mobile traces
python3 download_traces.py --fcc        # FCC broadband traces
python3 download_traces.py --list       # List available traces
```

### Datasets

| Dataset | Description | Source |
|---------|-------------|--------|
| HSDPA 3G | Mobile traces (bus, metro, train) | [Riiser et al., IMC 2013](https://dl.acm.org/doi/10.1145/2483977.2483991) |
| FCC | Broadband America traces | [GitHub](https://github.com/confiwent/Real-world-bandwidth-traces) |

## Traffic Shaping

Configure in `docker-compose.yaml`:

```yaml
shaper:
  environment:
    DEFAULT_DELAY: "100ms"
    DEFAULT_LOSS: "2%"
    DEFAULT_RATE: "5mbit"
```

Use trace files for dynamic bandwidth:
```yaml
volumes:
  - ./shaper/trace/my-trace.csv:/trace/trace.csv:ro
```

## Docker Commands

```bash
docker compose up -d              # Start
docker compose down               # Stop
docker compose build --no-cache   # Rebuild
docker logs -f netsail-shaper     # View shaper logs
```

