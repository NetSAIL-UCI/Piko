#!/usr/bin/env python3
"""
Download and convert HSDPA TCP log traces from the UiO dataset.

Source: http://home.ifi.uio.no/paalh/dataset/hsdpa-tcp-logs/
(Retrieved via Wayback Machine)

Log format (per line):
  timestamp_epoch  elapsed_ms  latitude  longitude  bytes_downloaded  interval_ms

Outputs *_tc.csv files: since,relative_seconds,rtt,bandwidth_kbps
"""

import csv
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

BASE_URL = "https://skulddata.cs.umass.edu/traces/mmsys/2013/pathbandwidth"

# All route directories from the dataset page
ROUTES = [
    "bus.ljansbakken-oslo",
    "metro.kalbakken-jernbanetorget",
    "tram.ljabru-jernbanetorget",
    "tram.jernbanetorget-ljabru",
    "tram.jernbanetorget-universitetssykehuset",
    "ferry.nesoddtangen-oslo",
    "car.aarnes-elverum",
    "car.oslo-grimstad",
    "car.snaroya-smestad",
    "train.oslo-vestby",
    "train.vestby-oslo",
]

# Default RTT for HSDPA (typical 50-100ms, we use 70ms as a reasonable default)
DEFAULT_RTT_MS = 70.0


def fetch_file_list(route):
    """Get list of .log files for a route from UMass mirror."""
    url = f"{BASE_URL}/{route}/"
    print(f"  Fetching index: {route}/")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"    [WARN] Could not fetch index: {e}")
        return []

    # Extract .log file names from directory listing
    logs = re.findall(r'href="(report\.[^"]+\.log)"', html)
    return sorted(set(logs))


def download_log(route, filename, raw_dir):
    """Download a single log file via Wayback Machine."""
    out_path = raw_dir / route / filename
    if out_path.exists() and out_path.stat().st_size > 0:
        return out_path

    out_path.parent.mkdir(parents=True, exist_ok=True)
    url = f"{BASE_URL}/{route}/{filename}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        with open(out_path, "wb") as f:
            f.write(data)
        return out_path
    except Exception as e:
        print(f"    [WARN] Failed to download {filename}: {e}")
        return None


def parse_log(filepath):
    """
    Parse an HSDPA log file.

    Returns list of (relative_sec, bandwidth_kbps) tuples at 1-second granularity.
    """
    entries = []
    first_ts = None

    with open(filepath, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 6:
                continue
            try:
                ts = int(parts[0])
                bytes_dl = int(parts[4])
                interval_ms = int(parts[5])
            except (ValueError, IndexError):
                continue

            if first_ts is None:
                first_ts = ts

            rel_sec = ts - first_ts
            # bandwidth = bytes * 8 / interval_seconds -> kbps
            if interval_ms > 0:
                bw_kbps = (bytes_dl * 8) / (interval_ms / 1000.0) / 1000.0
            else:
                bw_kbps = 0

            entries.append((rel_sec, round(bw_kbps, 0)))

    return entries


def merge_route_logs(log_files, raw_dir, route):
    """
    Parse all logs for a route and create a concatenated trace.
    Logs are appended sequentially with continuous relative time.
    """
    all_entries = []
    elapsed = 0.0

    for logfile in sorted(log_files):
        filepath = raw_dir / route / logfile
        if not filepath.exists():
            continue

        entries = parse_log(filepath)
        if not entries:
            continue

        for rel_sec, bw_kbps in entries:
            all_entries.append((round(elapsed + rel_sec, 3), bw_kbps))

        if entries:
            # Advance elapsed by the duration of this log + small gap
            elapsed += entries[-1][0] + 5.0

    return all_entries


def write_tc_csv(entries, output_path, rtt_ms=DEFAULT_RTT_MS):
    """Write entries to tc-trace CSV format."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["since", "relative_seconds", "rtt", "bandwidth_kbps"])
        for rel_sec, bw_kbps in entries:
            writer.writerow([f"{rel_sec:.3f}", f"{rel_sec:.3f}", f"{rtt_ms:.2f}", int(bw_kbps)])


def main():
    base_dir = Path(__file__).resolve().parent.parent
    raw_dir = base_dir / "traces" / "hsdpa" / "raw"
    output_dir = base_dir / "traces" / "hsdpa"

    raw_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    total_created = 0

    for route in ROUTES:
        print(f"\n{'─' * 60}")
        print(f"  Route: {route}")
        print(f"{'─' * 60}")

        # 1. Get file list
        log_files = fetch_file_list(route)
        if not log_files:
            print(f"  No log files found, skipping")
            continue

        print(f"  Found {len(log_files)} log files")

        # 2. Download all logs
        downloaded = 0
        for i, logfile in enumerate(log_files):
            result = download_log(route, logfile, raw_dir)
            if result:
                downloaded += 1
            # Rate limit to be polite to Wayback Machine
            if i % 5 == 4:
                time.sleep(1)

        print(f"  Downloaded {downloaded}/{len(log_files)} files")

        # 3. Merge and convert
        entries = merge_route_logs(log_files, raw_dir, route)
        if len(entries) < 10:
            print(f"  Too few data points ({len(entries)}), skipping")
            continue

        # Create trace name from route
        trace_name = f"hsdpa_{route.replace('.', '_').replace('-', '_')}_tc.csv"
        output_path = output_dir / trace_name
        write_tc_csv(entries, output_path)

        avg_bw = sum(e[1] for e in entries) / len(entries)
        duration_s = entries[-1][0]
        print(f"  Created: {trace_name}")
        print(f"    Points: {len(entries)}, Duration: {duration_s:.0f}s ({duration_s/60:.1f} min), Avg BW: {avg_bw:.0f} kbps")
        total_created += 1

    print(f"\n{'=' * 60}")
    print(f"  Done: {total_created} trace files written to {output_dir}/")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()
