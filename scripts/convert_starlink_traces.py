#!/usr/bin/env python3
"""
Convert Starlink LEO satellite measurement data (iperf3 throughput + IRTT latency)
into the standard trace format used by the NetSail tc-trace shaper.

Input data:
  - iperf3 CSV files: throughput at ~100ms granularity
    Columns: timestamp_utc, rel_start_sec, rel_end_sec, seconds, bytes, bits_per_second, ...
  - IRTT CSV files: RTT latency at ~10ms granularity
    Columns: seqno, timestamp (nanoseconds), lost, rtt (nanoseconds)

Output format (extended trace.csv):
    since,relative_seconds,rtt,bandwidth_kbps
    0.000,0.000,21.76,29639
    0.010,0.010,23.06,29639
    ...

Synchronization strategy:
  - Both iperf3 and IRTT were collected simultaneously with matching wall-clock times
  - Each ~100ms iperf3 throughput window maps to ~10 IRTT latency samples
  - For each IRTT sample, we find the overlapping iperf3 window and use its throughput
  - Files are paired by matching timestamps in filenames (e.g., 2025-11-24-19-00-00)
  - All pairs are concatenated chronologically into one continuous trace

Usage:
  # Single concatenated trace (14 min from 7 pairs)
  python convert_starlink_traces.py --input-dir /path/to/2025-11-24-processed --output trace.csv

  # Individual trace files (one per pair, for use with --trace-dir)
  python convert_starlink_traces.py --input-dir /path/to/2025-11-24-processed --output-dir starlink-traces/
"""

import argparse
import csv
import re
import sys
from pathlib import Path
from bisect import bisect_right


def parse_irtt_file(filepath):
    """
    Parse an IRTT CSV file.

    Returns list of (relative_seconds, rtt_ms) tuples.
    Lost packets are skipped.
    """
    entries = []
    base_ts = None

    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lost = int(row["lost"])
            if lost:
                continue

            ts_ns = int(row["timestamp"])
            rtt_ns = int(row["rtt"])

            if base_ts is None:
                base_ts = ts_ns

            rel_sec = (ts_ns - base_ts) / 1e9
            rtt_ms = rtt_ns / 1e6
            entries.append((rel_sec, rtt_ms))

    return entries, base_ts


def parse_iperf3_file(filepath):
    """
    Parse an iperf3 CSV file.

    Returns list of (rel_start_sec, rel_end_sec, bandwidth_kbps) tuples.
    """
    entries = []

    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                start = float(row["rel_start_sec"])
                end = float(row["rel_end_sec"])
                bps = float(row["bits_per_second"])
            except (ValueError, TypeError):
                # Skip summary/invalid rows (e.g. JSON summary at end of file)
                continue
            bw_kbps = bps / 1000.0  # bits/s -> kbps
            entries.append((start, end, bw_kbps))

    return entries


def extract_timestamp(filename):
    """Extract the datetime part from a filename like irtt-10ms-2m-2025-11-24-19-00-00.csv"""
    match = re.search(r"(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})", filename)
    if match:
        return match.group(1)
    return None


def find_file_pairs(input_dir):
    """
    Find matching iperf3/IRTT file pairs by timestamp.

    Returns sorted list of (iperf3_path, irtt_path, timestamp_str) tuples.
    """
    input_dir = Path(input_dir)
    iperf3_files = {}
    irtt_files = {}

    for f in input_dir.iterdir():
        if not f.is_file() or f.suffix != ".csv":
            continue
        ts = extract_timestamp(f.name)
        if ts is None:
            continue

        if "iperf3" in f.name:
            iperf3_files[ts] = f
        elif "irtt" in f.name:
            irtt_files[ts] = f

    # Find matching pairs
    common_ts = sorted(set(iperf3_files.keys()) & set(irtt_files.keys()))
    if not common_ts:
        print(f"[ERROR] No matching iperf3/IRTT file pairs found in {input_dir}")
        sys.exit(1)

    pairs = [(iperf3_files[ts], irtt_files[ts], ts) for ts in common_ts]
    print(f"Found {len(pairs)} matched file pairs:")
    for iperf3_f, irtt_f, ts in pairs:
        print(f"  {ts}: {iperf3_f.name} + {irtt_f.name}")

    return pairs


def merge_pair(iperf3_path, irtt_path):
    """
    Merge one iperf3/IRTT pair into synchronized trace entries.

    For each IRTT latency sample, finds the overlapping iperf3 throughput window
    and assigns that bandwidth value.

    Returns list of (relative_seconds, rtt_ms, bandwidth_kbps) tuples.
    """
    irtt_entries, _ = parse_irtt_file(irtt_path)
    iperf3_entries = parse_iperf3_file(iperf3_path)

    if not irtt_entries or not iperf3_entries:
        print(f"  [WARN] Empty data: irtt={len(irtt_entries)}, iperf3={len(iperf3_entries)}")
        return []

    # Build sorted list of iperf3 interval start times for binary search
    iperf3_starts = [e[0] for e in iperf3_entries]
    iperf3_ends = [e[1] for e in iperf3_entries]
    max_iperf3_time = iperf3_ends[-1] if iperf3_ends else 0

    merged = []
    for rel_sec, rtt_ms in irtt_entries:
        # Find the iperf3 interval that contains this IRTT timestamp
        # bisect_right gives us the index after the last start <= rel_sec
        idx = bisect_right(iperf3_starts, rel_sec) - 1
        if idx < 0:
            idx = 0
        if idx >= len(iperf3_entries):
            idx = len(iperf3_entries) - 1

        # Use that interval's bandwidth
        bw_kbps = iperf3_entries[idx][2]
        merged.append((rel_sec, rtt_ms, bw_kbps))

    return merged


def write_trace_file(output_path, entries):
    """Write trace entries to a CSV file in the standard tc-trace format."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["since", "relative_seconds", "rtt", "bandwidth_kbps"])
        for t, rtt, bw in entries:
            writer.writerow([
                f"{t:.3f}",
                f"{t:.3f}",
                f"{rtt:.2f}",
                f"{bw:.0f}",
            ])


def print_stats(entries, label=""):
    """Print summary statistics for trace entries."""
    rtts = [e[1] for e in entries]
    bws = [e[2] for e in entries]
    duration = entries[-1][0]
    prefix = f"[{label}] " if label else ""
    print(f"{prefix}{len(entries)} samples, {duration:.1f}s ({duration/60:.1f} min)")
    print(f"{prefix}RTT:  min={min(rtts):.1f}ms, max={max(rtts):.1f}ms, "
          f"avg={sum(rtts)/len(rtts):.1f}ms")
    print(f"{prefix}BW:   min={min(bws)/1000:.1f} Mbps, max={max(bws)/1000:.1f} Mbps, "
          f"avg={sum(bws)/len(bws)/1000:.1f} Mbps")


def convert_per_pair(input_dir, output_dir):
    """
    Convert each iperf3/IRTT pair into a separate _tc.csv trace file.

    Output files are named starlink-<timestamp>_tc.csv and can be used
    directly with benchmark.py --trace-dir.
    """
    pairs = find_file_pairs(input_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for iperf3_path, irtt_path, ts in pairs:
        print(f"\nProcessing pair: {ts}")
        merged = merge_pair(iperf3_path, irtt_path)
        if not merged:
            continue

        out_name = f"starlink-{ts}_tc.csv"
        out_path = output_dir / out_name
        write_trace_file(out_path, merged)
        print_stats(merged, ts)
        print(f"  -> {out_path}")

    print(f"\nWrote {len(pairs)} trace files to {output_dir}/")
    print(f"Use with: python benchmark.py --trace-dir {output_dir}")


def convert_concatenated(input_dir, output_path, replay_count=1):
    """
    Convert all Starlink measurement files into a single concatenated trace file.

    Args:
        input_dir: Directory with iperf3 + IRTT CSV files
        output_path: Output trace CSV path
        replay_count: Number of times to replay the concatenated trace
    """
    pairs = find_file_pairs(input_dir)

    # Merge all pairs into one continuous timeline
    all_entries = []
    cumulative_offset = 0.0

    for iperf3_path, irtt_path, ts in pairs:
        print(f"\nProcessing pair: {ts}")
        merged = merge_pair(iperf3_path, irtt_path)
        if not merged:
            continue

        # Offset all timestamps to create continuous timeline
        for rel_sec, rtt_ms, bw_kbps in merged:
            all_entries.append((
                cumulative_offset + rel_sec,
                rtt_ms,
                bw_kbps,
            ))

        # Next pair starts after this one ends
        pair_duration = merged[-1][0]
        cumulative_offset += pair_duration
        print(f"  {len(merged)} samples, duration={pair_duration:.1f}s, "
              f"cumulative={cumulative_offset:.1f}s")

    if not all_entries:
        print("[ERROR] No data to write")
        sys.exit(1)

    total_duration = all_entries[-1][0]
    print(f"\nSingle pass: {len(all_entries)} samples, {total_duration:.1f}s")

    # Replay if requested
    if replay_count > 1:
        base_entries = list(all_entries)
        base_duration = total_duration
        for rep in range(1, replay_count):
            offset = base_duration * rep
            for t, rtt, bw in base_entries:
                all_entries.append((t + offset, rtt, bw))
        total_duration = all_entries[-1][0]
        print(f"After {replay_count}x replay: {len(all_entries)} samples, {total_duration:.1f}s")

    write_trace_file(output_path, all_entries)
    print(f"\nWrote to {output_path}")
    print_stats(all_entries)


def main():
    parser = argparse.ArgumentParser(
        description="Convert Starlink iperf3+IRTT measurements to tc-trace format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Individual trace files (one per pair, for --trace-dir)
  python convert_starlink_traces.py \\
      --input-dir /path/to/2025-11-24-processed \\
      --output-dir starlink-traces/
  python benchmark.py --trace-dir starlink-traces/

  # Single concatenated trace (14 min from 7 pairs)
  python convert_starlink_traces.py \\
      --input-dir /path/to/2025-11-24-processed \\
      --output starlink-combined_tc.csv

  # Concatenated with 3x replay (~42 min)
  python convert_starlink_traces.py \\
      --input-dir /path/to/2025-11-24-processed \\
      --output starlink-combined_tc.csv --replay 3
        """,
    )

    parser.add_argument("--input-dir", "-i", type=str, required=True,
                        help="Directory containing iperf3 and IRTT CSV files")
    parser.add_argument("--output", "-o", type=str, default=None,
                        help="Output single concatenated trace CSV file")
    parser.add_argument("--output-dir", "-d", type=str, default=None,
                        help="Output directory for per-pair trace files (for --trace-dir)")
    parser.add_argument("--replay", "-r", type=int, default=1,
                        help="Number of times to replay (only for --output mode, default: 1)")

    args = parser.parse_args()

    if not args.output and not args.output_dir:
        parser.error("Specify either --output (single file) or --output-dir (per-pair files)")
    if args.output and args.output_dir:
        parser.error("Use --output or --output-dir, not both")

    if args.output_dir:
        convert_per_pair(args.input_dir, args.output_dir)
    else:
        if args.replay < 1:
            print("[ERROR] --replay must be >= 1")
            sys.exit(1)
        convert_concatenated(args.input_dir, args.output, args.replay)


if __name__ == "__main__":
    main()
