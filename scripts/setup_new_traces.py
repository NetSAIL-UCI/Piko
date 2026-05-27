#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Download and convert new trace datasets (2021+) for ABR streaming benchmarks.

Datasets:
  FCC 2021     — FCC Measuring Broadband America, Sept 2021 (fixed broadband)
  Starlink     — WetLinks longitudinal Starlink dataset, Enschede NL (2023-2024)
  5G Ireland   — UCC/MISL 5G NR dataset (166 traces, Ireland 2019)

Output directories (relative to repo root):
  traces/fcc-2021/         10 units, 5-second interval residential broadband
  traces/starlink-2024/    2-minute segments from 6-month Starlink measurements
  traces/5g-ireland/       Individual session traces, 5G NR + 4G LTE mobility
"""

import csv
import io
import os
import re
import shutil
import sys
import tarfile
import urllib.request
import urllib.error
import zipfile
from collections import defaultdict
from itertools import chain
from pathlib import Path

ROOT = Path(__file__).parent.parent
TRACES = ROOT / "traces"
RESULTS = ROOT / "results"

FCC_2021_URL  = "https://data.fcc.gov/download/measuring-broadband-america/2021/data-raw-2021-sept.tar.gz"
STARLINK_ROAD_IPERF_URL = "https://raw.githubusercontent.com/sys-uos/Starlink-on-the-Road/main/data/iperf.csv"
STARLINK_ROAD_PING_URL  = "https://raw.githubusercontent.com/sys-uos/Starlink-on-the-Road/main/data/ping.csv"
UCC5G_URL = "https://raw.githubusercontent.com/uccmisl/5Gdataset/master/5G-production-dataset.zip"


# ── download helpers ─────────────────────────────────────────────────────────

def fetch(url: str, dest: Path, label: str = None) -> bool:
    label = label or dest.name
    if dest.exists():
        print(f"  [skip] {label} already downloaded")
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  Downloading {label} …", flush=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=600) as r, open(dest, "wb") as f:
            total = int(r.headers.get("Content-Length", 0))
            done = 0
            chunk = 1 << 20  # 1 MB
            while True:
                buf = r.read(chunk)
                if not buf:
                    break
                f.write(buf)
                done += len(buf)
                if total:
                    pct = done * 100 // total
                    print(f"\r  {label}: {done>>20} / {total>>20} MB  ({pct}%)", end="", flush=True)
        print()
        print(f"  [ok] {label} saved ({done>>20} MB)")
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
            w.writerow([f"{since:.3f}", f"{since:.3f}", f"{rtt:.2f}", int(bw)])


# ── FCC 2021 ─────────────────────────────────────────────────────────────────

def convert_fcc_2021(tarball: Path, out_dir: Path, max_units: int = 12):
    print("\n[FCC 2021] Converting …")
    out_dir.mkdir(parents=True, exist_ok=True)

    existing = list(out_dir.glob("*.csv"))
    if len(existing) >= max_units:
        print(f"  [skip] {len(existing)} traces already in {out_dir}")
        return len(existing)

    # FCC 2021 uses curr_webget (not curr_httpgetmt) and curr_dlping.
    # Column names: unit_id, dtime, target, address, fetch_time,
    #               bytes_total, bytes_sec, bytes_sec_interval (or bytes_sec for some months),
    #               warmup_time, warmup_bytes, sequence, threads, successes, failures, ...

    WEBGET_PREFIXES = ("curr_webget_", "curr_httpgetmt_")
    PING_PREFIXES   = ("curr_dlping_",)

    webget_buf = None
    ping_buf   = None

    print(f"  Scanning tarball {tarball.name} …", flush=True)
    with tarfile.open(tarball, "r:gz") as tf:
        for member in tf.getmembers():
            n = Path(member.name).name.lower()
            if webget_buf is None and any(n.startswith(p) for p in WEBGET_PREFIXES) and n.endswith(".csv") and "mt6" not in n:
                webget_buf = tf.extractfile(member).read().decode("utf-8", errors="replace")
                print(f"  Throughput file: {member.name} ({len(webget_buf)>>20} MB)")
            elif ping_buf is None and any(n.startswith(p) for p in PING_PREFIXES) and n.endswith(".csv"):
                ping_buf = tf.extractfile(member).read().decode("utf-8", errors="replace")
                print(f"  Ping file: {member.name} ({len(ping_buf)>>20} MB)")
            if webget_buf and ping_buf:
                break

    if not webget_buf:
        print("  [error] no webget/httpgetmt CSV found in tarball")
        return 0

    # Parse throughput
    print("  Parsing throughput …", flush=True)
    units = defaultdict(list)
    reader = csv.reader(io.StringIO(webget_buf))
    first = next(reader)

    EXPECTED = ["unit_id","dtime","target","address","fetch_time",
                "bytes_total","bytes_sec","bytes_sec_interval",
                "warmup_time","warmup_bytes","sequence","threads",
                "successes","failures","location_id"]

    if first[0].strip().isdigit():
        cols = {n: i for i, n in enumerate(EXPECTED)}
        rows_iter = chain([first], reader)
    else:
        cols = {c.strip(): i for i, c in enumerate(first)}
        rows_iter = reader

    uid_i   = cols.get("unit_id", 0)
    dtime_i = cols.get("dtime", 1)
    seq_i   = cols.get("sequence", 10)
    # prefer bytes_sec_interval, fall back to bytes_sec
    bps_i   = cols.get("bytes_sec_interval") or cols.get("bytes_sec", 6)
    fail_i  = cols.get("failures", 13)

    for row in rows_iter:
        try:
            if len(row) <= max(uid_i, dtime_i, seq_i, bps_i, fail_i):
                continue
            if int(row[fail_i]) > 0:
                continue
            uid = int(row[uid_i])
            units[uid].append((row[dtime_i].strip(), int(row[seq_i]), int(row[bps_i])))
        except (ValueError, IndexError):
            continue

    sorted_units = sorted(units, key=lambda u: len(units[u]), reverse=True)[:max_units]
    print(f"  Found {len(units)} units, using top {len(sorted_units)}")

    # Parse ping
    rtts = defaultdict(dict)  # uid → dtime → rtt_ms
    if ping_buf:
        print("  Parsing ping …", flush=True)
        pr = csv.reader(io.StringIO(ping_buf))
        ph = next(pr)
        PING_EXPECTED = ["unit_id","dtime","target","rtt_avg","rtt_min",
                         "rtt_max","rtt_std","successes","failures","location_id"]
        if ph[0].strip().isdigit():
            pc = {n: i for i, n in enumerate(PING_EXPECTED)}
            pr = chain([ph], pr)
        else:
            pc = {c.strip(): i for i, c in enumerate(ph)}

        uid_pi   = pc.get("unit_id", 0)
        dtime_pi = pc.get("dtime", 1)
        rtt_pi   = pc.get("rtt_avg", 3)
        wanted   = set(sorted_units)
        for row in pr:
            try:
                uid = int(row[uid_pi])
                if uid not in wanted:
                    continue
                dt  = row[dtime_pi].strip()
                rtt = int(row[rtt_pi]) / 1000.0  # µs → ms
                if dt not in rtts[uid]:
                    rtts[uid][dt] = rtt
            except (ValueError, IndexError):
                continue

    # Build and write traces
    created = 0
    for uid in sorted_units:
        sessions = defaultdict(list)
        for dtime, seq, bps in units[uid]:
            sessions[dtime].append((seq, bps))

        trace = []
        elapsed = 0.0
        for dtime in sorted(sessions):
            rtt = rtts[uid].get(dtime, 20.0)
            for seq, bps in sorted(sessions[dtime]):
                trace.append((elapsed, rtt, bps * 8 / 1000))  # bytes/s → kbps
                elapsed += 5.0

        if len(trace) < 10:
            continue

        out = out_dir / f"fcc2021_sept_unit{uid}_tc.csv"
        write_tc(out, trace)
        avg_bw = sum(r[2] for r in trace) / len(trace)
        print(f"  {out.name}: {len(trace)} points, avg {avg_bw:.0f} kbps")
        created += 1

    print(f"  Created {created} FCC 2021 traces in {out_dir}")
    return created


# ── Starlink-on-the-Road ──────────────────────────────────────────────────────

def convert_starlink_road(iperf_path: Path, ping_path: Path, out_dir: Path,
                          burst_gap_s: int = 30, bursts_per_trace: int = 8,
                          max_traces: int = 40):
    print("\n[Starlink-on-the-Road] Converting …")
    out_dir.mkdir(parents=True, exist_ok=True)

    existing = list(out_dir.glob("*.csv"))
    if existing:
        print(f"  [skip] {len(existing)} traces already in {out_dir}")
        return len(existing)

    from datetime import datetime, timezone

    def parse_ts(s):
        s = s.strip()
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc).timestamp()
            except ValueError:
                continue
        return float(s)

    # Parse iperf — 15-second bursts at 1-second resolution
    # Columns: timestamp_start, ..., download (bits/sec), ..., download_mbps
    print("  Parsing iperf …")
    iperf_rows = []
    with open(iperf_path) as f:
        for row in csv.DictReader(f):
            try:
                ts  = parse_ts(row["timestamp_start"])
                bw  = float(row.get("download_mbps") or 0) * 1000  # Mbps → kbps
                if bw == 0:
                    bw = float(row.get("download") or 0) / 1000     # bits/s → kbps
                iperf_rows.append((ts, bw))
            except (ValueError, KeyError):
                continue
    iperf_rows.sort(key=lambda x: x[0])
    print(f"  {len(iperf_rows)} iperf samples")

    # Build ping lookup: ts → rtt_ms
    ping_map = {}
    with open(ping_path) as f:
        for row in csv.DictReader(f):
            try:
                ts  = parse_ts(row["timestamp_start"])
                end = parse_ts(row["timestamp_end"])
                rtt = float(row["ping_avg"])
                t = ts
                while t <= end + 1:
                    ping_map[int(t)] = rtt
                    t += 1.0
            except (ValueError, KeyError):
                continue
    print(f"  {len(ping_map)} ping seconds covered")

    # Identify 15-second bursts (gap > burst_gap_s = new burst)
    bursts = []
    burst = [iperf_rows[0]]
    for i in range(1, len(iperf_rows)):
        if iperf_rows[i][0] - iperf_rows[i-1][0] > burst_gap_s:
            bursts.append(burst)
            burst = []
        burst.append(iperf_rows[i])
    bursts.append(burst)
    print(f"  {len(bursts)} 15s bursts found")

    # Group bursts_per_trace consecutive bursts into one trace
    traces = []
    for i in range(0, len(bursts) - bursts_per_trace + 1, bursts_per_trace):
        group = bursts[i:i + bursts_per_trace]
        rows = []
        elapsed = 0.0
        for b in group:
            for ts, bw in b:
                rtt = ping_map.get(int(ts), 40.0)
                rows.append((elapsed, rtt, bw))
                elapsed += 1.0
        if len([r for r in rows if r[2] > 100]) >= 60:  # need >=60s of valid data
            traces.append(rows)

    # Subsample to max_traces spread evenly
    step = max(1, len(traces) // max_traces)
    selected = traces[::step][:max_traces]
    print(f"  {len(traces)} candidate traces, keeping {len(selected)}")

    created = 0
    for idx, rows in enumerate(selected):
        out = out_dir / f"starlink_road_{idx:03d}_tc.csv"
        write_tc(out, rows)
        created += 1

    print(f"  Created {created} Starlink traces in {out_dir}")
    return created


# ── UCC 5G Ireland ───────────────────────────────────────────────────────────

def convert_ucc5g(zip_path: Path, out_dir: Path):
    print("\n[5G Ireland] Converting …")
    out_dir.mkdir(parents=True, exist_ok=True)

    existing = list(out_dir.glob("*.csv"))
    if len(existing) >= 20:
        print(f"  [skip] {len(existing)} traces already in {out_dir}")
        return len(existing)

    # Each inner CSV: Timestamp(ms), DL_bitrate(kbps), UL_bitrate(kbps),
    #                 PINGAVG(ms), PINGMIN, PINGMAX, NetworkMode, ...
    from datetime import datetime, timezone

    def parse_ucc_ts(s):
        s = s.strip()
        try:
            v = float(s)
            return v / 1000.0 if v > 1e12 else v
        except ValueError:
            pass
        for fmt in ("%Y.%m.%d_%H.%M.%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc).timestamp()
            except ValueError:
                continue
        return None

    created = 0
    with zipfile.ZipFile(zip_path) as zf:
        # skip __MACOSX metadata entries
        names = [n for n in zf.namelist() if n.endswith(".csv") and not n.startswith("__MACOSX")]
        for zname in sorted(names):
            parts = zname.replace("\\", "/").split("/")
            category = "_".join(p for p in parts[:-1] if p and "5G" not in p and "dataset" not in p and "production" not in p).lower()
            base = Path(parts[-1]).stem
            label = f"{category}_{base}" if category else base
            label = re.sub(r"[^a-zA-Z0-9_\-]", "_", label)

            rows = []
            with zf.open(zname) as f:
                try:
                    raw = f.read().replace(b'\x00', b'').decode("utf-8", errors="replace")
                    content = raw
                except Exception:
                    continue
                reader = csv.DictReader(io.StringIO(content))
                for row in reader:
                    try:
                        ts_raw = row.get("Timestamp", "").strip()
                        ts = parse_ucc_ts(ts_raw)
                        if ts is None:
                            continue

                        bw = float(row.get("DL_bitrate", 0) or 0)
                        rtt_raw = (row.get("PINGAVG") or row.get("PingAvg") or "").strip()
                        try:
                            rtt = float(rtt_raw) if rtt_raw else 40.0
                        except ValueError:
                            rtt = 40.0
                        rows.append((ts, rtt, bw))
                    except (ValueError, KeyError):
                        continue

            if len(rows) < 5:
                continue

            rows.sort(key=lambda x: x[0])
            base_t = rows[0][0]
            tc_rows = [(t - base_t, rtt, bw) for t, rtt, bw in rows]

            # Filter: need at least some non-zero bandwidth
            nonzero = [r for r in tc_rows if r[2] > 0]
            if len(nonzero) < 5:
                continue

            out = out_dir / f"{label}_tc.csv"
            write_tc(out, tc_rows)
            created += 1

    print(f"  Created {created} 5G Ireland traces in {out_dir}")
    return created


# ── clear old data ────────────────────────────────────────────────────────────

def clear_old_traces(keep: set):
    print("\n[Clear] Removing old trace directories …")
    for d in sorted(TRACES.iterdir()):
        if d.is_dir() and d.name not in keep:
            print(f"  rm -rf {d.name}/")
            shutil.rmtree(d)
    print("  Done.")


def clear_results():
    print("\n[Clear] Removing old results …")
    if RESULTS.exists():
        shutil.rmtree(RESULTS)
    RESULTS.mkdir()
    print("  Done.")


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    import argparse
    p = argparse.ArgumentParser(description="Download + convert new ABR trace datasets")
    p.add_argument("--skip-fcc",      action="store_true", help="Skip FCC 2021 (2.5 GB download)")
    p.add_argument("--skip-starlink", action="store_true", help="Skip WetLinks Starlink download")
    p.add_argument("--skip-5g",       action="store_true", help="Skip UCC 5G download")
    p.add_argument("--no-clear",      action="store_true", help="Don't clear old traces/results")
    args = p.parse_args()

    dl_dir = TRACES / "_downloads"
    dl_dir.mkdir(parents=True, exist_ok=True)

    fcc_done  = False
    wl_done   = False
    ucc_done  = False

    # ── FCC 2021 ─────────────────────────────────────────────────────────────
    if not args.skip_fcc:
        tarball = dl_dir / "data-raw-2021-sept.tar.gz"
        if fetch(FCC_2021_URL, tarball, "FCC 2021 Sept (~2.5 GB)"):
            n = convert_fcc_2021(tarball, TRACES / "fcc-2021", max_units=12)
            fcc_done = n > 0

    # ── Starlink-on-the-Road ─────────────────────────────────────────────────
    if not args.skip_starlink:
        iperf_f = dl_dir / "starlink_road_iperf.csv"
        ping_f  = dl_dir / "starlink_road_ping.csv"
        ok1 = fetch(STARLINK_ROAD_IPERF_URL, iperf_f, "Starlink-on-the-Road iperf")
        ok2 = fetch(STARLINK_ROAD_PING_URL,  ping_f,  "Starlink-on-the-Road ping")
        if ok1 and ok2:
            n = convert_starlink_road(iperf_f, ping_f, TRACES / "starlink-2024")
            wl_done = n > 0

    # ── UCC 5G ───────────────────────────────────────────────────────────────
    if not args.skip_5g:
        zip_f = dl_dir / "ucc_5g.zip"
        if fetch(UCC5G_URL, zip_f, "UCC 5G dataset (~2 MB)"):
            n = convert_ucc5g(zip_f, TRACES / "5g-ireland")
            ucc_done = n > 0

    print("\n" + "=" * 60)
    print("Download + conversion summary:")
    print(f"  FCC 2021 traces:    {'OK' if fcc_done  else 'SKIPPED/FAILED'}")
    print(f"  Starlink 2024:      {'OK' if wl_done   else 'SKIPPED/FAILED'}")
    print(f"  5G Ireland:         {'OK' if ucc_done  else 'SKIPPED/FAILED'}")

    # ── clear old data ────────────────────────────────────────────────────────
    if not args.no_clear:
        new_sets = {"_downloads"}
        if fcc_done:  new_sets.add("fcc-2021")
        if wl_done:   new_sets.add("starlink-2024")
        if ucc_done:  new_sets.add("5g-ireland")
        # always keep synthetic + uploaded
        new_sets |= {"synthetic", "uploaded"}

        if new_sets - {"_downloads", "synthetic", "uploaded"}:
            clear_old_traces(keep=new_sets)
            clear_results()
        else:
            print("\n[Clear] No new traces were created — skipping clear to avoid data loss.")

    print("\nDone. Update gui/server.py TRACE_SETS to point at the new directories,")
    print("then restart the GUI and run benchmarks from the Run page.")


if __name__ == "__main__":
    main()
