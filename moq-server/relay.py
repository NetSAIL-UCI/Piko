#!/usr/bin/env python3
"""
MOQ Relay Server

Three transports:
  :4444 (TCP)  — publisher connections (same host, no browser TLS required)
  :4445 (WS)   — browser subscriber connections via WebSocket
  :8090 (HTTP) — serves player.html

All share the same in-memory MOQRelay fan-out engine.
WebSocket transport is used in place of WebTransport/QUIC to avoid the
browser cert-validation constraints on self-signed QUIC certs in Chrome.
"""

import asyncio
import json
import logging
import os
import struct
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Dict, List, Optional

import websockets
from websockets.server import WebSocketServerProtocol

PORT_TCP  = int(os.getenv('MOQ_PUB_PORT', 4444))   # publisher TCP
PORT_WS   = int(os.getenv('MOQ_WS_PORT', 4445))    # browser WebSocket
PORT_HTTP = int(os.getenv('MOQ_HTTP_PORT', 8090))  # player HTML

logging.basicConfig(level=logging.INFO,
                    format='[%(asctime)s] %(levelname)s %(message)s')
log = logging.getLogger('moq-relay')

# ── Message types ──────────────────────────────────────────────────────────
MSG_SUBSCRIBE    = 1
MSG_ANNOUNCE     = 2
MSG_OBJECT       = 3
MSG_SUBSCRIBE_OK = 4
MSG_ANNOUNCE_OK  = 5
MSG_UNSUBSCRIBE  = 6


def encode_msg(msg_type: int, payload: bytes) -> bytes:
    return struct.pack('>BI', msg_type, len(payload)) + payload


def decode_msg(data: bytes):
    if len(data) < 5:
        return None, data
    msg_type, length = struct.unpack('>BI', data[:5])
    if len(data) < 5 + length:
        return None, data
    return (msg_type, data[5:5 + length]), data[5 + length:]


@dataclass
class MOQObject:
    track_namespace: str
    track_name: str
    group_id: int
    object_id: int
    priority: int
    payload: bytes
    timestamp: float = field(default_factory=time.time)
    quality_bps: int = 0

    def encode(self) -> bytes:
        meta = json.dumps({
            'ns': self.track_namespace, 'name': self.track_name,
            'gid': self.group_id, 'oid': self.object_id,
            'pri': self.priority, 'ts': self.timestamp,
            'bps': self.quality_bps,
        }).encode()
        return struct.pack('>H', len(meta)) + meta + self.payload

    @staticmethod
    def decode(data: bytes) -> 'MOQObject':
        meta_len = struct.unpack('>H', data[:2])[0]
        meta = json.loads(data[2:2 + meta_len])
        return MOQObject(
            track_namespace=meta['ns'], track_name=meta['name'],
            group_id=meta['gid'], object_id=meta['oid'],
            priority=meta['pri'], payload=data[2 + meta_len:],
            timestamp=meta.get('ts', time.time()),
            quality_bps=meta.get('bps', 0),
        )


class MOQRelay:
    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = defaultdict(list)
        self._buffer: Dict[str, List[MOQObject]] = defaultdict(list)
        self._BUFFER_SIZE = 30
        self._stats = {'objects': 0, 'bytes': 0}

    def track_key(self, ns: str, name: str) -> str:
        return f"{ns}/{name}"

    def subscribe(self, ns: str, name: str, q: asyncio.Queue):
        key = self.track_key(ns, name)
        self._subscribers[key].append(q)
        log.info(f"SUBSCRIBE {key} (subs={len(self._subscribers[key])})")
        for obj in self._buffer[key]:
            q.put_nowait(obj)

    def unsubscribe(self, ns: str, name: str, q: asyncio.Queue):
        key = self.track_key(ns, name)
        try:
            self._subscribers[key].remove(q)
        except ValueError:
            pass

    def publish(self, obj: MOQObject):
        key = self.track_key(obj.track_namespace, obj.track_name)
        self._stats['objects'] += 1
        self._stats['bytes'] += len(obj.payload)
        buf = self._buffer[key]
        buf.append(obj)
        if len(buf) > self._BUFFER_SIZE:
            buf.pop(0)
        dead = []
        for q in self._subscribers[key]:
            try:
                q.put_nowait(obj)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self._subscribers[key].remove(q)

    def stats(self):
        return {**self._stats, 'tracks': len(self._subscribers)}


RELAY = MOQRelay()


# ── TCP publisher handler ──────────────────────────────────────────────────

async def publisher_handler(reader: asyncio.StreamReader,
                            writer: asyncio.StreamWriter):
    addr = writer.get_extra_info('peername')
    log.info(f"Publisher connected from {addr}")
    buf = b''
    try:
        while True:
            chunk = await reader.read(65536)
            if not chunk:
                break
            buf += chunk
            while True:
                result, buf = decode_msg(buf)
                if result is None:
                    break
                msg_type, payload = result
                if msg_type == MSG_ANNOUNCE:
                    info = json.loads(payload)
                    log.info(f"Publisher ANNOUNCE ns={info['namespace']}")
                    ack = encode_msg(MSG_ANNOUNCE_OK,
                                     json.dumps({'namespace': info['namespace']}).encode())
                    writer.write(ack)
                    await writer.drain()
                elif msg_type == MSG_OBJECT:
                    obj = MOQObject.decode(payload)
                    RELAY.publish(obj)
    except Exception as e:
        log.warning(f"Publisher {addr}: {e}")
    finally:
        writer.close()
        log.info(f"Publisher {addr} disconnected")


# ── WebSocket browser subscriber handler ───────────────────────────────────

async def ws_handler(ws: WebSocketServerProtocol):
    log.info(f"Browser WS connected from {ws.remote_address}")
    sub_queue: Optional[asyncio.Queue] = None
    sub_ns: Optional[str] = None
    sub_name: Optional[str] = None

    async def forward():
        while True:
            obj: MOQObject = await sub_queue.get()
            msg = encode_msg(MSG_OBJECT, obj.encode())
            try:
                await ws.send(msg)
            except Exception:
                break

    fwd_task = None
    recv_buf = b''
    try:
        async for raw in ws:
            recv_buf += raw if isinstance(raw, bytes) else raw.encode()
            while True:
                result, recv_buf = decode_msg(recv_buf)
                if result is None:
                    break
                msg_type, payload = result
                if msg_type == MSG_SUBSCRIBE:
                    info = json.loads(payload)
                    sub_ns, sub_name = info['namespace'], info['name']
                    sub_queue = asyncio.Queue(maxsize=500)
                    RELAY.subscribe(sub_ns, sub_name, sub_queue)
                    ack = encode_msg(MSG_SUBSCRIBE_OK,
                                     json.dumps({'namespace': sub_ns,
                                                 'name': sub_name}).encode())
                    await ws.send(ack)
                    if fwd_task is None:
                        fwd_task = asyncio.ensure_future(forward())
                    log.info(f"Browser SUBSCRIBE {sub_ns}/{sub_name}")

                elif msg_type == MSG_UNSUBSCRIBE:
                    if sub_ns and sub_name and sub_queue:
                        RELAY.unsubscribe(sub_ns, sub_name, sub_queue)
    except Exception as e:
        log.info(f"Browser WS closed: {e}")
    finally:
        if fwd_task:
            fwd_task.cancel()
        if sub_queue and sub_ns and sub_name:
            RELAY.unsubscribe(sub_ns, sub_name, sub_queue)
        log.info(f"Browser WS disconnected")


# ── HTTP player server ─────────────────────────────────────────────────────

_PLAYER_DIR = Path(__file__).parent


class PlayerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]
        if path in ('/', '/player.html', '/index.html'):
            fp = _PLAYER_DIR / 'player.html'
            body = fp.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif path == '/health':
            body = json.dumps(RELAY.stats()).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, fmt, *args):
        pass


def _start_http_server():
    server = HTTPServer(('0.0.0.0', PORT_HTTP), PlayerHandler)
    log.info(f"HTTP player server on :{PORT_HTTP}")
    server.serve_forever()


# ── Main ───────────────────────────────────────────────────────────────────

async def main():
    threading.Thread(target=_start_http_server, daemon=True).start()

    tcp_server = await asyncio.start_server(
        publisher_handler, '0.0.0.0', PORT_TCP)
    log.info(f"TCP publisher on :{PORT_TCP}")

    ws_server = await websockets.serve(
        ws_handler, '0.0.0.0', PORT_WS,
        max_size=8 * 1024 * 1024,   # 8MB for large m4s chunks
    )
    log.info(f"WebSocket browser on :{PORT_WS}")

    async with tcp_server, ws_server:
        await asyncio.Future()


if __name__ == '__main__':
    asyncio.run(main())
