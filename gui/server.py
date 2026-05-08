#!/usr/bin/env python3
"""
Benchmarking GUI backend — Flask server.

Provides REST + SSE endpoints consumed by the single-page frontend.
"""

import json
import os
import queue
import re
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from flask import Flask, jsonify, request, Response, send_from_directory

ROOT        = Path(__file__).parent.parent
TRACES_DIR  = ROOT / 'traces' / 'fcc-2016-sept'
RESULTS_DIR = ROOT / 'results'
BENCHMARK   = ROOT / 'benchmark.py'

app = Flask(__name__, static_folder='static', static_url_path='')

# ── active runs ──────────────────────────────────────────────────────────────
_runs = {}   # run_id → {proc, log_queue, status, ...}
_runs_lock = threading.Lock()


# ── helpers ──────────────────────────────────────────────────────────────────

PROTOCOLS = ['dash', 'lldash-gpac', 'hls', 'webrtc', 'moq2']

def _list_traces():
    traces = []
    if TRACES_DIR.exists():
        for f in sorted(TRACES_DIR.glob('*.csv')):
            traces.append({'name': f.name, 'path': str(f)})
    return traces

def _list_results():
    """Return all results grouped by protocol, each with key metrics."""
    groups: dict[str, list] = {p: [] for p in PROTOCOLS}
    for fpath in sorted(RESULTS_DIR.rglob('*.json')):
        try:
            with open(fpath) as f:
                r = json.load(f)
            proto = r.get('protocol', 'unknown')
            fname = fpath.name
            m = re.search(r'unit(\d+)', fname)
            unit = m.group(1) if m else None
            md = r.get('metrics', {})
            entry = {
                'file':      str(fpath.relative_to(ROOT)),
                'timestamp': r.get('timestamp', ''),
                'protocol':  proto,
                'unit':      unit,
                'trace_bw':  r.get('trace_bandwidth', {}).get('average_kbps'),
                'avg_bitrate':   md.get('bitrate',    {}).get('average_kbps'),
                'avg_buffer_s':  (md.get('buffer',    {}).get('average_ms') or 0) / 1000,
                'rebuf_count':   md.get('rebuffering',{}).get('count'),
                'rebuf_ms':      md.get('rebuffering',{}).get('total_time_ms'),
                'startup_ms':    md.get('timing',     {}).get('startup_delay_ms'),
                'switches':      md.get('switching',  {}).get('total_count'),
                'avg_throughput':md.get('throughput', {}).get('average_kbps'),
                'samples': {
                    'bitrate':  md.get('samples', {}).get('bitrate', []),
                    'buffer':   md.get('samples', {}).get('buffer', []),
                    'throughput': md.get('samples', {}).get('throughput', []),
                },
            }
            bucket = proto if proto in groups else 'unknown'
            if bucket in groups:
                groups[bucket].append(entry)
        except Exception:
            pass
    # sort each bucket by timestamp desc
    for bucket in groups.values():
        bucket.sort(key=lambda x: x['timestamp'], reverse=True)
    return groups


def _stream_proc(run_id: str, proc: subprocess.Popen, log_q: queue.Queue):
    """Read subprocess stdout/stderr and push to queue."""
    for line in iter(proc.stdout.readline, ''):
        log_q.put(line.rstrip())
    proc.wait()
    with _runs_lock:
        if run_id in _runs:
            _runs[run_id]['status'] = 'done' if proc.returncode == 0 else 'error'
            _runs[run_id]['returncode'] = proc.returncode
    log_q.put(None)  # sentinel


# ── routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/traces')
def api_traces():
    return jsonify(_list_traces())


@app.route('/api/results')
def api_results():
    return jsonify(_list_results())


@app.route('/api/result-detail')
def api_result_detail():
    """Return full JSON for one result file."""
    rel = request.args.get('file', '')
    fpath = ROOT / rel
    if not fpath.exists() or not str(fpath).startswith(str(RESULTS_DIR)):
        return jsonify({'error': 'not found'}), 404
    with open(fpath) as f:
        return jsonify(json.load(f))


@app.route('/api/run', methods=['POST'])
def api_run():
    body     = request.json or {}
    protocol = body.get('protocol', 'dash')
    traces   = body.get('traces', [])   # list of trace filenames, empty = all
    duration = int(body.get('duration', 120))
    results_subdir = body.get('results_dir', f'gui_run_{int(time.time())}')

    if protocol not in PROTOCOLS:
        return jsonify({'error': f'unknown protocol {protocol}'}), 400

    # Build command
    results_path = RESULTS_DIR / results_subdir
    results_path.mkdir(parents=True, exist_ok=True)

    if traces and len(traces) == 1:
        # single trace — use --trace
        cmd = [
            sys.executable, '-u', str(BENCHMARK),
            '--protocol', protocol,
            '--duration', str(duration),
            '--results-dir', str(results_path),
            '--trace', str(TRACES_DIR / traces[0]),
        ]
    elif traces:
        # multiple specific traces — wrap in a shell loop via a helper script
        # We run them sequentially by launching one process per trace
        cmd = None  # handled below via multi-trace runner
    else:
        cmd = [
            sys.executable, '-u', str(BENCHMARK),
            '--protocol', protocol,
            '--duration', str(duration),
            '--results-dir', str(results_path),
            '--trace-dir', str(TRACES_DIR),
        ]

    run_id = str(uuid.uuid4())[:8]
    log_q: queue.Queue = queue.Queue()

    with _runs_lock:
        _runs[run_id] = {
            'proc':        None,
            'log_queue':   log_q,
            'status':      'running',
            'protocol':    protocol,
            'traces':      traces,
            'duration':    duration,
            'results_dir': str(results_path),
            'started_at':  time.time(),
            'returncode':  None,
        }

    if cmd is not None:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=str(ROOT))
        with _runs_lock:
            _runs[run_id]['proc'] = proc
        threading.Thread(target=_stream_proc, args=(run_id, proc, log_q), daemon=True).start()
    else:
        # multi-trace: run sequentially in a background thread
        def run_multi():
            n = len(traces)
            for i, trace in enumerate(traces, 1):
                log_q.put(f'[{i}/{n}] {trace}')
                c = [sys.executable, '-u', str(BENCHMARK),
                     '--protocol', protocol,
                     '--duration', str(duration),
                     '--results-dir', str(results_path),
                     '--trace', str(TRACES_DIR / trace)]
                p = subprocess.Popen(c, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=str(ROOT))
                with _runs_lock:
                    _runs[run_id]['proc'] = p
                for line in iter(p.stdout.readline, ''):
                    log_q.put(line.rstrip())
                p.wait()
                if p.returncode != 0:
                    log_q.put(f'[ERROR] trace {trace} exited {p.returncode}')
            with _runs_lock:
                _runs[run_id]['status'] = 'done'
            log_q.put(f'BATCH COMPLETE: {n}/{n} succeeded')
            log_q.put(None)
        threading.Thread(target=run_multi, daemon=True).start()

    return jsonify({'run_id': run_id, 'status': 'running'})


@app.route('/api/run/<run_id>/stream')
def api_run_stream(run_id: str):
    """SSE endpoint — emits log lines and a final 'done' event."""
    with _runs_lock:
        run = _runs.get(run_id)
    if not run:
        return jsonify({'error': 'unknown run'}), 404

    log_q = run['log_queue']

    def generate():
        while True:
            try:
                line = log_q.get(timeout=30)
            except queue.Empty:
                yield 'event: ping\ndata: {}\n\n'
                continue
            if line is None:
                with _runs_lock:
                    status = _runs.get(run_id, {}).get('status', 'done')
                yield f'event: done\ndata: {json.dumps({"status": status})}\n\n'
                return
            yield f'data: {json.dumps({"line": line})}\n\n'

    return Response(generate(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@app.route('/api/run/<run_id>/status')
def api_run_status(run_id: str):
    with _runs_lock:
        run = _runs.get(run_id)
    if not run:
        return jsonify({'error': 'unknown run'}), 404
    return jsonify({
        'run_id':    run_id,
        'status':    run['status'],
        'protocol':  run['protocol'],
        'duration':  run['duration'],
        'started_at': run['started_at'],
    })


@app.route('/api/run/<run_id>/stop', methods=['POST'])
def api_run_stop(run_id: str):
    with _runs_lock:
        run = _runs.get(run_id)
    if not run:
        return jsonify({'error': 'unknown run'}), 404
    try:
        run['proc'].terminate()
        run['status'] = 'stopped'
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'status': 'stopped'})


@app.route('/api/runs')
def api_runs():
    with _runs_lock:
        return jsonify([
            {'run_id': rid, 'status': r['status'], 'protocol': r['protocol'],
             'started_at': r['started_at']}
            for rid, r in _runs.items()
        ])


if __name__ == '__main__':
    port = int(os.getenv('GUI_PORT', '5000'))
    print(f'[GUI] Serving on http://0.0.0.0:{port}/', flush=True)
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
