#!/usr/bin/env python3
"""
LL-DASH Streaming Server

Dedicated HTTP server for low-latency DASH experiments.
Serves LL-DASH player UI and CMAF/DASH content from CONTENT_DIR.
"""

import json
import os
import subprocess
import threading
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler


PORT = int(os.getenv("PORT", 8081))
HOST = os.getenv("HOST", "0.0.0.0")
CONTENT_DIR = os.getenv("CONTENT_DIR", "/app/content")

_tc_trace_proc = None

def _do_start_shaping():
    global _tc_trace_proc
    subprocess.run(["pkill", "-f", "tc-trace.py"], capture_output=True)
    _tc_trace_proc = None
    _tc_trace_proc = subprocess.Popen(
        ["python3", "/app/tc-trace.py"],
        start_new_session=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"[SHAPING] tc-trace.py started (pid: {_tc_trace_proc.pid})")

def start_shaping():
    threading.Timer(0.3, _do_start_shaping).start()


class LLDASHHandler(SimpleHTTPRequestHandler):
    """HTTP handler for DASH content with CORS headers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=CONTENT_DIR, **kwargs)

    def guess_type(self, path):
        if path.endswith('.mpd'):
            return 'application/dash+xml'
        if path.endswith('.m4s'):
            return 'video/iso.segment'
        if path.endswith('.mp4'):
            return 'video/mp4'
        return super().guess_type(path)

    def end_headers(self):
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range')
        self.send_header('Access-Control-Expose-Headers', 'Content-Length, Content-Range')

        # Keep manifests fresh; segments can be cached.
        if self.path.endswith('.mpd'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        elif self.path.endswith('.m4s') and '/ll-' in self.path:
            # LL-DASH chunks should not be cached aggressively.
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        elif self.path.endswith('.m4s') or self.path.endswith('.mp4'):
            self.send_header('Cache-Control', 'public, max-age=86400')

        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/startShaping':
            start_shaping()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'message': 'tc-trace.py starting'}).encode())
            return
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'status': 'healthy',
                'service': 'll-dash-server',
                'timestamp': datetime.utcnow().isoformat(),
                'content_dir': CONTENT_DIR,
            }
            self.wfile.write(json.dumps(response).encode())
            return

        path_base = self.path.split('?')[0]
        if path_base in ('/', '/index.html', '/dash.all.min.js'):
            # Preserve query string for index so JS can read ?mpd= param,
            # but serve the file from /app not CONTENT_DIR.
            if path_base == '/':
                self.path = '/index.html' + (self.path[1:] if '?' in self.path else '')
            else:
                self.path = path_base
            old_dir = self.directory
            self.directory = '/app'
            super().do_GET()
            self.directory = old_dir
            return

        super().do_GET()

    def log_message(self, fmt, *args):
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {args[0]}")


def main():
    print("=" * 52)
    print("NetSail LL-DASH Streaming Server")
    print("=" * 52)
    print(f"Host: {HOST}")
    print(f"Port: {PORT}")
    print(f"Content Directory: {CONTENT_DIR}")
    print("")
    print("Endpoints:")
    print("  - GET /            - LL-DASH player")
    print("  - GET /health      - Health check")
    print("  - GET /<file>.mpd  - DASH manifest")
    print("=" * 52)

    server = HTTPServer((HOST, PORT), LLDASHHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down LL-DASH server...")
        server.shutdown()


if __name__ == '__main__':
    main()
