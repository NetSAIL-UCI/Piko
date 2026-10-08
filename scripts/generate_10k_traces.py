#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate ~10,000 bandwidth traces for Piko ABR streaming benchmarks.

Sources:
  1. FCC Measuring Broadband America 2017–2021  (~6,500 traces)
  2. Stanford Puffer (multiple days 2019–2022)   (~2,000 traces)
  3. Starlink-on-the-Road (re-slice)             (~500 traces)
  4. High-bandwidth synthetic traces             (~800 traces)

Output: traces/<source>/ directories with *_tc.csv files

Usage:
    python scripts/generate_10k_traces.py              # all sources
    python scripts/generate_10k_traces.py --fcc-only   # just FCC
    python scripts/generate_10k_traces.py --puffer-only # just Puffer
    python scripts/generate_10k_traces.py --synth-only  # just synthetic
    python scripts/generate_10k_traces.py --starlink-only # just starlink re-slice
"""

import argparse
import csv
import io
import math
import os
import random
import shutil
import sys
import tarfile
import tempfile
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from itertools import chain
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACES = ROOT / "traces"
DOWNLOADS = TRACES / "_downloads"

csv.field_size_limit(1 << 24)

# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def fetch(url: str, dest: Path, label: str = None) -> bool:
    """Download a file using curl. Skip if already present and non-empty."""
    import subprocess
    label = label or dest.name
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  [skip] {label} already downloaded ({dest.stat().st_size >> 20} MB)")
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Remove empty/corrupt files from previous failed attempts
    dest.unlink(missing_ok=True)
    print(f"  Downloading {label} …", flush=True)
    try:
        result = subprocess.run(
            ["curl", "-fSL", "--progress-bar", "--connect-timeout", "30",
             "--max-time", "1800", "-o", str(dest), url],
            capture_output=False, timeout=1900
        )
        if result.returncode != 0:
            print(f"\n  [error] {label}: curl exit code {result.returncode}")
            dest.unlink(missing_ok=True)
            return False
        if not dest.exists() or dest.stat().st_size == 0:
            print(f"\n  [error] {label}: downloaded file is empty")
            dest.unlink(missing_ok=True)
            return False
        print(f"  [ok] {label} saved ({dest.stat().st_size >> 20} MB)")
        return True
    except Exception as e:
        print(f"\n  [error] {label}: {e}")
        dest.unlink(missing_ok=True)
        return False


def write_tc(path: Path, rows):
    """Write rows of (since, rtt, bw_kbps) to tc-trace CSV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["since", "relative_seconds", "rtt", "bandwidth_kbps"])
        for since, rtt, bw in rows:
            w.writerow([f"{since:.3f}", f"{since:.3f}", f"{rtt:.2f}", int(max(1, bw))])


def _find_col(header, *names):
    """Return index of the first matching column name (case-insensitive)."""
    low = [h.strip().lower() for h in header]
    for n in names:
        if n.lower() in low:
            return low.index(n.lower())
    return None


def count_existing(directory: Path) -> int:
    """Count existing *_tc.csv files in a directory."""
    if not directory.exists():
        return 0
    return len(list(directory.glob("*_tc.csv")))


# ═══════════════════════════════════════════════════════════════════════════════
# FCC Measuring Broadband America 2017–2021
# ═══════════════════════════════════════════════════════════════════════════════

# FCC data URL pattern — try multiple months per year
FCC_URL_TEMPLATE = "https://data.fcc.gov/download/measuring-broadband-america/{year}/data-raw-{year}-{month}.tar.gz"
FCC_MONTHS = ["sept", "jul", "jun", "mar", "jan"]  # preference order
FCC_MONTHS = ["jan", "jul", "sept", "jun", "mar"]  # jan works for all years

# Target traces per year
FCC_TARGETS = {
    2017: 1500,
    2018: 1500,
    2019: 1500,
    2020: 1000,
    2021: 1000,
    2022: 1000,
    2023: 1000,
}

# Known FCC tarball filenames for throughput data (varies across years)
THROUGHPUT_PREFIXES = ("curr_httpgetmt", "curr_httpget", "curr_webget")
LATENCY_PREFIXES = ("curr_udplatency", "curr_dlping")


def find_csv_in_tarball(tarball: Path, prefixes: tuple, skip_suffixes=("mt6",)):
    """Extract the largest matching CSV from a tarball as a string buffer."""
    best_member = None
    best_size = -1
    with tarfile.open(tarball, "r:gz") as tf:
        for member in tf.getmembers():
            name = Path(member.name).name.lower()
            if not name.endswith(".csv"):
                continue
            if any(s in name for s in skip_suffixes):
                continue
            if any(name.startswith(p) for p in prefixes):
                print(f"    Candidate: {member.name} ({member.size >> 20} MB)")
                if member.size > best_size:
                    best_member = member
                    best_size = member.size
        if best_member:
            print(f"    Selected: {best_member.name} ({best_member.size >> 20} MB)")
            buf = tf.extractfile(best_member)
            if buf:
                return buf.read().decode("utf-8", errors="replace")
    return None


def load_unit_rtt_from_buf(buf: str):
    """Parse latency CSV buffer -> {unit_id: median_rtt_ms}."""
    per_unit = {}
    reader = csv.reader(io.StringIO(buf))
    header = next(reader, None)
    if not header:
        return {}

    c_unit = _find_col(header, "unit_id", "unit")
    c_rtt = _find_col(header, "rtt_avg", "rtt", "rttavg")
    if c_unit is None or c_rtt is None:
        # Try positional fallback for headerless files
        return {}

    for row in reader:
        if len(row) <= max(c_unit, c_rtt):
            continue
        try:
            rtt_us = float(row[c_rtt])
        except ValueError:
            continue
        if rtt_us <= 0:
            continue
        per_unit.setdefault(row[c_unit].strip(), []).append(rtt_us / 1000.0)

    out = {}
    for unit, vals in per_unit.items():
        vals.sort()
        out[unit] = vals[len(vals) // 2]
    return out


def collect_units_from_buf(buf: str, min_samples: int, max_rows: int):
    """Parse throughput CSV buffer -> list of unit dicts."""
    raw = {}  # unit -> dict(dtime -> [bytes_sec ...])
    reader = csv.reader(io.StringIO(buf))
    header = next(reader, None)
    if not header:
        return []

    c_unit = _find_col(header, "unit_id", "unit")
    c_dtime = _find_col(header, "dtime", "time")
    # Try bytes_sec_interval first, fall back to bytes_sec
    c_bps = _find_col(header, "bytes_sec_interval", "bytes_sec", "throughput")

    if c_unit is None or c_dtime is None or c_bps is None:
        print(f"    [warn] Could not find required columns in header: {header[:10]}")
        return []

    need = max(c_unit, c_dtime, c_bps)
    for row in reader:
        if len(row) <= need:
            continue
        try:
            bps = float(row[c_bps])
        except ValueError:
            continue
        if bps <= 0:
            continue
        raw.setdefault(row[c_unit].strip(), {}).setdefault(
            row[c_dtime].strip(), []).append(bps)

    out = []
    for unit, by_time in raw.items():
        if len(by_time) < min_samples:
            continue
        def _key(t):
            try:
                return (0, float(t))
            except ValueError:
                return (1, t)
        times = sorted(by_time.keys(), key=_key)
        kbps_series = []
        for t in times:
            vals = by_time[t]
            mean_bps = sum(vals) / len(vals)
            kbps_series.append(mean_bps * 8.0 / 1000.0)
            if len(kbps_series) >= max_rows:
                break
        if len(kbps_series) < min_samples:
            continue
        med = sorted(kbps_series)[len(kbps_series) // 2]
        out.append({"unit": unit, "kbps": kbps_series, "median_bw": med})
    return out


def pick_diverse(items, count: int, key="median_bw"):
    """Pick `count` items spread evenly across the given key's range."""
    if len(items) <= count:
        return items
    items.sort(key=lambda u: u[key])
    step = len(items) / count
    return [items[int(i * step)] for i in range(count)]


def convert_fcc_year(year: int, tarball: Path, out_dir: Path, target_count: int):
    """Convert one FCC year's tarball into traces."""
    print(f"\n{'='*60}")
    print(f"  [FCC {year}] Converting → {out_dir}")
    print(f"{'='*60}")

    existing = count_existing(out_dir)
    if existing >= target_count:
        print(f"  [skip] Already have {existing} traces (target: {target_count})")
        return existing

    # Extract throughput CSV
    print(f"  Scanning tarball for throughput data …")
    tp_buf = find_csv_in_tarball(tarball, THROUGHPUT_PREFIXES)
    if not tp_buf:
        print(f"  [error] No throughput CSV found in {tarball.name}")
        return 0

    # Extract latency CSV
    print(f"  Scanning tarball for latency data …")
    lat_buf = find_csv_in_tarball(tarball, LATENCY_PREFIXES, skip_suffixes=())
    unit_rtt = load_unit_rtt_from_buf(lat_buf) if lat_buf else {}
    print(f"  RTT data for {len(unit_rtt)} units")

    # Parse throughput
    print(f"  Parsing throughput (this may take a few minutes) …")
    units = collect_units_from_buf(tp_buf, min_samples=40, max_rows=360)
    print(f"  Found {len(units)} qualifying units (>= 40 measurements)")

    if not units:
        print(f"  [error] No qualifying units found for {year}")
        return 0

    # Pick diverse subset
    chosen = pick_diverse(units, target_count)
    out_dir.mkdir(parents=True, exist_ok=True)

    created = 0
    for i, u in enumerate(chosen):
        rtt = unit_rtt.get(u["unit"], 40.0)
        rtt = max(1.0, min(rtt, 1000.0))
        name = f"fcc{year}_{i:04d}_unit{u['unit']}_tc.csv"
        path = out_dir / name
        with open(path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["since", "relative_seconds", "rtt", "bandwidth_kbps"])
            for j, kbps in enumerate(u["kbps"]):
                rel = j * 5.0
                w.writerow([f"{rel:.3f}", f"{rel:.3f}", f"{rtt:.2f}",
                            f"{max(1, round(kbps))}"])
        created += 1

    bws = sorted(u["median_bw"] for u in chosen)
    n = len(bws)
    print(f"  [ok] Wrote {created} traces to {out_dir}")
    if n > 0:
        print(f"  Bandwidth spread: min={bws[0]:.0f} p50={bws[n//2]:.0f} "
              f"max={bws[-1]:.0f} kbps")
    return created


def download_and_convert_fcc():
    """Download and convert FCC data for all target years."""
    print("\n" + "=" * 70)
    print("  FCC MEASURING BROADBAND AMERICA — 2017-2021")
    print("=" * 70)

    total = 0
    for year, target in FCC_TARGETS.items():
        out_dir = TRACES / f"fcc_{year}"

        # Check if already done
        existing = count_existing(out_dir)
        if existing >= target:
            print(f"\n  [FCC {year}] Already have {existing} traces — skipping")
            total += existing
            continue

        # Try to download tarball
        tarball = None
        for month in FCC_MONTHS:
            fname = f"data-raw-{year}-{month}.tar.gz"
            dest = DOWNLOADS / fname
            url = FCC_URL_TEMPLATE.format(year=year, month=month)

            if dest.exists():
                tarball = dest
                break

            if fetch(url, dest, f"FCC {year} {month}"):
                tarball = dest
                break

        if not tarball:
            print(f"  [error] Could not download any FCC data for {year}")
            continue

        n = convert_fcc_year(year, tarball, out_dir, target)
        total += n

    print(f"\n  [FCC TOTAL] {total} traces across all years")
    return total


# ═══════════════════════════════════════════════════════════════════════════════
# Stanford Puffer (multiple days)
# ═══════════════════════════════════════════════════════════════════════════════

GS_PREFIX = "https://storage.googleapis.com/puffer-data-release/"

PUFFER_DAYS = [
    # 2019 — 4 days
    "2019-02-01", "2019-05-01", "2019-08-01", "2019-11-01",
    # 2020 — 4 days
    "2020-02-01", "2020-05-01", "2020-08-01", "2020-11-01",
    # 2021 — 4 days
    "2021-02-01", "2021-05-01", "2021-08-01", "2021-11-01",
    # 2022 — 2 days
    "2022-02-01", "2022-07-01",
]

# Column indices in Puffer video_sent CSV
P_TIME, P_SESSION, P_INDEX = 0, 1, 2
P_CHANNEL = 4
P_RTT, P_DELIVERY = 12, 13


def puffer_day_to_range(day: str) -> str:
    """'2019-11-04' -> '2019-11-04T11_2019-11-05T11'."""
    d0 = datetime.strptime(day, "%Y-%m-%d")
    d1 = d0 + timedelta(days=1)
    return f"{d0:%Y-%m-%d}T11_{d1:%Y-%m-%d}T11"


def download_puffer_day(day: str) -> Path:
    """Download one day's Puffer video_sent CSV."""
    rng = puffer_day_to_range(day)
    url = f"{GS_PREFIX}{rng}/video_sent_{rng}.csv"
    dest = DOWNLOADS / f"puffer_video_sent_{day}.csv"
    if fetch(url, dest, f"Puffer {day}"):
        return dest
    return None


def collect_puffer_streams(input_path: Path, min_samples=50, max_rows=400,
                           max_duration_s=300.0):
    """Parse Puffer CSV -> list of stream dicts."""
    streams = {}
    with open(input_path, newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        for row in reader:
            if len(row) <= P_DELIVERY:
                continue
            try:
                t = int(row[P_TIME])
                rtt = float(row[P_RTT])
                dr = float(row[P_DELIVERY])
            except (ValueError, IndexError):
                continue
            key = (row[P_SESSION], row[P_INDEX], row[P_CHANNEL])
            streams.setdefault(key, []).append((t, rtt, dr))

    out = []
    for (session, index, channel), rows in streams.items():
        if len(rows) < min_samples:
            continue
        rows.sort(key=lambda x: x[0])
        t0 = rows[0][0]
        samples = []
        for t, rtt_us, dr in rows:
            rel = (t - t0) / 1e9
            if rel > max_duration_s:
                break
            bw_kbps = dr * 8.0 / 1000.0
            rtt_ms = rtt_us / 1000.0
            if bw_kbps <= 0:
                bw_kbps = 1.0
            if rtt_ms <= 0:
                rtt_ms = 1.0
            samples.append((rel, rtt_ms, bw_kbps))
            if len(samples) >= max_rows:
                break
        if len(samples) < min_samples:
            continue
        span = samples[-1][0] - samples[0][0]
        if span < 30.0:
            continue
        med_bw = sorted(s[2] for s in samples)[len(samples) // 2]
        out.append({
            "session": session, "index": index, "channel": channel,
            "samples": samples, "median_bw": med_bw, "span": span,
        })
    return out


def download_and_convert_puffer():
    """Download multiple Puffer days and convert to traces."""
    print("\n" + "=" * 70)
    print("  STANFORD PUFFER — Multiple Days (2019-2022)")
    print("=" * 70)

    # We'll put all puffer traces into one expanded directory
    out_dir = TRACES / "puffer"

    # Keep existing traces, but track what we already have
    existing = count_existing(out_dir)
    if existing >= 2000:
        print(f"  [skip] Already have {existing} puffer traces")
        return existing

    all_streams = []
    for day in PUFFER_DAYS:
        print(f"\n  --- Puffer day: {day} ---")
        csv_path = download_puffer_day(day)
        if not csv_path or not csv_path.exists():
            print(f"  [error] Failed to get data for {day}")
            continue

        streams = collect_puffer_streams(csv_path)
        print(f"  Found {len(streams)} qualifying streams for {day}")
        # Tag each stream with its day for naming
        for s in streams:
            s["day"] = day
        all_streams.extend(streams)

    print(f"\n  Total qualifying streams across all days: {len(all_streams)}")

    # Pick 2000 diverse streams
    chosen = pick_diverse(all_streams, 2000)

    # Clear existing and rewrite
    out_dir.mkdir(parents=True, exist_ok=True)
    # Remove old files first
    for old in out_dir.glob("*_tc.csv"):
        old.unlink()

    created = 0
    for i, s in enumerate(chosen):
        chan = "".join(c for c in s["channel"] if c.isalnum()) or "ch"
        name = f"puffer_{i:04d}_{chan}_tc.csv"
        path = out_dir / name
        with open(path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["since", "relative_seconds", "rtt", "bandwidth_kbps"])
            for rel, rtt_ms, bw_kbps in s["samples"]:
                w.writerow([f"{rel:.3f}", f"{rel:.3f}", f"{rtt_ms:.2f}",
                            f"{round(bw_kbps)}"])
        created += 1

    bws = sorted(s["median_bw"] for s in chosen)
    n = len(bws)
    print(f"\n  [ok] Wrote {created} Puffer traces to {out_dir}")
    if n > 0:
        print(f"  Bandwidth range: {bws[0]:.0f} – {bws[-1]:.0f} kbps "
              f"(median {bws[n//2]:.0f} kbps)")
    return created


# ═══════════════════════════════════════════════════════════════════════════════
# Starlink Re-Slice (more traces from existing data)
# ═══════════════════════════════════════════════════════════════════════════════

def reslice_starlink(max_traces=500):
    """Re-slice Starlink data with smaller burst groupings for more traces."""
    print("\n" + "=" * 70)
    print("  STARLINK RE-SLICE — Target ~500 traces")
    print("=" * 70)

    iperf_path = DOWNLOADS / "starlink_road_iperf.csv"
    ping_path = DOWNLOADS / "starlink_road_ping.csv"
    out_dir = TRACES / "starlink-2024"

    if not iperf_path.exists() or not ping_path.exists():
        print("  [error] Starlink data files not found in _downloads/")
        print("  Run setup_new_traces.py first to download them")
        return 0

    def parse_ts(s):
        s = s.strip()
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc).timestamp()
            except ValueError:
                continue
        return float(s)

    # Parse iperf
    print("  Parsing iperf data …")
    iperf_rows = []
    with open(iperf_path) as f:
        for row in csv.DictReader(f):
            try:
                ts = parse_ts(row["timestamp_start"])
                bw = float(row.get("download_mbps") or 0) * 1000
                if bw == 0:
                    bw = float(row.get("download") or 0) / 1000
                iperf_rows.append((ts, bw))
            except (ValueError, KeyError):
                continue
    iperf_rows.sort(key=lambda x: x[0])
    print(f"  {len(iperf_rows)} iperf samples")

    # Parse ping
    ping_map = {}
    with open(ping_path) as f:
        for row in csv.DictReader(f):
            try:
                ts = parse_ts(row["timestamp_start"])
                end = parse_ts(row["timestamp_end"])
                rtt = float(row["ping_avg"])
                t = ts
                while t <= end + 1:
                    ping_map[int(t)] = rtt
                    t += 1.0
            except (ValueError, KeyError):
                continue
    print(f"  {len(ping_map)} ping seconds covered")

    # Identify 15s bursts
    burst_gap_s = 30
    bursts = []
    burst = [iperf_rows[0]]
    for i in range(1, len(iperf_rows)):
        if iperf_rows[i][0] - iperf_rows[i-1][0] > burst_gap_s:
            bursts.append(burst)
            burst = []
        burst.append(iperf_rows[i])
    bursts.append(burst)
    print(f"  {len(bursts)} bursts found")

    # Strategy: use sliding window of 2 bursts with step 1 to maximize traces
    traces = []
    for window_size in [2, 3, 4]:
        for i in range(0, len(bursts) - window_size + 1):
            group = bursts[i:i + window_size]
            rows = []
            elapsed = 0.0
            for b in group:
                for ts, bw in b:
                    rtt = ping_map.get(int(ts), 40.0)
                    rows.append((elapsed, rtt, bw))
                    elapsed += 1.0
            if len([r for r in rows if r[2] > 100]) >= 20:
                traces.append(rows)

    # Deduplicate by taking evenly spaced samples
    step = max(1, len(traces) // max_traces)
    selected = traces[::step][:max_traces]
    print(f"  {len(traces)} candidate traces, keeping {len(selected)}")

    # Clear old and write new
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*_tc.csv"):
        old.unlink()

    for idx, rows in enumerate(selected):
        out = out_dir / f"starlink_road_{idx:04d}_tc.csv"
        write_tc(out, rows)

    print(f"  [ok] Wrote {len(selected)} Starlink traces to {out_dir}")
    return len(selected)


# ═══════════════════════════════════════════════════════════════════════════════
# High-Bandwidth Synthetic Traces
# ═══════════════════════════════════════════════════════════════════════════════

def generate_synthetic_traces(count=800, duration_s=300, interval_s=1.0):
    """Generate synthetic high-bandwidth traces mimicking various conditions."""
    print("\n" + "=" * 70)
    print(f"  SYNTHETIC HIGH-BANDWIDTH TRACES — {count} traces")
    print("=" * 70)

    out_dir = TRACES / "high_bandwidth"
    existing = count_existing(out_dir)
    if existing >= count:
        print(f"  [skip] Already have {existing} traces")
        return existing

    out_dir.mkdir(parents=True, exist_ok=True)
    # Clear old
    for old in out_dir.glob("*_tc.csv"):
        old.unlink()

    random.seed(42)  # reproducible
    n_steps = int(duration_s / interval_s)

    profiles = {
        "stable_high": 200,    # 200 traces: stable 50-200 Mbps
        "bursty_high": 150,    # 150 traces: bursty 10-400 Mbps
        "declining": 100,      # 100 traces: starts high, drops
        "increasing": 100,     # 100 traces: starts low, climbs
        "oscillating": 100,    # 100 traces: sinusoidal variation
        "starlink_sim": 100,   # 100 traces: Starlink-like pattern
        "lte_good": 50,        # 50 traces: good LTE (20-80 Mbps)
    }

    created = 0
    for profile_name, n_traces in profiles.items():
        for t_idx in range(n_traces):
            rows = []
            for step in range(n_steps):
                elapsed = step * interval_s
                bw_kbps, rtt = _generate_sample(profile_name, step, n_steps, t_idx)
                rows.append((elapsed, rtt, bw_kbps))

            name = f"synth_{profile_name}_{t_idx:04d}_tc.csv"
            write_tc(out_dir / name, rows)
            created += 1

    print(f"  [ok] Wrote {created} synthetic traces to {out_dir}")
    return created


def _generate_sample(profile: str, step: int, n_steps: int, trace_idx: int):
    """Generate one (bw_kbps, rtt_ms) sample for a given profile."""
    frac = step / n_steps  # 0.0 → 1.0 through the trace

    # Per-trace randomization
    r = random.Random(trace_idx * 1000 + step)
    noise = r.gauss(0, 1)

    if profile == "stable_high":
        base_mbps = 50 + trace_idx * 0.75  # 50-200 Mbps
        bw_mbps = base_mbps + noise * (base_mbps * 0.05)
        rtt = 15 + r.gauss(0, 3)

    elif profile == "bursty_high":
        base_mbps = 100 + trace_idx * 2
        # Random bursts and drops
        if r.random() < 0.15:  # 15% chance of drop
            bw_mbps = base_mbps * r.uniform(0.05, 0.3)
        else:
            bw_mbps = base_mbps + noise * (base_mbps * 0.2)
        rtt = 20 + r.gauss(0, 5)

    elif profile == "declining":
        start_mbps = 200 + trace_idx * 3
        end_mbps = 5 + trace_idx * 0.5
        bw_mbps = start_mbps + (end_mbps - start_mbps) * frac + noise * 10
        rtt = 20 + 60 * frac + r.gauss(0, 5)  # RTT increases as BW drops

    elif profile == "increasing":
        start_mbps = 5 + trace_idx * 0.5
        end_mbps = 100 + trace_idx * 3
        bw_mbps = start_mbps + (end_mbps - start_mbps) * frac + noise * 10
        rtt = 80 - 50 * frac + r.gauss(0, 5)  # RTT decreases as BW grows

    elif profile == "oscillating":
        center_mbps = 50 + trace_idx * 1.5
        amplitude = center_mbps * 0.6
        period = 30 + trace_idx * 0.5  # seconds per cycle
        phase = trace_idx * 0.7
        bw_mbps = center_mbps + amplitude * math.sin(
            2 * math.pi * (step / period) + phase) + noise * 5
        rtt = 25 + 10 * math.sin(2 * math.pi * (step / period) + phase + math.pi)

    elif profile == "starlink_sim":
        # Starlink-like: high BW with periodic drops (satellite handoffs)
        base_mbps = 80 + trace_idx * 2
        # Simulate handoff drops every ~15-45 seconds
        handoff_period = 15 + (trace_idx % 30)
        if step % handoff_period < 2:  # 2-second drop during handoff
            bw_mbps = r.uniform(1, 10)
            rtt = r.uniform(200, 800)
        else:
            bw_mbps = base_mbps + noise * (base_mbps * 0.15)
            rtt = 35 + r.gauss(0, 8)

    elif profile == "lte_good":
        base_mbps = 20 + trace_idx * 1.2
        # LTE-like: relatively stable with occasional fading
        fade = r.random()
        if fade < 0.05:  # 5% deep fade
            bw_mbps = base_mbps * r.uniform(0.1, 0.3)
        elif fade < 0.15:  # 10% moderate fade
            bw_mbps = base_mbps * r.uniform(0.5, 0.8)
        else:
            bw_mbps = base_mbps + noise * (base_mbps * 0.1)
        rtt = 30 + r.gauss(0, 5)

    else:
        bw_mbps = 50
        rtt = 20

    # Clamp
    bw_kbps = max(1, bw_mbps * 1000)
    rtt = max(1, min(rtt, 2000))
    return bw_kbps, rtt


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════

def print_summary():
    """Print final trace count summary."""
    print("\n" + "=" * 70)
    print("  FINAL TRACE INVENTORY")
    print("=" * 70)
    total = 0
    for d in sorted(TRACES.iterdir()):
        if d.is_dir() and d.name != "_downloads":
            n = count_existing(d)
            if n > 0:
                print(f"  {d.name:25s} {n:>6,} traces")
                total += n
    print(f"  {'TOTAL':25s} {total:>6,} traces")
    print("=" * 70)
    return total


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fcc-only", action="store_true", help="Only FCC traces")
    ap.add_argument("--puffer-only", action="store_true", help="Only Puffer traces")
    ap.add_argument("--starlink-only", action="store_true", help="Only Starlink re-slice")
    ap.add_argument("--synth-only", action="store_true", help="Only synthetic traces")
    args = ap.parse_args()

    run_all = not any([args.fcc_only, args.puffer_only, args.starlink_only, args.synth_only])

    DOWNLOADS.mkdir(parents=True, exist_ok=True)

    if run_all or args.fcc_only:
        download_and_convert_fcc()

    if run_all or args.puffer_only:
        download_and_convert_puffer()

    if run_all or args.starlink_only:
        reslice_starlink(max_traces=500)

    if run_all or args.synth_only:
        generate_synthetic_traces(count=800)

    total = print_summary()
    print(f"\n  Done! {total:,} total traces generated.")
    if total >= 10000:
        print("  ✓ Target of 10K traces REACHED!")
    else:
        print(f"  ✗ {10000 - total:,} more traces needed to reach 10K target")


if __name__ == "__main__":
    main()

