# DASH Streaming QoE Benchmark

Testbed for measuring video streaming Quality of Experience under network emulation.

## Quick Start

```bash
# 1. Start services (Linux required)
sudo docker compose up -d

# 2. Generate multi-bitrate content (first time only)
cd scripts && ./generate-dash.sh <input.mp4> ../content 4

# 3. Run benchmark
python3 scripts/benchmark.py                    # Direct (port 8080)
python3 scripts/benchmark.py --shaped           # Shaped (port 9080)
python3 scripts/benchmark.py --duration 60      # Limit to 60s
```

## Access

| Port | Description |
|------|-------------|
| `8080` | Direct server (no shaping) |
| `9080` | Traffic-shaped (tc/netem) |

**Browser player:** http://localhost:8080

## Benchmark Tool

```bash
python3 scripts/benchmark.py [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--url URL` | Server URL (default: localhost:8080) |
| `--shaped` | Use shaped port 9080 |
| `--duration N` | Test N seconds (default: full video) |
| `-o FILE` | Output JSON file |

### QoE Metrics

| Metric | Description |
|--------|-------------|
| Avg Bitrate | Mean video quality (kbps) |
| Bitrate Switches | Quality level changes |
| Rebuffer Time | Total stalling duration |
| Rebuffer Ratio | % time spent buffering |
| **QoE Score** | 1-5 composite score |

### QoE Formula

```
QoE = 0.40×Quality + 0.35×Continuity + 0.15×Stability + 0.10×Startup
```

## Traffic Shaping

Edit `docker-compose.yaml` environment:

```yaml
shaper:
  environment:
    DEFAULT_DELAY: "100ms"
    DEFAULT_LOSS: "2%"
    DEFAULT_RATE: "5mbit"
```

Use trace files for dynamic conditions:
```yaml
volumes:
  - ./shaper/trace/starlink-isl-trace.csv:/trace/trace.csv:ro
```

## Common Commands

```bash
sudo docker compose up -d          # Start
sudo docker compose down           # Stop
sudo docker compose build --no-cache  # Rebuild
docker logs -f netsail-shaper      # View shaper logs
```

