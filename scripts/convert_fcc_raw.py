#!/usr/bin/env python3
"""
Convert FCC Measuring Broadband America 2016 raw data into tc-trace format.

Reads:
  - curr_httpgetmt*.csv  (multi-threaded download throughput at 5s intervals)
  - curr_dlping*.csv     (RTT during download)

Outputs *_tc.csv files with columns: since,relative_seconds,rtt,bandwidth_kbps

Usage:
  python convert_fcc_raw.py --input-dir traces/fcc/raw-2016/data-raw-2016-sept \
                            --output-dir traces/fcc/raw-2016/converted-sept \
                            --max-units 10
"""

import argparse
import csv
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path


def find_csv(directory: Path, prefix: str) -> Path:
    """Find a CSV file matching prefix in directory (may be in a subdirectory)."""
    # Check directly in directory
    for f in directory.rglob(f"{prefix}*.csv"):
        if f.stat().st_size > 0:
            return f
    return None


def load_httpgetmt(filepath: Path, max_units: int = None):
    """
    Load httpgetmt CSV and return per-unit throughput data.

    Returns: dict[unit_id] -> list of (dtime_str, sequence, fetch_time_us, bytes_sec_interval)
    """
    units = defaultdict(list)
    
    print(f"  Reading throughput data: {filepath.name} ({filepath.stat().st_size / 1e9:.1f} GB)")
    
    # Expected columns (some files lack a header row)
    EXPECTED_COLS = ["unit_id", "dtime", "target", "address", "fetch_time",
                     "bytes_total", "bytes_sec", "bytes_sec_interval",
                     "warmup_time", "warmup_bytes", "sequence", "threads",
                     "successes", "failures", "location_id"]
    
    with open(filepath, "r") as f:
        reader = csv.reader(f)
        first_row = next(reader)
        
        # Detect if first row is a header or data
        if first_row[0].strip().isdigit():
            # No header - use expected column order
            cols = {name: idx for idx, name in enumerate(EXPECTED_COLS)}
            data_rows = [first_row]  # first row is data
        else:
            cols = {name.strip(): idx for idx, name in enumerate(first_row)}
            data_rows = []
        
        uid_idx = cols["unit_id"]
        dtime_idx = cols["dtime"]
        seq_idx = cols["sequence"]
        fetch_idx = cols["fetch_time"]
        bps_int_idx = cols["bytes_sec_interval"]
        failures_idx = cols["failures"]
        
        import itertools
        for row in itertools.chain(data_rows, reader):
            try:
                if int(row[failures_idx]) > 0:
                    continue
                uid = int(row[uid_idx])
                units[uid].append((
                    row[dtime_idx].strip(),
                    int(row[seq_idx]),
                    int(row[fetch_idx]),
                    int(row[bps_int_idx]),
                ))
            except (ValueError, IndexError):
                continue
    
    # Sort by measurement count and select top units
    sorted_units = sorted(units.keys(), key=lambda u: len(units[u]), reverse=True)
    
    if max_units and len(sorted_units) > max_units:
        # Pick diverse units: top N by measurement count
        selected = sorted_units[:max_units]
    else:
        selected = sorted_units
    
    print(f"  Found {len(units)} units, selected {len(selected)}")
    return {u: units[u] for u in selected}


def load_dlping(filepath: Path, unit_ids: set):
    """
    Load dlping CSV for specified units.

    Returns: dict[unit_id] -> dict[dtime_str] -> avg_rtt_ms
    """
    rtt_data = defaultdict(dict)
    
    if filepath is None:
        return rtt_data
    
    print(f"  Reading RTT data: {filepath.name} ({filepath.stat().st_size / 1e9:.1f} GB)")
    
    EXPECTED_DLPING_COLS = ["unit_id", "dtime", "target", "rtt_avg", "rtt_min",
                            "rtt_max", "rtt_std", "successes", "failures", "location_id"]
    
    with open(filepath, "r") as f:
        reader = csv.reader(f)
        first_row = next(reader)
        
        # Detect if first row is a header or data
        if first_row[0].strip().isdigit():
            cols = {name: idx for idx, name in enumerate(EXPECTED_DLPING_COLS)}
            data_rows = [first_row]
        else:
            cols = {name.strip(): idx for idx, name in enumerate(first_row)}
            data_rows = []
        
        uid_idx = cols["unit_id"]
        dtime_idx = cols["dtime"]
        rtt_avg_idx = cols["rtt_avg"]
        
        import itertools
        for row in itertools.chain(data_rows, reader):
            try:
                uid = int(row[uid_idx])
                if uid not in unit_ids:
                    continue
                dtime = row[dtime_idx].strip()
                rtt_us = int(row[rtt_avg_idx])
                rtt_ms = rtt_us / 1000.0
                # Keep first RTT for each (unit, dtime) pair
                if dtime not in rtt_data[uid]:
                    rtt_data[uid][dtime] = rtt_ms
            except (ValueError, IndexError):
                continue
    
    return rtt_data


def build_trace(throughput_data, rtt_data, default_rtt_ms=20.0):
    """
    Build a trace from throughput and RTT data for one unit.

    Groups measurements by test session (same dtime), sorts chronologically,
    and creates a continuous time series using 5-second intervals.

    Returns: list of (relative_sec, rtt_ms, bandwidth_kbps) tuples
    """
    # Group by dtime (test session)
    sessions = defaultdict(list)
    for dtime, seq, fetch_us, bps_int in throughput_data:
        sessions[dtime].append((seq, fetch_us, bps_int))
    
    # Sort sessions chronologically
    sorted_sessions = sorted(sessions.items(), key=lambda x: x[0])
    
    trace = []
    elapsed = 0.0
    
    for dtime, measurements in sorted_sessions:
        # Sort by sequence number within session
        measurements.sort(key=lambda x: x[0])
        
        # Get RTT for this session
        rtt_ms = rtt_data.get(dtime, default_rtt_ms)
        
        for seq, fetch_us, bps_int in measurements:
            # Each interval is ~5 seconds
            bw_kbps = (bps_int * 8) / 1000.0  # bytes/sec -> kbps
            trace.append((round(elapsed, 3), round(rtt_ms, 2), round(bw_kbps, 0)))
            elapsed += 5.0  # 5-second intervals
    
    return trace


def write_trace(trace, output_path: Path):
    """Write trace to CSV file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["since", "relative_seconds", "rtt", "bandwidth_kbps"])
        for rel_sec, rtt_ms, bw_kbps in trace:
            writer.writerow([f"{rel_sec:.3f}", f"{rel_sec:.3f}", f"{rtt_ms:.2f}", int(bw_kbps)])


def main():
    parser = argparse.ArgumentParser(description="Convert FCC 2016 raw data to tc-trace format")
    parser.add_argument("--input-dir", required=True, help="Directory with extracted FCC raw CSV files")
    parser.add_argument("--output-dir", required=True, help="Output directory for trace files")
    parser.add_argument("--max-units", type=int, default=10,
                       help="Maximum number of units to convert (default: 10)")
    parser.add_argument("--min-sessions", type=int, default=50,
                       help="Minimum number of test sessions per unit (default: 50)")
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    
    if not input_dir.is_dir():
        print(f"[ERROR] Input directory not found: {input_dir}")
        sys.exit(1)
    
    # Find the CSV files (prefer IPv4 httpgetmt over httpgetmt6)
    httpgetmt_file = None
    dlping_file = None
    
    for f in sorted(input_dir.rglob("*.csv"), key=lambda x: len(x.name)):
        if f.stat().st_size == 0:
            continue
        name = f.name.lower()
        if "httpgetmt" in name and "mt6" not in name and httpgetmt_file is None:
            httpgetmt_file = f
        elif "dlping" in name and dlping_file is None:
            dlping_file = f
    
    if httpgetmt_file is None:
        print(f"[ERROR] No curr_httpgetmt CSV found in {input_dir}")
        sys.exit(1)
    
    print(f"Using throughput file: {httpgetmt_file}")
    print(f"Using RTT file: {dlping_file}")
    
    # Load throughput data
    unit_data = load_httpgetmt(httpgetmt_file, max_units=args.max_units)
    
    # Load RTT data for selected units
    rtt_data = load_dlping(dlping_file, set(unit_data.keys()))
    
    # Convert each unit to a trace file
    output_dir.mkdir(parents=True, exist_ok=True)
    month_tag = input_dir.name.replace("data-raw-2016-", "")  # e.g., "sept"
    
    created = 0
    for uid in sorted(unit_data.keys()):
        data = unit_data[uid]
        
        # Count unique sessions
        sessions = set(d[0] for d in data)
        if len(sessions) < args.min_sessions:
            print(f"  Skipping unit {uid}: only {len(sessions)} sessions (need {args.min_sessions})")
            continue
        
        trace = build_trace(data, rtt_data.get(uid, {}))
        
        if len(trace) < 10:
            print(f"  Skipping unit {uid}: only {len(trace)} data points")
            continue
        
        output_path = output_dir / f"fcc2016_{month_tag}_unit{uid}_tc.csv"
        write_trace(trace, output_path)
        
        avg_bw = sum(t[2] for t in trace) / len(trace)
        print(f"  Created: {output_path.name} ({len(trace)} points, {len(sessions)} sessions, avg {avg_bw:.0f} kbps)")
        created += 1
    
    print(f"\nDone: {created} trace files written to {output_dir}/")


if __name__ == "__main__":
    main()
