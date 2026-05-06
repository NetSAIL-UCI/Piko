#!/usr/bin/env python3
"""
MOQ Publisher — reads DASH m4s segments from content dir and publishes
them as MOQ Objects to the relay via TCP (port 4444).

Per-chunk ABR: at each chunk, picks the highest quality stream whose
bitrate ≤ 0.85 × current_trace_bandwidth. On quality switch, prepends
the new init segment so MSE can reset decoder parameters seamlessly.

Pacing: sleeps chunk_bytes / bandwidth_Bps before sending each chunk to
simulate the download delay that a real network would impose.
"""

import asyncio
import csv
import json
import os
import struct
import time
from pathlib import Path

RELAY_HOST     = os.getenv('MOQ_RELAY_HOST', '127.0.0.1')
RELAY_PUB_PORT = int(os.getenv('MOQ_PUB_PORT', 4444))
CONTENT_DIR    = Path(os.getenv('MOQ_CONTENT_DIR',
                                 str(Path(__file__).parent.parent / 'content')))

# Must match the DASH manifest's bitrate ladder exactly
LADDER = [
    (0,   100_000,  '144p'),
    (1,   200_000,  '180p'),
    (2,   400_000,  '240p'),
    (3,   600_000,  '270p'),
    (4,   800_000,  '360p'),
    (5,  1_200_000, '360p-hi'),
    (6,  1_500_000, '480p'),
    (7,  2_000_000, '480p-hi'),
    (8,  3_000_000, '720p'),
    (9,  4_500_000, '720p-hi'),
]
CHUNK_DURATION_S = 4.0
ABR_SAFETY       = 0.85   # same margin as DASH/Pensieve

MSG_ANNOUNCE    = 2
MSG_OBJECT      = 3
MSG_ANNOUNCE_OK = 5


def encode_msg(msg_type: int, payload: bytes) -> bytes:
    return struct.pack('>BI', msg_type, len(payload)) + payload


def decode_msg(data: bytes):
    if len(data) < 5:
        return None, data
    msg_type, length = struct.unpack('>BI', data[:5])
    if len(data) < 5 + length:
        return None, data
    return (msg_type, data[5:5 + length]), data[5 + length:]


def encode_obj(ns, name, gid, oid, priority, payload: bytes, quality_bps: int = 0) -> bytes:
    meta = json.dumps({
        'ns': ns, 'name': name, 'gid': gid, 'oid': oid,
        'pri': priority, 'ts': time.time(), 'bps': quality_bps,
    }).encode()
    hdr = struct.pack('>H', len(meta)) + meta
    return encode_msg(MSG_OBJECT, hdr + payload)


def load_trace(trace_path: str):
    """Load FCC trace CSV; returns [(elapsed_ms, bw_kbps), ...]."""
    rows = []
    has_header = False
    with open(trace_path) as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if not row:
                continue
            if i == 0 and 'bandwidth' in ','.join(row).lower():
                has_header = True
                continue
            try:
                elapsed_s = float(row[0])
                bw = float(row[3]) if has_header and len(row) >= 4 else float(row[1])
                rows.append((elapsed_s, bw))
            except (ValueError, IndexError):
                continue
    if not rows:
        raise ValueError(f"No data in {trace_path}")
    t0 = rows[0][0]
    return [(( t - t0) * 1000, bw) for t, bw in rows]


def get_trace_bw_at(rows, elapsed_ms: float) -> float:
    if not rows:
        return 3000.0
    dur = rows[-1][0]
    if dur > 0:
        elapsed_ms = elapsed_ms % dur
    for i in range(len(rows) - 1):
        if rows[i][0] <= elapsed_ms < rows[i + 1][0]:
            return rows[i][1]
    return rows[-1][1]


def pick_quality_at_bw(bw_kbps: float) -> tuple:
    """Pick highest quality stream whose bitrate ≤ ABR_SAFETY × bw_kbps × 1000."""
    budget_bps = bw_kbps * 1000 * ABR_SAFETY
    chosen = LADDER[0]
    for sid, bps, label in LADDER:
        if bps <= budget_bps:
            chosen = (sid, bps, label)
    return chosen


# Cache init segments so we don't re-read on every quality switch
_init_cache: dict = {}

def read_init(stream_id: int) -> bytes:
    if stream_id not in _init_cache:
        p = CONTENT_DIR / f'init-stream{stream_id}.m4s'
        _init_cache[stream_id] = p.read_bytes()
    return _init_cache[stream_id]


async def publish(trace_path: str, duration_s: float = 120.0):
    print(f"[PUBLISHER] Connecting to {RELAY_HOST}:{RELAY_PUB_PORT}")
    reader, writer = await asyncio.open_connection(RELAY_HOST, RELAY_PUB_PORT)

    writer.write(encode_msg(MSG_ANNOUNCE,
                            json.dumps({'namespace': 'video'}).encode()))
    await writer.drain()

    buf = b''
    while True:
        chunk = await reader.read(4096)
        if not chunk:
            raise RuntimeError("Relay closed connection")
        buf += chunk
        result, buf = decode_msg(buf)
        if result and result[0] == MSG_ANNOUNCE_OK:
            print("[PUBLISHER] ANNOUNCE_OK — starting per-chunk ABR")
            break

    rows = load_trace(trace_path) if trace_path else []

    start_wall = time.perf_counter()
    sim_time_ms = 0.0
    cur_stream_id = -1          # -1 = no quality selected yet
    quality_history = []

    for chunk_idx in range(1, 151):   # chunks numbered 1-150
        elapsed = time.perf_counter() - start_wall
        if elapsed >= duration_s:
            break

        bw_kbps = max(get_trace_bw_at(rows, sim_time_ms), 10.0)
        sid, bps, label = pick_quality_at_bw(bw_kbps)
        quality_history.append(bps)

        chunk_path = CONTENT_DIR / f'chunk-stream{sid}-{chunk_idx:05d}.m4s'
        chunk_data = chunk_path.read_bytes()

        if sid != cur_stream_id:
            # Quality switch: prepend new init segment.
            # MSE handles [moov | moof+mdat] as a single appendBuffer() call.
            init_data = read_init(sid)
            payload = init_data + chunk_data
            sw_str = f"stream {cur_stream_id}→{sid}" if cur_stream_id >= 0 else f"init stream {sid}"
            print(f"\n[PUBLISHER] ABR: {sw_str} ({label}, {bps//1000}kbps)  bw={bw_kbps:.0f}kbps")
            cur_stream_id = sid
        else:
            payload = chunk_data

        bw_Bps     = bw_kbps * 1000.0 / 8.0
        download_s = len(payload) / bw_Bps
        await asyncio.sleep(max(0.0, download_s))

        writer.write(encode_obj('video', 'main', chunk_idx, 0, 100, payload, bps))
        await writer.drain()

        sim_time_ms += CHUNK_DURATION_S * 1000
        elapsed_now = time.perf_counter() - start_wall
        print(f"[PUBLISHER] chunk {chunk_idx}  bw={bw_kbps:.0f}kbps  "
              f"q={label}  dl={download_s:.2f}s  wall={elapsed_now:.1f}s",
              end='\r', flush=True)

    avg_q = sum(quality_history) / len(quality_history) / 1000 if quality_history else 0
    print(f"\n[PUBLISHER] Done — {chunk_idx-1} chunks, avg quality {avg_q:.0f} kbps "
          f"in {time.perf_counter()-start_wall:.1f}s")
    writer.close()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--trace', default=None)
    parser.add_argument('--duration', type=float, default=130.0)
    args = parser.parse_args()
    asyncio.run(publish(args.trace, args.duration))


if __name__ == '__main__':
    main()
