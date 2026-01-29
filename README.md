# DASH Streaming Benchmark

Testbed for measuring video streaming performance under network emulation.

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

## Measurement Pipeline

For systematic benchmarking across multiple network traces with statistical analysis:

```bash
cd scripts

# Download real traces
python3 download_traces.py --all                # Download HSDPA 3G + FCC traces

# Run the pipeline
python3 run_pipeline.py                         # All traces, 5-minute video
python3 run_pipeline.py --datasets hsdpa_3g fcc # Specific datasets
python3 run_pipeline.py --duration 300          # Custom video duration
python3 run_pipeline.py --max-traces 10         # Limit traces per dataset
```

See [PIPELINE_README.md](PIPELINE_README.md) for full documentation.

## Trace Datasets

| Dataset | Description | Source |
|---------|-------------|--------|
| HSDPA 3G | Real-world mobile traces (bus, metro, train, etc.) | [Riiser et al., IMC 2013](https://dl.acm.org/doi/10.1145/2483977.2483991) |
| FCC | Broadband America traces | [GitHub](https://github.com/confiwent/Real-world-bandwidth-traces) |

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

### Metrics

| Category | Metric | Description |
|----------|--------|-------------|
| **Bitrate** | avg/min/max | Selected quality levels |
| | std_dev, variance | Bitrate stability |
| | percentiles | 25th, 50th, 75th percentile |
| **Switching** | count | Total quality changes |
| | up/down | Direction of switches |
| | avg_magnitude | Size of quality jumps |
| **Rebuffering** | count, time, ratio | Stall events |
| | frequency | Stalls per minute |
| **Throughput** | avg/min/max | Network performance |
| **Buffer** | avg/min/max | Buffer occupancy |
| **Utilization** | bandwidth_util | bitrate / throughput |

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

