#!/usr/bin/env python3
"""
NetSail Analytics Server
Serves the benchmark results web app and REST API.

Usage:
    python3 analytics/server.py
    python3 analytics/server.py --port 8888 --results results/hsdpa_comparison
"""

import argparse
import json
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

ANALYTICS_DIR = Path(__file__).parent
DEFAULT_RESULTS_DIR = ANALYTICS_DIR.parent / "results"


def parse_filename(fname: str):
    """Extract (protocol, trace, timestamp) from benchmark JSON filename."""
    m = re.match(r'benchmark_([a-z]+)_(.+)_(\d{8}_\d{6})\.json$', fname)
    if m:
        return m.group(1), m.group(2), m.group(3)
    return None, None, None


def load_results(results_dir: Path) -> list:
    results = []
    if not results_dir.exists():
        return results
    for f in sorted(results_dir.glob("benchmark_*.json")):
        try:
            protocol, trace, ts = parse_filename(f.name)
            if not protocol:
                continue
            with open(f) as fp:
                data = json.load(fp)
            data['_file'] = f.name
            data['_protocol'] = protocol
            data['_trace'] = trace
            data['_ts'] = ts
            results.append(data)
        except Exception:
            pass
    # Also scan one level deep (subdirectories like hsdpa_comparison/)
    for subdir in sorted(results_dir.iterdir()):
        if subdir.is_dir():
            for f in sorted(subdir.glob("benchmark_*.json")):
                try:
                    protocol, trace, ts = parse_filename(f.name)
                    if not protocol:
                        continue
                    with open(f) as fp:
                        data = json.load(fp)
                    data['_file'] = str(subdir.name + '/' + f.name)
                    data['_protocol'] = protocol
                    data['_trace'] = trace
                    data['_ts'] = ts
                    data['_subdir'] = subdir.name
                    results.append(data)
                except Exception:
                    pass
    return results


class Handler(BaseHTTPRequestHandler):
    results_dir: Path = DEFAULT_RESULTS_DIR

    def do_GET(self):
        path = self.path.split('?')[0]
        if path in ('/', '/index.html'):
            self._serve_file(ANALYTICS_DIR / 'index.html', 'text/html; charset=utf-8')
        elif path == '/api/results':
            self._serve_json(load_results(self.results_dir))
        elif path == '/api/protocols':
            results = load_results(self.results_dir)
            protocols = sorted(set(r['_protocol'] for r in results))
            self._serve_json(protocols)
        else:
            self.send_error(404)

    def _serve_file(self, p: Path, content_type: str):
        try:
            data = p.read_bytes()
        except FileNotFoundError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

    def _serve_json(self, obj):
        # Replace NaN/Infinity with null so browsers can parse the JSON
        import math
        def sanitize(o):
            if isinstance(o, float) and (math.isnan(o) or math.isinf(o)):
                return None
            if isinstance(o, dict):
                return {k: sanitize(v) for k, v in o.items()}
            if isinstance(o, list):
                return [sanitize(v) for v in o]
            return o
        data = json.dumps(sanitize(obj)).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        import sys
        print(f"[REQ] {self.address_string()} {fmt % args}", file=sys.stderr, flush=True)


def main():
    parser = argparse.ArgumentParser(description='NetSail Analytics Server')
    parser.add_argument('--port', type=int, default=8888)
    parser.add_argument('--results', type=str, default=str(DEFAULT_RESULTS_DIR),
                        help='Path to results directory (scans subdirs too)')
    args = parser.parse_args()

    Handler.results_dir = Path(args.results)
    print(f"NetSail Analytics  →  http://localhost:{args.port}")
    print(f"Results directory  →  {Handler.results_dir}")
    HTTPServer(('0.0.0.0', args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
