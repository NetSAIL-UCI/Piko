#!/usr/bin/env python3
"""
End-to-End DASH Streaming Measurement Pipeline

Runs benchmarks across multiple network traces and computes statistical metrics
including confidence intervals and variance analysis.

Features:
- Multiple trace dataset support (HSDPA 3G, FCC)
- Statistical analysis with confidence intervals
- Per-dataset and aggregate metrics
- Parallel trace execution (optional)
- CSV and JSON output formats
"""

import argparse
import json
import os
import sys
import time
import math
import statistics
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess

# Attempt to import scipy for confidence intervals
try:
    from scipy import stats as scipy_stats
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

SCRIPT_DIR = Path(__file__).resolve().parent
TRACES_DIR = SCRIPT_DIR.parent / "traces"
RESULTS_DIR = SCRIPT_DIR.parent / "results"


@dataclass
class TraceResult:
    """Results from a single trace run."""
    trace_name: str
    dataset: str
    trace_path: str
    
    # Success/failure
    success: bool = True
    error_message: str = ""
    
    # Timing metrics
    startup_delay_ms: float = 0
    total_playback_time_ms: float = 0
    
    # Bitrate metrics
    avg_bitrate_kbps: float = 0
    min_bitrate_kbps: float = 0
    max_bitrate_kbps: float = 0
    bitrate_std_dev: float = 0
    
    # Quality switching
    bitrate_switches: int = 0
    switch_magnitude_total: int = 0
    avg_switch_magnitude: float = 0
    
    # Rebuffering
    rebuffer_count: int = 0
    rebuffer_time_ms: float = 0
    rebuffer_ratio: float = 0
    
    # Throughput
    avg_throughput_kbps: float = 0
    min_throughput_kbps: float = 0
    max_throughput_kbps: float = 0
    throughput_std_dev: float = 0
    
    # Buffer metrics
    avg_buffer_level_ms: float = 0
    min_buffer_level_ms: float = 0
    
    # Utilization metrics
    bandwidth_utilization: float = 0  # avg_bitrate / avg_throughput
    
    # Segment metrics
    total_segments: int = 0
    failed_segments: int = 0
    
    # Run metadata
    run_timestamp: str = ""
    run_duration_s: float = 0


@dataclass
class DatasetStatistics:
    """Statistical summary for a dataset."""
    dataset_name: str
    trace_count: int = 0
    successful_runs: int = 0
    failed_runs: int = 0
    
    # Metric means
    mean_avg_bitrate: float = 0
    mean_rebuffer_ratio: float = 0
    mean_bitrate_switches: float = 0
    mean_startup_delay: float = 0
    mean_avg_throughput: float = 0
    mean_bandwidth_util: float = 0
    
    # Metric standard deviations
    std_avg_bitrate: float = 0
    std_rebuffer_ratio: float = 0
    std_bitrate_switches: float = 0
    std_startup_delay: float = 0
    std_avg_throughput: float = 0
    std_bandwidth_util: float = 0
    
    # 95% Confidence Intervals (lower, upper)
    ci_avg_bitrate: Tuple[float, float] = (0, 0)
    ci_rebuffer_ratio: Tuple[float, float] = (0, 0)
    ci_bitrate_switches: Tuple[float, float] = (0, 0)
    ci_startup_delay: Tuple[float, float] = (0, 0)
    ci_avg_throughput: Tuple[float, float] = (0, 0)
    ci_bandwidth_util: Tuple[float, float] = (0, 0)
    
    # Variance
    var_avg_bitrate: float = 0
    var_rebuffer_ratio: float = 0
    var_bitrate_switches: float = 0


def compute_confidence_interval(data: List[float], confidence: float = 0.95) -> Tuple[float, float]:
    """Compute confidence interval for a list of values."""
    if len(data) < 2:
        mean = data[0] if data else 0
        return (mean, mean)
    
    n = len(data)
    mean = statistics.mean(data)
    std_err = statistics.stdev(data) / math.sqrt(n)
    
    if HAS_SCIPY:
        # Use t-distribution for small samples
        t_value = scipy_stats.t.ppf((1 + confidence) / 2, n - 1)
    else:
        # Approximate t-value for 95% CI
        # For n >= 30, t ≈ 1.96
        t_values = {
            2: 12.71, 3: 4.30, 4: 3.18, 5: 2.78, 6: 2.57,
            7: 2.45, 8: 2.36, 9: 2.31, 10: 2.26,
            15: 2.14, 20: 2.09, 25: 2.06, 30: 2.04
        }
        t_value = 1.96  # Default
        for threshold, val in sorted(t_values.items()):
            if n <= threshold:
                t_value = val
                break
    
    margin = t_value * std_err
    return (mean - margin, mean + margin)


def compute_dataset_statistics(results: List[TraceResult], dataset_name: str) -> DatasetStatistics:
    """Compute statistical summary for a dataset."""
    stats = DatasetStatistics(dataset_name=dataset_name)
    
    successful = [r for r in results if r.success]
    stats.trace_count = len(results)
    stats.successful_runs = len(successful)
    stats.failed_runs = len(results) - len(successful)
    
    if not successful:
        return stats
    
    # Extract metric lists
    bitrates = [r.avg_bitrate_kbps for r in successful]
    rebuffer_ratios = [r.rebuffer_ratio for r in successful]
    switches = [float(r.bitrate_switches) for r in successful]
    startup_delays = [r.startup_delay_ms for r in successful]
    throughputs = [r.avg_throughput_kbps for r in successful if r.avg_throughput_kbps > 0]
    utilizations = [r.bandwidth_utilization for r in successful if r.bandwidth_utilization > 0]
    
    # Compute means
    stats.mean_avg_bitrate = statistics.mean(bitrates) if bitrates else 0
    stats.mean_rebuffer_ratio = statistics.mean(rebuffer_ratios) if rebuffer_ratios else 0
    stats.mean_bitrate_switches = statistics.mean(switches) if switches else 0
    stats.mean_startup_delay = statistics.mean(startup_delays) if startup_delays else 0
    stats.mean_avg_throughput = statistics.mean(throughputs) if throughputs else 0
    stats.mean_bandwidth_util = statistics.mean(utilizations) if utilizations else 0
    
    # Compute standard deviations
    if len(bitrates) > 1:
        stats.std_avg_bitrate = statistics.stdev(bitrates)
        stats.var_avg_bitrate = statistics.variance(bitrates)
    if len(rebuffer_ratios) > 1:
        stats.std_rebuffer_ratio = statistics.stdev(rebuffer_ratios)
        stats.var_rebuffer_ratio = statistics.variance(rebuffer_ratios)
    if len(switches) > 1:
        stats.std_bitrate_switches = statistics.stdev(switches)
        stats.var_bitrate_switches = statistics.variance(switches)
    if len(startup_delays) > 1:
        stats.std_startup_delay = statistics.stdev(startup_delays)
    if len(throughputs) > 1:
        stats.std_avg_throughput = statistics.stdev(throughputs)
    if len(utilizations) > 1:
        stats.std_bandwidth_util = statistics.stdev(utilizations)
    
    # Compute 95% confidence intervals
    stats.ci_avg_bitrate = compute_confidence_interval(bitrates)
    stats.ci_rebuffer_ratio = compute_confidence_interval(rebuffer_ratios)
    stats.ci_bitrate_switches = compute_confidence_interval(switches)
    stats.ci_startup_delay = compute_confidence_interval(startup_delays)
    if throughputs:
        stats.ci_avg_throughput = compute_confidence_interval(throughputs)
    if utilizations:
        stats.ci_bandwidth_util = compute_confidence_interval(utilizations)
    
    return stats


class TraceReader:
    """Read and parse bandwidth traces."""
    
    def __init__(self, trace_path: Path):
        self.trace_path = trace_path
        self.timestamps: List[float] = []
        self.throughputs: List[float] = []  # Mbps
        self._load()
    
    def _load(self):
        """Load trace file."""
        content = self.trace_path.read_text()
        
        for line in content.strip().split('\n'):
            parts = line.strip().split()
            if len(parts) >= 2:
                try:
                    timestamp = float(parts[0])
                    throughput = float(parts[1])
                    self.timestamps.append(timestamp)
                    self.throughputs.append(throughput)
                except ValueError:
                    continue
    
    def get_throughput_at_time(self, time_s: float) -> float:
        """Get throughput at a specific time (interpolated)."""
        if not self.timestamps:
            return 1.0  # Default 1 Mbps
        
        # Handle time before first sample
        if time_s <= self.timestamps[0]:
            return self.throughputs[0]
        
        # Handle time after last sample (loop trace)
        trace_duration = self.timestamps[-1] - self.timestamps[0]
        if trace_duration > 0 and time_s > self.timestamps[-1]:
            time_s = self.timestamps[0] + (time_s % trace_duration)
        
        # Linear interpolation
        for i in range(len(self.timestamps) - 1):
            if self.timestamps[i] <= time_s <= self.timestamps[i + 1]:
                t1, t2 = self.timestamps[i], self.timestamps[i + 1]
                v1, v2 = self.throughputs[i], self.throughputs[i + 1]
                if t2 - t1 > 0:
                    ratio = (time_s - t1) / (t2 - t1)
                    return v1 + ratio * (v2 - v1)
                return v1
        
        return self.throughputs[-1]
    
    @property
    def duration(self) -> float:
        """Total trace duration in seconds."""
        if len(self.timestamps) < 2:
            return 0
        return self.timestamps[-1] - self.timestamps[0]
    
    @property
    def avg_throughput(self) -> float:
        """Average throughput in Mbps."""
        if not self.throughputs:
            return 0
        return statistics.mean(self.throughputs)


class SimulatedBenchmark:
    """Simulate DASH streaming benchmark using trace files."""
    
    def __init__(self, trace: TraceReader, 
                 video_duration_s: float = 300,  # 5 minutes
                 segment_duration_s: float = 4.0,
                 bitrate_levels: List[int] = None):
        self.trace = trace
        self.video_duration_s = video_duration_s
        self.segment_duration_s = segment_duration_s
        
        # Default bitrate levels (kbps) - matching typical DASH encoding ladder
        self.bitrate_levels = bitrate_levels or [300, 700, 1200, 2000, 3000, 4500]
        
        # Simulation state
        self.buffer_level_ms = 0
        self.buffer_target_ms = 30000
        self.current_time_s = 0
        self.playback_time_ms = 0
        
        # Throughput estimation
        self.throughput_history: List[float] = []
        self.safety_factor = 0.9
    
    def _select_bitrate(self) -> int:
        """Throughput-based ABR selection."""
        if len(self.throughput_history) < 2:
            return self.bitrate_levels[0]
        
        # Harmonic mean of recent throughput
        recent = self.throughput_history[-5:]
        harmonic_sum = sum(1/t for t in recent if t > 0)
        if harmonic_sum > 0:
            est_throughput = len(recent) / harmonic_sum
        else:
            est_throughput = 0
        
        safe_throughput = est_throughput * self.safety_factor
        
        # Buffer-based adjustment
        buffer_ratio = self.buffer_level_ms / self.buffer_target_ms
        if buffer_ratio < 0.5:
            safe_throughput *= 0.7
        elif buffer_ratio > 1.5:
            safe_throughput *= 1.1
        
        # Select highest fitting bitrate
        selected = self.bitrate_levels[0]
        for bitrate in self.bitrate_levels:
            if bitrate <= safe_throughput:
                selected = bitrate
        
        return selected
    
    def run(self) -> TraceResult:
        """Run the simulated benchmark."""
        result = TraceResult(
            trace_name=self.trace.trace_path.stem,
            dataset=self.trace.trace_path.parent.name,
            trace_path=str(self.trace.trace_path),
            run_timestamp=datetime.now().isoformat()
        )
        
        start_time = time.time()
        
        # Startup delay (first segment download)
        startup_throughput = self.trace.get_throughput_at_time(0) * 1000  # to kbps
        first_segment_size_kb = self.bitrate_levels[0] * self.segment_duration_s / 8
        startup_delay_s = first_segment_size_kb / max(1, startup_throughput)
        result.startup_delay_ms = startup_delay_s * 1000
        
        self.current_time_s = startup_delay_s
        self.buffer_level_ms = self.segment_duration_s * 1000
        
        # Track metrics
        bitrate_samples = []
        throughput_samples = []
        buffer_samples = []
        last_bitrate = None
        
        num_segments = int(self.video_duration_s / self.segment_duration_s)
        result.total_segments = num_segments
        
        for seg_num in range(num_segments):
            # Get current throughput
            throughput_kbps = self.trace.get_throughput_at_time(self.current_time_s) * 1000
            throughput_samples.append(throughput_kbps)
            self.throughput_history.append(throughput_kbps)
            
            # Select bitrate
            bitrate = self._select_bitrate()
            bitrate_samples.append(bitrate)
            
            # Track switches
            if last_bitrate is not None and last_bitrate != bitrate:
                result.bitrate_switches += 1
                result.switch_magnitude_total += abs(bitrate - last_bitrate)
            last_bitrate = bitrate
            
            # Calculate download time
            segment_size_kb = bitrate * self.segment_duration_s / 8
            download_time_s = segment_size_kb / max(1, throughput_kbps)
            download_time_ms = download_time_s * 1000
            
            # Simulate playback during download
            playback_during_download = download_time_ms
            
            if self.buffer_level_ms >= playback_during_download:
                # No rebuffer
                self.buffer_level_ms -= playback_during_download
            else:
                # Rebuffer
                stall_duration = playback_during_download - self.buffer_level_ms
                result.rebuffer_count += 1
                result.rebuffer_time_ms += stall_duration
                self.buffer_level_ms = 0
            
            # Add segment to buffer
            self.buffer_level_ms += self.segment_duration_s * 1000
            buffer_samples.append(self.buffer_level_ms)
            
            # Advance time
            self.current_time_s += download_time_s
            result.total_playback_time_ms += self.segment_duration_s * 1000
        
        # Compute final metrics
        if bitrate_samples:
            result.avg_bitrate_kbps = statistics.mean(bitrate_samples)
            result.min_bitrate_kbps = min(bitrate_samples)
            result.max_bitrate_kbps = max(bitrate_samples)
            if len(bitrate_samples) > 1:
                result.bitrate_std_dev = statistics.stdev(bitrate_samples)
        
        if throughput_samples:
            result.avg_throughput_kbps = statistics.mean(throughput_samples)
            result.min_throughput_kbps = min(throughput_samples)
            result.max_throughput_kbps = max(throughput_samples)
            if len(throughput_samples) > 1:
                result.throughput_std_dev = statistics.stdev(throughput_samples)
        
        if buffer_samples:
            result.avg_buffer_level_ms = statistics.mean(buffer_samples)
            result.min_buffer_level_ms = min(buffer_samples)
        
        # Rebuffer ratio
        total_time = result.total_playback_time_ms + result.rebuffer_time_ms
        if total_time > 0:
            result.rebuffer_ratio = result.rebuffer_time_ms / total_time
        
        # Bandwidth utilization
        if result.avg_throughput_kbps > 0:
            result.bandwidth_utilization = result.avg_bitrate_kbps / result.avg_throughput_kbps
        
        # Average switch magnitude
        if result.bitrate_switches > 0:
            result.avg_switch_magnitude = result.switch_magnitude_total / result.bitrate_switches
        
        result.run_duration_s = time.time() - start_time
        result.success = True
        
        return result


def discover_traces(traces_dir: Path, datasets: List[str] = None) -> Dict[str, List[Path]]:
    """Discover available trace files organized by dataset."""
    trace_map = {}
    
    if not traces_dir.exists():
        return trace_map
    
    for dataset_dir in traces_dir.iterdir():
        if not dataset_dir.is_dir() or dataset_dir.name.startswith('.'):
            continue
        
        # Skip 'converted' as it's a subdirectory
        if dataset_dir.name == 'converted':
            continue
        
        if datasets and dataset_dir.name not in datasets:
            continue
        
        traces = []
        
        # Check for converted subdirectory first
        converted_dir = dataset_dir / "converted"
        if converted_dir.exists():
            traces.extend(converted_dir.glob("*.txt"))
        
        # Also check for direct files in dataset directory
        # Include common trace extensions
        for ext in ['*.txt', '*.log', '*.csv']:
            traces.extend(dataset_dir.glob(ext))
        
        # Check for trace files (with names containing 'trace' or files without common extensions)
        for trace_file in dataset_dir.glob("*"):
            if trace_file.is_file() and not trace_file.name.startswith('.'):
                # Include if it looks like a trace file
                name_lower = trace_file.name.lower()
                suffix = trace_file.suffix.lower()
                if ('trace' in name_lower or 
                    suffix in ['', '.com', '.org', '.net'] or
                    suffix not in ['.py', '.sh', '.md', '.json', '.yaml', '.yml']):
                    traces.append(trace_file)
        
        # Deduplicate and sort
        traces = list(set(traces))
        
        if traces:
            trace_map[dataset_dir.name] = sorted(traces)
    
    return trace_map


def run_single_trace(trace_path: Path, video_duration: float, 
                     segment_duration: float) -> TraceResult:
    """Run benchmark on a single trace."""
    try:
        trace = TraceReader(trace_path)
        benchmark = SimulatedBenchmark(
            trace, 
            video_duration_s=video_duration,
            segment_duration_s=segment_duration
        )
        return benchmark.run()
    except Exception as e:
        return TraceResult(
            trace_name=trace_path.stem,
            dataset=trace_path.parent.name,
            trace_path=str(trace_path),
            success=False,
            error_message=str(e)
        )


def save_results_json(results: Dict[str, List[TraceResult]], 
                      stats: Dict[str, DatasetStatistics],
                      output_path: Path):
    """Save results to JSON file."""
    output = {
        "timestamp": datetime.now().isoformat(),
        "summary": {},
        "per_dataset": {},
        "all_results": []
    }
    
    # Summary statistics
    all_results = [r for traces in results.values() for r in traces if r.success]
    if all_results:
        output["summary"] = {
            "total_traces": len(all_results),
            "total_datasets": len(results),
            "avg_bitrate_kbps": statistics.mean([r.avg_bitrate_kbps for r in all_results]),
            "avg_rebuffer_ratio": statistics.mean([r.rebuffer_ratio for r in all_results]),
            "avg_switches": statistics.mean([r.bitrate_switches for r in all_results]),
        }
    
    # Per-dataset statistics
    for dataset_name, dataset_stats in stats.items():
        output["per_dataset"][dataset_name] = {
            "trace_count": dataset_stats.trace_count,
            "successful_runs": dataset_stats.successful_runs,
            "metrics": {
                "avg_bitrate": {
                    "mean": round(dataset_stats.mean_avg_bitrate, 2),
                    "std": round(dataset_stats.std_avg_bitrate, 2),
                    "variance": round(dataset_stats.var_avg_bitrate, 2),
                    "ci_95": [round(x, 2) for x in dataset_stats.ci_avg_bitrate]
                },
                "rebuffer_ratio": {
                    "mean": round(dataset_stats.mean_rebuffer_ratio, 6),
                    "std": round(dataset_stats.std_rebuffer_ratio, 6),
                    "variance": round(dataset_stats.var_rebuffer_ratio, 8),
                    "ci_95": [round(x, 6) for x in dataset_stats.ci_rebuffer_ratio]
                },
                "bitrate_switches": {
                    "mean": round(dataset_stats.mean_bitrate_switches, 2),
                    "std": round(dataset_stats.std_bitrate_switches, 2),
                    "variance": round(dataset_stats.var_bitrate_switches, 2),
                    "ci_95": [round(x, 2) for x in dataset_stats.ci_bitrate_switches]
                },
                "startup_delay_ms": {
                    "mean": round(dataset_stats.mean_startup_delay, 2),
                    "std": round(dataset_stats.std_startup_delay, 2),
                    "ci_95": [round(x, 2) for x in dataset_stats.ci_startup_delay]
                },
                "throughput_kbps": {
                    "mean": round(dataset_stats.mean_avg_throughput, 2),
                    "std": round(dataset_stats.std_avg_throughput, 2),
                    "ci_95": [round(x, 2) for x in dataset_stats.ci_avg_throughput]
                },
                "bandwidth_utilization": {
                    "mean": round(dataset_stats.mean_bandwidth_util, 4),
                    "std": round(dataset_stats.std_bandwidth_util, 4),
                    "ci_95": [round(x, 4) for x in dataset_stats.ci_bandwidth_util]
                }
            }
        }
    
    # Individual results
    for dataset_name, trace_results in results.items():
        for result in trace_results:
            output["all_results"].append(asdict(result))
    
    output_path.write_text(json.dumps(output, indent=2))


def save_results_csv(results: Dict[str, List[TraceResult]], output_path: Path):
    """Save results to CSV file."""
    lines = [
        "dataset,trace_name,success,avg_bitrate_kbps,rebuffer_ratio,rebuffer_count,"
        "bitrate_switches,startup_delay_ms,avg_throughput_kbps,bandwidth_utilization"
    ]
    
    for dataset_name, trace_results in results.items():
        for r in trace_results:
            lines.append(
                f"{r.dataset},{r.trace_name},{r.success},{r.avg_bitrate_kbps:.2f},"
                f"{r.rebuffer_ratio:.6f},{r.rebuffer_count},{r.bitrate_switches},"
                f"{r.startup_delay_ms:.2f},{r.avg_throughput_kbps:.2f},"
                f"{r.bandwidth_utilization:.4f}"
            )
    
    output_path.write_text('\n'.join(lines))


def print_statistics_table(stats: Dict[str, DatasetStatistics]):
    """Print formatted statistics table."""
    print("\n" + "=" * 100)
    print("  📊 DATASET STATISTICS (with 95% Confidence Intervals)")
    print("=" * 100)
    
    for dataset_name, s in stats.items():
        print(f"\n  📁 Dataset: {dataset_name}")
        print(f"     Traces: {s.successful_runs}/{s.trace_count} successful")
        print()
        
        # Table header
        print("     ┌" + "─" * 25 + "┬" + "─" * 15 + "┬" + "─" * 15 + "┬" + "─" * 25 + "┐")
        print(f"     │ {'Metric':<23} │ {'Mean':>13} │ {'Std Dev':>13} │ {'95% CI':>23} │")
        print("     ├" + "─" * 25 + "┼" + "─" * 15 + "┼" + "─" * 15 + "┼" + "─" * 25 + "┤")
        
        # Metrics
        metrics = [
            ("Avg Bitrate (kbps)", s.mean_avg_bitrate, s.std_avg_bitrate, s.ci_avg_bitrate, ".1f"),
            ("Rebuffer Ratio", s.mean_rebuffer_ratio * 100, s.std_rebuffer_ratio * 100, 
             (s.ci_rebuffer_ratio[0] * 100, s.ci_rebuffer_ratio[1] * 100), ".3f"),
            ("Bitrate Switches", s.mean_bitrate_switches, s.std_bitrate_switches, s.ci_bitrate_switches, ".1f"),
            ("Startup Delay (ms)", s.mean_startup_delay, s.std_startup_delay, s.ci_startup_delay, ".0f"),
            ("Throughput (kbps)", s.mean_avg_throughput, s.std_avg_throughput, s.ci_avg_throughput, ".1f"),
            ("Bandwidth Util", s.mean_bandwidth_util, s.std_bandwidth_util, s.ci_bandwidth_util, ".3f"),
        ]
        
        for name, mean, std, ci, fmt in metrics:
            ci_str = f"[{ci[0]:{fmt}}, {ci[1]:{fmt}}]"
            print(f"     │ {name:<23} │ {mean:>13{fmt}} │ {std:>13{fmt}} │ {ci_str:>23} │")
        
        print("     └" + "─" * 25 + "┴" + "─" * 15 + "┴" + "─" * 15 + "┴" + "─" * 25 + "┘")


def main():
    parser = argparse.ArgumentParser(
        description="End-to-End DASH Streaming Measurement Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_pipeline.py                           # Run on all available traces
  python run_pipeline.py --datasets hsdpa_3g fcc   # Run on specific datasets
  python run_pipeline.py --duration 300            # 5 minute video simulation
  python run_pipeline.py --parallel 4              # Run 4 traces in parallel
  python run_pipeline.py --output results.json     # Save to specific file

Datasets:
  hsdpa_3g    - HSDPA 3G mobile traces (Riiser et al., IMC 2013)
  fcc         - FCC Measuring Broadband America traces
        """
    )
    
    parser.add_argument("--traces-dir", type=Path, default=TRACES_DIR,
                       help=f"Traces directory (default: {TRACES_DIR})")
    parser.add_argument("--datasets", nargs="+", default=None,
                       help="Datasets to run (default: all)")
    parser.add_argument("--duration", type=float, default=300,
                       help="Video duration in seconds (default: 300)")
    parser.add_argument("--segment-duration", type=float, default=4.0,
                       help="Segment duration in seconds (default: 4.0)")
    parser.add_argument("--parallel", type=int, default=1,
                       help="Number of parallel trace runs (default: 1)")
    parser.add_argument("--output", "-o", type=Path, default=None,
                       help="Output JSON file")
    parser.add_argument("--output-csv", type=Path, default=None,
                       help="Output CSV file")
    parser.add_argument("--max-traces", type=int, default=None,
                       help="Maximum traces per dataset")
    parser.add_argument("--quiet", "-q", action="store_true",
                       help="Suppress progress output")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("  🚀 DASH Streaming Measurement Pipeline")
    print("=" * 70)
    print(f"  Video Duration: {args.duration}s")
    print(f"  Segment Duration: {args.segment_duration}s")
    print(f"  Traces Directory: {args.traces_dir}")
    print("=" * 70)
    
    # Discover traces
    trace_map = discover_traces(args.traces_dir, args.datasets)
    
    if not trace_map:
        print("\n❌ No traces found!")
        print("   Run: python download_traces.py --all")
        sys.exit(1)
    
    print(f"\n📁 Found {len(trace_map)} datasets:")
    for dataset, traces in trace_map.items():
        count = len(traces)
        if args.max_traces:
            count = min(count, args.max_traces)
        print(f"   • {dataset}: {count} traces")
    
    # Run benchmarks
    results: Dict[str, List[TraceResult]] = {}
    total_traces = 0
    
    for dataset_name, traces in trace_map.items():
        print(f"\n📊 Running dataset: {dataset_name}")
        
        if args.max_traces:
            traces = traces[:args.max_traces]
        
        dataset_results = []
        
        if args.parallel > 1:
            with ThreadPoolExecutor(max_workers=args.parallel) as executor:
                futures = {
                    executor.submit(
                        run_single_trace, trace, args.duration, args.segment_duration
                    ): trace for trace in traces
                }
                
                for i, future in enumerate(as_completed(futures)):
                    result = future.result()
                    dataset_results.append(result)
                    total_traces += 1
                    
                    if not args.quiet:
                        status = "✓" if result.success else "✗"
                        print(f"   [{i+1}/{len(traces)}] {status} {result.trace_name}")
        else:
            for i, trace in enumerate(traces):
                result = run_single_trace(trace, args.duration, args.segment_duration)
                dataset_results.append(result)
                total_traces += 1
                
                if not args.quiet:
                    status = "✓" if result.success else "✗"
                    print(f"   [{i+1}/{len(traces)}] {status} {result.trace_name} "
                          f"(bitrate: {result.avg_bitrate_kbps:.0f} kbps, "
                          f"rebuf: {result.rebuffer_ratio*100:.2f}%)")
        
        results[dataset_name] = dataset_results
    
    # Compute statistics
    stats: Dict[str, DatasetStatistics] = {}
    for dataset_name, dataset_results in results.items():
        stats[dataset_name] = compute_dataset_statistics(dataset_results, dataset_name)
    
    # Print results
    print_statistics_table(stats)
    
    # Save results
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if args.output:
        output_json = args.output
    else:
        output_json = RESULTS_DIR / f"pipeline_results_{timestamp}.json"
    
    save_results_json(results, stats, output_json)
    print(f"\n💾 Results saved to: {output_json}")
    
    if args.output_csv:
        save_results_csv(results, args.output_csv)
        print(f"💾 CSV saved to: {args.output_csv}")
    else:
        csv_path = RESULTS_DIR / f"pipeline_results_{timestamp}.csv"
        save_results_csv(results, csv_path)
        print(f"💾 CSV saved to: {csv_path}")
    
    print("\n" + "=" * 70)
    print(f"  ✅ Pipeline complete: {total_traces} traces processed")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
