#!/usr/bin/env python3
"""
MOQ2 Publisher — pipes DASH fMP4 segments into moq-cli (moq-dev/moq stack).

Quality is fixed per run (chosen once from the trace median bandwidth).
Each chunk is paced at the current trace bandwidth to simulate network delay.
Selected quality is printed as: QUALITY <bps>
"""

import asyncio
import csv
import os
import subprocess
import sys
import time
from pathlib import Path

CONTENT_DIR = Path(os.getenv('MOQ_CONTENT_DIR',
                              str(Path(__file__).parent.parent / 'content')))
MOQ_CLI     = Path(os.getenv('MOQ_CLI', '/tmp/moq-dev/target/release/moq-cli'))
RELAY_URL   = os.getenv('MOQ2_RELAY_URL', 'http://127.0.0.1:4446')
BROADCAST   = os.getenv('MOQ2_BROADCAST', 'video')

LADDER = [
    (0,   100_000),
    (1,   200_000),
    (2,   400_000),
    (3,   600_000),
    (4,   800_000),
    (5,  1_200_000),
    (6,  1_500_000),
    (7,  2_000_000),
    (8,  3_000_000),
    (9,  4_500_000),
]
CHUNK_DURATION_S = 4.0
ABR_SAFETY       = 0.85


def load_trace(path: str):
    rows = []
    has_header = False
    with open(path) as f:
        for i, row in enumerate(csv.reader(f)):
            if not row:
                continue
            if i == 0 and 'bandwidth' in ','.join(row).lower():
                has_header = True
                continue
            try:
                t = float(row[0])
                bw = float(row[3]) if has_header and len(row) >= 4 else float(row[1])
                rows.append((t, bw))
            except (ValueError, IndexError):
                continue
    if not rows:
        return []
    t0 = rows[0][0]
    return [(t - t0, bw) for t, bw in rows]


def trace_bw_at(rows, elapsed_s: float) -> float:
    if not rows:
        return 4_500_000
    dur = rows[-1][0]
    t = elapsed_s % dur if dur > 0 else 0
    for i in range(len(rows) - 1):
        if rows[i][0] <= t < rows[i + 1][0]:
            return rows[i][1]
    return rows[-1][1]


def select_quality(trace_rows, *, safety=ABR_SAFETY) -> int:
    if not trace_rows:
        return 5  # 1.2 Mbps default
    bws = sorted(bw for _, bw in trace_rows)
    median_bw_kbps = bws[len(bws) // 2]
    available_bps = median_bw_kbps * 1000 * safety  # kbps → bps
    chosen = 0
    for sid, bps in LADDER:
        if bps <= available_bps:
            chosen = sid
    return chosen


async def run(trace_path=None, duration=120.0):
    trace_rows = load_trace(trace_path) if trace_path else []
    quality = select_quality(trace_rows)
    quality_bps = LADDER[quality][1]

    print(f'QUALITY {quality_bps}', flush=True)
    print(f'[MOQ2 PUB] quality=stream{quality} ({quality_bps//1000}kbps)', file=sys.stderr)

    init_path = CONTENT_DIR / f'init-stream{quality}.m4s'
    if not init_path.exists():
        print(f'[MOQ2 PUB] ERROR: init not found: {init_path}', file=sys.stderr)
        return

    # Start moq-cli in publish mode, reading fMP4 from stdin
    proc = await asyncio.create_subprocess_exec(
        str(MOQ_CLI),
        'publish',
        '--url', RELAY_URL,
        '--name', BROADCAST,
        'fmp4', '--passthrough',
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )

    start_time = time.monotonic()
    chunk_idx  = 1

    try:
        # Write init segment (ftyp + moov)
        init_data = init_path.read_bytes()
        proc.stdin.write(init_data)
        await proc.stdin.drain()
        print(f'[MOQ2 PUB] sent init ({len(init_data)} bytes)', file=sys.stderr)

        # Feed chunks with trace-based pacing
        while True:
            elapsed = time.monotonic() - start_time
            if elapsed >= duration:
                break

            chunk_path = CONTENT_DIR / f'chunk-stream{quality}-{chunk_idx:05d}.m4s'
            if not chunk_path.exists():
                chunk_idx = 1
                chunk_path = CONTENT_DIR / f'chunk-stream{quality}-{chunk_idx:05d}.m4s'
                if not chunk_path.exists():
                    print('[MOQ2 PUB] no chunks found', file=sys.stderr)
                    break

            chunk_data = chunk_path.read_bytes()
            chunk_bytes = len(chunk_data)

            # Pacing: simulate chunk download delay based on trace bandwidth
            bw_kbps = trace_bw_at(trace_rows, elapsed)
            bw_bps  = bw_kbps * 1000  # kbps → bps
            delay_s = chunk_bytes * 8 / bw_bps if bw_bps > 0 else CHUNK_DURATION_S
            delay_s = min(delay_s, CHUNK_DURATION_S * 2)  # cap at 2x chunk duration

            proc.stdin.write(chunk_data)
            await proc.stdin.drain()

            if chunk_idx % 10 == 0:
                print(f'[MOQ2 PUB] t={elapsed:.0f}s chunk={chunk_idx} '
                      f'bw={bw_bps//1000:.0f}kbps delay={delay_s:.2f}s', file=sys.stderr)

            await asyncio.sleep(delay_s)
            chunk_idx += 1

    except (BrokenPipeError, ConnectionResetError):
        pass
    finally:
        if proc.stdin and not proc.stdin.is_closing():
            proc.stdin.close()
        try:
            await asyncio.wait_for(proc.wait(), timeout=5)
        except asyncio.TimeoutError:
            proc.terminate()


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--trace',    default=None)
    ap.add_argument('--duration', type=float, default=120.0)
    args = ap.parse_args()
    asyncio.run(run(trace_path=args.trace, duration=args.duration))
