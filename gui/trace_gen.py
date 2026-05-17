"""
Synthetic network trace generator.

Models implemented:
  constant   — fixed bandwidth baseline (BOLA, MPC papers)
  step       — square-wave alternation (Pensieve evaluation traces)
  sinusoidal — smooth periodic oscillation (Comyco, RobustMPC)
  markov     — Markov-modulated discrete states (Mao et al., SIGCOMM 2017)
  lognormal  — log-normal AR(1) process (Comyco / Oboe literature)
  profile    — 3GPP-calibrated presets (TR 38.901 / TR 36.942)

Output format: since,relative_seconds,rtt,bandwidth_kbps  (same as real traces)
"""
import csv
import math
import random
from pathlib import Path


# 3GPP-inspired presets.
# Mean / std values from: 3GPP TR 38.901 (5G NR), TR 36.942 (LTE),
# Huang et al. 2012 (Confused, Timely), and measured Starlink data.
PROFILE_PRESETS = {
    '3g':       {'label': '3G UMTS',        'mean_kbps': 750,    'std_kbps': 300,   'autocorr': 0.85, 'rtt_ms': 100},
    'hspa':     {'label': 'HSPA+',          'mean_kbps': 3000,   'std_kbps': 1200,  'autocorr': 0.85, 'rtt_ms': 70},
    'lte':      {'label': '4G LTE',         'mean_kbps': 10000,  'std_kbps': 5000,  'autocorr': 0.85, 'rtt_ms': 40},
    'lte_a':    {'label': 'LTE-Advanced',   'mean_kbps': 30000,  'std_kbps': 12000, 'autocorr': 0.82, 'rtt_ms': 30},
    '5g_nr':    {'label': '5G NR',          'mean_kbps': 100000, 'std_kbps': 40000, 'autocorr': 0.80, 'rtt_ms': 10},
    'wifi':     {'label': 'WiFi 802.11ac',  'mean_kbps': 50000,  'std_kbps': 10000, 'autocorr': 0.90, 'rtt_ms': 5},
    'satellite':{'label': 'Satellite-like', 'mean_kbps': 30000,  'std_kbps': 15000, 'autocorr': 0.75, 'rtt_ms': 600},
}


# ── random helpers ─────────────────────────────────────────────────────────────

def _randn():
    """Box-Muller standard normal sample."""
    u1 = max(random.random(), 1e-12)
    u2 = random.random()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def _randexp(mean):
    """Exponential sample with given mean."""
    return -mean * math.log(max(random.random(), 1e-12))


# ── model functions ────────────────────────────────────────────────────────────

def _constant(bw_kbps, rtt_ms, duration_s, interval_s):
    t, rows = 0.0, []
    while t <= duration_s:
        rows.append((t, rtt_ms, float(bw_kbps)))
        t += interval_s
    return rows


def _step(high_kbps, low_kbps, period_s, rtt_ms, duration_s, interval_s):
    t, rows = 0.0, []
    while t <= duration_s:
        bw = high_kbps if int(t / period_s) % 2 == 0 else low_kbps
        rows.append((t, rtt_ms, float(bw)))
        t += interval_s
    return rows


def _sinusoidal(min_kbps, max_kbps, period_s, rtt_ms, duration_s, interval_s):
    amp    = (max_kbps - min_kbps) / 2.0
    center = (max_kbps + min_kbps) / 2.0
    t, rows = 0.0, []
    while t <= duration_s:
        bw = max(50.0, center + amp * math.sin(2 * math.pi * t / period_s))
        rows.append((t, rtt_ms, bw))
        t += interval_s
    return rows


def _markov(states_kbps, mean_hold_s, rtt_ms, duration_s, interval_s):
    """
    Pensieve-style Markov-modulated bandwidth.
    Reference: Mao et al., "Real-World Performance of Adaptive Bitrate
               Algorithms", SIGCOMM 2017.
    Each state is held for an Exp(1/mean_hold_s) duration, then a
    uniformly-random different state is chosen.
    """
    states = [float(s) for s in states_kbps] or [500, 1000, 2000, 4000, 8000]
    state  = random.choice(states)
    next_t = _randexp(mean_hold_s)
    t, rows = 0.0, []
    while t <= duration_s:
        if t >= next_t:
            others = [s for s in states if s != state]
            state  = random.choice(others) if others else state
            next_t = t + _randexp(mean_hold_s)
        rows.append((t, rtt_ms, state))
        t += interval_s
    return rows


def _lognormal_ar1(mean_kbps, std_kbps, autocorr, rtt_ms, duration_s, interval_s):
    """
    Log-normal AR(1) process — closely matches empirical broadband traces.
    References:
      Huang et al., "Comyco: Quality-Aware Adaptive Video Streaming", MM 2019.
      Mok et al., "Measuring the Quality of Experience of HTTP Video Streaming",
                  IFIP/IEEE IM 2012.
      Achterberg et al., "Oboe: Auto-tuning Video ABR Algorithms to Network
                          Conditions", SIGCOMM 2018.
    """
    mean_kbps = max(float(mean_kbps), 50.0)
    std_kbps  = max(float(std_kbps),  1.0)
    autocorr  = max(0.0, min(float(autocorr), 0.999))

    sigma2  = math.log(1 + (std_kbps / mean_kbps) ** 2)
    mu      = math.log(mean_kbps) - sigma2 / 2.0
    sigma   = math.sqrt(sigma2)
    max_bw  = mean_kbps * 6.0

    t, rows  = 0.0, []
    prev_log = mu
    while t <= duration_s:
        noise   = _randn() * sigma * math.sqrt(1.0 - autocorr ** 2)
        log_bw  = autocorr * prev_log + (1.0 - autocorr) * mu + noise
        bw      = max(50.0, min(math.exp(log_bw), max_bw))
        rows.append((t, rtt_ms, bw))
        prev_log = log_bw
        t += interval_s
    return rows


# ── CSV writer ─────────────────────────────────────────────────────────────────

def _write_csv(rows, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['since', 'relative_seconds', 'rtt', 'bandwidth_kbps'])
        for t, rtt, bw in rows:
            w.writerow([round(t, 3), round(t, 3), round(rtt, 2), round(bw, 1)])


# ── public API ─────────────────────────────────────────────────────────────────

def generate(model: str, params: dict, output_path: Path) -> dict:
    """
    Generate a synthetic trace and write it to output_path.
    Returns summary statistics.
    """
    duration_s = float(params.get('duration_s', 120))
    interval_s = float(params.get('interval_s', 1.0))
    interval_s = max(0.1, interval_s)

    if model == 'constant':
        rows = _constant(
            bw_kbps=float(params.get('bw_kbps', 5000)),
            rtt_ms=float(params.get('rtt_ms', 20)),
            duration_s=duration_s, interval_s=interval_s,
        )
    elif model == 'step':
        rows = _step(
            high_kbps=float(params.get('high_kbps', 10000)),
            low_kbps=float(params.get('low_kbps', 1000)),
            period_s=max(1.0, float(params.get('period_s', 30))),
            rtt_ms=float(params.get('rtt_ms', 20)),
            duration_s=duration_s, interval_s=interval_s,
        )
    elif model == 'sinusoidal':
        rows = _sinusoidal(
            min_kbps=float(params.get('min_kbps', 1000)),
            max_kbps=float(params.get('max_kbps', 15000)),
            period_s=max(1.0, float(params.get('period_s', 60))),
            rtt_ms=float(params.get('rtt_ms', 20)),
            duration_s=duration_s, interval_s=interval_s,
        )
    elif model == 'markov':
        raw = params.get('states_kbps', [500, 1000, 2000, 4000, 8000])
        if isinstance(raw, str):
            raw = [float(x.strip()) for x in raw.split(',') if x.strip()]
        rows = _markov(
            states_kbps=raw,
            mean_hold_s=max(0.5, float(params.get('mean_hold_s', 5))),
            rtt_ms=float(params.get('rtt_ms', 20)),
            duration_s=duration_s, interval_s=interval_s,
        )
    elif model == 'lognormal':
        rows = _lognormal_ar1(
            mean_kbps=float(params.get('mean_kbps', 5000)),
            std_kbps=float(params.get('std_kbps', 2000)),
            autocorr=float(params.get('autocorr', 0.8)),
            rtt_ms=float(params.get('rtt_ms', 20)),
            duration_s=duration_s, interval_s=interval_s,
        )
    elif model == 'profile':
        p = PROFILE_PRESETS.get(params.get('profile', 'lte'), PROFILE_PRESETS['lte'])
        rows = _lognormal_ar1(
            mean_kbps=p['mean_kbps'],
            std_kbps=p['std_kbps'],
            autocorr=p['autocorr'],
            rtt_ms=p['rtt_ms'],
            duration_s=duration_s, interval_s=interval_s,
        )
    else:
        raise ValueError(f'Unknown model: {model!r}')

    _write_csv(rows, output_path)

    bws = [r[2] for r in rows]
    return {
        'rows':     len(rows),
        'avg_bw':   round(sum(bws) / len(bws)),
        'min_bw':   round(min(bws)),
        'max_bw':   round(max(bws)),
        'std_bw':   round(math.sqrt(sum((b - sum(bws)/len(bws))**2 for b in bws) / len(bws))),
        'duration': duration_s,
        'file':     output_path.name,
    }
