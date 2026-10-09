#!/usr/bin/env python3
"""Recompute trace_bandwidth / bandwidth_utilization for result files whose
recorded trace was wrong.

The HLS (Sep 21-23) and LL-DASH (Sep 27) batches recorded the *global*
shaper/trace/trace.csv instead of the per-run trace (HLS ~1055 kbps, LL-DASH
~29,300 kbps for every run). The real shaping was correct; only the bookkeeping
was stale. This rebuilds the series from the actual trace file (step function,
looping like tc-trace.py) on the same sample grid, and recomputes utilization
with the same formula as StreamingMetrics (avg bitrate / median trace bw).

Originals are never modified: corrected copies go to --out, with the old values
kept under "original_*" and a "recomputed" note. A flags CSV marks runs whose
log shows the /startShaping call failed (probably replayed a stale trace).
"""
import argparse, csv, glob, json, os, re, statistics as st
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = {
    "hls": "results/parallel_20260921_161812",
    "lldash-gpac": "results/parallel_20260927_111321",
}


def load_trace(path):
    rows = []
    with open(path) as f:
        for r in csv.DictReader(f):
            try:
                rows.append((float(r["since"]), float(r["bandwidth_kbps"])))
            except (KeyError, ValueError):
                continue
    rows.sort()
    return rows


def bw_at(rows, t):
    if not rows:
        return None
    period = rows[-1][0] + (rows[-1][0] - rows[-2][0] if len(rows) > 1 else 1.0)
    t = t % period if period > 0 else 0.0
    bw = rows[0][1]
    for ts, b in rows:
        if ts > t:
            break
        bw = b
    return bw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="results/recomputed_20261008")
    ap.add_argument("--trace-list", default="traces/six_bins_traces.txt")
    args = ap.parse_args()
    six = {Path(l.strip()).stem: l.strip() for l in open(ROOT / args.trace_list) if l.strip()}
    out_root = ROOT / args.out
    flags = []
    done = 0
    for proto, batch in SRC.items():
        for f in glob.glob(str(ROOT / batch / f"{proto}_*" / f"benchmark_{proto}_*.json")):
            stem = re.sub(r"_\d{8}_\d{6}\.json$", "", os.path.basename(f)[len(f"benchmark_{proto}_"):])
            if stem not in six:
                continue
            d = json.load(open(f))
            m = d["metrics"]
            n = len(d.get("trace_bandwidth", {}).get("samples", [])) or 90
            span = (m["timing"]["total_playback_time_ms"] or 45000) / 1000.0
            rows = load_trace(six[stem])
            samples = [bw_at(rows, i * span / n) for i in range(n)]
            old = d.get("trace_bandwidth", {})
            new_avg = st.mean(samples)
            median_tb = sorted(samples)[len(samples) // 2]
            util = m["bitrate"]["average_kbps"] / median_tb if median_tb > 0 else 0.0
            d["trace_bandwidth"] = {
                "samples": samples, "average_kbps": new_avg, "utilisation": round(util, 4),
                "original_average_kbps": old.get("average_kbps"),
                "original_utilisation": old.get("utilisation"),
            }
            m.setdefault("utilization", {})["original_bandwidth_utilization"] = m["utilization"].get("bandwidth_utilization")
            m["utilization"]["bandwidth_utilization"] = round(util, 4)
            d["recomputed"] = ("trace_bandwidth + bandwidth_utilization rebuilt from the run's own trace file "
                               "by scripts/recompute_trace_bandwidth.py; original values kept as original_*")
            dest = out_root / proto / os.path.basename(os.path.dirname(f))
            dest.mkdir(parents=True, exist_ok=True)
            json.dump(d, open(dest / os.path.basename(f), "w"))
            log = ROOT / batch / "logs" / f"{proto}_{stem}.log"
            timed_out = log.exists() and bool(re.search(r"could not reach /startShaping", log.read_text(errors="ignore")))
            flags.append((proto, stem, int(timed_out), round(old.get("average_kbps") or 0), round(new_avg), os.path.relpath(f, ROOT)))
            done += 1
    out_root.mkdir(parents=True, exist_ok=True)
    with open(out_root / "flags.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["protocol", "trace", "shaper_timeout", "recorded_trace_kbps", "recomputed_trace_kbps", "source_file"])
        w.writerows(flags)
    print(f"recomputed {done} results -> {out_root}")
    print(f"flagged shaper_timeout: {sum(x[2] for x in flags)}")


if __name__ == "__main__":
    main()
