#!/usr/bin/env python3
"""
MOQ2 Publisher — publishes a MULTI-RENDITION ladder into the moq-dev/moq stack.

Unlike the old single-quality publisher, this one publishes every rung of the
ladder simultaneously, each as its own broadcast (video<sid>), so the browser
player can switch between them (ABR). Each rendition's chunks are paced at the
current trace bandwidth based on *that rendition's* byte size, so a higher
rendition genuinely costs more to deliver than a lower one — which is what
gives the player's ABR something real to react to.

Prints, once at startup, a machine-readable ladder line for benchmark.py:
    LADDER [{"name": "video0", "sid": 0, "kbps": 100}, ...]
"""

import asyncio
import csv
import json
import os
import sys
import time
from pathlib import Path

CONTENT_DIR = Path(os.getenv('MOQ_CONTENT_DIR',
                              str(Path(__file__).parent.parent / 'content')))
MOQ_CLI     = Path(os.getenv('MOQ_CLI', '/tmp/moq-dev/target/release/moq-cli'))
RELAY_URL   = os.getenv('MOQ2_RELAY_URL', 'http://127.0.0.1:4446')

# stream id -> nominal bitrate (bps). Matches the DASH encoding ladder.
LADDER_BPS = {
    0:   100_000,
    1:   200_000,
    2:   400_000,
    3:   600_000,
    4:   800_000,
    5: 1_200_000,
    6: 1_500_000,
    7: 2_000_000,
    8: 3_000_000,
    9: 4_500_000,
}
CHUNK_DURATION_S = 4.0


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
    """Available bandwidth (kbps) at a given elapsed time, looping the trace."""
    if not rows:
        return 4_500_000
    dur = rows[-1][0]
    t = elapsed_s % dur if dur > 0 else 0
    for i in range(len(rows) - 1):
        if rows[i][0] <= t < rows[i + 1][0]:
            return rows[i][1]
    return rows[-1][1]


async def feed_rendition(sid: int, trace_rows, duration: float):
    """Publish one rendition as broadcast video<sid>, paced by the trace."""
    init_path = CONTENT_DIR / f'init-stream{sid}.m4s'
    if not init_path.exists():
        print(f'[MOQ2 PUB] ERROR: init not found: {init_path}', file=sys.stderr)
        return

    proc = await asyncio.create_subprocess_exec(
        str(MOQ_CLI),
        'publish',
        '--url', RELAY_URL,
        '--name', f'video{sid}',
        'fmp4', '--passthrough',
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )

    start = time.monotonic()
    idx = 1
    try:
        proc.stdin.write(init_path.read_bytes())
        await proc.stdin.drain()

        while True:
            elapsed = time.monotonic() - start
            if elapsed >= duration:
                break

            chunk_path = CONTENT_DIR / f'chunk-stream{sid}-{idx:05d}.m4s'
            if not chunk_path.exists():
                idx = 1
                chunk_path = CONTENT_DIR / f'chunk-stream{sid}-{idx:05d}.m4s'
                if not chunk_path.exists():
                    break

            data = chunk_path.read_bytes()

            proc.stdin.write(data)
            await proc.stdin.drain()

            # Pace this rendition's delivery by how long it would take to ship
            # `len(data)` bytes over the current trace bandwidth. Bigger renditions
            # (higher bitrate) take longer -> their buffer drains faster at the
            # player -> ABR has a real cost signal to react to.
            bw_kbps = trace_bw_at(trace_rows, elapsed)
            bw_bps = bw_kbps * 1000
            delay_s = (len(data) * 8 / bw_bps) if bw_bps > 0 else CHUNK_DURATION_S
            delay_s = min(delay_s, CHUNK_DURATION_S * 3)
            await asyncio.sleep(delay_s)
            idx += 1
    except (BrokenPipeError, ConnectionResetError):
        pass
    finally:
        try:
            if proc.stdin and not proc.stdin.is_closing():
                proc.stdin.close()
        except Exception:
            pass
        try:
            await asyncio.wait_for(proc.wait(), timeout=5)
        except (asyncio.TimeoutError, ProcessLookupError):
            try:
                proc.terminate()
            except Exception:
                pass


async def run(trace_path=None, duration=120.0, sids=None):
    trace_rows = load_trace(trace_path) if trace_path else []
    sids = sids or [0, 3, 6, 9]
    sids = [s for s in sids if (CONTENT_DIR / f'init-stream{s}.m4s').exists()]
    if not sids:
        print('[MOQ2 PUB] ERROR: no renditions available', file=sys.stderr)
        return

    ladder = [{'name': f'video{s}', 'sid': s, 'kbps': LADDER_BPS.get(s, 0) // 1000}
              for s in sids]
    ladder.sort(key=lambda r: r['kbps'])
    print('LADDER ' + json.dumps(ladder), flush=True)
    print(f'[MOQ2 PUB] publishing {len(sids)} renditions: '
          + ', '.join(f"{r['name']}({r['kbps']}k)" for r in ladder), file=sys.stderr)

    await asyncio.gather(*(feed_rendition(s, trace_rows, duration) for s in sids))


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--trace',    default=None)
    ap.add_argument('--duration', type=float, default=120.0)
    ap.add_argument('--ladder',   default='0,3,6,9',
                    help='comma-separated stream ids to publish as the ABR ladder')
    args = ap.parse_args()
    sid_list = [int(x) for x in args.ladder.split(',') if x.strip() != '']
    asyncio.run(run(trace_path=args.trace, duration=args.duration, sids=sid_list))
