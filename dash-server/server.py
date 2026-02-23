#!/usr/bin/env python3
"""
DASH Streaming Server

A simple HTTP server optimized for serving DASH video content with:
- Proper MIME types for DASH segments
- CORS headers for cross-origin requests
- Health check endpoint
- Configurable via environment variables
"""

import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

# Configuration
PORT = int(os.getenv("PORT", 8080))
HOST = os.getenv("HOST", "0.0.0.0")
CONTENT_DIR = os.getenv("CONTENT_DIR", "/app/content")


class DASHHandler(SimpleHTTPRequestHandler):
    """HTTP handler with DASH-specific optimizations."""
    
    def __init__(self, *args, **kwargs):
        # Serve from content directory
        super().__init__(*args, directory=CONTENT_DIR, **kwargs)
    
    def guess_type(self, path):
        """Return proper MIME types for DASH content."""
        if path.endswith('.mpd'):
            return 'application/dash+xml'
        if path.endswith('.m4s'):
            return 'video/iso.segment'
        if path.endswith('.mp4'):
            return 'video/mp4'
        if path.endswith('.m4a'):
            return 'audio/mp4'
        return super().guess_type(path)
    
    def end_headers(self):
        """Add CORS and caching headers."""
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range')
        self.send_header('Access-Control-Expose-Headers', 'Content-Length, Content-Range')
        
        # Cache control for segments
        if self.path.endswith('.m4s'):
            self.send_header('Cache-Control', 'public, max-age=31536000')
        elif self.path.endswith('.mpd'):
            self.send_header('Cache-Control', 'no-cache')
        
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests with special endpoints."""
        # Health check endpoint
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'content_dir': CONTENT_DIR
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Serve static app files from /app directory
        if self.path in ('/', '/index.html', '/dash.all.min.js'):
            if self.path == '/':
                self.path = '/index.html'
            old_dir = self.directory
            self.directory = '/app'
            super().do_GET()
            self.directory = old_dir
            return
        
        # Default file serving
        super().do_GET()
    
    def log_message(self, format, *args):
        """Custom logging with timestamps."""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {args[0]}")


def main():
    """Start the DASH server."""
    print(f"=" * 50)
    print(f"NetSail DASH Streaming Server")
    print(f"=" * 50)
    print(f"Host: {HOST}")
    print(f"Port: {PORT}")
    print(f"Content Directory: {CONTENT_DIR}")
    print(f"")
    print(f"Endpoints:")
    print(f"  - GET /           - Video player")
    print(f"  - GET /health     - Health check")
    print(f"  - GET /manifest.mpd - DASH manifest")
    print(f"=" * 50)
    
    server = HTTPServer((HOST, PORT), DASHHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.shutdown()


if __name__ == "__main__":
    main()

