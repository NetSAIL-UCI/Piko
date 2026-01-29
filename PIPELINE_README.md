# DASH Streaming Measurement Pipeline

End-to-end benchmarking pipeline for DASH video streaming performance measurement.

## Overview

This pipeline enables systematic benchmarking of DASH streaming across multiple network trace datasets with statistical analysis including confidence intervals and variance metrics.

## Features

- **Multiple Trace Support**: HSDPA 3G mobile traces, FCC broadband traces, synthetic traces
- **Statistical Analysis**: Mean, variance, standard deviation, 95% confidence intervals
- **Per-Dataset Comparison**: Compare performance across different network conditions
- **Comprehensive Metrics**: Bitrate, rebuffering, switching, throughput, buffer health
- **No QoE Score**: Individual metrics for detailed analysis (no composite score)

## Quick Start

### 1. Download Traces

```bash
cd scripts

# Download all available traces
python download_traces.py --all

# Or download specific datasets
python download_traces.py --hsdpa      # HSDPA 3G mobile traces
python download_traces.py --fcc        # FCC broadband traces
python download_traces.py --synthetic  # Create synthetic traces for testing

# List available traces
python download_traces.py --list
```

### 2. Run the Pipeline

```bash
# Run on all available traces (5-minute video simulation)
python run_pipeline.py

# Run on specific datasets
python run_pipeline.py --datasets hsdpa_3g fcc

# Customize video duration
python run_pipeline.py --duration 300   # 5 minutes
python run_pipeline.py --duration 600   # 10 minutes

# Parallel execution
python run_pipeline.py --parallel 4

# Limit traces per dataset
python run_pipeline.py --max-traces 10

# Custom output
python run_pipeline.py --output my_results.json --output-csv my_results.csv
```

### 3. Run Direct Benchmark (Live Server)

```bash
# Start the server
sudo docker compose up -d

# Run benchmark against live server
python benchmark.py                     # Direct connection
python benchmark.py --shaped            # Through traffic shaper
python benchmark.py --duration 60       # 60-second test
```

## Trace Datasets

### HSDPA 3G Dataset (Riiser et al., ACM IMC 2013)

- **Paper**: https://dl.acm.org/doi/10.1145/2483977.2483991
- **Description**: Real-world 3G/HSDPA mobile network traces
- **Collection**: Norway (bus, metro, tram, train, ferry, car routes)
- **Format**: `timestamp(s) throughput(Mbps)`

### FCC Broadband Dataset

- **Source**: https://github.com/confiwent/Real-world-bandwidth-traces
- **Description**: FCC Measuring Broadband America traces
- **Format**: `timestamp(s) throughput(Mbps)`

### Synthetic Traces

For testing and debugging, synthetic traces with controlled patterns:
- Low/medium/high stable bandwidth
- Variable bandwidth (simulating mobile)
- Degrading bandwidth over time

## Metrics

| Category | Metric | Description |
|----------|--------|-------------|
| **Bitrate** | avg_bitrate_kbps | Mean selected bitrate |
| | min/max_bitrate_kbps | Bitrate range |
| | bitrate_std_dev | Bitrate stability |
| | bitrate_variance | Variance in bitrate selection |
| | bitrate_percentiles | 25th, 50th (median), 75th percentiles |
| **Switching** | bitrate_switches | Total quality level changes |
| | switch_up/down_count | Direction of switches |
| | avg_switch_magnitude | Average bitrate change per switch |
| **Rebuffering** | rebuffer_count | Number of stall events |
| | rebuffer_time_ms | Total stalling duration |
| | rebuffer_ratio | Fraction of time spent buffering |
| | rebuffer_frequency | Stalls per minute |
| | avg/max_rebuffer_duration | Individual stall durations |
| **Throughput** | avg_throughput_kbps | Mean network throughput |
| | throughput_std_dev | Network stability |
| **Buffer** | avg_buffer_level_ms | Mean buffer occupancy |
| | min_buffer_level_ms | Lowest buffer level |
| **Utilization** | bandwidth_utilization | avg_bitrate / avg_throughput |
| **Startup** | startup_delay_ms | Time to first frame |

## Output Format

### JSON Results

```json
{
  "timestamp": "2026-01-28T12:00:00",
  "summary": {
    "total_traces": 50,
    "total_datasets": 3,
    "avg_bitrate_kbps": 2500.5,
    "avg_rebuffer_ratio": 0.0123
  },
  "per_dataset": {
    "hsdpa_3g": {
      "trace_count": 20,
      "successful_runs": 20,
      "metrics": {
        "avg_bitrate": {
          "mean": 1850.5,
          "std": 450.2,
          "variance": 202680.04,
          "ci_95": [1650.3, 2050.7]
        }
      }
    }
  },
  "all_results": [...]
}
```

### CSV Results

```csv
dataset,trace_name,success,avg_bitrate_kbps,rebuffer_ratio,...
hsdpa_3g,bus.ljansbansen.1,True,1850.5,0.0125,...
fcc,trace_797466,True,3200.0,0.0050,...
```

## Statistical Analysis

The pipeline computes for each metric:

- **Mean**: Average value across all traces in a dataset
- **Standard Deviation**: Measure of spread
- **Variance**: Square of standard deviation
- **95% Confidence Interval**: Range where true mean likely falls

Confidence intervals are computed using the t-distribution for small samples:

$$CI = \bar{x} \pm t_{\alpha/2, n-1} \cdot \frac{s}{\sqrt{n}}$$

Where:
- $\bar{x}$ is the sample mean
- $t_{\alpha/2, n-1}$ is the t-value for 95% confidence
- $s$ is the sample standard deviation
- $n$ is the sample size

## Directory Structure

```
Benchmarking/
├── scripts/
│   ├── benchmark.py           # Live server benchmark
│   ├── run_pipeline.py        # Multi-trace pipeline
│   └── download_traces.py     # Trace downloader
├── traces/
│   ├── hsdpa_3g/              # Existing HSDPA traces
│   ├── fcc/                   # Existing FCC traces
│   ├── hsdpa_3g_downloaded/   # Downloaded HSDPA traces
│   ├── fcc_downloaded/        # Downloaded FCC traces
│   └── synthetic/             # Generated synthetic traces
├── results/
│   ├── pipeline_results_*.json
│   └── pipeline_results_*.csv
└── PIPELINE_README.md         # This file
```

## Advanced Usage

### Using Existing Traces

If you already have trace files, place them in the appropriate directory:

```bash
# HSDPA 3G traces (already present)
traces/hsdpa_3g/trace_*

# FCC traces (already present)
traces/fcc/trace_*.log
```

The pipeline automatically discovers traces in standard locations.

### Custom Trace Format

Trace files should have the format:
```
timestamp_seconds throughput_mbps
0.0   1.5
1.0   2.3
2.0   1.8
...
```

### Integration with Docker Environment

```bash
# Start the full environment
sudo docker compose up -d

# Run live benchmark through traffic shaper
python benchmark.py --shaped --duration 120

# Use trace files to control traffic shaping
# (Configure in docker-compose.yaml)
```

## Troubleshooting

### No Traces Found

```bash
# Create synthetic traces for testing
python download_traces.py --synthetic

# List available traces
python download_traces.py --list
```

### Download Failures

Some trace URLs may be unavailable. The pipeline:
1. Skips failed downloads
2. Reports success/failure counts
3. Uses existing traces in the traces/ directory

### Memory Issues with Large Trace Sets

```bash
# Limit traces per dataset
python run_pipeline.py --max-traces 10

# Run sequentially (no parallelism)
python run_pipeline.py --parallel 1
```

## Citation

If you use this pipeline with the HSDPA 3G dataset, please cite:

```bibtex
@inproceedings{riiser2013commute,
  title={A comparison of quality scheduling in commercial adaptive HTTP streaming solutions on a 3G network},
  author={Riiser, Haakon and Vigmostad, Paul and Griwodz, Carsten and Halvorsen, P{\aa}l},
  booktitle={Proceedings of the 4th Workshop on Mobile Video},
  pages={25--30},
  year={2013},
  organization={ACM}
}
```

## License

This benchmarking pipeline is provided for research and educational purposes.
