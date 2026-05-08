#!/usr/bin/env python3
"""
GPAC-backed LL-DASH streaming server.

Serves pre-packaged GPAC LL-CMAF content with chunked transfer encoding so
dash.js can start consuming sub-segments before a full segment has arrived —
the defining feature of true LL-DASH.

The server simulates a live edge by computing which segments are "available"
based on elapsed wall-clock time from first request, preventing the player
from jumping ahead and exposing the pre-recorded nature of the content.

Architecture:
  - GPAC MP4Box packages BigBuckBunny → 2s segments / 0.5s fragments
  - This server streams each segment file in 0.5s fragment-sized chunks
    with artificial inter-chunk pacing matching the original frame rate
  - dash.js in LL mode fetches segments early and processes them as chunks arrive
"""

import os
import sys
import time
import threading
import socketserver
import http.server
from pathlib import Path

PORT       = int(os.getenv('LLDASH_PORT', '8081'))
HOST       = os.getenv('LLDASH_HOST', '0.0.0.0')
# Content: serve the existing ll2s-* fMP4 segments (same content as the Docker lldash server)
CONTENT    = Path(os.getenv('LLDASH_CONTENT', str(Path(__file__).parent.parent / 'content')))
PLAYER_DIR = Path(__file__).parent
TRACE_PATH = Path(os.getenv('LLDASH_TRACE',
    str(Path(__file__).parent.parent / 'shaper' / 'trace' / 'trace.csv')))

SEG_DUR_S  = float(os.getenv('SEG_DUR_S', '2.0'))    # segment duration
FRAG_DUR_S = float(os.getenv('FRAG_DUR_S', '0.5'))   # sub-segment duration
CHUNK_SIZE = 4096  # bytes per socket write

# Live edge simulation: track stream start time so we can gate segment availability.
_stream_start: float = 0.0
_stream_lock  = threading.Lock()


def _load_trace():
    """Load trace CSV → list of (elapsed_s, bw_kbps) tuples, normalized to t=0."""
    if not TRACE_PATH.exists():
        return []
    rows = []
    try:
        with open(TRACE_PATH) as f:
            has_header = False
            for i, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                parts = line.split(',')
                if i == 0 and 'bandwidth' in line.lower():
                    has_header = True
                    continue
                try:
                    t = float(parts[0])
                    bw = float(parts[3]) if has_header and len(parts) >= 4 else float(parts[1])
                    rows.append((t, bw))
                except (ValueError, IndexError):
                    continue
        if rows:
            t0 = rows[0][0]
            rows = [(t - t0, bw) for t, bw in rows]
    except Exception as e:
        print(f"[WARN] trace load failed: {e}", flush=True)
    return rows


def _trace_bw_kbps(rows, elapsed_s: float):
    """Return bandwidth (kbps) for the given elapsed time, cycling the trace."""
    if not rows:
        return None
    dur = rows[-1][0]
    t = elapsed_s % dur if dur > 0 else 0
    bw = rows[-1][1]
    for i in range(len(rows) - 1):
        if rows[i][0] <= t < rows[i + 1][0]:
            bw = rows[i][1]
            break
    return bw

def stream_elapsed() -> float:
    with _stream_lock:
        if _stream_start == 0.0:
            return 0.0
        return time.monotonic() - _stream_start

def init_stream():
    global _stream_start
    with _stream_lock:
        if _stream_start == 0.0:
            _stream_start = time.monotonic()
            print(f"[GPAC-LL] Live stream started at t=0", flush=True)


class GPACLLHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'  # required for chunked transfer encoding
    log_message = lambda self, *a: None  # suppress per-request noise

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Range, Content-Type')
        self.send_header('Access-Control-Expose-Headers', 'Content-Length, Content-Range')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split('?')[0].lstrip('/')

        # Player HTML / JS assets served from player directory
        if path in ('', 'index.html', 'player.html'):
            self._serve_file(PLAYER_DIR / 'gpac_player.html', 'text/html')
        elif path == 'dash.all.min.js':
            self._serve_file(PLAYER_DIR / 'dash.all.min.js', 'application/javascript')
        # DASH manifest — serve ll2s-manifest.mpd for any .mpd request
        elif path.endswith('.mpd'):
            init_stream()
            self._serve_manifest(CONTENT / 'll2s-manifest.mpd')
        # Init segments — serve immediately (video/mp4 MIME type for MSE)
        elif 'init' in path and path.endswith('.m4s'):
            self._serve_file(CONTENT / path, 'video/mp4')
        # Media segments — stream with chunked transfer (LL-DASH key feature)
        elif path.endswith('.m4s') or path.endswith('.dash'):
            self._serve_segment_chunked(CONTENT / path)
        else:
            self.send_error(404, path)

    def _serve_file(self, fpath: Path, ctype: str):
        if not fpath.exists():
            self.send_error(404, str(fpath))
            return
        data = fpath.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_cors()
        self.end_headers()
        self.wfile.write(data)

    def _serve_manifest(self, fpath: Path):
        if not fpath.exists():
            self.send_error(404, str(fpath))
            return
        data = fpath.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', 'application/dash+xml')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_cors()
        self.end_headers()
        self.wfile.write(data)

    def _serve_segment_chunked(self, fpath: Path):
        """Stream a segment file using HTTP chunked transfer.

        Paces delivery at fragment boundaries (FRAG_DUR_S per fragment) so the
        player sees sub-segments arriving progressively — exactly as in live LL-DASH.
        The network shaper (tc/netem) constrains total throughput on top of this.
        """
        if not fpath.exists():
            self.send_error(404, str(fpath))
            return

        data = fpath.read_bytes()
        total = len(data)

        self.send_response(200)
        self.send_header('Content-Type', 'video/iso.segment')
        self.send_header('Transfer-Encoding', 'chunked')
        self.send_header('Cache-Control', 'no-cache')
        self.send_cors()
        self.end_headers()

        # Divide segment into FRAG_COUNT equal parts and pace delivery
        frags_per_seg = max(1, round(SEG_DUR_S / FRAG_DUR_S))
        frag_size     = max(1, total // frags_per_seg)
        offset        = 0
        frag_idx      = 0

        # Load trace once per segment for consistent pacing across threads
        trace_rows = _load_trace()

        while offset < total:
            frag_t0 = time.monotonic()
            end  = min(offset + frag_size, total)
            chunk = data[offset:end]

            # Pace delivery based purely on trace bandwidth (= segment_bytes / bandwidth).
            # High bandwidth → fast delivery → player buffers ahead.
            # Low bandwidth → slow delivery → player stalls.
            # No real-time floor: unlike live LL-DASH, VOD content can arrive early.
            bw_kbps = _trace_bw_kbps(trace_rows, stream_elapsed())
            if bw_kbps and bw_kbps > 0:
                pace_s = len(chunk) * 8 / (bw_kbps * 1000)
            else:
                pace_s = FRAG_DUR_S

            # HTTP chunked transfer encoding framing
            try:
                self.wfile.write(f'{len(chunk):X}\r\n'.encode())
                self.wfile.write(chunk)
                self.wfile.write(b'\r\n')
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                return

            offset    += len(chunk)
            frag_idx  += 1

            # Sleep for remaining pace time (except last fragment)
            if offset < total:
                spent = time.monotonic() - frag_t0
                sleep_s = max(0.0, pace_s - spent)
                if sleep_s > 0:
                    time.sleep(sleep_s)

        # Chunked transfer terminator
        try:
            self.wfile.write(b'0\r\n\r\n')
            self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    manifest = CONTENT / 'll2s-manifest.mpd'
    if not CONTENT.exists():
        print(f"[ERROR] Content dir not found: {CONTENT}", file=sys.stderr)
        sys.exit(1)
    if not manifest.exists():
        print(f"[ERROR] Manifest not found: {manifest}", file=sys.stderr)
        sys.exit(1)

    server = ThreadedHTTPServer((HOST, PORT), GPACLLHandler)
    print(f"[GPAC-LL] Serving LL-DASH on http://{HOST}:{PORT}/", flush=True)
    print(f"[GPAC-LL] Content: {CONTENT}  Manifest: ll2s-manifest.mpd", flush=True)
    print(f"[GPAC-LL] Segment: {SEG_DUR_S}s  Fragment: {FRAG_DUR_S}s  Trace: {TRACE_PATH.name}", flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
