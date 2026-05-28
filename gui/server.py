#!/usr/bin/env python3
"""
Benchmarking GUI backend — Flask server.

Provides REST + SSE endpoints consumed by the single-page frontend.
"""

import csv
import json
import os
import queue
import re
import statistics
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from flask import Flask, jsonify, request, Response, send_from_directory

sys.path.insert(0, str(Path(__file__).parent))
import trace_gen as _tgen

ROOT        = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / 'results'
BENCHMARK   = ROOT / 'benchmark.py'

SYNTHETIC_DIR = ROOT / 'traces' / 'synthetic'
UPLOADED_DIR  = ROOT / 'traces' / 'uploaded'
SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)
UPLOADED_DIR.mkdir(parents=True, exist_ok=True)

TRACE_SETS = {
    'fcc-2021':       {'label': 'FCC 2021 – September',     'dir': ROOT / 'traces' / 'fcc',            'glob': '*.csv'},
    'starlink-2024':  {'label': 'Starlink 2024 (Mobile)',   'dir': ROOT / 'traces' / 'starlink-2024', 'glob': '*.csv'},
    '5g-ireland':     {'label': '5G/4G Ireland (UCC)',      'dir': ROOT / 'traces' / '5g-ireland',    'glob': '*.csv'},
    'synthetic':      {'label': 'Synthetic',                'dir': SYNTHETIC_DIR,                      'glob': '*.csv'},
    'uploaded':       {'label': 'Uploaded',                 'dir': UPLOADED_DIR,                       'glob': '*.csv'},
}
DEFAULT_TRACE_SET = 'fcc-2021'

app = Flask(__name__, static_folder='static', static_url_path='')

# ── active runs ──────────────────────────────────────────────────────────────
_runs = {}   # run_id → {proc, log_queue, status, ...}
_runs_lock = threading.Lock()


# ── helpers ──────────────────────────────────────────────────────────────────

PROTOCOLS = ['dash', 'lldash-gpac', 'hls', 'webrtc', 'moq2']

def _list_traces():
    result = {}
    for set_id, meta in TRACE_SETS.items():
        d = meta['dir']
        files = []
        if d.exists():
            for f in sorted(d.glob(meta.get('glob', '*.csv'))):
                files.append({'name': f.name, 'path': str(f)})
        result[set_id] = {'label': meta['label'], 'traces': files}
    return result

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
            dir_name = fpath.parent.name
            trace_set = dir_name[len(proto)+1:] if dir_name.startswith(proto + '_') else None
            md = r.get('metrics', {})
            entry = {
                'file':      str(fpath.relative_to(ROOT)),
                'timestamp': r.get('timestamp', ''),
                'protocol':  proto,
                'trace_set': trace_set,
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


TRACE_NETWORK_DIRS = {
    '5g-ireland':    (ROOT / 'traces' / '5g-ireland',    '*.csv'),
    'starlink-2024': (ROOT / 'traces' / 'starlink-2024', '*.csv'),
    'fcc':           (ROOT / 'traces' / 'fcc',           '*_tc.csv'),
}

NET_DISPLAY = {
    '5g-ireland':    '5G/4G Ireland',
    'starlink-2024': 'Starlink 2024',
    'fcc':           'FCC (3G)',
}

def _network_stats():
    result = {}
    for net_id, (trace_dir, glob) in TRACE_NETWORK_DIRS.items():
        traces = []
        all_bws = []
        for f in sorted(trace_dir.glob(glob)):
            bws, rtts = [], []
            try:
                with open(f, newline='') as fh:
                    for row in csv.DictReader(fh):
                        bw  = float(row.get('bandwidth_kbps') or 0)
                        rtt = float(row.get('rtt') or 0)
                        bws.append(bw)
                        if rtt > 0:
                            rtts.append(rtt)
            except Exception:
                continue
            if not bws:
                continue
            nonzero = [b for b in bws if b > 0]
            all_bws.extend(nonzero)
            traces.append({
                'name':      f.stem,
                'samples':   len(bws),
                'avg_bw':    round(statistics.mean(bws),  1),
                'median_bw': round(statistics.median(nonzero), 1) if nonzero else 0,
                'min_bw':    round(min(nonzero), 1)       if nonzero else 0,
                'max_bw':    round(max(nonzero), 1)       if nonzero else 0,
                'std_bw':    round(statistics.stdev(bws), 1) if len(bws) > 1 else 0,
                'cv':        round(statistics.stdev(bws) / statistics.mean(bws), 3)
                              if len(bws) > 1 and statistics.mean(bws) > 0 else 0,
                'avg_rtt':   round(statistics.mean(rtts), 1) if rtts else None,
            })

        if not all_bws:
            continue

        # histogram: 10 equal-width bins over [0, max_bw]
        lo, hi = 0.0, max(all_bws)
        step = (hi - lo) / 10 if hi > 0 else 1.0
        bins = [0] * 10
        for b in all_bws:
            idx = min(int((b - lo) / step), 9)
            bins[idx] += 1
        histogram = [
            {'lo': round(lo + i * step), 'hi': round(lo + (i+1) * step), 'count': bins[i]}
            for i in range(10)
        ]

        avg_bw = statistics.mean(all_bws)
        result[net_id] = {
            'label':     NET_DISPLAY.get(net_id, net_id),
            'count':     len(traces),
            'avg_bw':    round(avg_bw, 1),
            'median_bw': round(statistics.median(all_bws), 1),
            'min_bw':    round(min(all_bws), 1),
            'max_bw':    round(max(all_bws), 1),
            'std_bw':    round(statistics.stdev(all_bws), 1) if len(all_bws) > 1 else 0,
            'cv':        round(statistics.stdev(all_bws) / avg_bw, 3) if avg_bw > 0 else 0,
            'p10':       round(sorted(all_bws)[int(len(all_bws) * 0.10)], 1),
            'p90':       round(sorted(all_bws)[int(len(all_bws) * 0.90)], 1),
            'avg_rtt':   round(statistics.mean([t['avg_rtt'] for t in traces if t['avg_rtt'] is not None]), 1)
                          if any(t['avg_rtt'] for t in traces) else None,
            'histogram': histogram,
            'traces':    traces,
        }
    return result


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


@app.route('/api/network-stats')
def api_network_stats():
    return jsonify(_network_stats())


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
    body      = request.json or {}
    protocol  = body.get('protocol', 'dash')
    traces    = body.get('traces', [])   # list of trace filenames, empty = all
    trace_set = body.get('trace_set', DEFAULT_TRACE_SET)
    duration  = int(body.get('duration', 120))
    results_subdir = body.get('results_dir', f'gui_run_{int(time.time())}')

    if protocol not in PROTOCOLS:
        return jsonify({'error': f'unknown protocol {protocol}'}), 400
    if trace_set not in TRACE_SETS:
        return jsonify({'error': f'unknown trace_set {trace_set}'}), 400

    traces_dir = TRACE_SETS[trace_set]['dir']

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
            '--trace', str(traces_dir / traces[0]),
        ]
    elif traces:
        # multiple specific traces — run sequentially in background thread
        cmd = None  # handled below via multi-trace runner
    else:
        cmd = [
            sys.executable, '-u', str(BENCHMARK),
            '--protocol', protocol,
            '--duration', str(duration),
            '--results-dir', str(results_path),
            '--trace-dir', str(traces_dir),
        ]

    run_id = str(uuid.uuid4())[:8]
    log_q: queue.Queue = queue.Queue()

    with _runs_lock:
        _runs[run_id] = {
            'proc':        None,
            'log_queue':   log_q,
            'status':      'running',
            'protocol':    protocol,
            'trace_set':   trace_set,
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
                     '--trace', str(traces_dir / trace)]
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


@app.route('/api/upload-trace', methods=['POST'])
def api_upload_trace():
    f = request.files.get('file')
    if not f:
        return jsonify({'error': 'No file provided'}), 400
    if not f.filename.lower().endswith('.csv'):
        return jsonify({'error': 'Only CSV files are accepted'}), 400
    try:
        content = f.read().decode('utf-8')
    except UnicodeDecodeError:
        return jsonify({'error': 'File must be UTF-8 text'}), 400
    lines = [l for l in content.strip().splitlines() if l.strip()]
    if len(lines) < 2:
        return jsonify({'error': 'File has fewer than 2 rows'}), 400
    header = {h.strip() for h in lines[0].split(',')}
    required = {'since', 'relative_seconds', 'rtt', 'bandwidth_kbps'}
    if not required.issubset(header):
        missing = required - header
        return jsonify({'error': f'Missing columns: {", ".join(sorted(missing))}'}), 400
    safe = re.sub(r'[^a-zA-Z0-9_\-.]', '_', f.filename)
    (UPLOADED_DIR / safe).write_text(content)
    return jsonify({'ok': True, 'file': safe, 'rows': len(lines) - 1})


@app.route('/api/profiles')
def api_profiles():
    return jsonify(_tgen.PROFILE_PRESETS)


@app.route('/api/generate-trace', methods=['POST'])
def api_generate_trace():
    body   = request.json or {}
    model  = body.get('model', 'constant')
    params = body.get('params', {})
    name   = re.sub(r'[^a-zA-Z0-9_\-]', '_', (body.get('name') or '').strip())

    if not name:
        name = f'synth_{model}_{int(time.time())}'
    if not name.endswith('.csv'):
        name += '_tc.csv'

    try:
        stats = _tgen.generate(model, params, SYNTHETIC_DIR / name)
        return jsonify({'ok': True, 'file': name, 'stats': stats})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/synthetic-trace/<name>', methods=['DELETE'])
def api_delete_synthetic(name: str):
    safe = re.sub(r'[^a-zA-Z0-9_\-.]', '', name)
    fpath = SYNTHETIC_DIR / safe
    if not fpath.exists():
        return jsonify({'error': 'not found'}), 404
    fpath.unlink()
    return jsonify({'ok': True})


if __name__ == '__main__':
    port = int(os.getenv('GUI_PORT', '5000'))
    print(f'[GUI] Serving on http://0.0.0.0:{port}/', flush=True)
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
