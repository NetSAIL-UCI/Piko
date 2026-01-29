# DASH Streaming Benchmark

Measure video streaming QoE under emulated network conditions.

## Quick Start

```bash
docker compose up -d                                        # Start services
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv   # Run with trace
```

## Usage

```bash
python3 benchmark.py [OPTIONS]

--trace FILE     Use network trace (auto-enables shaping)
--shaped         Use traffic-shaped port (9080)
--duration N     Limit test to N seconds
-o FILE          Save results to JSON file
```

## Examples

```bash
benchmark.py                                          # Direct (no shaping)
benchmark.py --shaped                                 # Shaped (default settings)
benchmark.py --trace traces/trace_12743_3g_tc.csv    # 3G mobile trace
benchmark.py --trace traces/trace_797466_*_tc.csv    # FCC broadband trace
benchmark.py --duration 60 -o results.json           # 60s test, save output
```

## Metrics Output

**Bitrate**: avg, min, max, std_dev, percentiles  
**Switching**: count, up/down, magnitude  
**Rebuffering**: count, time, ratio, frequency  
**Throughput**: avg, min, max  
**Buffer**: avg, min levels  

## Traces

```bash
python3 download_traces.py --all     # Download HSDPA 3G + FCC traces
python3 download_traces.py --list    # List available
```

| Type | Files | Source |
|------|-------|--------|
| 3G Mobile | `*_3g_tc.csv` | [Riiser, IMC 2013](https://dl.acm.org/doi/10.1145/2483977.2483991) |
| Broadband | `*_http-*_tc.csv` | [FCC/GitHub](https://github.com/confiwent/Real-world-bandwidth-traces) |

## Ports

- **8080** - Direct server
- **9080** - Traffic-shaped

## Files

```
benchmark.py         Main tool
traces/              Network traces (*_tc.csv)
results/             Output JSON files
shaper/trace/        Active trace (auto-copied)
```## Docker Commands

```bash
docker compose up -d              # Start
docker compose down               # Stop
docker compose build --no-cache   # Rebuild
docker logs -f netsail-shaper     # View shaper logs
```

