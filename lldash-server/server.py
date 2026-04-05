#!/usr/bin/env python3
"""
LL-DASH Streaming Server

Dedicated HTTP server for low-latency DASH experiments.
Serves LL-DASH player UI and CMAF/DASH content from CONTENT_DIR.
"""

import json
import os
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler

CHUNK_SIZE = 65536  # 64 KiB read buffer for chunked transfer


PORT = int(os.getenv("PORT", 8081))
HOST = os.getenv("HOST", "0.0.0.0")
CONTENT_DIR = os.getenv("CONTENT_DIR", "/app/content")


class LLDASHHandler(SimpleHTTPRequestHandler):
    """HTTP handler with LL-DASH-friendly headers."""

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

    def send_head(self):
        """Use chunked transfer encoding for .m4s segments; fall back for everything else."""
        if self.path.split('?')[0].endswith('.m4s'):
            return self._send_head_chunked()
        return super().send_head()

    def _send_head_chunked(self):
        path = self.translate_path(self.path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, 'File not found')
            return None
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Transfer-Encoding', 'chunked')
        # No Content-Length — required for chunked encoding
        self._chunked_response = True
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        if getattr(self, '_chunked_response', False):
            self._chunked_response = False
            try:
                while True:
                    data = source.read(CHUNK_SIZE)
                    if not data:
                        break
                    outputfile.write(f'{len(data):X}\r\n'.encode())
                    outputfile.write(data)
                    outputfile.write(b'\r\n')
                outputfile.write(b'0\r\n\r\n')
                outputfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
        else:
            super().copyfile(source, outputfile)

    def end_headers(self):
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range')
        self.send_header('Access-Control-Expose-Headers', 'Content-Length, Content-Range')

        # Keep manifests fresh; segments can be cached.
        if self.path.endswith('.mpd'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        elif self.path.endswith('.m4s') or self.path.endswith('.mp4'):
            self.send_header('Cache-Control', 'public, max-age=86400')

        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
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

        if self.path in ('/', '/index.html'):
            old_dir = self.directory
            self.directory = '/app'
            self.path = '/index.html'
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
