#!/usr/bin/env python3
"""
NetSail Streaming Benchmark — Analysis Script

Loads benchmark JSON results, prints a summary table, and saves comparison
plots (startup delay, effective bitrate, rebuffering, switches, utilization).

Usage:
    python3 analytics/analysis.py
    python3 analytics/analysis.py --results results/fcc2016_sept --output plots/
"""

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path

import matplotlib
matplotlib.use('Agg')  # headless — no display needed
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np


# ── colour palette (matches web UI) ──────────────────────────────────────────
COLORS = {
    'dash':   '#3b82f6',
    'lldash': '#2dd4bf',
    'hls':    '#fb923c',
    'webrtc': '#a78bfa',
}
BG   = '#0d1821'
CARD = '#111c27'
TEXT = '#cdd8e3'
MUTED = '#4e6a85'

plt.rcParams.update({
    'figure.facecolor':  BG,
    'axes.facecolor':    CARD,
    'axes.edgecolor':    MUTED,
    'axes.labelcolor':   TEXT,
    'xtick.color':       MUTED,
    'ytick.color':       MUTED,
    'text.color':        TEXT,
    'grid.color':        MUTED,
    'grid.alpha':        0.3,
    'legend.facecolor':  CARD,
    'legend.edgecolor':  MUTED,
    'font.size':         10,
})


# ── data loading ──────────────────────────────────────────────────────────────

def parse_filename(name: str):
    """Return (protocol, trace_id) from a benchmark JSON filename."""
    m = re.match(r'benchmark_([a-z]+)_(.+)_\d{8}_\d{6}\.json$', name)
    if m:
        return m.group(1), m.group(2)
    return None, None


def load_results(results_dir: Path) -> dict:
    """
    Load all benchmark JSONs from results_dir.
    Returns dict: protocol -> list of record dicts, each with flattened metrics.
    """
    by_protocol = {}
    for f in sorted(results_dir.glob('benchmark_*.json')):
        proto, trace_id = parse_filename(f.name)
        if not proto:
            continue
        try:
            raw = json.loads(f.read_text())
        except Exception as e:
            print(f'[WARN] Could not parse {f.name}: {e}')
            continue

        m = raw.get('metrics', {})
        rec = {
            'file':        f.name,
            'protocol':    proto,
            'trace_id':    trace_id,
            # timing
            'startup_ms':  m.get('timing', {}).get('startup_delay_ms', 0),
            'playtime_ms': m.get('timing', {}).get('total_playback_time_ms', 0),
            # bitrate
            'bitrate_sel': m.get('bitrate', {}).get('average_kbps', 0),
            'bitrate_eff': m.get('bitrate', {}).get('effective_average_kbps', 0),
            'bitrate_min': m.get('bitrate', {}).get('min_kbps', 0),
            'bitrate_max': m.get('bitrate', {}).get('max_kbps', 0),
            'bitrate_std': m.get('bitrate', {}).get('std_dev', 0),
            # switching
            'switches':    m.get('switching', {}).get('total_count', 0),
            'sw_up':       m.get('switching', {}).get('up_count', 0),
            'sw_down':     m.get('switching', {}).get('down_count', 0),
            # rebuffering
            'rebuf_ratio': m.get('rebuffering', {}).get('ratio', 0) * 100,
            'rebuf_count': m.get('rebuffering', {}).get('count', 0),
            'rebuf_ms':    m.get('rebuffering', {}).get('total_time_ms', 0),
            # throughput / utilization
            # Use trace_bandwidth.average_kbps as denominator when available
            # (correct available BW from tc/netem trace). Falls back to the
            # metrics-derived value for WebRTC which uses BWE as throughput.
            'throughput':  m.get('throughput', {}).get('average_kbps', 0),
            '_avg_trace_bw': raw.get('trace_bandwidth', {}).get('average_kbps', 0),
            'bw_util':     (
                raw['metrics']['bitrate']['average_kbps'] /
                raw['trace_bandwidth']['average_kbps'] * 100
                if raw.get('trace_bandwidth', {}).get('average_kbps', 0) > 0
                else m.get('utilization', {}).get('bandwidth_utilization', 0) * 100
            ),
            # WebRTC-specific
            'packet_loss': (raw.get('webrtc_specific', {})
                               .get('packet_loss', {})
                               .get('average_percent', None)),
            # bitrate samples for CDF
            '_bitrate_samples': m.get('samples', {}).get('bitrate', []),
        }
        by_protocol.setdefault(proto, []).append(rec)

    return by_protocol


# ── statistics helpers ────────────────────────────────────────────────────────

def _vals(records, key):
    return [r[key] for r in records if r[key] is not None and math.isfinite(r[key])]

def mean(xs):  return sum(xs) / len(xs) if xs else 0
def std(xs):
    if len(xs) < 2: return 0
    m = mean(xs)
    return math.sqrt(sum((x - m)**2 for x in xs) / len(xs))
def median(xs):
    s = sorted(xs)
    n = len(s)
    return (s[n//2] + s[(n-1)//2]) / 2 if n else 0
def cdf(xs):
    s = sorted(xs)
    n = len(s)
    return s, [i / n for i in range(1, n + 1)]


# ── summary table ─────────────────────────────────────────────────────────────

METRICS = [
    ('startup_ms',   'Startup delay (ms)'),
    ('bitrate_sel',  'Avg bitrate selected (kbps)'),
    ('bitrate_eff',  'Avg bitrate effective (kbps)'),
    ('bitrate_min',  'Min bitrate (kbps)'),
    ('bitrate_max',  'Max bitrate (kbps)'),
    ('bitrate_std',  'Bitrate std dev (kbps)'),
    ('switches',     'Quality switches'),
    ('rebuf_ratio',  'Rebuffer ratio (%)'),
    ('rebuf_count',  'Rebuffer events'),
    ('rebuf_ms',     'Rebuffer total (ms)'),
    ('throughput',   'Avg throughput / trace BW (kbps)'),
    ('bw_util',      'BW utilization (%)'),
]

def print_summary(by_protocol):
    protocols = sorted(by_protocol.keys())
    col_w = 14
    header = f"{'Metric':<42}" + ''.join(f"{p.upper():>{col_w}}" for p in protocols)
    print('\n' + '=' * len(header))
    print('  AGGREGATE SUMMARY')
    print('=' * len(header))
    print(header)
    print('-' * len(header))

    for key, label in METRICS:
        row = f"  {label:<40}"
        for p in protocols:
            vals = _vals(by_protocol[p], key)
            row += f"  {mean(vals):>{col_w-2}.1f}"
        print(row)

    # Packet loss (WebRTC only)
    row = f"  {'Packet loss % [WebRTC only]':<40}"
    for p in protocols:
        if p == 'webrtc':
            vals = _vals(by_protocol[p], 'packet_loss')
            row += f"  {mean(vals):>{col_w-2}.1f}"
        else:
            row += f"  {'N/A':>{col_w-2}}"
    print(row)

    print('-' * len(header))
    n_line = f"  {'Traces':<40}"
    for p in protocols:
        n_line += f"  {len(by_protocol[p]):>{col_w-2}}"
    print(n_line)
    print('=' * len(header) + '\n')


# ── plotting ──────────────────────────────────────────────────────────────────

def _color(proto):
    return COLORS.get(proto, '#ffffff')


def fig_summary_bars(by_protocol, out_dir):
    """Side-by-side bar chart of key QoE metrics (mean across traces)."""
    metrics = [
        ('startup_ms',  'Startup\nDelay (ms)'),
        ('bitrate_eff', 'Effective\nBitrate (kbps)'),
        ('rebuf_ratio',  'Rebuffer\nRatio (%)'),
        ('switches',    'Quality\nSwitches'),
        ('bw_util',     'BW\nUtil (%)'),
    ]
    protocols = sorted(by_protocol.keys())
    n_metrics = len(metrics)
    n_proto   = len(protocols)
    x = np.arange(n_metrics)
    width = 0.7 / n_proto

    fig, ax = plt.subplots(figsize=(11, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(CARD)

    for i, proto in enumerate(protocols):
        vals = [mean(_vals(by_protocol[proto], k)) for k, _ in metrics]
        errs = [std(_vals(by_protocol[proto], k))  for k, _ in metrics]
        offset = (i - (n_proto - 1) / 2) * width
        bars = ax.bar(x + offset, vals, width * 0.9, yerr=errs,
                      label=proto.upper(), color=_color(proto),
                      error_kw={'ecolor': TEXT, 'capsize': 3, 'linewidth': 1},
                      alpha=0.9)
        for bar, v in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(errs) * 0.05,
                    f'{v:.0f}', ha='center', va='bottom', fontsize=8, color=TEXT)

    ax.set_xticks(x)
    ax.set_xticklabels([label for _, label in metrics])
    ax.set_ylabel('Mean value (across all traces)')
    ax.set_title('QoE Metric Comparison — Mean ± Std Dev', color=TEXT, pad=12)
    ax.legend(facecolor=CARD, edgecolor=MUTED)
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)

    fig.tight_layout()
    path = out_dir / 'summary_bars.png'
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor=BG)
    plt.close(fig)
    print(f'  [SAVED] {path}')


def fig_cdfs(by_protocol, out_dir):
    """CDF plots: startup delay, effective bitrate, rebuffer ratio."""
    plots = [
        ('startup_ms',  'Startup Delay (ms)',     False),
        ('bitrate_eff', 'Effective Bitrate (kbps)', False),
        ('rebuf_ratio',  'Rebuffer Ratio (%)',      False),
    ]
    fig, axes = plt.subplots(1, 3, figsize=(14, 4))
    fig.patch.set_facecolor(BG)

    for ax, (key, xlabel, _) in zip(axes, plots):
        ax.set_facecolor(CARD)
        for proto, records in sorted(by_protocol.items()):
            vals = _vals(records, key)
            if not vals:
                continue
            xs, ys = cdf(vals)
            ax.plot(xs, ys, color=_color(proto), label=proto.upper(), linewidth=2)
            ax.axvline(mean(vals), color=_color(proto), linestyle='--',
                       linewidth=1, alpha=0.6)

        ax.set_xlabel(xlabel)
        ax.set_ylabel('CDF')
        ax.set_ylim(0, 1)
        ax.set_title(f'CDF: {xlabel}', color=TEXT, pad=8)
        ax.legend(facecolor=CARD, edgecolor=MUTED, fontsize=8)
        ax.grid(alpha=0.3)
        ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)

    fig.suptitle('Cumulative Distribution Functions (dashed = mean)',
                 color=TEXT, fontsize=11, y=1.02)
    fig.tight_layout()
    path = out_dir / 'cdfs.png'
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor=BG)
    plt.close(fig)
    print(f'  [SAVED] {path}')


def fig_per_trace(by_protocol, out_dir):
    """Per-trace grouped bar: effective bitrate and startup delay."""
    all_traces = sorted(set(
        r['trace_id'] for recs in by_protocol.values() for r in recs
    ))
    # Short trace labels
    labels = [t.split('_unit')[-1].replace('_tc', '') for t in all_traces]

    protocols = sorted(by_protocol.keys())
    n_traces  = len(all_traces)
    n_proto   = len(protocols)
    x = np.arange(n_traces)
    width = 0.7 / n_proto

    fig, axes = plt.subplots(2, 1, figsize=(12, 8), sharex=True)
    fig.patch.set_facecolor(BG)

    for ax, (key, ylabel) in zip(axes, [
        ('bitrate_eff', 'Effective Bitrate (kbps)'),
        ('startup_ms',  'Startup Delay (ms)'),
    ]):
        ax.set_facecolor(CARD)
        for i, proto in enumerate(protocols):
            idx = {r['trace_id']: r for r in by_protocol[proto]}
            vals = [idx[t][key] if t in idx else 0 for t in all_traces]
            offset = (i - (n_proto - 1) / 2) * width
            ax.bar(x + offset, vals, width * 0.9,
                   label=proto.upper(), color=_color(proto), alpha=0.9)

        ax.set_ylabel(ylabel)
        ax.legend(facecolor=CARD, edgecolor=MUTED, fontsize=8)
        ax.grid(axis='y', alpha=0.3)
        ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)

    axes[-1].set_xticks(x)
    axes[-1].set_xticklabels(labels, rotation=30, ha='right', fontsize=8)
    axes[-1].set_xlabel('Trace unit ID')
    fig.suptitle('Per-Trace Results', color=TEXT, fontsize=11)
    fig.tight_layout()
    path = out_dir / 'per_trace.png'
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor=BG)
    plt.close(fig)
    print(f'  [SAVED] {path}')


def fig_bitrate_box(by_protocol, out_dir):
    """Box plot of per-trace effective bitrate per protocol."""
    protocols = sorted(by_protocol.keys())
    data = [_vals(by_protocol[p], 'bitrate_eff') for p in protocols]
    colors = [_color(p) for p in protocols]

    fig, ax = plt.subplots(figsize=(6, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(CARD)

    bp = ax.boxplot(data, patch_artist=True, notch=False,
                    medianprops={'color': TEXT, 'linewidth': 2},
                    whiskerprops={'color': MUTED},
                    capprops={'color': MUTED},
                    flierprops={'markerfacecolor': MUTED, 'markersize': 4})
    for patch, col in zip(bp['boxes'], colors):
        patch.set_facecolor(col)
        patch.set_alpha(0.7)

    ax.set_xticks(range(1, len(protocols) + 1))
    ax.set_xticklabels([p.upper() for p in protocols])
    ax.set_ylabel('Effective Bitrate (kbps)')
    ax.set_title('Bitrate Distribution by Protocol', color=TEXT, pad=10)
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)

    fig.tight_layout()
    path = out_dir / 'bitrate_boxplot.png'
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor=BG)
    plt.close(fig)
    print(f'  [SAVED] {path}')


def fig_webrtc_packet_loss(by_protocol, out_dir):
    """Per-trace WebRTC packet loss bar chart."""
    if 'webrtc' not in by_protocol:
        return
    records = sorted(by_protocol['webrtc'], key=lambda r: r['trace_id'])
    labels = [r['trace_id'].split('_unit')[-1].replace('_tc', '') for r in records]
    losses = [r['packet_loss'] or 0 for r in records]

    fig, ax = plt.subplots(figsize=(9, 4))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(CARD)

    bars = ax.bar(range(len(labels)), losses, color=_color('webrtc'), alpha=0.85)
    ax.axhline(mean(losses), color=TEXT, linestyle='--', linewidth=1.2,
               label=f'Mean {mean(losses):.1f}%')
    for bar, v in zip(bars, losses):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 0.3,
                f'{v:.1f}', ha='center', va='bottom', fontsize=8, color=TEXT)

    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=30, ha='right', fontsize=8)
    ax.set_ylabel('Avg Packet Loss (%)')
    ax.set_title('WebRTC Packet Loss per Trace', color=TEXT, pad=10)
    ax.legend(facecolor=CARD, edgecolor=MUTED)
    ax.grid(axis='y', alpha=0.3)
    ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)

    fig.tight_layout()
    path = out_dir / 'webrtc_packet_loss.png'
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor=BG)
    plt.close(fig)
    print(f'  [SAVED] {path}')


def fig_utilization_scatter(by_protocol, out_dir):
    """Scatter: effective bitrate vs throughput (trace BW), coloured by protocol."""
    fig, ax = plt.subplots(figsize=(7, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(CARD)

    for proto, records in sorted(by_protocol.items()):
        xs = _vals(records, 'throughput')
        ys = _vals(records, 'bitrate_eff')
        if not xs:
            continue
        ax.scatter(xs, ys, color=_color(proto), label=proto.upper(),
                   s=70, alpha=0.85, zorder=3)

    # 45° perfect-utilization line
    lim = ax.get_xlim()
    ax.plot(lim, lim, color=MUTED, linestyle='--', linewidth=1, label='100% util')
    ax.set_xlim(lim)

    ax.set_xlabel('Available BW / Trace (kbps)')
    ax.set_ylabel('Effective Bitrate (kbps)')
    ax.set_title('Bitrate vs Available Bandwidth', color=TEXT, pad=10)
    ax.legend(facecolor=CARD, edgecolor=MUTED)
    ax.grid(alpha=0.3)
    ax.spines['top'].set_visible(False); ax.spines['right'].set_visible(False)

    fig.tight_layout()
    path = out_dir / 'utilization_scatter.png'
    fig.savefig(path, dpi=150, bbox_inches='tight', facecolor=BG)
    plt.close(fig)
    print(f'  [SAVED] {path}')


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='NetSail Benchmark Analysis')
    parser.add_argument('--results', default='results/fcc2016_sept',
                        help='Directory containing benchmark JSON files')
    parser.add_argument('--output',  default=None,
                        help='Output directory for plots (default: <results>/plots)')
    args = parser.parse_args()

    results_dir = Path(args.results)
    if not results_dir.exists():
        print(f'[ERROR] Results directory not found: {results_dir}')
        sys.exit(1)

    out_dir = Path(args.output) if args.output else results_dir / 'plots'
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'\nLoading results from: {results_dir}')
    by_protocol = load_results(results_dir)

    if not by_protocol:
        print('[ERROR] No benchmark_*.json files found.')
        sys.exit(1)

    total = sum(len(v) for v in by_protocol.values())
    proto_counts = ', '.join(f'{len(v)} {p}' for p, v in sorted(by_protocol.items()))
    print(f'Loaded {total} results ({proto_counts})')

    print_summary(by_protocol)

    print(f'Generating plots → {out_dir}/')
    fig_summary_bars(by_protocol, out_dir)
    fig_cdfs(by_protocol, out_dir)
    fig_per_trace(by_protocol, out_dir)
    fig_bitrate_box(by_protocol, out_dir)
    fig_webrtc_packet_loss(by_protocol, out_dir)
    fig_utilization_scatter(by_protocol, out_dir)
    print('\nDone.')


if __name__ == '__main__':
    main()
