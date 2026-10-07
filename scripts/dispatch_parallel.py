#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NetSail Parallel Benchmark Dispatcher (Multi-Worker Execution)

Dispatches benchmark runs across an isolated worker pool (e.g. 16 workers)
to complete large trace suites (10k+ traces) within 2-3 days.

Features:
- Worker isolation: each worker has its own port, network namespace, and trace file.
- Auto-resume: checks results directory to skip already completed runs.
- Concurrency control: manages active worker slots and prevents port collisions.
- Progress monitoring: real-time progress, throughput, ETA, and error logging.
"""

import argparse
import os
import queue
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Set, Tuple

ROOT = Path(__file__).resolve().parent.parent
TRACES_DIR = ROOT / "traces"
RESULTS_DIR = ROOT / "results"

DEFAULT_PROTOCOLS = ["dash", "lldash-gpac", "hls", "webrtc", "moq2"]
DEFAULT_TRACE_SETS = [
    "5g-ireland",
    "starlink-2024",
    "fcc",
    "fcc_2017",
    "fcc_2018",
    "fcc_2019",
    "fcc_2020",
    "fcc_2021",
    "fcc_2022",
    "fcc_2023",
    "puffer",
    "high_bandwidth",
]


def find_completed_runs(results_dir: Path) -> Set[Tuple[str, str]]:
    """Scan results directory and subdirectories for completed (protocol, trace_stem) runs."""
    import json
    completed = set()
    if not results_dir.exists():
        return completed

    # Pattern matches benchmark_{protocol}_{trace_stem}_{timestamp}.json
    pattern = re.compile(r"^benchmark_([a-zA-Z0-9_\-]+?)_(.+?)_\d{8}_\d{6}\.json$")

    for f in results_dir.rglob("*.json"):
        m = pattern.match(f.name)
        if m:
            proto = m.group(1)
            trace_stem = m.group(2)
            completed.add((proto, trace_stem))
            completed.add((m.group(1), m.group(2)))
        else:
            try:
                data = json.loads(f.read_text())
                proto = data.get("protocol")
                trace = data.get("trace") or data.get("trace_name") or data.get("trace_file")
                if proto and trace:
                    stem = Path(trace).stem
                    completed.add((proto, stem))
            except Exception:
                pass

    return completed


def collect_all_tasks(protocols: List[str], trace_sets: List[str],
                      completed: Set[Tuple[str, str]],
                      limit_per_set: int = None) -> Tuple[List[dict], int, int]:
    """Collect all pending (protocol, trace_file) tasks."""
    tasks = []
    total_found = 0
    total_skipped = 0

    for set_name in trace_sets:
        set_dir = TRACES_DIR / set_name
        if not set_dir.exists():
            continue
        traces = sorted(set_dir.glob("*_tc.csv"))
        if limit_per_set and limit_per_set > 0:
            traces = traces[:limit_per_set]
        for t in traces:
            total_found += 1
            stem = t.stem
            for proto in protocols:
                if (proto, stem) in completed:
                    total_skipped += 1
                    continue
                tasks.append({
                    "protocol": proto,
                    "trace_path": t,
                    "trace_stem": stem,
                    "trace_set": set_name,
                })

    return tasks, total_found, total_skipped


def run_worker_task(task: dict, worker_id: int, duration: float,
                    out_dir: Path, log_dir: Path, abr: str = "mpc") -> Tuple[bool, dict, float]:
    """Execute a single benchmark task on a specific worker."""
    proto = task["protocol"]
    trace = task["trace_path"]
    stem = task["trace_stem"]
    set_name = task["trace_set"]

    log_file = log_dir / f"{proto}_{stem}.log"
    cmd = [
        sys.executable, "-u", str(ROOT / "benchmark.py"),
        "--protocol", proto,
        "--duration", str(duration),
        "--trace", str(trace),
        "--worker-id", str(worker_id),
        "--results-dir", f"{proto}_{set_name}",
        "--results-root", str(out_dir),
        "--no-autostart",
        "--no-shaper-restart",
        "--no-autocontent",
        "--abr", abr,
    ]

    t0 = time.time()
    try:
        with open(log_file, "w") as lf:
            proc = subprocess.run(
                cmd,
                stdout=lf,
                stderr=subprocess.STDOUT,
                timeout=duration + 120,  # 2 min grace period for startup/settle
                cwd=str(ROOT),
            )
        elapsed = time.time() - t0
        ok = (proc.returncode == 0)
        return ok, task, elapsed
    except subprocess.TimeoutExpired:
        elapsed = time.time() - t0
        with open(log_file, "a") as lf:
            lf.write(f"\n[ERROR] Task timed out after {elapsed:.1f}s\n")
        try:
            with open(log_file, "a") as lf:
                lf.write(f"\n[ERROR] Task timed out after {elapsed:.1f}s\n")
        except Exception:
            pass
        return False, task, elapsed
    except Exception as e:
        elapsed = time.time() - t0
        with open(log_file, "a") as lf:
            lf.write(f"\n[ERROR] Exception executing task: {e}\n")
        try:
            with open(log_file, "a") as lf:
                lf.write(f"\n[ERROR] Exception executing task: {e}\n")
        except Exception:
            pass
        return False, task, elapsed


def format_seconds(s: float) -> str:
    """Format seconds into human-readable H:MM:SS or days."""
    if s < 0:
        return "0s"
    td = timedelta(seconds=int(s))
    days = td.days
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def main():
    parser = argparse.ArgumentParser(
        description="Parallel Multi-Worker Benchmark Dispatcher for NetSail/Piko",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--workers", "-w", type=int, default=16,
                        help="Number of concurrent worker slots (default: 16)")
    parser.add_argument("--duration", "-d", type=float, default=60.0,
                        help="Trace playback duration in seconds (default: 60)")
    parser.add_argument("--protocols", "-p", nargs="+", default=DEFAULT_PROTOCOLS,
                        help=f"Protocols to benchmark (default: {' '.join(DEFAULT_PROTOCOLS)})")
    parser.add_argument("--trace-sets", "-s", nargs="+", default=DEFAULT_TRACE_SETS,
                        help="Trace sets to include (default: all 12 sets)")
    parser.add_argument("--results-tag", type=str, default=None,
                        help="Subdirectory tag under results/ (default: parallel_<timestamp>)")
    parser.add_argument("--max-tasks", type=int, default=None,
                        help="Limit the total number of tasks to execute")
    parser.add_argument("--limit-per-set", type=int, default=None,
                        help="Limit the number of traces sampled per trace set")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show queue summary and counts without running")
    parser.add_argument("--abr", type=str, default="mpc", choices=["mpc", "bola", "throughput"],
                        help="ABR algorithm for DASH (default: mpc)")

    args = parser.parse_args()

    tag = args.results_tag or f"parallel_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    out_dir = RESULTS_DIR / tag
    log_dir = out_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 75)
    print(f"  NetSail Parallel Benchmark Dispatcher")
    print(f"  Workers     : {args.workers}")
    print(f"  Duration    : {args.duration}s per trace")
    print(f"  Protocols   : {', '.join(args.protocols)}")
    print(f"  Trace sets  : {len(args.trace_sets)} sets")
    print(f"  Output dir  : {out_dir}")
    print("=" * 75)

    # Check already completed runs
    print(f"\n[SCAN] Scanning existing results in {RESULTS_DIR} ...")
    completed = find_completed_runs(RESULTS_DIR)
    print(f"[SCAN] Found {len(completed):,} previously completed benchmark runs")

    # Build task list
    tasks, total_traces, skipped_count = collect_all_tasks(
        args.protocols, args.trace_sets, completed, args.limit_per_set
    )
    if args.max_tasks and args.max_tasks > 0:
        tasks = tasks[:args.max_tasks]
    total_tasks = len(tasks)

    print(f"[QUEUE] Total available traces in sets : {total_traces:,}")
    print(f"[QUEUE] Already completed runs         : {skipped_count:,}")
    print(f"[QUEUE] Pending runs to execute        : {total_tasks:,}")

    # Estimate runtime
    est_total_seconds = (total_tasks * (args.duration + 5)) / max(1, args.workers)
    print(f"[ESTIMATE] Estimated wall-clock time   : {format_seconds(est_total_seconds)}")
    print("=" * 75)

    if args.dry_run:
        print("\n[DRY RUN] Exiting without executing tasks.")
        return

    if total_tasks == 0:
        print("\n[COMPLETE] All tasks have already been completed!")
        return

    # Worker ID queue (thread-safe pool 1..N)
    worker_pool = queue.Queue()
    for wid in range(1, args.workers + 1):
        worker_pool.put(wid)

    done_count = 0
    fail_count = 0
    start_time = time.time()

    def _worker_wrapper(task):
        wid = worker_pool.get()
        try:
            return run_worker_task(task, wid, args.duration, out_dir, log_dir, abr=args.abr)
        finally:
            worker_pool.put(wid)

    print(f"\n[LAUNCH] Starting execution pool with {args.workers} workers ...\n")

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_to_task = {executor.submit(_worker_wrapper, t): t for t in tasks}

        for future in as_completed(future_to_task):
            done_count += 1
            ok, task, elapsed = future.result()
            if not ok:
                fail_count += 1

            # Progress math
            now = time.time()
            wall_elapsed = now - start_time
            rate = done_count / max(1.0, wall_elapsed)  # tasks per second
            remaining_tasks = total_tasks - done_count
            eta_seconds = remaining_tasks / rate if rate > 0 else 0

            status = "OK" if ok else "FAIL"
            pct = (done_count / total_tasks) * 100

            sys.stdout.write(
                f"\r[{pct:5.1f}%] {done_count}/{total_tasks} "
                f"[{status}] {task['protocol']}:{task['trace_stem'][:20]} "
                f"({elapsed:.1f}s) | ETA: {format_seconds(eta_seconds)} "
                f"(Fails: {fail_count})    "
            )
            sys.stdout.flush()

    print("\n\n" + "=" * 75)
    print(f"  Benchmark Suite Completed!")
    print(f"  Total executed : {done_count}")
    print(f"  Succeeded      : {done_count - fail_count}")
    print(f"  Failed         : {fail_count}")
    print(f"  Total time     : {format_seconds(time.time() - start_time)}")
    print(f"  Results in     : {out_dir}/")
    print("=" * 75)


if __name__ == "__main__":
    main()

