#!/usr/bin/env python3
"""
Convert Puffer (https://puffer.stanford.edu/results/) video_sent measurement
data into this repo's trace format.

Puffer publishes one CSV per day per measurement under
    https://storage.googleapis.com/puffer-data-release/<DAY>/video_sent_<DAY>.csv
where <DAY> looks like "2019-11-04T11_2019-11-05T11" (UTC).

video_sent columns (in order):
    time (ns GMT), session_id, index, expt_id, channel, video_ts, format,
    size, ssim_index, cwnd, in_flight, min_rtt, rtt, delivery_rate

Each (session_id, index) pair is one "stream" (a continuous playback of a
single channel over one TCP connection). We turn each qualifying stream into a
bandwidth trace by reading, per sent chunk:
    - time         -> wall-clock timestamp (relative seconds from stream start)
    - rtt   (us)   -> rtt (ms)        = rtt / 1000
    - delivery_rate (B/s) -> bandwidth_kbps = delivery_rate * 8 / 1000
``delivery_rate`` is the kernel/TCP (BBR) estimate of the link delivery rate —
a direct, per-chunk bandwidth measurement.

Output format (matches traces/fcc/*_tc.csv), one file per stream:
    since,relative_seconds,rtt,bandwidth_kbps

Usage:
    # download today's data is large; you can pass a pre-downloaded CSV:
    python scripts/convert_puffer.py --input /tmp/puffer_vs.bin \
        --out-dir traces/puffer --count 150
    # or let the script download a day:
    python scripts/convert_puffer.py --day 2019-11-04 \
        --out-dir traces/puffer --count 150
"""

import argparse
import csv
import sys
import urllib.request
from pathlib import Path

GS_PREFIX = "https://storage.googleapis.com/puffer-data-release/"

# Column indices in video_sent CSV.
C_TIME, C_SESSION, C_INDEX = 0, 1, 2
C_CHANNEL = 4
C_RTT, C_DELIVERY = 12, 13


def day_to_range(day: str) -> str:
    """'2019-11-04' -> '2019-11-04T11_2019-11-05T11'."""
    from datetime import datetime, timedelta
    d0 = datetime.strptime(day, "%Y-%m-%d")
    d1 = d0 + timedelta(days=1)
    return f"{d0:%Y-%m-%d}T11_{d1:%Y-%m-%d}T11"


def download_day(day: str, dest: Path) -> Path:
    rng = day_to_range(day)
    url = f"{GS_PREFIX}{rng}/video_sent_{rng}.csv"
    print(f"[DOWNLOAD] {url}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as f:
        while True:
            buf = r.read(1 << 20)
            if not buf:
                break
            f.write(buf)
    print(f"[DOWNLOAD] saved {dest} ({dest.stat().st_size:,} bytes)")
    return dest


def collect_streams(input_path: Path, min_samples: int, max_rows: int,
                    max_duration_s: float):
    """Group rows by (session_id, index) -> list of (t_ns, rtt_us, dr_Bps)."""
    streams = {}
    with open(input_path, newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)  # skip header
        for row in reader:
            if len(row) <= C_DELIVERY:
                continue
            try:
                t = int(row[C_TIME])
                rtt = float(row[C_RTT])
                dr = float(row[C_DELIVERY])
            except (ValueError, IndexError):
                continue
            key = (row[C_SESSION], row[C_INDEX], row[C_CHANNEL])
            streams.setdefault(key, []).append((t, rtt, dr))

    out = []
    for (session, index, channel), rows in streams.items():
        if len(rows) < min_samples:
            continue
        rows.sort(key=lambda x: x[0])
        t0 = rows[0][0]
        samples = []  # (rel_s, rtt_ms, bw_kbps)
        for t, rtt_us, dr in rows:
            rel = (t - t0) / 1e9
            if rel > max_duration_s:
                break
            bw_kbps = dr * 8.0 / 1000.0
            rtt_ms = rtt_us / 1000.0
            # Clamp obviously-degenerate values.
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
        if span < 30.0:  # need at least 30s of real spread
            continue
        med_bw = sorted(s[2] for s in samples)[len(samples) // 2]
        out.append({
            "session": session, "index": index, "channel": channel,
            "samples": samples, "median_bw": med_bw, "span": span,
        })
    return out


def pick_diverse(streams, count: int):
    """Pick `count` streams spread evenly across the median-bandwidth range."""
    if len(streams) <= count:
        return streams
    streams.sort(key=lambda s: s["median_bw"])
    step = len(streams) / count
    return [streams[int(i * step)] for i in range(count)]


def write_trace(stream, out_dir: Path, idx: int) -> Path:
    chan = "".join(c for c in stream["channel"] if c.isalnum()) or "ch"
    name = f"puffer_{idx:03d}_{chan}_tc.csv"
    path = out_dir / name
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["since", "relative_seconds", "rtt", "bandwidth_kbps"])
        for rel, rtt_ms, bw_kbps in stream["samples"]:
            w.writerow([f"{rel:.3f}", f"{rel:.3f}", f"{rtt_ms:.2f}",
                        f"{round(bw_kbps)}"])
    return path


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", type=Path,
                    help="Pre-downloaded video_sent CSV (skips download).")
    ap.add_argument("--day", type=str,
                    help="UTC day to download, e.g. 2019-11-04.")
    ap.add_argument("--out-dir", type=Path,
                    default=Path(__file__).parent.parent / "traces" / "puffer")
    ap.add_argument("--count", type=int, default=150,
                    help="Number of traces to produce (default 150).")
    ap.add_argument("--max-median-bw", type=float, default=None,
                    help="Only keep streams whose median bandwidth (kbps) is "
                         "<= this, for a slow/streaming-relevant set that "
                         "actually exercises ABR adaptation (e.g. 6000).")
    ap.add_argument("--min-samples", type=int, default=50,
                    help="Minimum chunks per stream to qualify (default 50).")
    ap.add_argument("--max-rows", type=int, default=400,
                    help="Cap rows per trace (default 400).")
    ap.add_argument("--max-duration", type=float, default=300.0,
                    help="Cap trace duration in seconds (default 300).")
    args = ap.parse_args()

    if args.input:
        input_path = args.input
    elif args.day:
        input_path = Path("/tmp") / f"puffer_video_sent_{args.day}.csv"
        if not input_path.exists():
            download_day(args.day, input_path)
    else:
        ap.error("provide --input <csv> or --day <YYYY-MM-DD>")

    if not input_path.exists():
        print(f"[ERROR] input not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    print(f"[PARSE] reading {input_path} ...")
    streams = collect_streams(input_path, args.min_samples, args.max_rows,
                              args.max_duration)
    print(f"[PARSE] {len(streams)} qualifying streams "
          f"(>= {args.min_samples} samples, >= 30s span)")
    if args.max_median_bw is not None:
        streams = [s for s in streams if s["median_bw"] <= args.max_median_bw]
        print(f"[PARSE] {len(streams)} streams after median-bw cap "
              f"(<= {args.max_median_bw:.0f} kbps)")
    if not streams:
        print("[ERROR] no qualifying streams found", file=sys.stderr)
        sys.exit(1)

    chosen = pick_diverse(streams, args.count)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    bws = []
    for i, s in enumerate(chosen):
        write_trace(s, args.out_dir, i)
        bws.append(s["median_bw"])
    print(f"[WRITE] wrote {len(chosen)} traces to {args.out_dir}")
    print(f"[WRITE] median bandwidth range: {min(bws):.0f} - {max(bws):.0f} kbps "
          f"(overall median {sorted(bws)[len(bws)//2]:.0f} kbps)")


if __name__ == "__main__":
    main()
