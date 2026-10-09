#!/usr/bin/env python3
"""Remove the startup wait from the rebuffering metrics of the HLS (Sep 21-23)
and LL-DASH (Sep 27) batches.

Those runs used players without the `hasStartedPlayback` guard (added Oct 6,
commit 40dd3d0), so the initial waiting->playing interval was recorded as
stall event #1. The JSON keeps only aggregates (count, total, avg, max), not
per-event durations, so the correction is an estimate:

  count == 1 : the only event is the startup wait  -> 0 stalls (exact if so)
  count >= 2 : drop one event of estimated length d1; bounds given.

d1 is calibrated from the runs themselves (single-event runs) and a live probe:
  HLS      : d1 = max(0, 0.53*startup_ms - 114)   (Theil-Sen fit, rho(stall,startup)=0.95, +-0.5 s)
  LL-DASH  : d1 = 70 ms                           (single-event runs: p10-p90 61-85 ms)

Works on the corrected copies in results/recomputed_20261008 (run
recompute_trace_bandwidth.py first). Originals are kept under
metrics.rebuffering_original.
"""
import glob, json, os, statistics as st, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BASE = os.path.join(ROOT, "results", "recomputed_20261008")
MODEL = {  # d1(startup_ms) , +- tolerance (ms)
    "hls": (lambda s: max(0.0, 0.53 * s - 114.0), 500.0),
    "lldash-gpac": (lambda s: 70.0, 20.0),
}


def fix(d, proto):
    m = d["metrics"]; r = m["rebuffering"]
    c, T, mx = r["count"], r["total_time_ms"], r["max_duration_ms"]
    S = m["timing"]["startup_delay_ms"]; P = m["timing"]["total_playback_time_ms"]
    f, tol = MODEL[proto]
    m["rebuffering_original"] = dict(r)
    if c == 0:
        method, nc, nt, lo, hi, nmax = "unchanged", 0, 0.0, 0.0, 0.0, 0
    elif c == 1:
        method, nc, nt, lo, hi, nmax = "single_event_is_startup", 0, 0.0, 0.0, 0.0, 0
    else:
        d1 = min(f(S), mx, T)
        nc, nt = c - 1, max(0.0, T - d1)
        hi = max(0.0, T - max(0.0, d1 - tol)); lo = max(0.0, T - min(d1 + tol, mx, T))
        method = "estimated_startup_event_removed"
        nmax = mx if mx - d1 > tol else None  # None: max may have been the startup event
    tt = P + nt
    r["count"] = nc; r["total_time_ms"] = round(nt, 2)
    r["ratio"] = round(nt / tt, 6) if tt > 0 else 0
    r["frequency_per_min"] = round(nc / (P / 60000.0), 3) if P > 0 else 0
    r["avg_duration_ms"] = round(nt / nc, 2) if nc else 0
    r["max_duration_ms"] = nmax
    ab = m["bitrate"]["average_kbps"]
    m["bitrate"]["effective_average_kbps"] = round(ab * (P / tt), 2) if tt > 0 else ab
    d["stall_correction"] = {"method": method, "total_time_ms_bounds": [round(lo, 1), round(hi, 1)],
                             "note": "startup wait removed from stall metrics; see scripts/recompute_stall_metrics.py"}
    return d


def main():
    n = 0; before = {}; after = {}
    for proto in MODEL:
        for f in glob.glob(os.path.join(BASE, proto, "*", "benchmark_*.json")):
            d = json.load(open(f))
            if "stall_correction" in d:  # idempotent
                continue
            b = d["metrics"]["rebuffering"]; before.setdefault(proto, []).append((b["count"], b["total_time_ms"]))
            d = fix(d, proto); a = d["metrics"]["rebuffering"]; after.setdefault(proto, []).append((a["count"], a["total_time_ms"]))
            json.dump(d, open(f, "w")); n += 1
    print(f"corrected {n} results")
    for p in before:
        b, a = before[p], after[p]
        print(f"{p:12} zero-stall runs {100*sum(x[0]==0 for x in b)/len(b):4.1f}% -> {100*sum(x[0]==0 for x in a)/len(a):4.1f}% | "
              f"mean stalls {st.mean(x[0] for x in b):.2f} -> {st.mean(x[0] for x in a):.2f} | mean stall time {st.mean(x[1] for x in b)/1000:.1f}s -> {st.mean(x[1] for x in a)/1000:.1f}s")


if __name__ == "__main__":
    main()
