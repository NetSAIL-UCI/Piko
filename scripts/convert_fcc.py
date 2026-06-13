#!/usr/bin/env python3
"""
Convert FCC "Measuring Broadband America" (fixed) raw data into this repo's
trace format.

The FCC releases monthly raw data tarballs at
    https://data.fcc.gov/download/measuring-broadband-america/<YEAR>/data-raw-<YEAR>-<mon>.tar.gz
(the program ended Aug 1 2023, so the most recent month is 2023-jul).

Inside each tarball:
  * curr_httpgetmt.csv  -- multi-threaded HTTP GET download throughput.
        Relevant columns (by header name): unit_id, dtime, bytes_sec.
        bytes_sec is the measured download throughput in bytes/second.
  * curr_udplatency.csv -- UDP round-trip latency.
        Relevant columns (by header name): unit_id, rtt_avg (microseconds).

FCC probes run on a periodic (~hourly) schedule, so real timestamps are far too
coarse to drive a short streaming benchmark. Following the Pensieve/FCC
convention (which the existing traces/fcc/*_tc.csv files use), we treat each
unit's time-ordered sequence of throughput measurements as a synthetic
bandwidth time-series sampled at a fixed cadence (default 5 s). Per unit we
attach a constant RTT taken from that unit's median UDP latency.

Output format (matches traces/fcc/*_tc.csv), one file per unit:
    since,relative_seconds,rtt,bandwidth_kbps

Usage:
    # point at the two pre-extracted CSVs:
    python scripts/convert_fcc.py \
        --httpget /srv/disk00/ajhunjh1/fcc2023/curr_httpgetmt.csv \
        --udplatency /srv/disk00/ajhunjh1/fcc2023/curr_udplatency.csv \
        --out-dir traces/fcc_2023 --count 150
"""

import argparse
import csv
import sys
from pathlib import Path

# Allow very large CSV fields (FCC rows are small, but be safe).
csv.field_size_limit(1 << 24)


def _find_col(header, *names):
    """Return index of the first matching column name (case-insensitive)."""
    low = [h.strip().lower() for h in header]
    for n in names:
        if n in low:
            return low.index(n)
    return None


def load_unit_rtt(path: Path):
    """unit_id -> median RTT in ms, from curr_udplatency.csv (rtt_avg in us)."""
    if not path or not path.exists():
        return {}
    per_unit = {}
    with open(path, newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            return {}
        c_unit = _find_col(header, "unit_id", "unit")
        c_rtt = _find_col(header, "rtt_avg", "rtt", "rttavg")
        if c_unit is None or c_rtt is None:
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
            per_unit.setdefault(row[c_unit], []).append(rtt_us / 1000.0)
    out = {}
    for unit, vals in per_unit.items():
        vals.sort()
        out[unit] = vals[len(vals) // 2]
    return out


def collect_units(path: Path, min_samples: int, max_rows: int):
    """Group httpgetmt rows by unit_id -> ordered list of throughput samples."""
    raw = {}  # unit -> dict(dtime -> [bytes_sec ...])
    with open(path, newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            return []
        c_unit = _find_col(header, "unit_id", "unit")
        c_dtime = _find_col(header, "dtime", "time")
        c_bps = _find_col(header, "bytes_sec", "throughput")
        if c_unit is None or c_dtime is None or c_bps is None:
            raise SystemExit(f"[ERROR] could not locate columns in {path} "
                             f"(header={header})")
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
            raw.setdefault(row[c_unit], {}).setdefault(row[c_dtime], []).append(bps)

    out = []
    for unit, by_time in raw.items():
        if len(by_time) < min_samples:
            continue
        # One throughput value per measurement time (average duplicate targets),
        # ordered chronologically. dtime is ISO "YYYY-MM-DD HH:MM:SS" -> string
        # sort is chronological; fall back to numeric if it parses.
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


def pick_diverse(units, count: int):
    """Pick `count` units spread evenly across the median-bandwidth range."""
    if len(units) <= count:
        return units
    units.sort(key=lambda u: u["median_bw"])
    step = len(units) / count
    return [units[int(i * step)] for i in range(count)]


def write_trace(unit, rtt_ms: float, cadence: float, out_dir: Path, idx: int) -> Path:
    name = f"fcc2023_{idx:03d}_unit{unit['unit']}_tc.csv"
    path = out_dir / name
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["since", "relative_seconds", "rtt", "bandwidth_kbps"])
        for i, kbps in enumerate(unit["kbps"]):
            rel = i * cadence
            w.writerow([f"{rel:.3f}", f"{rel:.3f}", f"{rtt_ms:.2f}",
                        f"{max(1, round(kbps))}"])
    return path


def main():
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--httpget", type=Path, required=True,
                    help="Path to curr_httpgetmt.csv")
    ap.add_argument("--udplatency", type=Path,
                    help="Path to curr_udplatency.csv (for per-unit RTT)")
    ap.add_argument("--out-dir", type=Path,
                    default=Path(__file__).parent.parent / "traces" / "fcc_2023")
    ap.add_argument("--count", type=int, default=150,
                    help="Number of traces to produce (default 150).")
    ap.add_argument("--max-median-bw", type=float, default=None,
                    help="Only keep units whose median bandwidth (kbps) is <= "
                         "this, so traces actually exercise ABR adaptation "
                         "(e.g. 20000 for a streaming-relevant set).")
    ap.add_argument("--min-samples", type=int, default=40,
                    help="Minimum measurements per unit to qualify (default 40).")
    ap.add_argument("--max-rows", type=int, default=360,
                    help="Cap rows per trace (default 360 = 30 min at 5s).")
    ap.add_argument("--cadence", type=float, default=5.0,
                    help="Seconds between synthetic samples (default 5).")
    ap.add_argument("--default-rtt", type=float, default=40.0,
                    help="RTT (ms) used when a unit has no latency data.")
    args = ap.parse_args()

    if not args.httpget.exists():
        print(f"[ERROR] httpget CSV not found: {args.httpget}", file=sys.stderr)
        sys.exit(1)

    print(f"[PARSE] reading latency from {args.udplatency} ...")
    unit_rtt = load_unit_rtt(args.udplatency)
    print(f"[PARSE] RTT for {len(unit_rtt)} units")

    print(f"[PARSE] reading throughput from {args.httpget} ...")
    units = collect_units(args.httpget, args.min_samples, args.max_rows)
    print(f"[PARSE] {len(units)} qualifying units (>= {args.min_samples} measurements)")
    if args.max_median_bw is not None:
        units = [u for u in units if u["median_bw"] <= args.max_median_bw]
        print(f"[PARSE] {len(units)} units after median-bw cap "
              f"(<= {args.max_median_bw:.0f} kbps)")
    if not units:
        print("[ERROR] no qualifying units found", file=sys.stderr)
        sys.exit(1)

    chosen = pick_diverse(units, args.count)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    bws = []
    for i, u in enumerate(chosen):
        rtt = unit_rtt.get(u["unit"], args.default_rtt)
        rtt = max(1.0, min(rtt, 1000.0))
        write_trace(u, rtt, args.cadence, args.out_dir, i)
        bws.append(u["median_bw"])
    bws.sort()
    n = len(bws)
    print(f"[WRITE] wrote {n} traces to {args.out_dir}")
    print(f"[WRITE] median-bandwidth spread: min={bws[0]:.0f} "
          f"p10={bws[n//10]:.0f} p50={bws[n//2]:.0f} "
          f"p90={bws[(9*n)//10]:.0f} max={bws[-1]:.0f} kbps")


if __name__ == "__main__":
    main()
