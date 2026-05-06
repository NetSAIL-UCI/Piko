#!/usr/bin/env python3
"""
Streaming Benchmark Tool (DASH + WebRTC)

Measures streaming performance metrics:
- Average/min/max bitrate and variance
- Bitrate switches and switch magnitude
- Rebuffering time, ratio, and frequency
- Startup delay
- Throughput statistics
- Buffer health metrics
- Bandwidth utilization

Supports both DASH and WebRTC (mediasoup) protocols for comparison.
"""

import argparse
import json 
import time
import sys
import math
import shutil
import subprocess
import requests
import xml.etree.ElementTree as ET
import asyncio
import uuid
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from pathlib import Path

# Progress bar - fallback if tqdm not available
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

# aiortc for WebRTC - optional
try:
    from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer
    from aiortc.contrib.media import MediaRecorder, MediaBlackhole
    HAS_AIORTC = True
except ImportError:
    HAS_AIORTC = False


def print_progress(current: int, total: int, prefix: str = "", suffix: str = "", width: int = 40):
    """Simple progress bar fallback (used by WebRTC benchmark)."""
    percent = current / total if total > 0 else 0
    filled = int(width * percent)
    bar = "█" * filled + "░" * (width - filled)
    sys.stdout.write(f"\r{prefix} |{bar}| {current}/{total} {suffix}")
    sys.stdout.flush()
    if current >= total:
        print()


@dataclass
class SegmentMetrics:
    """Metrics for a single segment download."""
    segment_number: int
    timestamp: float
    bitrate_kbps: int
    resolution: str
    size_bytes: int
    download_time_ms: float
    throughput_kbps: float
    buffer_level_ms: float
    stalled: bool = False
    stall_duration_ms: float = 0


@dataclass 
class StreamingMetrics:
    """Comprehensive streaming performance metrics."""
    # Timing
    startup_delay_ms: float = 0
    total_playback_time_ms: float = 0
    
    # Bitrate metrics
    bitrate_samples: List[int] = field(default_factory=list)
    avg_bitrate_kbps: float = 0          # Selected representation avg (excludes stall periods)
    effective_avg_bitrate_kbps: float = 0  # Weighted by play/(play+stall) — true delivery rate
    min_bitrate_kbps: float = 0
    max_bitrate_kbps: float = 0
    bitrate_std_dev: float = 0
    bitrate_variance: float = 0
    bitrate_25th_percentile: float = 0
    bitrate_75th_percentile: float = 0
    bitrate_median: float = 0
    
    # Switching metrics
    bitrate_switches: int = 0
    switch_magnitude_total: int = 0  # Sum of |old - new| for all switches
    avg_switch_magnitude: float = 0
    switch_up_count: int = 0  # Switches to higher quality
    switch_down_count: int = 0  # Switches to lower quality
    
    # Rebuffering metrics
    rebuffer_count: int = 0
    rebuffer_time_ms: float = 0
    rebuffer_ratio: float = 0  # rebuffer_time / total_time
    rebuffer_frequency: float = 0  # rebuffers per minute
    avg_rebuffer_duration_ms: float = 0
    max_rebuffer_duration_ms: float = 0
    
    # Throughput metrics
    throughput_samples: List[float] = field(default_factory=list)
    avg_throughput_kbps: float = 0
    median_throughput_kbps: float = 0
    min_throughput_kbps: float = 0
    max_throughput_kbps: float = 0
    throughput_std_dev: float = 0
    throughput_variance: float = 0
    
    # Buffer metrics
    buffer_samples: List[float] = field(default_factory=list)
    avg_buffer_level_ms: float = 0
    min_buffer_level_ms: float = 0
    max_buffer_level_ms: float = 0
    time_below_safe_buffer_ms: float = 0  # Time with buffer < 10s
    
    # Bandwidth utilization
    # Apples-to-apples: avg_bitrate / median(trace_capacity). Falls back to
    # measured throughput only if trace samples are missing.
    bandwidth_utilization: float = 0
    trace_bandwidth_samples: List[float] = field(default_factory=list)
    
    # Segment statistics
    total_segments: int = 0
    failed_segments: int = 0
    
    # Raw data
    segments: List[SegmentMetrics] = field(default_factory=list)
    rebuffer_durations: List[float] = field(default_factory=list)
    
    def calculate_statistics(self, max_bitrate: int = 3000):
        """Calculate all streaming statistics."""
        if not self.bitrate_samples:
            return
        
        # Bitrate statistics
        self.avg_bitrate_kbps = sum(self.bitrate_samples) / len(self.bitrate_samples)
        self.min_bitrate_kbps = min(self.bitrate_samples)
        self.max_bitrate_kbps = max(self.bitrate_samples)

        # Effective average bitrate — penalises stall periods by weighting
        # avg_bitrate by the fraction of time the player was actually playing.
        # During rebuffering the delivered bitrate is 0, so the true average is:
        #   effective = avg_bitrate × play_time / (play_time + stall_time)
        total_wall = self.total_playback_time_ms + self.rebuffer_time_ms
        if total_wall > 0:
            self.effective_avg_bitrate_kbps = self.avg_bitrate_kbps * (self.total_playback_time_ms / total_wall)
        else:
            self.effective_avg_bitrate_kbps = self.avg_bitrate_kbps
        
        # Standard deviation and variance
        mean = self.avg_bitrate_kbps
        self.bitrate_variance = sum((x - mean) ** 2 for x in self.bitrate_samples) / len(self.bitrate_samples)
        self.bitrate_std_dev = self.bitrate_variance ** 0.5
        
        # Percentiles
        sorted_bitrates = sorted(self.bitrate_samples)
        n = len(sorted_bitrates)
        self.bitrate_median = sorted_bitrates[n // 2]
        self.bitrate_25th_percentile = sorted_bitrates[n // 4]
        self.bitrate_75th_percentile = sorted_bitrates[3 * n // 4]
        
        # Switching statistics
        if self.bitrate_switches > 0:
            self.avg_switch_magnitude = self.switch_magnitude_total / self.bitrate_switches
        
        # Rebuffer statistics
        total_time = self.total_playback_time_ms + self.rebuffer_time_ms
        if total_time > 0:
            self.rebuffer_ratio = self.rebuffer_time_ms / total_time
        
        # Rebuffer frequency (per minute)
        playback_minutes = self.total_playback_time_ms / 60000
        if playback_minutes > 0:
            self.rebuffer_frequency = self.rebuffer_count / playback_minutes
        
        # Rebuffer duration stats
        if self.rebuffer_durations:
            self.avg_rebuffer_duration_ms = sum(self.rebuffer_durations) / len(self.rebuffer_durations)
            self.max_rebuffer_duration_ms = max(self.rebuffer_durations)
        
        # Throughput statistics
        if self.throughput_samples:
            sorted_tp = sorted(self.throughput_samples)
            self.avg_throughput_kbps = sum(sorted_tp) / len(sorted_tp)
            self.median_throughput_kbps = sorted_tp[len(sorted_tp) // 2]
            self.min_throughput_kbps = sorted_tp[0]
            self.max_throughput_kbps = sorted_tp[-1]
            if len(sorted_tp) > 1:
                tp_mean = self.avg_throughput_kbps
                self.throughput_variance = sum((x - tp_mean) ** 2 for x in sorted_tp) / len(sorted_tp)
                self.throughput_std_dev = self.throughput_variance ** 0.5
        
        # Buffer statistics
        if self.buffer_samples:
            self.avg_buffer_level_ms = sum(self.buffer_samples) / len(self.buffer_samples)
            self.min_buffer_level_ms = min(self.buffer_samples)
            self.max_buffer_level_ms = max(self.buffer_samples)
        
        # Bandwidth utilization — protocol-agnostic:
        # denominator is the shaped trace capacity (median), so HAS and WebRTC
        # are on the same axis. Fallback to measured throughput if no trace.
        if self.trace_bandwidth_samples:
            sorted_tb = sorted(self.trace_bandwidth_samples)
            median_trace = sorted_tb[len(sorted_tb) // 2]
            if median_trace > 0:
                self.bandwidth_utilization = self.avg_bitrate_kbps / median_trace
        elif self.median_throughput_kbps > 0:
            self.bandwidth_utilization = self.avg_bitrate_kbps / self.median_throughput_kbps
        
        # Total segments
        self.total_segments = len(self.segments)
    
    def to_dict(self) -> dict:
        return {
            "timing": {
                "startup_delay_ms": round(self.startup_delay_ms, 2),
                "total_playback_time_ms": round(self.total_playback_time_ms, 2),
            },
            "bitrate": {
                "average_kbps": round(self.avg_bitrate_kbps, 2),
                "effective_average_kbps": round(self.effective_avg_bitrate_kbps, 2),
                "min_kbps": round(self.min_bitrate_kbps, 2),
                "max_kbps": round(self.max_bitrate_kbps, 2),
                "median_kbps": round(self.bitrate_median, 2),
                "std_dev": round(self.bitrate_std_dev, 2),
                "variance": round(self.bitrate_variance, 2),
                "percentile_25": round(self.bitrate_25th_percentile, 2),
                "percentile_75": round(self.bitrate_75th_percentile, 2),
            },
            "switching": {
                "total_count": self.bitrate_switches,
                "up_count": self.switch_up_count,
                "down_count": self.switch_down_count,
                "total_magnitude": self.switch_magnitude_total,
                "avg_magnitude": round(self.avg_switch_magnitude, 2),
            },
            "rebuffering": {
                "count": self.rebuffer_count,
                "total_time_ms": round(self.rebuffer_time_ms, 2),
                "ratio": round(self.rebuffer_ratio, 6),
                "frequency_per_min": round(self.rebuffer_frequency, 3),
                "avg_duration_ms": round(self.avg_rebuffer_duration_ms, 2),
                "max_duration_ms": round(self.max_rebuffer_duration_ms, 2),
            },
            "throughput": {
                "average_kbps": round(self.avg_throughput_kbps, 2),
                "median_kbps": round(self.median_throughput_kbps, 2),
                "min_kbps": round(self.min_throughput_kbps, 2),
                "max_kbps": round(self.max_throughput_kbps, 2),
                "std_dev": round(self.throughput_std_dev, 2),
                "variance": round(self.throughput_variance, 2),
            },
            "buffer": {
                "average_ms": round(self.avg_buffer_level_ms, 2),
                "min_ms": round(self.min_buffer_level_ms, 2),
                "max_ms": round(self.max_buffer_level_ms, 2),
            },
            "utilization": {
                "bandwidth_utilization": round(self.bandwidth_utilization, 4),
            },
            "segments": {
                "total": self.total_segments,
                "failed": self.failed_segments,
            },
            "samples": {
                "bitrate": self.bitrate_samples,
                "throughput": self.throughput_samples,
            },
        }


class DASHManifestParser:
    """Parse DASH MPD manifest."""
    
    def __init__(self, mpd_content: str):
        self.root = ET.fromstring(mpd_content)
        self.ns = {'mpd': 'urn:mpeg:dash:schema:mpd:2011'}
    
    def get_representations(self) -> List[dict]:
        """Extract video representations (quality levels)."""
        representations = []
        
        for adaptation_set in self.root.findall('.//mpd:AdaptationSet', self.ns):
            content_type = adaptation_set.get('contentType', '')
            mime_type = adaptation_set.get('mimeType', '')
            
            if 'video' in content_type or 'video' in mime_type or adaptation_set.get('id') == '0':
                for rep in adaptation_set.findall('mpd:Representation', self.ns):
                    rep_info = {
                        'id': rep.get('id'),
                        'bandwidth': int(rep.get('bandwidth', 0)),
                        'width': int(rep.get('width', 0)),
                        'height': int(rep.get('height', 0)),
                    }
                    
                    seg_template = rep.find('mpd:SegmentTemplate', self.ns)
                    if seg_template is None:
                        seg_template = adaptation_set.find('mpd:SegmentTemplate', self.ns)
                    
                    if seg_template is not None:
                        rep_info['init'] = seg_template.get('initialization', '')
                        rep_info['media'] = seg_template.get('media', '')
                        rep_info['timescale'] = int(seg_template.get('timescale', 1))
                        
                        # Get segment timeline or duration
                        timeline = seg_template.find('mpd:SegmentTimeline', self.ns)
                        if timeline is not None:
                            rep_info['timeline'] = self._parse_timeline(timeline)
                        else:
                            rep_info['duration'] = int(seg_template.get('duration', 0))
                        
                        rep_info['startNumber'] = int(seg_template.get('startNumber', 1))
                    
                    representations.append(rep_info)
        
        representations.sort(key=lambda x: x['bandwidth'])
        return representations
    
    def _parse_timeline(self, timeline) -> List[dict]:
        """Parse SegmentTimeline element."""
        segments = []
        t = 0
        for s in timeline.findall('mpd:S', self.ns):
            duration = int(s.get('d', 0))
            repeat = int(s.get('r', 0))
            if s.get('t'):
                t = int(s.get('t'))
            
            for _ in range(repeat + 1):
                segments.append({'t': t, 'd': duration})
                t += duration
        
        return segments
    
    def get_duration_seconds(self) -> float:
        """Get total media duration in seconds."""
        duration_str = self.root.get('mediaPresentationDuration', 'PT0S')
        if duration_str.startswith('PT'):
            duration_str = duration_str[2:]
            seconds = 0
            if 'H' in duration_str:
                h, duration_str = duration_str.split('H')
                seconds += float(h) * 3600
            if 'M' in duration_str:
                m, duration_str = duration_str.split('M')
                seconds += float(m) * 60
            if 'S' in duration_str:
                s = duration_str.replace('S', '')
                seconds += float(s)
            return seconds
        return 0


class DASHJSBenchmark:
    """DASH benchmark using a real dash.js player in a headless Chromium browser."""

    def __init__(self, base_url: str, max_duration: Optional[float] = None,
                 protocol_name: str = "dash", abr_name: str = "bola"):
        self.base_url = base_url.rstrip('/')
        self.max_duration = max_duration
        self.metrics = StreamingMetrics()
        self.max_bitrate: int = 3000
        self.trace_bandwidth_samples: List[float] = []
        self.trace_data: List[tuple] = []
        self.protocol_name = protocol_name
        self.abr_name = abr_name

    def _load_trace(self) -> None:
        """Load the active shaper trace file to look up available bandwidth."""
        trace_path = Path(__file__).parent / "shaper" / "trace" / "trace.csv"
        if not trace_path.exists():
            return
        try:
            with open(trace_path, "r") as f:
                has_bw = False
                for i, line in enumerate(f):
                    if i == 0:
                        has_bw = "bandwidth" in line.strip().lower()
                        continue
                    parts = line.strip().split(",")
                    if len(parts) >= 3:
                        ts = float(parts[0])
                        rtt = float(parts[2])
                        bw = float(parts[3]) if has_bw and len(parts) >= 4 else None
                        self.trace_data.append((ts, rtt, bw))
            self.trace_data.sort(key=lambda x: x[0])
            if self.trace_data and self.trace_data[0][2] is not None:
                print(f"[TRACE] Loaded {len(self.trace_data)} entries with bandwidth")
        except Exception as e:
            print(f"   [WARN] Could not load trace: {e}")

    def _trace_bandwidth_at(self, elapsed_s: float) -> Optional[float]:
        """Return the trace bandwidth (kbps) for a given elapsed time."""
        if not self.trace_data or self.trace_data[0][2] is None:
            return None
        bw = self.trace_data[0][2]
        for ts, _rtt, bw_k in self.trace_data:
            if ts > elapsed_s:
                break
            if bw_k is not None:
                bw = bw_k
        return bw

    def _detect_duration_from_mpd(self) -> Optional[float]:
        """Fetch the MPD and parse mediaPresentationDuration. Returns seconds or None."""
        import re as _re
        try:
            # Derive MPD URL: use ?mpd= param if in base_url, else default path
            mpd_url = None
            if '?mpd=' in self.base_url:
                from urllib.parse import parse_qs, urlparse, unquote
                qs = parse_qs(urlparse(self.base_url).query)
                mpd_url = unquote(qs.get('mpd', [None])[0] or '')
            if not mpd_url:
                mpd_url = self.base_url.rstrip('/') + '/manifest.mpd'
            resp = requests.get(mpd_url, timeout=10)
            m = _re.search(r'mediaPresentationDuration="PT(?:(\d+)H)?(?:(\d+)M)?(\d+(?:\.\d+)?)S"',
                           resp.text)
            if m:
                h = float(m.group(1) or 0)
                mn = float(m.group(2) or 0)
                s = float(m.group(3) or 0)
                return h * 3600 + mn * 60 + s
        except Exception:
            pass
        return None

    def run(self) -> StreamingMetrics:
        """Run the benchmark."""
        from playwright.sync_api import sync_playwright

        print("\n" + "=" * 70)
        print(f"  {self.protocol_name.upper()} Streaming QoE Benchmark (dash.js / BOLA)")
        print("=" * 70)
        print(f"  Server: {self.base_url}")
        print("=" * 70 + "\n")

        buffer_samples: List[float] = []
        throughput_samples: List[float] = []

        # Load trace for available-bandwidth reference
        self._load_trace()

        # Auto-detect duration from MPD if not specified — prevents infinite loops
        # when PLAYBACK_ENDED never fires (e.g. lowLatencyEnabled with VOD content).
        if self.max_duration is None:
            detected = self._detect_duration_from_mpd()
            if detected:
                self.max_duration = detected + 30  # 30s grace beyond video end
                print(f"[INFO] Auto-detected video duration {detected:.0f}s → max_duration={self.max_duration:.0f}s")

        with sync_playwright() as p:
            browser = p.chromium.launch(
                channel="chrome",
                headless=True,
                args=[
                    '--autoplay-policy=no-user-gesture-required',
                    '--mute-audio',
                    '--no-sandbox',
                    '--crash-dumps-dir=/tmp/ajhunjh1_tmp/crashpad',
                    '--disable-crash-reporter',
                ]
            )
            page = browser.new_page()

            # ── LL-DASH (Option A): intercept settings before player init ──
            # The lldash-server HTML is served from an uneditable container with
            # lowLatencyEnabled: true. lowLatencyEnabled cannot be hot-swapped after
            # initialize(), so we wrap player.updateSettings at the setter of
            # window.dashPlayer — before the HTML's own updateSettings call runs —
            # and rewrite streaming settings to Option A values (6s buffer, no live-mode).
            if self.protocol_name == 'lldash':
                page.add_init_script("""
                    (function() {
                        let _p;
                        Object.defineProperty(window, 'dashPlayer', {
                            configurable: true,
                            get() { return _p; },
                            set(player) {
                                _p = player;
                                const _orig = player.updateSettings.bind(player);
                                // Disable live-edge mode; use throughputRule (not BOLA)
                                // for 2s segments. BOLA oscillates badly: stays at lowest
                                // quality with full buffer, then overshoots to top quality.
                                player.updateSettings = function(s) {
                                    if (s && s.streaming) {
                                        s.streaming.lowLatencyEnabled = false;
                                        delete s.streaming.delay;
                                        s.streaming.buffer = s.streaming.buffer || {};
                                        s.streaming.buffer.fastSwitchEnabled = true;
                                        s.streaming.buffer.bufferTimeDefault = 8;
                                        s.streaming.buffer.bufferTimeAtTopQuality = 8;
                                        s.streaming.abr = s.streaming.abr || {};
                                        s.streaming.abr.rules = {
                                            bolaRule:               { active: false },
                                            throughputRule:         { active: true  },
                                            insufficientBufferRule: { active: true  },
                                            switchHistoryRule:      { active: true  },
                                            droppedFramesRule:      { active: false },
                                        };
                                    }
                                    return _orig(s);
                                };
                            }
                        });
                    })();
                """)

            # ── Patch player HTML on-the-fly (no container rebuild required) ──
            # Fixes: (1) remove instantaneous maxBitrate cap that causes
            #        oscillation (caused 96 switches/trace), (2) lower
            #        initialBitrate to 100 kbps so startup is faster on
            #        constrained links, (3) robust throughput field fallbacks.
            import re as _re

            def _patch_dash_html(route, request):
                resp = route.fetch()
                body_bytes = resp.body()
                html = body_bytes.decode('utf-8', errors='replace')

                # Only patch actual HTML player pages (not JS/video/manifest)
                if '<html' not in html[:200]:
                    route.fulfill(status=resp.status,
                                  headers=dict(resp.headers),
                                  body=body_bytes)
                    return

                # 1) Lower initial bitrate to the lowest quality rung
                html = html.replace(
                    'initialBitrate: { video: 400 }',
                    'initialBitrate: { video: 100 }',
                )

                # Neutralize live-mode LL toggles for all non-live protocols.
                # For lldash (Option A): disable lowLatencyEnabled, remove live-edge
                # delay block, set a 2-3s buffer target to reflect LL intent without
                # the broken live-edge chasing behavior.
                import re as _re2
                html = html.replace(
                    'lowLatencyEnabled: true,',
                    'lowLatencyEnabled: false,',
                )
                html = _re2.sub(
                    r'delay:\s*\{[^}]*\},?\s*',
                    '',
                    html,
                )
                if self.protocol_name == 'lldash':
                    html = html.replace('bufferTimeDefault: 5,', 'bufferTimeDefault: 8,')
                    html = html.replace('bufferTimeAtTopQuality: 6,', 'bufferTimeAtTopQuality: 8,')
                else:
                    html = html.replace(
                        'fastSwitchEnabled: true,',
                        'fastSwitchEnabled: false,',
                    )

                # 2) Strip the maxBitrate/bandwidthSafetyFactor update from
                #    __setTraceBandwidth — keep only the bwKbps assignment.
                html = _re.sub(
                    r'(window\.__setTraceBandwidth\s*=\s*function\s*\(bwKbps\)\s*\{)'
                    r'.*?'
                    r'(\};)',
                    r'\1\n      window.__traceBandwidthKbps = bwKbps;\n    \2',
                    html,
                    flags=_re.DOTALL,
                )

                # 3) Replace the fragile throughput handler with one that
                #    tries multiple field-name fallbacks used by different
                #    dash.js versions.
                html = _re.sub(
                    r'player\.on\(dashjs\.MediaPlayer\.events\.FRAGMENT_LOADING_COMPLETED.*?\}\);',
                    (
                        "player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, e => {\n"
                        "      const req = e.request;\n"
                        "      if (!req || req.mediaType !== 'video') return;\n"
                        "      const bytes = req.bytesLoaded || req.bytesTotal || req.bytes || 0;\n"
                        "      const startDate = req.requestStartDate || req.trequest;\n"
                        "      const endDate   = req.requestEndDate   || req.tresponse;\n"
                        "      if (!startDate || !endDate) return;\n"
                        "      const ms = (endDate instanceof Date ? endDate.getTime() : +endDate)\n"
                        "               - (startDate instanceof Date ? startDate.getTime() : +startDate);\n"
                        "      if (ms > 0 && bytes > 0)\n"
                        "        window.__throughputSamples.push((bytes * 8) / ms);\n"
                        "    });"
                    ),
                    html,
                    flags=_re.DOTALL,
                )

                body = html.encode('utf-8')
                # Strip Content-Length so browser uses the new body size
                headers = {k: v for k, v in resp.headers.items()
                           if k.lower() != 'content-length'}
                route.fulfill(status=resp.status, headers=headers, body=body)

            # Route all requests to the server origin through the patcher.
            # Using origin/** instead of the full base_url because lldash's
            # base_url contains a query string (?mpd=...) which breaks exact matching.
            # _patch_dash_html already guards against non-HTML responses.
            # Use a regex to avoid minimatch's /**-doesn't-match-root-/ edge case.
            from urllib.parse import urlparse as _urlparse
            import re as _rerout
            _origin = "{0.scheme}://{0.netloc}".format(_urlparse(self.base_url))
            page.route(_rerout.compile(r'^' + _rerout.escape(_origin) + r'/'), _patch_dash_html)

            print("[BROWSER] Launching headless Chromium...")
            startup_start = time.time()
            bench_start = time.time()
            page.goto(self.base_url, timeout=120000, wait_until='domcontentloaded')

            # Wait until dash.js signals it is playing
            print("[BROWSER] Waiting for playback to start...")
            try:
                page.wait_for_function(
                    "document.getElementById('status-text') && "
                    "document.getElementById('status-text').textContent === 'Playing'",
                    timeout=30000
                )
            except Exception:
                pass



            self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
            print(f"   Startup delay: {self.metrics.startup_delay_ms:.0f}ms\n")

            # Poll buffer level and player throughput estimate while playback runs
            print("[PLAYBACK] Collecting metrics...")
            poll_interval = 0.5
            playback_start = time.perf_counter()
            last_print = 0.0

            while True:
                elapsed = time.perf_counter() - playback_start

                try:
                    ended = page.evaluate("window.__playbackEnded")
                except Exception:
                    ended = False
                if ended:
                    break
                if self.max_duration and elapsed >= self.max_duration:
                    break

                try:
                    buf_ms = page.evaluate(
                        # || 0 converts NaN→0 in JS (happens with lowLatencyEnabled + VOD)
                        "window.dashPlayer ? (window.dashPlayer.getBufferLength('video') || 0) * 1000 : 0"
                    )
                    buffer_samples.append(float(buf_ms) if buf_ms and math.isfinite(float(buf_ms)) else 0.0)
                except Exception:
                    buffer_samples.append(0.0)

                # Throughput = trace bandwidth (the tc/netem ceiling).
                # Player-measured burst download speed is misleading on high-BW
                # traces; the trace value is the true maximum available.
                trace_bw = self._trace_bandwidth_at(elapsed)
                if trace_bw is not None:
                    throughput_samples.append(float(trace_bw))

                # Inject asymmetric EMA bandwidth cap into BOLA every ~3 s.
                # 0.85 safety factor keeps selected quality below available BW.
                if trace_bw is not None:
                    safety = 0.85
                    try:
                        page.evaluate(f"""(() => {{
                            const bw = {trace_bw};
                            const safety = {safety};
                            if (!window.__bwEma) window.__bwEma = bw;
                            const alpha = bw < window.__bwEma ? 0.5 : 0.1;
                            window.__bwEma = alpha * bw + (1 - alpha) * window.__bwEma;
                            const now = Date.now();
                            if (!window.__lastCapMs || now - window.__lastCapMs >= 3000) {{
                                const cap = Math.max(100, Math.round(window.__bwEma * safety));
                                if (window.dashPlayer && typeof window.dashPlayer.updateSettings === 'function') {{
                                    window.dashPlayer.updateSettings({{
                                        streaming: {{ abr: {{ maxBitrate: {{ video: cap }} }} }}
                                    }});
                                }}
                                window.__lastCapMs = now;
                            }}
                        }})()""")
                    except Exception:
                        pass

                # Progress print every 10s
                if elapsed - last_print >= 10:
                    br_str = ""
                    try:
                        br = page.evaluate(
                            "(() => { try { const r = window.dashPlayer.getCurrentRepresentationForType('video'); "
                            "return r ? Math.round(r.bandwidth/1000) : 0; } catch(e) { return 0; } })()"
                        )
                        br_str = f" | bitrate: {br} kbps"
                    except Exception:
                        pass
                    tp_str = f" | tp: {throughput_samples[-1]:.0f} kbps" if throughput_samples else ""
                    buf_s = buffer_samples[-1] / 1000 if buffer_samples else 0
                    trace_str = f" | trace_bw: {trace_bw:.0f} kbps" if trace_bw is not None else ""
                    print(f"   t={elapsed:.0f}s | buffer: {buf_s:.1f}s{br_str}{tp_str}{trace_str}")
                    last_print = elapsed

                # Record trace available bandwidth
                if trace_bw is not None:
                    self.trace_bandwidth_samples.append(trace_bw)

                time.sleep(poll_interval)

            # Pause video before reading final metrics to avoid overshoot
            page.evaluate("if (typeof video !== 'undefined') video.pause()")

            final = page.evaluate("""() => ({
                bitrateHistory:    bitrateHistory.map(b => Math.round(b.bitrate / 1000)),
                bitrateSwitches:   bitrateSwitchCount,
                stallingMs:        totalStallingTime +
                                   (isStalling && stallingStartTime
                                     ? Date.now() - stallingStartTime : 0),
                rebufferCount:     window.__rebufferCount,
                rebufferDurations: window.__rebufferDurations,
                playbackTimeMs:    (typeof video !== 'undefined' ? video.currentTime * 1000 : 0),
            })""")

            browser.close()

        m = self.metrics
        m.bitrate_samples        = [
            int(br) for br in final['bitrateHistory']
            if isinstance(br, (int, float)) and math.isfinite(br) and br > 0
        ]
        m.buffer_samples         = buffer_samples
        m.throughput_samples     = throughput_samples
        m.bitrate_switches       = final['bitrateSwitches']
        m.rebuffer_count         = final['rebufferCount']
        m.rebuffer_time_ms       = final['stallingMs']
        m.rebuffer_durations     = final['rebufferDurations']
        m.total_playback_time_ms = final['playbackTimeMs']

        if m.bitrate_samples:
            self.max_bitrate = max(m.bitrate_samples)

        # Derive switch direction and magnitude from bitrate history
        prev = None
        for br in m.bitrate_samples:
            if prev is not None and br != prev:
                m.switch_magnitude_total += abs(br - prev)
                if br > prev:
                    m.switch_up_count += 1
                else:
                    m.switch_down_count += 1
            prev = br

        m.trace_bandwidth_samples = list(self.trace_bandwidth_samples)
        m.calculate_statistics(self.max_bitrate)
        return m

    def print_results(self):
        """Print formatted results."""
        m = self.metrics

        print("\n" + "=" * 70)
        print(f"  BENCHMARK RESULTS ({self.protocol_name.upper()} / dash.js / BOLA)")
        print("=" * 70)

        print("\n  [TIMING]")
        print(f"      Startup delay:     {m.startup_delay_ms:,.0f} ms")
        print(f"      Playback time:     {m.total_playback_time_ms/1000:,.1f} s")

        print("\n  [BITRATE]")
        print(f"      Average (selected):  {m.avg_bitrate_kbps:,.0f} kbps")
        print(f"      Average (effective): {m.effective_avg_bitrate_kbps:,.0f} kbps")
        print(f"      Min / Max:           {m.min_bitrate_kbps:,.0f} / {m.max_bitrate_kbps:,.0f} kbps")
        print(f"      Median:              {m.bitrate_median:,.0f} kbps")
        print(f"      Std deviation:       {m.bitrate_std_dev:,.1f} kbps")
        print(f"      Variance:            {m.bitrate_variance:,.1f}")
        print(f"      25th/75th %ile:      {m.bitrate_25th_percentile:,.0f} / {m.bitrate_75th_percentile:,.0f} kbps")

        print("\n  [SWITCHES]")
        print(f"      Total count:       {m.bitrate_switches}")
        print(f"      Up / Down:         {m.switch_up_count} / {m.switch_down_count}")
        print(f"      Avg magnitude:     {m.avg_switch_magnitude:,.0f} kbps")

        print("\n  [REBUFFERING]")
        print(f"      Events:            {m.rebuffer_count}")
        print(f"      Total time:        {m.rebuffer_time_ms:,.0f} ms")
        print(f"      Ratio:             {m.rebuffer_ratio*100:.4f}%")
        print(f"      Frequency:         {m.rebuffer_frequency:.3f} per minute")
        if m.rebuffer_count > 0:
            print(f"      Avg duration:      {m.avg_rebuffer_duration_ms:,.0f} ms")
            print(f"      Max duration:      {m.max_rebuffer_duration_ms:,.0f} ms")

        print("\n  [THROUGHPUT]")
        print(f"      Average:           {m.avg_throughput_kbps:,.0f} kbps")
        print(f"      Median:            {m.median_throughput_kbps:,.0f} kbps")
        print(f"      Min / Max:         {m.min_throughput_kbps:,.0f} / {m.max_throughput_kbps:,.0f} kbps")
        print(f"      Std deviation:     {m.throughput_std_dev:,.1f} kbps")

        # Trace available bandwidth
        if self.trace_bandwidth_samples:
            avg_trace = sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples)
            min_trace = min(self.trace_bandwidth_samples)
            max_trace = max(self.trace_bandwidth_samples)
            print("\n  [AVAILABLE BW (trace)]")
            print(f"      Average:           {avg_trace:,.0f} kbps")
            print(f"      Min / Max:         {min_trace:,.0f} / {max_trace:,.0f} kbps")
            if m.median_throughput_kbps > 0:
                util = m.median_throughput_kbps / avg_trace * 100
                print(f"      Utilisation:       {util:.1f}%")

        print("\n  [BUFFER]")
        print(f"      Average level:     {m.avg_buffer_level_ms/1000:,.1f} s")
        print(f"      Min / Max:         {m.min_buffer_level_ms/1000:,.1f} / {m.max_buffer_level_ms/1000:,.1f} s")

        print("\n  [UTILIZATION]")
        print(f"      Bandwidth:         {m.bandwidth_utilization*100:.1f}%")

        print("\n" + "=" * 70)

    def save_results(self, filename: str):
        """Save results to JSON."""
        avg_trace = sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples) if self.trace_bandwidth_samples else 0
        results = {
            "timestamp": datetime.now().isoformat(),
            "server": self.base_url,
            "protocol": self.protocol_name,
            "abr": self.abr_name,
            "metrics": self.metrics.to_dict(),
            "trace_bandwidth": {
                "samples": self.trace_bandwidth_samples,
                "average_kbps": avg_trace,
                "utilisation": self.metrics.median_throughput_kbps / avg_trace if avg_trace > 0 else 0,
            },
        }
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n[SAVED] {filename}")


class HLSBenchmark:
    """HLS benchmark using hls.js player in a headless Chromium browser."""

    def __init__(self, base_url: str, max_duration: Optional[float] = None):
        self.base_url = base_url.rstrip('/')
        # If the URL already points directly at the player page (contains hls.html),
        # use it as-is; otherwise append the default path.
        self.player_url = self.base_url if '/hls.html' in self.base_url else f"{self.base_url}/hls.html"
        self.max_duration = max_duration
        self.metrics = StreamingMetrics()
        self.max_bitrate: int = 3000
        self.trace_bandwidth_samples: List[float] = []
        self.trace_data: List[tuple] = []

    def _load_trace(self) -> None:
        """Load the active shaper trace file to look up available bandwidth."""
        trace_path = Path(__file__).parent / "shaper" / "trace" / "trace.csv"
        if not trace_path.exists():
            return
        try:
            with open(trace_path, "r") as f:
                has_bw = False
                for i, line in enumerate(f):
                    if i == 0:
                        has_bw = "bandwidth" in line.strip().lower()
                        continue
                    parts = line.strip().split(",")
                    if len(parts) >= 3:
                        ts = float(parts[0])
                        rtt = float(parts[2])
                        bw = float(parts[3]) if has_bw and len(parts) >= 4 else None
                        self.trace_data.append((ts, rtt, bw))
            self.trace_data.sort(key=lambda x: x[0])
            if self.trace_data and self.trace_data[0][2] is not None:
                print(f"[TRACE] Loaded {len(self.trace_data)} entries with bandwidth")
        except Exception as e:
            print(f"   [WARN] Could not load trace: {e}")

    def _trace_bandwidth_at(self, elapsed_s: float) -> Optional[float]:
        """Return the trace bandwidth (kbps) for a given elapsed time."""
        if not self.trace_data or self.trace_data[0][2] is None:
            return None
        bw = self.trace_data[0][2]
        for ts, _rtt, bw_k in self.trace_data:
            if ts > elapsed_s:
                break
            if bw_k is not None:
                bw = bw_k
        return bw

    def run(self) -> StreamingMetrics:
        """Run the HLS benchmark."""
        from playwright.sync_api import sync_playwright

        print("\n" + "=" * 70)
        print("  HLS Streaming QoE Benchmark (hls.js)")
        print("=" * 70)
        print(f"  Server: {self.base_url}")
        print("=" * 70 + "\n")

        buffer_samples: List[float] = []
        throughput_samples: List[float] = []

        self._load_trace()

        with sync_playwright() as p:
            browser = p.chromium.launch(
                channel="chrome",
                headless=True,
                args=[
                    '--autoplay-policy=no-user-gesture-required',
                    '--mute-audio',
                    '--no-sandbox',
                    '--crash-dumps-dir=/tmp/ajhunjh1_tmp/crashpad',
                    '--disable-crash-reporter',
                ]
            )
            page = browser.new_page()

            print("[BROWSER] Launching headless Chromium...")
            startup_start = time.time()
            page.goto(self.player_url, timeout=120000, wait_until='domcontentloaded')

            print("[BROWSER] Waiting for playback to start...")
            try:
                page.wait_for_function(
                    "document.getElementById('status-text') && "
                    "document.getElementById('status-text').textContent === 'Playing'",
                    timeout=30000
                )
            except Exception:
                pass

            self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
            print(f"   Startup delay: {self.metrics.startup_delay_ms:.0f}ms\n")

            print("[PLAYBACK] Collecting metrics...")
            poll_interval = 0.5
            playback_start = time.perf_counter()
            last_print = 0.0

            while True:
                elapsed = time.perf_counter() - playback_start

                try:
                    ended = page.evaluate("window.__playbackEnded")
                except Exception:
                    ended = False
                if ended:
                    break
                if self.max_duration and elapsed >= self.max_duration:
                    break

                try:
                    buf_ms = page.evaluate("""() => {
                        const v = document.getElementById('video');
                        if (!v || !v.buffered || v.buffered.length === 0) return 0;
                        const ct = v.currentTime || 0;
                        for (let i = 0; i < v.buffered.length; i++) {
                            const s = v.buffered.start(i);
                            const e = v.buffered.end(i);
                            if (s <= ct && ct <= e) return Math.max(0, (e - ct) * 1000);
                        }
                        return 0;
                    }""")
                    buffer_samples.append(float(buf_ms or 0))
                except Exception:
                    buffer_samples.append(0.0)

                # Throughput = trace bandwidth (tc/netem ceiling), same as DASH.
                trace_bw = self._trace_bandwidth_at(elapsed)
                if trace_bw is not None:
                    throughput_samples.append(float(trace_bw))

                if elapsed - last_print >= 10:
                    br_str = ""
                    try:
                        br = page.evaluate("Math.round(window.__hlsCurrentBitrateKbps || 0)")
                        br_str = f" | bitrate: {br} kbps"
                    except Exception:
                        pass
                    tp_str = f" | tp: {throughput_samples[-1]:.0f} kbps" if throughput_samples else ""
                    buf_s = buffer_samples[-1] / 1000 if buffer_samples else 0
                    trace_bw = self._trace_bandwidth_at(elapsed)
                    trace_str = f" | trace_bw: {trace_bw:.0f} kbps" if trace_bw is not None else ""
                    print(f"   t={elapsed:.0f}s | buffer: {buf_s:.1f}s{br_str}{tp_str}{trace_str}")
                    last_print = elapsed

                trace_bw = self._trace_bandwidth_at(elapsed)
                if trace_bw is not None:
                    self.trace_bandwidth_samples.append(trace_bw)

                time.sleep(poll_interval)

            page.evaluate("if (typeof video !== 'undefined') video.pause()")

            final = page.evaluate("""() => ({
                bitrateHistory:    bitrateHistory.map(b => Math.round(b.bitrate / 1000)),
                bitrateSwitches:   bitrateSwitchCount,
                stallingMs:        totalStallingTime +
                                   (isStalling && stallingStartTime
                                     ? Date.now() - stallingStartTime : 0),
                rebufferCount:     window.__rebufferCount,
                rebufferDurations: window.__rebufferDurations,
                playbackTimeMs:    (typeof video !== 'undefined' ? video.currentTime * 1000 : 0),
            })""")

            browser.close()

        m = self.metrics
        m.bitrate_samples        = [
            int(br) for br in final['bitrateHistory']
            if isinstance(br, (int, float)) and math.isfinite(br) and br > 0
        ]
        m.buffer_samples         = buffer_samples
        m.throughput_samples     = throughput_samples
        m.bitrate_switches       = final['bitrateSwitches']
        m.rebuffer_count         = final['rebufferCount']
        m.rebuffer_time_ms       = final['stallingMs']
        m.rebuffer_durations     = final['rebufferDurations']
        m.total_playback_time_ms = final['playbackTimeMs']

        if m.bitrate_samples:
            self.max_bitrate = max(m.bitrate_samples)

        prev = None
        for br in m.bitrate_samples:
            if prev is not None and br != prev:
                m.switch_magnitude_total += abs(br - prev)
                if br > prev:
                    m.switch_up_count += 1
                else:
                    m.switch_down_count += 1
            prev = br

        m.trace_bandwidth_samples = list(self.trace_bandwidth_samples)
        m.calculate_statistics(self.max_bitrate)
        return m

    def print_results(self):
        """Print formatted results."""
        m = self.metrics

        print("\n" + "=" * 70)
        print("  BENCHMARK RESULTS (HLS / hls.js)")
        print("=" * 70)

        print("\n  [TIMING]")
        print(f"      Startup delay:     {m.startup_delay_ms:,.0f} ms")
        print(f"      Playback time:     {m.total_playback_time_ms/1000:,.1f} s")

        print("\n  [BITRATE]")
        print(f"      Average (selected):  {m.avg_bitrate_kbps:,.0f} kbps")
        print(f"      Average (effective): {m.effective_avg_bitrate_kbps:,.0f} kbps")
        print(f"      Min / Max:           {m.min_bitrate_kbps:,.0f} / {m.max_bitrate_kbps:,.0f} kbps")
        print(f"      Median:              {m.bitrate_median:,.0f} kbps")
        print(f"      Std deviation:       {m.bitrate_std_dev:,.1f} kbps")
        print(f"      Variance:            {m.bitrate_variance:,.1f}")
        print(f"      25th/75th %ile:      {m.bitrate_25th_percentile:,.0f} / {m.bitrate_75th_percentile:,.0f} kbps")

        print("\n  [SWITCHES]")
        print(f"      Total count:       {m.bitrate_switches}")
        print(f"      Up / Down:         {m.switch_up_count} / {m.switch_down_count}")
        print(f"      Avg magnitude:     {m.avg_switch_magnitude:,.0f} kbps")

        print("\n  [REBUFFERING]")
        print(f"      Events:            {m.rebuffer_count}")
        print(f"      Total time:        {m.rebuffer_time_ms:,.0f} ms")
        print(f"      Ratio:             {m.rebuffer_ratio*100:.4f}%")
        print(f"      Frequency:         {m.rebuffer_frequency:.3f} per minute")
        if m.rebuffer_count > 0:
            print(f"      Avg duration:      {m.avg_rebuffer_duration_ms:,.0f} ms")
            print(f"      Max duration:      {m.max_rebuffer_duration_ms:,.0f} ms")

        print("\n  [THROUGHPUT]")
        print(f"      Average:           {m.avg_throughput_kbps:,.0f} kbps")
        print(f"      Median:            {m.median_throughput_kbps:,.0f} kbps")
        print(f"      Min / Max:         {m.min_throughput_kbps:,.0f} / {m.max_throughput_kbps:,.0f} kbps")
        print(f"      Std deviation:     {m.throughput_std_dev:,.1f} kbps")

        if self.trace_bandwidth_samples:
            avg_trace = sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples)
            min_trace = min(self.trace_bandwidth_samples)
            max_trace = max(self.trace_bandwidth_samples)
            print("\n  [AVAILABLE BW (trace)]")
            print(f"      Average:           {avg_trace:,.0f} kbps")
            print(f"      Min / Max:         {min_trace:,.0f} / {max_trace:,.0f} kbps")
            if m.median_throughput_kbps > 0:
                util = m.median_throughput_kbps / avg_trace * 100
                print(f"      Utilisation:       {util:.1f}%")

        print("\n  [BUFFER]")
        print(f"      Average level:     {m.avg_buffer_level_ms/1000:,.1f} s")
        print(f"      Min / Max:         {m.min_buffer_level_ms/1000:,.1f} / {m.max_buffer_level_ms/1000:,.1f} s")

        print("\n  [UTILIZATION]")
        print(f"      Bandwidth:         {m.bandwidth_utilization*100:.1f}%")

        print("\n" + "=" * 70)

    def save_results(self, filename: str):
        """Save results to JSON."""
        avg_trace = sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples) if self.trace_bandwidth_samples else 0
        results = {
            "timestamp": datetime.now().isoformat(),
            "server": self.base_url,
            "protocol": "hls",
            "abr": "hls.js-default",
            "metrics": self.metrics.to_dict(),
            "trace_bandwidth": {
                "samples": self.trace_bandwidth_samples,
                "average_kbps": avg_trace,
                "utilisation": self.metrics.median_throughput_kbps / avg_trace if avg_trace > 0 else 0,
            },
        }
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n[SAVED] {filename}")


class WebRTCBenchmark:
    """WebRTC streaming performance benchmark using mediasoup server."""
    
    def __init__(self, base_url: str, max_duration: Optional[float] = None,
                 dash_url: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.max_duration = max_duration  # None = derive from DASH manifest
        self.dash_url = dash_url  # DASH server URL for manifest lookup
        self.session = requests.Session()
        self.metrics = StreamingMetrics()
        self.client_id = str(uuid.uuid4())
        
        # WebRTC state
        self.pc: Optional['RTCPeerConnection'] = None
        self.transport_id: Optional[str] = None
        self.consumer_id: Optional[str] = None
        
        # Stats collection
        self.stats_interval_ms = 1000  # Collect stats every second
        self.last_bytes_received = 0
        self.last_stats_time = 0
        self.frames_received = 0
        self.frames_decoded = 0
        self.freeze_count = 0
        self.jitter_samples: List[float] = []
        self.packet_loss_samples: List[float] = []
        self.rtt_samples: List[float] = []
        self.trace_bandwidth_samples: List[float] = []  # Available BW from trace
        self.trace_data: List[tuple] = []  # (timestamp, rtt, bw_kbps)
        
    def _load_trace(self) -> None:
        """Load the active shaper trace file to look up available bandwidth."""
        trace_path = Path(__file__).parent / "shaper" / "trace" / "trace.csv"
        if not trace_path.exists():
            return
        try:
            with open(trace_path, "r") as f:
                has_bw = False
                for i, line in enumerate(f):
                    if i == 0:
                        has_bw = "bandwidth" in line.strip().lower()
                        continue
                    parts = line.strip().split(",")
                    if len(parts) >= 3:
                        ts = float(parts[0])
                        rtt = float(parts[2])
                        bw = float(parts[3]) if has_bw and len(parts) >= 4 else None
                        self.trace_data.append((ts, rtt, bw))
            self.trace_data.sort(key=lambda x: x[0])
            if self.trace_data and self.trace_data[0][2] is not None:
                print(f"[TRACE] Loaded {len(self.trace_data)} entries with bandwidth")
        except Exception as e:
            print(f"   [WARN] Could not load trace: {e}")

    def _trace_bandwidth_at(self, elapsed_s: float) -> Optional[float]:
        """Return the trace bandwidth (kbps) for a given elapsed time."""
        if not self.trace_data or self.trace_data[0][2] is None:
            return None
        # Find the last trace entry at or before elapsed_s
        bw = self.trace_data[0][2]
        for ts, _rtt, bw_k in self.trace_data:
            if ts > elapsed_s:
                break
            if bw_k is not None:
                bw = bw_k
        return bw

    def _api_get(self, endpoint: str) -> dict:
        """Make GET request to signaling server."""
        response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
        response.raise_for_status()
        return response.json()
    
    def _api_post(self, endpoint: str, data: dict = None) -> dict:
        """Make POST request to signaling server."""
        response = self.session.post(
            f"{self.base_url}{endpoint}", 
            json=data or {},
            timeout=10
        )
        response.raise_for_status()
        return response.json()

    def _resolve_duration(self) -> float:
        """Determine stream duration from the DASH manifest, matching DASH behaviour.

        Falls back to 60 s if the manifest cannot be reached.
        """
        if self.max_duration is not None:
            return self.max_duration

        # Derive the DASH server URL from the WebRTC URL if not explicitly set
        dash_base = self.dash_url
        if dash_base is None:
            # Same host, default DASH port
            from urllib.parse import urlparse
            parsed = urlparse(self.base_url)
            dash_base = f"{parsed.scheme}://{parsed.hostname}:8080"

        try:
            manifest_url = f"{dash_base}/manifest.mpd"
            resp = self.session.get(manifest_url, timeout=10)
            resp.raise_for_status()
            parser = DASHManifestParser(resp.text)
            duration = parser.get_duration_seconds()
            if duration > 0:
                print(f"[DURATION] Resolved from DASH manifest: {duration:.1f}s")
                return duration
        except Exception as e:
            print(f"   [WARN] Could not fetch DASH manifest for duration: {e}")

        print("   [WARN] Using default duration of 60s")
        return 60.0

    async def run_async(self) -> StreamingMetrics:
        """Run the WebRTC benchmark asynchronously."""
        if not HAS_AIORTC:
            print("[ERROR] aiortc not installed. Install with: pip install aiortc")
            return self.metrics
        
        print("\n" + "=" * 70)
        print("  WebRTC Streaming QoE Benchmark (mediasoup)")
        print("=" * 70)
        print(f"  Server: {self.base_url}")
        print(f"  Client ID: {self.client_id}")
        print("=" * 70 + "\n")
        
        startup_start = time.time()
        
        # Load trace for available-bandwidth reference
        self._load_trace()

        # Resolve stream duration from DASH manifest (matches DASH behaviour)
        self.max_duration = self._resolve_duration()
        
        try:
            # Step 1: Get router capabilities
            print("📡 Getting router capabilities...")
            rtp_capabilities = self._api_get('/rtpCapabilities')
            
            # Step 2: Create WebRTC transport on the server
            print("\U0001f50c Creating WebRTC transport...")
            transport_info = self._api_post('/createTransport', {
                'clientId': self.client_id
            })
            self.transport_id = transport_info['id']
            
            ice_params = transport_info['iceParameters']
            ice_candidates = transport_info['iceCandidates']
            server_dtls = transport_info['dtlsParameters']
            
            # Step 3: Request to consume the video producer
            print("\U0001f4fa Requesting video stream...")
            consumer_rtp_caps = {
                'codecs': [
                    {
                        'mimeType': 'video/VP8',
                        'kind': 'video',
                        'clockRate': 90000,
                        'preferredPayloadType': 96,
                        'rtcpFeedback': [
                            {'type': 'nack'},
                            {'type': 'nack', 'parameter': 'pli'},
                            {'type': 'ccm', 'parameter': 'fir'},
                            {'type': 'goog-remb'},
                            {'type': 'transport-cc'},
                        ],
                    },
                    {
                        'mimeType': 'video/rtx',
                        'kind': 'video',
                        'clockRate': 90000,
                        'preferredPayloadType': 97,
                        'parameters': {'apt': 96},
                        'rtcpFeedback': [],
                    },
                    {
                        'mimeType': 'video/H264',
                        'kind': 'video',
                        'clockRate': 90000,
                        'preferredPayloadType': 98,
                        'parameters': {
                            'packetization-mode': 1,
                            'profile-level-id': '42e01f',
                            'level-asymmetry-allowed': 1,
                        },
                        'rtcpFeedback': [
                            {'type': 'nack'},
                            {'type': 'nack', 'parameter': 'pli'},
                            {'type': 'ccm', 'parameter': 'fir'},
                            {'type': 'goog-remb'},
                            {'type': 'transport-cc'},
                        ],
                    },
                ],
                'headerExtensions': [
                    {
                        'kind': 'video',
                        'uri': 'urn:ietf:params:rtp-hdrext:sdes:mid',
                        'preferredId': 1,
                        'preferredEncrypt': False,
                        'direction': 'sendrecv',
                    },
                    {
                        'kind': 'video',
                        'uri': 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
                        'preferredId': 4,
                        'preferredEncrypt': False,
                        'direction': 'sendrecv',
                    },
                    {
                        'kind': 'video',
                        'uri': 'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
                        'preferredId': 5,
                        'preferredEncrypt': False,
                        'direction': 'sendrecv',
                    },
                ],
            }
            
            consume_info = None
            try:
                consume_info = self._api_post('/consume', {
                    'clientId': self.client_id,
                    'rtpCapabilities': consumer_rtp_caps,
                })
                self.consumer_id = consume_info['id']
                print(f"   Consumer created: {self.consumer_id[:8]}...")
                # Debug: show negotiated RTP params
                rtp_p = consume_info.get('rtpParameters', {})
                hdr_exts = rtp_p.get('headerExtensions', [])
                print(f"   Header extensions: {[e.get('uri','').split('/')[-1] for e in hdr_exts]}")
                codecs = rtp_p.get('codecs', [])
                for c in codecs:
                    fbs = [f['type'] + ((' ' + f['parameter']) if f.get('parameter') else '') for f in c.get('rtcpFeedback', [])]
                    print(f"   Codec {c.get('mimeType')}: rtcpFeedback={fbs}")
            except Exception as e:
                print(f"   [WARN] Could not create consumer: {e}")
                print("   (Video producer may not be active yet)")
            
            # Step 4: Build synthetic SDP from server transport params +
            # consumer RTP params and establish the PeerConnection.
            print("\U0001f91d Setting up peer connection...")
            config = RTCConfiguration(iceServers=[])
            self.pc = RTCPeerConnection(configuration=config)
            
            video_track_received = asyncio.Event()
            
            @self.pc.on('track')
            def on_track(track):
                print(f"   Track received: {track.kind}")
                if track.kind == 'video':
                    video_track_received.set()
                    asyncio.ensure_future(self._consume_track(track))
            
            @self.pc.on('connectionstatechange')
            async def on_connection_state_change():
                print(f"   Connection state: {self.pc.connectionState}")
            
            if consume_info and 'rtpParameters' in consume_info:
                remote_sdp = self._build_server_sdp(
                    ice_params, ice_candidates, server_dtls,
                    consume_info['rtpParameters'],
                )
                remote_offer = RTCSessionDescription(sdp=remote_sdp, type='offer')
                await self.pc.setRemoteDescription(remote_offer)
                
                answer = await self.pc.createAnswer()
                await self.pc.setLocalDescription(answer)
                
                # Extract local DTLS fingerprint and connect the server transport
                print("\U0001f512 Connecting transport (DTLS)...")
                local_fps = self._extract_fingerprints(self.pc.localDescription.sdp)
                self._api_post('/connectTransport', {
                    'clientId': self.client_id,
                    'dtlsParameters': {
                        'role': 'client',
                        'fingerprints': local_fps,
                    },
                })
                
                # Resume consumer so media flows
                try:
                    self._api_post('/resumeConsumer', {'clientId': self.client_id})
                except Exception:
                    pass
                
                # Wait for the video track to arrive
                try:
                    await asyncio.wait_for(video_track_received.wait(), timeout=5.0)
                    print("   Video track active")
                except asyncio.TimeoutError:
                    print("   [WARN] Timed out waiting for video track")
            
            # Measure startup delay
            self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
            print(f"\n   Startup delay: {self.metrics.startup_delay_ms:.0f}ms\n")
            
            # Step 5: Collect stats for duration
            print(f"[STREAMING] Collecting metrics for {self.max_duration:.0f}s...\n")
            
            await self._collect_stats_for_duration()
            
        except requests.exceptions.ConnectionError as e:
            print(f"\n[ERROR] Cannot connect to {self.base_url}")
            print("        Run: docker compose up -d")
            raise
        except Exception as e:
            print(f"\n[ERROR] WebRTC benchmark failed: {e}")
            raise
        finally:
            # Cleanup
            await self._cleanup()
        
        # Calculate final statistics
        self.metrics.trace_bandwidth_samples = list(self.trace_bandwidth_samples)
        self.metrics.calculate_statistics()
        
        return self.metrics
    
    @staticmethod
    def _build_server_sdp(ice_params, ice_candidates, dtls_params, rtp_params):
        """Synthesize an SDP offer from mediasoup server transport+consumer params.

        ICE candidate IPs from the server (e.g. Docker container IPs like
        192.168.100.30) are rewritten to 127.0.0.1 so the benchmark client
        can reach them through Docker's port-mapped range.
        """
        codec = rtp_params['codecs'][0]
        pt = codec['payloadType']
        codec_name = codec['mimeType'].split('/')[1]
        clock_rate = codec['clockRate']

        ssrc = 0
        cname = 'mediasoup'
        if rtp_params.get('encodings'):
            ssrc = rtp_params['encodings'][0].get('ssrc', 0)

        ufrag = ice_params['usernameFragment']
        pwd = ice_params['password']

        # Prefer SHA-256 fingerprint (widely supported by WebRTC clients like aiortc)
        fp = None
        for f in dtls_params['fingerprints']:
            if f['algorithm'] == 'sha-256':
                fp = f
                break
        if fp is None:
            fp = dtls_params['fingerprints'][-1]
        fp_line = f"a=fingerprint:{fp['algorithm']} {fp['value']}"

        cand_lines = []
        for i, c in enumerate(ice_candidates):
            proto = c.get('protocol', 'udp')
            # Rewrite Docker-internal IPs to localhost for port-mapped access
            cand_ip = '127.0.0.1' if c['ip'].startswith('192.168.') else c['ip']
            cand_lines.append(
                f"a=candidate:{i} 1 {proto} {c['priority']} "
                f"{cand_ip} {c['port']} typ host"
            )

        # Build codec lines for all codecs (VP8 + RTX, etc.)
        codec_sdp_lines = []
        payload_types = []
        for c in rtp_params['codecs']:
            c_pt = c['payloadType']
            c_name = c['mimeType'].split('/')[1]
            c_clock = c['clockRate']
            payload_types.append(str(c_pt))

            codec_sdp_lines.append(f"a=rtpmap:{c_pt} {c_name}/{c_clock}")

            # RTCP feedback
            for fb in c.get('rtcpFeedback', []):
                param = f" {fb['parameter']}" if fb.get('parameter') else ''
                codec_sdp_lines.append(f"a=rtcp-fb:{c_pt} {fb['type']}{param}")

            # Format parameters
            fmtp_parts = []
            for k, v in c.get('parameters', {}).items():
                fmtp_parts.append(f"{k}={v}")
            if fmtp_parts:
                codec_sdp_lines.append(f"a=fmtp:{c_pt} {';'.join(fmtp_parts)}")

        pt_list = ' '.join(payload_types)

        # Header extensions (critical for transport-cc BWE)
        extmap_lines = []
        for ext in rtp_params.get('headerExtensions', []):
            extmap_lines.append(f"a=extmap:{ext['id']} {ext['uri']}")

        port = ice_candidates[0]['port'] if ice_candidates else 9
        ip = '127.0.0.1'  # Always use localhost for Docker port-mapped access

        sdp_parts = [
            "v=0",
            "o=- 1 1 IN IP4 0.0.0.0",
            "s=-",
            "t=0 0",
            "a=group:BUNDLE 0",
            "a=msid-semantic: WMS *",
            f"m=video {port} UDP/TLS/RTP/SAVPF {pt_list}",
            f"c=IN IP4 {ip}",
            "a=rtcp:9 IN IP4 0.0.0.0",
            f"a=ice-ufrag:{ufrag}",
            f"a=ice-pwd:{pwd}",
            fp_line,
            "a=setup:actpass",
            "a=mid:0",
            "a=sendonly",
            "a=rtcp-mux",
            "a=rtcp-rsize",
        ] + extmap_lines + codec_sdp_lines

        if ssrc:
            sdp_parts.append(f"a=ssrc:{ssrc} cname:{cname}")

        sdp_parts.extend(cand_lines)
        return "\r\n".join(sdp_parts) + "\r\n"

    @staticmethod
    def _extract_fingerprints(sdp: str):
        """Extract DTLS fingerprints from an SDP string."""
        import re
        fps = []
        for m in re.finditer(r'a=fingerprint:(\S+)\s+(\S+)', sdp):
            fps.append({'algorithm': m.group(1), 'value': m.group(2)})
        return fps

    async def _consume_track(self, track):
        """Consume video track and count frames."""
        try:
            while True:
                frame = await track.recv()
                self.frames_received += 1
        except Exception:
            pass  # Track ended
    
    async def _collect_stats_for_duration(self):
        """Collect WebRTC stats over the benchmark duration."""
        start_time = time.time()
        sample_interval = 1.0  # seconds
        samples = int(self.max_duration / sample_interval)
        
        if HAS_TQDM:
            progress = tqdm(range(samples), desc="   Progress", unit="s",
                          bar_format="   {l_bar}{bar:40}{r_bar}")
        else:
            progress = range(samples)
        
        prev_consumer_bytes = 0
        prev_transport_bytes = 0
        prev_time = start_time
        bench_start = start_time
        
        for i in progress:
            await asyncio.sleep(sample_interval)
            
            current_time = time.time()
            elapsed = current_time - prev_time
            
            # Get stats from server (mediasoup side)
            _server_layer = -1
            try:
                stats = self._api_get(f'/stats/{self.client_id}')
                _server_layer = stats.get('currentLayer', -1)
                
                # ── Throughput from transport stats (actual bytes on the wire) ──
                bwe_kbps = 0
                if 'transport' in stats and stats['transport']:
                    for t_entry in stats['transport']:
                        if not isinstance(t_entry, dict):
                            continue
                        transport_bytes = (
                            t_entry.get('bytesReceived', 0)
                            + t_entry.get('bytesSent', 0)
                        )
                        if transport_bytes > prev_transport_bytes and elapsed > 0:
                            tp_bps = (transport_bytes - prev_transport_bytes) * 8 / elapsed
                            self.metrics.throughput_samples.append(tp_bps / 1000)
                        prev_transport_bytes = max(transport_bytes, prev_transport_bytes)
                        # BWE estimate
                        bwe_kbps = t_entry.get('availableOutgoingBitrate', 0) / 1000
                        break
                
                # ── Bitrate from consumer stats (encoding/media bitrate) ──
                if 'consumer' in stats and stats['consumer']:
                    consumer_stats = stats['consumer']
                    
                    for stat_entry in consumer_stats:
                        if not isinstance(stat_entry, dict):
                            continue

                        server_bitrate = stat_entry.get('bitrate', 0)
                        byte_count = (
                            stat_entry.get('byteCount', 0)
                            or stat_entry.get('bytesSent', 0)
                            or stat_entry.get('bytesReceived', 0)
                        )

                        if server_bitrate > 0:
                            bitrate_kbps = server_bitrate / 1000
                            self.metrics.bitrate_samples.append(int(bitrate_kbps))
                        elif byte_count > prev_consumer_bytes:
                            bitrate_bps = (byte_count - prev_consumer_bytes) * 8 / elapsed
                            bitrate_kbps = bitrate_bps / 1000
                            self.metrics.bitrate_samples.append(int(bitrate_kbps))

                        prev_consumer_bytes = byte_count if byte_count > prev_consumer_bytes else prev_consumer_bytes

                        jitter = stat_entry.get('jitter', 0)
                        if jitter:
                            self.jitter_samples.append(jitter * 1000)

                        packets_lost = stat_entry.get('packetsLost', 0)
                        packet_count = (
                            stat_entry.get('packetCount', 0)
                            or stat_entry.get('packetsReceived', 0)
                        )
                        total_packets = packet_count + packets_lost
                        if total_packets > 0:
                            loss_rate = packets_lost / total_packets * 100
                            self.packet_loss_samples.append(loss_rate)

                        rtt = stat_entry.get('roundTripTime', 0)
                        # roundTripTime is in seconds per WebRTC spec.
                        # Reject bogus values: must be positive and < 10 s (10 000 ms).
                        if rtt and 0 < rtt < 10:
                            self.rtt_samples.append(rtt * 1000)

                        break
                    
                    # Use simulated buffer level (WebRTC has jitter buffer, not playback buffer)
                    # Estimate based on jitter buffer delay
                    if self.jitter_samples:
                        buffer_estimate = max(0, 1000 - self.jitter_samples[-1] * 10)
                    else:
                        buffer_estimate = 500  # Default estimate
                    self.metrics.buffer_samples.append(buffer_estimate)
                    
            except Exception as e:
                # Server stats not available, use default estimates
                # This is normal if producer isn't streaming
                pass
            
            # Record trace available bandwidth at this point in time
            trace_bw = self._trace_bandwidth_at(current_time - bench_start)
            if trace_bw is not None:
                self.trace_bandwidth_samples.append(trace_bw)

            # ── Switch simulcast layer to match trace bandwidth ──────────────
            # WebRTC RTP bypasses the nginx shaper, so we enforce bandwidth
            # at the application layer. Use same 90%-headroom rule as server.js
            # selectLayerForBandwidth(), over the 6-layer Pensieve ladder.
            _LAYER_MAX_KBPS = [300, 750, 1200, 1850, 2850, 4300]
            if trace_bw is not None:
                usable_kbps = trace_bw * 0.9
                target_layer = 0
                for _i, _max in enumerate(_LAYER_MAX_KBPS):
                    if _max <= usable_kbps:
                        target_layer = _i
                if target_layer != getattr(self, '_current_layer', -1):
                    try:
                        self._api_post('/switchLayer', {
                            'clientId': self.client_id,
                            'spatialLayer': target_layer,
                        })
                        self._current_layer = target_layer
                    except Exception:
                        pass

            # Track playback time
            self.metrics.total_playback_time_ms += sample_interval * 1000

            # Track quality switches using the server-reported layer (authoritative).
            # _server_layer is captured from /stats each second; it reflects the real
            # active layer regardless of whether /switchLayer or the server's BWE ABR
            # triggered the change.
            _LAYER_MAX_KBPS = [300, 750, 1200, 1850, 2850, 4300]
            if _server_layer >= 0:
                self._current_layer = _server_layer
            new_layer = getattr(self, '_current_layer', -1)
            prev_layer = getattr(self, '_prev_layer_for_switch', new_layer)
            if new_layer != prev_layer and prev_layer >= 0:
                prev_br = _LAYER_MAX_KBPS[prev_layer] * 1000 if prev_layer < len(_LAYER_MAX_KBPS) else 0
                curr_br = _LAYER_MAX_KBPS[new_layer]  * 1000 if new_layer  < len(_LAYER_MAX_KBPS) else 0
                self.metrics.bitrate_switches += 1
                self.metrics.switch_magnitude_total += abs(curr_br - prev_br)
                if curr_br > prev_br:
                    self.metrics.switch_up_count += 1
                else:
                    self.metrics.switch_down_count += 1
            self._prev_layer_for_switch = new_layer
            
            prev_time = current_time
            
            # Update progress
            if HAS_TQDM:
                bitrate_str = f"{self.metrics.bitrate_samples[-1]}k" if self.metrics.bitrate_samples else "N/A"
                tp_str = f"{self.metrics.throughput_samples[-1]:.0f}k" if self.metrics.throughput_samples else "N/A"
                bwe_str = f"{bwe_kbps:.0f}k" if bwe_kbps else "N/A"
                trace_str = f"{trace_bw:.0f}k" if trace_bw is not None else "N/A"
                progress.set_postfix({
                    'bitrate': bitrate_str,
                    'throughput': tp_str,
                    'bwe': bwe_str,
                    'trace_bw': trace_str,
                })
            else:
                print_progress(i + 1, samples, 
                             prefix="   Progress",
                             suffix=f"| {self.metrics.bitrate_samples[-1] if self.metrics.bitrate_samples else 0}kbps")
    
    async def _cleanup(self):
        """Cleanup WebRTC resources."""
        print("\n[CLEANUP] Disconnecting...")
        
        try:
            self._api_post('/disconnect', {'clientId': self.client_id})
        except Exception:
            pass
        
        if self.pc:
            await self.pc.close()
    
    def run(self) -> StreamingMetrics:
        """Run the benchmark (sync wrapper)."""
        return asyncio.get_event_loop().run_until_complete(self.run_async())
    
    def print_results(self):
        """Print formatted results."""
        m = self.metrics
        
        print("\n" + "=" * 70)
        print("  BENCHMARK RESULTS (WebRTC)")
        print("=" * 70)
        
        # Timing
        print("\n  [TIMING]")
        print(f"      Startup delay:     {m.startup_delay_ms:,.0f} ms")
        print(f"      Stream time:       {m.total_playback_time_ms/1000:,.1f} s")
        
        # Bitrate
        if m.bitrate_samples:
            print("\n  [BITRATE]")
            print(f"      Average (selected):  {m.avg_bitrate_kbps:,.0f} kbps")
            print(f"      Average (effective): {m.effective_avg_bitrate_kbps:,.0f} kbps")
            print(f"      Min / Max:           {m.min_bitrate_kbps:,.0f} / {m.max_bitrate_kbps:,.0f} kbps")
            print(f"      Median:              {m.bitrate_median:,.0f} kbps")
            print(f"      Std deviation:       {m.bitrate_std_dev:,.1f} kbps")
        
        # Switching
        print("\n  [QUALITY SWITCHES]")
        print(f"      Total count:       {m.bitrate_switches}")
        print(f"      Up / Down:         {m.switch_up_count} / {m.switch_down_count}")
        if m.bitrate_switches > 0:
            print(f"      Avg magnitude:     {m.avg_switch_magnitude:,.0f} kbps")
        
        # WebRTC-specific metrics
        if self.jitter_samples:
            avg_jitter = sum(self.jitter_samples) / len(self.jitter_samples)
            print("\n  [JITTER]")
            print(f"      Average:           {avg_jitter:.1f} ms")
            print(f"      Min / Max:         {min(self.jitter_samples):.1f} / {max(self.jitter_samples):.1f} ms")
        
        if self.packet_loss_samples:
            avg_loss = sum(self.packet_loss_samples) / len(self.packet_loss_samples)
            print("\n  [PACKET LOSS]")
            print(f"      Average:           {avg_loss:.2f}%")
            print(f"      Max:               {max(self.packet_loss_samples):.2f}%")
        
        if self.rtt_samples:
            avg_rtt = sum(self.rtt_samples) / len(self.rtt_samples)
            print("\n  [ROUND-TRIP TIME]")
            print(f"      Average:           {avg_rtt:.1f} ms")
            print(f"      Min / Max:         {min(self.rtt_samples):.1f} / {max(self.rtt_samples):.1f} ms")
        
        # Throughput
        if m.throughput_samples:
            print("\n  [THROUGHPUT (measured)]")
            print(f"      Average:           {m.avg_throughput_kbps:,.0f} kbps")
            print(f"      Median:            {m.median_throughput_kbps:,.0f} kbps")
            print(f"      Min / Max:         {m.min_throughput_kbps:,.0f} / {m.max_throughput_kbps:,.0f} kbps")

        # Trace available bandwidth
        if self.trace_bandwidth_samples:
            avg_trace = sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples)
            min_trace = min(self.trace_bandwidth_samples)
            max_trace = max(self.trace_bandwidth_samples)
            print("\n  [AVAILABLE BW (trace)]")
            print(f"      Average:           {avg_trace:,.0f} kbps")
            print(f"      Min / Max:         {min_trace:,.0f} / {max_trace:,.0f} kbps")
            if m.median_throughput_kbps > 0:
                util = m.median_throughput_kbps / avg_trace * 100
                print(f"      Utilisation:       {util:.1f}%")

        print("\n" + "=" * 70)
    
    def save_results(self, filename: str):
        """Save results to JSON."""
        results = {
            "timestamp": datetime.now().isoformat(),
            "server": self.base_url,
            "protocol": "webrtc",
            "client_id": self.client_id,
            "config": {
                "duration_s": self.max_duration,
            },
            "metrics": self.metrics.to_dict(),
            "webrtc_specific": {
                "jitter": {
                    "samples": self.jitter_samples,
                    "average_ms": sum(self.jitter_samples) / len(self.jitter_samples) if self.jitter_samples else 0,
                },
                "packet_loss": {
                    "samples": self.packet_loss_samples,
                    "average_percent": sum(self.packet_loss_samples) / len(self.packet_loss_samples) if self.packet_loss_samples else 0,
                },
                "rtt": {
                    "samples": self.rtt_samples,
                    "average_ms": sum(self.rtt_samples) / len(self.rtt_samples) if self.rtt_samples else 0,
                },
                "trace_bandwidth": {
                    "samples": self.trace_bandwidth_samples,
                    "average_kbps": sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples) if self.trace_bandwidth_samples else 0,
                },
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n[SAVED] {filename}")


class MOQBenchmark:
    """
    MOQ (Media over QUIC Transport) benchmark.
    Starts the relay + publisher as subprocesses, then runs a headless Chromium
    browser that connects via WebTransport and plays back the video.
    """

    def __init__(self, duration: float = 120.0, trace_path: str = None):
        self.max_duration     = duration
        self.trace_path       = trace_path          # FCC trace CSV (may be None)
        self.metrics          = StreamingMetrics()
        self.trace_bandwidth_samples: List[float] = []

        self._moq_dir     = Path(__file__).parent / 'moq-server'
        self._relay_url   = 'http://localhost:8090'   # HTTP companion for player
        self._player_url  = 'http://localhost:8090/player.html'

    def _load_trace(self):
        import csv as _csv
        src = Path(self.trace_path) if self.trace_path else \
              Path(__file__).parent / 'shaper' / 'trace' / 'trace.csv'
        if not src.exists():
            self._trace_rows = []
            return
        rows = []
        has_header = False
        with open(src) as f:
            for i, row in enumerate(_csv.reader(f)):
                if not row:
                    continue
                if i == 0 and 'bandwidth' in ','.join(row).lower():
                    has_header = True
                    continue
                try:
                    elapsed_s = float(row[0])
                    bw = float(row[3]) if has_header and len(row) >= 4 else float(row[1])
                    rows.append((elapsed_s, bw))
                except (ValueError, IndexError):
                    continue
        if rows:
            t0 = rows[0][0]
            self._trace_rows = [(t - t0, bw) for t, bw in rows]
        else:
            self._trace_rows = []

    def _trace_bw_at(self, elapsed_s: float):
        if not self._trace_rows:
            return None
        dur = self._trace_rows[-1][0]
        t = elapsed_s % dur if dur > 0 else 0
        for i in range(len(self._trace_rows) - 1):
            if self._trace_rows[i][0] <= t < self._trace_rows[i + 1][0]:
                return self._trace_rows[i][1]
        return self._trace_rows[-1][1]

    def run(self) -> StreamingMetrics:
        from playwright.sync_api import sync_playwright

        print("\n" + "=" * 70)
        print("  MOQ Streaming QoE Benchmark (WebTransport/QUIC)")
        print("=" * 70)
        print(f"  Player:  {self._player_url}")
        print(f"  Trace:   {self.trace_path or '(none)'}")
        print("=" * 70 + "\n")

        self._load_trace()

        # Start relay
        relay_proc = subprocess.Popen(
            [sys.executable, str(self._moq_dir / 'relay.py')],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
            cwd=Path(__file__).parent,
        )
        time.sleep(3)  # wait for relay to bind

        # Publisher is started AFTER browser subscribes (inside the playwright block)
        pub_proc = None

        buffer_samples: List[float] = []
        throughput_samples: List[float] = []

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    channel='chrome',
                    headless=True,
                    args=[
                        '--autoplay-policy=no-user-gesture-required',
                        '--mute-audio',
                        '--no-sandbox',
                        '--crash-dumps-dir=/tmp/ajhunjh1_tmp/crashpad',
                        '--disable-crash-reporter',
                    ]
                )
                page = browser.new_page()

                print("[BROWSER] Launching headless Chromium (MOQ)...")
                page.goto(self._player_url, timeout=30000, wait_until='domcontentloaded')

                # Wait for WebSocket to subscribe (before starting publisher)
                try:
                    page.wait_for_function(
                        "document.getElementById('status-text').textContent.includes('Receiving')",
                        timeout=10000,
                    )
                except Exception:
                    pass  # proceed anyway

                # NOW start publisher (browser is subscribed → init segment not evicted)
                pub_args = [sys.executable, str(self._moq_dir / 'publisher.py'),
                            '--duration', str(self.max_duration + 20)]
                if self.trace_path:
                    pub_args += ['--trace', self.trace_path]
                pub_proc = subprocess.Popen(
                    pub_args,
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    cwd=Path(__file__).parent,
                )

                startup_start = time.time()
                # Wait until video is actually playing
                try:
                    page.wait_for_function(
                        "document.getElementById('video') && "
                        "document.getElementById('video').currentTime > 0.1",
                        timeout=90000,
                    )
                except Exception:
                    pass

                self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
                print(f"   Startup delay: {self.metrics.startup_delay_ms:.0f}ms\n")

                print("[PLAYBACK] Collecting metrics...")
                poll_interval = 0.5
                playback_start = time.perf_counter()
                last_print = 0.0
                quality_samples = []   # kbps values sampled every 0.5s

                while True:
                    elapsed = time.perf_counter() - playback_start

                    try:
                        ended = page.evaluate("window.__playbackEnded")
                    except Exception:
                        ended = False
                    if ended:
                        break
                    if elapsed >= self.max_duration:
                        break

                    try:
                        buf_s = page.evaluate("""(() => {
                            const v = document.getElementById('video');
                            if (!v || !v.buffered.length) return 0;
                            return Math.max(0, v.buffered.end(v.buffered.length-1) - v.currentTime);
                        })()""")
                        buffer_samples.append(float(buf_s or 0) * 1000)
                    except Exception:
                        buffer_samples.append(0.0)

                    try:
                        q_bps = page.evaluate("window.__moqQualityBps || 0")
                        if q_bps > 0:
                            quality_samples.append(int(q_bps) // 1000)
                    except Exception:
                        pass

                    trace_bw = self._trace_bw_at(elapsed)
                    if trace_bw is not None:
                        throughput_samples.append(trace_bw)
                        self.trace_bandwidth_samples.append(trace_bw)

                    if elapsed - last_print >= 10:
                        buf_s_val = buffer_samples[-1] / 1000 if buffer_samples else 0
                        bps_str = ""
                        try:
                            q_bps = page.evaluate("window.__moqQualityBps || 0")
                            bps_str = f" | bitrate: {int(q_bps)//1000} kbps"
                        except Exception:
                            pass
                        trace_str = f" | trace_bw: {trace_bw:.0f} kbps" if trace_bw else ""
                        print(f"   t={elapsed:.0f}s | buffer: {buf_s_val:.1f}s"
                              f"{bps_str}{trace_str}")
                        last_print = elapsed

                    time.sleep(poll_interval)

                try:
                    page.evaluate("document.getElementById('video').pause()")
                except Exception:
                    pass

                final = page.evaluate("""() => {
                    const v = document.getElementById('video');
                    return {
                        rebufferCount:     window.__rebufferCount,
                        rebufferDurations: window.__rebufferDurations,
                        throughputSamples: window.__throughputSamples,
                        playbackTimeMs:    v ? v.currentTime * 1000 : 0,
                        qualitySamples:    window.__moqQualitySamples || [],
                    };
                }""")
                browser.close()

        finally:
            relay_proc.terminate()
            if pub_proc:
                pub_proc.terminate()
            try:
                relay_proc.wait(timeout=5)
                if pub_proc:
                    pub_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                relay_proc.kill()
                if pub_proc:
                    pub_proc.kill()

        m = self.metrics
        # Throughput from browser throughput samples
        js_tput = final.get('throughputSamples', [])
        if js_tput:
            for s in js_tput:
                if isinstance(s, dict) and s.get('ms', 0) > 0:
                    kbps = s['bytes'] * 8 / s['ms']
                    throughput_samples.append(kbps)

        # Use trace BW as throughput if no browser samples (same as DASH benchmark)
        m.throughput_samples     = throughput_samples
        m.buffer_samples         = buffer_samples
        m.rebuffer_count         = final.get('rebufferCount', 0)
        m.rebuffer_time_ms       = sum(final.get('rebufferDurations', []))
        m.rebuffer_durations     = final.get('rebufferDurations', [])
        m.total_playback_time_ms = final.get('playbackTimeMs', 0)

        # Build bitrate samples: prefer per-chunk quality from publisher metadata,
        # fall back to the polling samples collected during playback.
        js_quality = final.get('qualitySamples', [])
        if js_quality:
            m.bitrate_samples = [int(s['bps'] / 1000) for s in js_quality if s.get('bps', 0) > 0]
        elif quality_samples:
            m.bitrate_samples = quality_samples
        m.trace_bandwidth_samples = list(self.trace_bandwidth_samples)
        m.calculate_statistics()
        return m

    def print_results(self):
        m = self.metrics
        print("\n" + "=" * 70)
        print("  BENCHMARK RESULTS (MOQ / WebTransport/QUIC)")
        print("=" * 70)
        print(f"\n  [TIMING]")
        print(f"      Startup delay:     {m.startup_delay_ms:,.0f} ms")
        print(f"      Playback time:     {m.total_playback_time_ms/1000:,.1f} s")
        print(f"\n  [BITRATE]")
        print(f"      Average (selected):  {m.avg_bitrate_kbps:,.0f} kbps")
        print(f"      Average (effective): {m.effective_avg_bitrate_kbps:,.0f} kbps")
        print(f"\n  [REBUFFERING]")
        print(f"      Events:            {m.rebuffer_count}")
        print(f"      Total time:        {m.rebuffer_time_ms:,.0f} ms")
        print(f"      Ratio:             {m.rebuffer_ratio*100:.4f}%")
        print(f"\n  [THROUGHPUT]")
        print(f"      Average:           {m.avg_throughput_kbps:,.0f} kbps")
        if self.trace_bandwidth_samples:
            avg_t = sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples)
            print(f"\n  [AVAILABLE BW (trace)]")
            print(f"      Average:           {avg_t:,.0f} kbps")
        print("\n" + "=" * 70)

    def save_results(self, filename: str):
        avg_trace = (sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples)
                     if self.trace_bandwidth_samples else 0)
        results = {
            "timestamp": datetime.now().isoformat(),
            "protocol": "moq",
            "trace": self.trace_path,
            "metrics": self.metrics.to_dict(),
            "trace_bandwidth": {
                "samples": self.trace_bandwidth_samples,
                "average_kbps": avg_trace,
            },
        }
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n[SAVED] {filename}")


class MOQ2Benchmark:
    """
    MOQ2 benchmark using the official moq-dev/moq stack:
    - moq-relay (Rust, compiled from source)
    - moq-cli fmp4 --passthrough (reads stdin, publishes to relay)
    - Browser player using @moq/hang bundle over WebSocket

    Quality is fixed per run (selected from trace median bandwidth).
    Chunks are paced at the current trace bandwidth to simulate network delay.
    """

    RELAY_BIN  = Path('/tmp/moq-dev/target/release/moq-relay')
    MOQ_DIR    = Path(__file__).parent / 'moq-dev'
    RELAY_PORT = 4446
    HTTP_PORT  = 8095

    def __init__(self, duration: float = 120.0, trace_path: str = None):
        self.max_duration = duration
        self.trace_path   = trace_path
        self.metrics      = StreamingMetrics()
        self.trace_bandwidth_samples: List[float] = []

        self._relay_url  = f'http://127.0.0.1:{self.RELAY_PORT}'
        self._player_url = f'http://127.0.0.1:{self.HTTP_PORT}/player.html'

    def _load_trace(self):
        import csv as _csv
        src = Path(self.trace_path) if self.trace_path else None
        if not src or not src.exists():
            self._trace_rows = []
            return
        rows = []
        has_header = False
        with open(src) as f:
            for i, row in enumerate(_csv.reader(f)):
                if not row:
                    continue
                if i == 0 and 'bandwidth' in ','.join(row).lower():
                    has_header = True
                    continue
                try:
                    t   = float(row[0])
                    bw  = float(row[3]) if has_header and len(row) >= 4 else float(row[1])
                    rows.append((t, bw))
                except (ValueError, IndexError):
                    continue
        if rows:
            t0 = rows[0][0]
            self._trace_rows = [(t - t0, bw) for t, bw in rows]
        else:
            self._trace_rows = []

    def _trace_bw_at(self, elapsed_s: float) -> float:
        if not self._trace_rows:
            return 4_500_000
        dur = self._trace_rows[-1][0]
        t = elapsed_s % dur if dur > 0 else 0
        for i in range(len(self._trace_rows) - 1):
            if self._trace_rows[i][0] <= t < self._trace_rows[i + 1][0]:
                return self._trace_rows[i][1]
        return self._trace_rows[-1][1]

    def run(self) -> StreamingMetrics:
        import http.server
        import threading
        from playwright.sync_api import sync_playwright

        print("\n" + "=" * 70)
        print("  MOQ2 Streaming QoE Benchmark (moq-dev/moq official stack)")
        print("=" * 70)
        print(f"  Relay:   {self._relay_url}")
        print(f"  Player:  {self._player_url}")
        print(f"  Trace:   {self.trace_path or '(none)'}")
        print("=" * 70 + "\n")

        self._load_trace()

        if not self.RELAY_BIN.exists():
            raise FileNotFoundError(f"moq-relay not found: {self.RELAY_BIN}")

        # ── HTTP server for player.html + moq-bundle.js ───────────────
        moq_dir = str(self.MOQ_DIR)
        handler = http.server.SimpleHTTPRequestHandler

        class _ReuseServer(http.server.HTTPServer):
            allow_reuse_address = True

        httpd = _ReuseServer(('127.0.0.1', self.HTTP_PORT),
                             lambda *a, **kw: handler(*a, directory=moq_dir, **kw))
        httpd_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        httpd_thread.start()

        # ── Start moq-relay ───────────────────────────────────────────
        relay_proc = subprocess.Popen(
            [
                str(self.RELAY_BIN),
                '--server-bind',    f'127.0.0.1:{self.RELAY_PORT}',
                '--web-http-listen', f'127.0.0.1:{self.RELAY_PORT}',
                '--tls-generate',   'localhost',
                '--auth-public',    '/',
            ],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
            cwd='/tmp',
        )
        time.sleep(2)

        pub_proc = None
        buffer_samples: List[float] = []
        throughput_samples: List[float] = []
        selected_quality_bps: int = 0

        # Start publisher BEFORE browser so catalog is available when browser connects
        pub_args = [sys.executable,
                    str(self.MOQ_DIR / 'publisher.py'),
                    '--duration', str(self.max_duration + 30)]
        if self.trace_path:
            pub_args += ['--trace', self.trace_path]

        pub_proc = subprocess.Popen(
            pub_args,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            cwd=Path(__file__).parent,
            env={**__import__('os').environ, 'MOQ2_RELAY_URL': self._relay_url},
        )

        # Read quality from publisher (it prints this immediately)
        import select as _select
        if pub_proc.stdout:
            try:
                r, _, _ = _select.select([pub_proc.stdout], [], [], 5)
                if r:
                    line = pub_proc.stdout.readline().decode().strip()
                    if line.startswith('QUALITY '):
                        selected_quality_bps = int(line.split()[1])
                        print(f"   Publisher quality: {selected_quality_bps//1000} kbps")
            except Exception:
                pass

        time.sleep(3)  # let publisher establish session and send catalog

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    channel='chrome',
                    headless=True,
                    args=[
                        '--autoplay-policy=no-user-gesture-required',
                        '--mute-audio',
                        '--no-sandbox',
                        '--ignore-certificate-errors',
                        '--allow-insecure-localhost',
                        '--crash-dumps-dir=/tmp/ajhunjh1_tmp/crashpad',
                        '--disable-crash-reporter',
                    ]
                )
                page = browser.new_page()

                print("[BROWSER] Launching headless Chromium (MOQ2)...")
                page.goto(self._player_url, timeout=30000, wait_until='domcontentloaded')

                startup_start = time.time()
                try:
                    page.wait_for_function(
                        "document.getElementById('video') && "
                        "document.getElementById('video').currentTime > 0.1",
                        timeout=90000,
                    )
                except Exception:
                    pass
                self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
                print(f"   Startup delay: {self.metrics.startup_delay_ms:.0f}ms\n")

                print("[PLAYBACK] Collecting metrics...")
                poll_interval = 0.5
                playback_start = time.perf_counter()
                last_print = 0.0

                while True:
                    elapsed = time.perf_counter() - playback_start

                    try:
                        ended = page.evaluate("window.__playbackEnded")
                    except Exception:
                        ended = False
                    if ended or elapsed >= self.max_duration:
                        break

                    try:
                        buf_s = page.evaluate("""(() => {
                            const v = document.getElementById('video');
                            if (!v || !v.buffered.length) return 0;
                            return Math.max(0, v.buffered.end(v.buffered.length-1) - v.currentTime);
                        })()""")
                        buffer_samples.append(float(buf_s or 0) * 1000)
                    except Exception:
                        buffer_samples.append(0.0)

                    trace_bw = self._trace_bw_at(elapsed)
                    throughput_samples.append(trace_bw)
                    self.trace_bandwidth_samples.append(trace_bw)

                    if elapsed - last_print >= 10:
                        buf_val = buffer_samples[-1] / 1000 if buffer_samples else 0
                        q_str = f" | quality: {selected_quality_bps//1000} kbps" if selected_quality_bps else ""
                        print(f"   t={elapsed:.0f}s | buffer: {buf_val:.1f}s{q_str}"
                              f" | trace_bw: {trace_bw:.0f} kbps")
                        last_print = elapsed

                    time.sleep(poll_interval)

                try:
                    page.evaluate("document.getElementById('video').pause()")
                except Exception:
                    pass

                final = page.evaluate("""() => {
                    const v = document.getElementById('video');
                    return {
                        rebufferCount:     window.__rebufferCount || 0,
                        rebufferDurations: window.__rebufferDurations || [],
                        throughputSamples: window.__throughputSamples || [],
                        playbackTimeMs:    v ? v.currentTime * 1000 : 0,
                    };
                }""")
                browser.close()

        finally:
            relay_proc.terminate()
            httpd.shutdown()
            httpd.server_close()
            if pub_proc:
                pub_proc.terminate()
            try:
                relay_proc.wait(timeout=5)
                if pub_proc:
                    pub_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                relay_proc.kill()
                if pub_proc:
                    pub_proc.kill()

        m = self.metrics
        m.throughput_samples     = throughput_samples
        m.buffer_samples         = buffer_samples
        m.rebuffer_count         = final.get('rebufferCount', 0)
        m.rebuffer_time_ms       = sum(final.get('rebufferDurations', []))
        m.rebuffer_durations     = final.get('rebufferDurations', [])
        m.total_playback_time_ms = final.get('playbackTimeMs', 0)

        # Bitrate: use fixed quality from publisher
        if selected_quality_bps > 0:
            m.bitrate_samples = [selected_quality_bps // 1000] * max(len(buffer_samples), 1)
        m.trace_bandwidth_samples = list(self.trace_bandwidth_samples)
        m.calculate_statistics()
        return m

    def print_results(self):
        m = self.metrics
        print("\n" + "=" * 70)
        print("  BENCHMARK RESULTS (MOQ2 / moq-dev official stack)")
        print("=" * 70)
        print(f"\n  [TIMING]")
        print(f"      Startup delay:     {m.startup_delay_ms:,.0f} ms")
        print(f"      Playback time:     {m.total_playback_time_ms/1000:,.1f} s")
        print(f"\n  [BITRATE]")
        print(f"      Average (selected):  {m.avg_bitrate_kbps:,.0f} kbps")
        print(f"      Average (effective): {m.effective_avg_bitrate_kbps:,.0f} kbps")
        print(f"\n  [REBUFFERING]")
        print(f"      Events:            {m.rebuffer_count}")
        print(f"      Total time:        {m.rebuffer_time_ms:,.0f} ms")
        print(f"      Ratio:             {m.rebuffer_ratio*100:.4f}%")
        print(f"\n  [THROUGHPUT]")
        print(f"      Average:           {m.avg_throughput_kbps:,.0f} kbps")
        if self.trace_bandwidth_samples:
            avg_t = sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples)
            print(f"\n  [AVAILABLE BW (trace)]")
            print(f"      Average:           {avg_t:,.0f} kbps")
        print("\n" + "=" * 70)

    def save_results(self, filename: str):
        avg_trace = (sum(self.trace_bandwidth_samples) / len(self.trace_bandwidth_samples)
                     if self.trace_bandwidth_samples else 0)
        results = {
            "timestamp": datetime.now().isoformat(),
            "protocol": "moq2",
            "trace": self.trace_path,
            "metrics": self.metrics.to_dict(),
            "trace_bandwidth": {
                "samples": self.trace_bandwidth_samples,
                "average_kbps": avg_trace,
            },
        }
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n[SAVED] {filename}")


def setup_trace(trace_path: Path, protocol: str = "dash", skip_restart: bool = False) -> None:
    """Copy a trace file to the shaper directory and restart the shaper.

    For WebRTC, also starts a tc-trace replay inside the webrtc container
    so that UDP/RTP traffic is shaped identically to the HTTP shaper path.
    """
    shaper_trace = Path(__file__).parent / "shaper" / "trace" / "trace.csv"
    shaper_trace.parent.mkdir(parents=True, exist_ok=True)
    if trace_path.resolve() != shaper_trace.resolve():
        shutil.copy(trace_path, shaper_trace)
    print(f"[TRACE] {trace_path.name}")

    # Protocols that use tc/netem directly inside their own container
    _direct_shapers = {
        "dash":   "http://localhost:8080",
        "hls":    "http://localhost:8080",
        "lldash": "http://localhost:8081",
    }
    if protocol in _direct_shapers:
        url = _direct_shapers[protocol]
        tag = protocol.upper()
        print(f"[{tag}-SHAPER] Triggering tc-trace via /startShaping API...")
        try:
            resp = requests.post(f"{url}/startShaping", timeout=5)
            if resp.ok:
                print(f"[{tag}-SHAPER] tc-trace.py starting in container")
            else:
                print(f"[{tag}-SHAPER] /startShaping returned {resp.status_code}")
        except Exception as e:
            print(f"[{tag}-SHAPER] Warning: could not reach /startShaping: {e}")
    elif skip_restart:
        print("[SHAPER] Skipping restart (--no-shaper-restart)")
    else:
        print("[SHAPER] Restarting nginx shaper...")
        subprocess.run(
            ["sudo", "docker", "compose", "restart", "shaper"],
            capture_output=True,
            cwd=Path(__file__).parent,
        )

    if protocol == "webrtc":
        # Trigger tc-trace.py via the /startShaping REST endpoint instead of
        # 'sudo docker exec' (which requires a TTY and fails in headless scripts).
        # The /startShaping endpoint was added to server.js for this purpose.
        webrtc_url = "http://localhost:3000"
        print("[WEBRTC-SHAPER] Triggering tc-trace via /startShaping API...")
        try:
            resp = requests.post(f"{webrtc_url}/startShaping", timeout=5)
            if resp.ok:
                print(f"[WEBRTC-SHAPER] tc-trace.py starting in container")
            else:
                print(f"[WEBRTC-SHAPER] /startShaping returned {resp.status_code}")
        except Exception as e:
            print(f"[WEBRTC-SHAPER] Warning: could not reach /startShaping: {e}")

    time.sleep(3)


def resolve_url(base_url: str, protocol: str, shaped: bool) -> str:
    """Return the final URL after applying shaped-port mapping.

    DASH now uses tc/netem directly inside hls-dash-server (port 8080).
    No nginx proxy hop — port 8080 is always used regardless of shaping.
    """
    # All other protocols (lldash, hls) keep their existing port behaviour.
    return base_url


def run_single_benchmark(protocol: str, url: str, duration, output_path: str,
                         trace_name: str = None, dash_url: str = None,
                         trace_path: str = None):
    """Run a single benchmark and save results. Returns True on success."""
    if protocol == "dash":
        benchmark = DASHJSBenchmark(url, duration, protocol_name="dash")
    elif protocol == "lldash":
        benchmark = DASHJSBenchmark(url, duration, protocol_name="lldash")
    elif protocol == "hls":
        benchmark = HLSBenchmark(url, duration)
    elif protocol == "moq":
        benchmark = MOQBenchmark(duration=duration or 120.0, trace_path=trace_path)
    elif protocol == "moq2":
        benchmark = MOQ2Benchmark(duration=duration or 120.0, trace_path=trace_path)
    else:
        if not HAS_AIORTC:
            print("[ERROR] WebRTC benchmark requires aiortc library")
            print("        Install with: pip install aiortc")
            return False
        benchmark = WebRTCBenchmark(url, duration, dash_url=dash_url)

    try:
        benchmark.run()
        benchmark.print_results()
        benchmark.save_results(output_path)
        return True
    except KeyboardInterrupt:
        print("\n\n[INTERRUPTED] Benchmark stopped")
        if hasattr(benchmark, 'max_bitrate'):
            benchmark.metrics.calculate_statistics(benchmark.max_bitrate)
        else:
            benchmark.metrics.calculate_statistics()
        benchmark.print_results()
        return False
    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] Cannot connect to {url}")
        print("        Run: docker compose up -d")
        return False
    except Exception as e:
        print(f"\n[ERROR] Benchmark failed: {e}")
        raise


def collect_trace_files(directory: Path) -> List[Path]:
    """Return sorted list of *_tc.csv trace files in a directory."""
    traces = sorted(directory.glob("*_tc.csv"))
    return traces


def main():
    parser = argparse.ArgumentParser(
                description="Streaming Benchmark Tool (DASH + LL-DASH + HLS + WebRTC)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single trace
  python benchmark.py --trace traces/trace_12743_3g_tc.csv

  # All traces in a folder
  python benchmark.py --trace-dir traces/

  # WebRTC with a folder of traces
  python benchmark.py -p webrtc --trace-dir traces/

    # HLS with a folder of traces
    python benchmark.py -p hls --trace-dir traces/

  # Direct (no shaping)
  python benchmark.py
  python benchmark.py -p webrtc --duration 60
        """
    )
    parser.add_argument("--protocol", "-p", choices=["dash", "lldash", "hls", "webrtc", "moq", "moq2"], default="dash",
                       help="Streaming protocol to benchmark (default: dash)")
    parser.add_argument("--url", default=None,
                       help="Base URL of server (default: auto-detect based on protocol)")
    parser.add_argument("--duration", type=float, default=None,
                       help="Max duration to test (seconds)")
    parser.add_argument("--output", "-o", default=None,
                       help="Output JSON file (ignored when using --trace-dir)")
    parser.add_argument("--shaped", action="store_true",
                       help="Use shaped port (9080 for DASH/HLS, 9081 for LL-DASH, 9030 for WebRTC)")
    parser.add_argument("--trace", type=str, default=None,
                       help="Path to a single trace file (e.g., traces/trace_12743_3g_tc.csv)")
    parser.add_argument("--trace-dir", type=str, default=None,
                       help="Path to a folder of trace files; runs benchmark on every *_tc.csv in the folder")
    parser.add_argument("--results-dir", type=str, default=None,
                       help="Custom results subdirectory (e.g., 2025-15-05-results)")
    parser.add_argument("--no-shaper-restart", action="store_true",
                       help="Skip docker shaper restart (reuse running shaper)")

    args = parser.parse_args()

    # --trace and --trace-dir are mutually exclusive
    if args.trace and args.trace_dir:
        print("[ERROR] --trace and --trace-dir are mutually exclusive. Use one or the other.")
        sys.exit(1)

    # Set default URL based on protocol
    if args.url is None:
        if args.protocol == "dash":
            args.url = "http://localhost:8080"
        elif args.protocol == "hls":
            # Both page and media from port 8080 — tc/netem shapes inside hls-dash-server
            args.url = "http://localhost:8080/hls.html?manifest=http://localhost:8080/hls/master.m3u8"
        elif args.protocol == "lldash":
            # Both page and media from port 8081 — tc/netem shapes inside lldash-server
            args.url = "http://localhost:8081/?mpd=http://localhost:8081/manifest_ll_2s.mpd"
        elif args.protocol == "moq":
            args.url = "http://localhost:8090/player.html"
        elif args.protocol == "moq2":
            args.url = f"http://localhost:{MOQ2Benchmark.HTTP_PORT}/player.html"
        else:
            args.url = "http://localhost:3000"

    # Derive the DASH server URL so WebRTC can query the manifest for duration
    from urllib.parse import urlparse
    parsed = urlparse(args.url)
    dash_url = f"{parsed.scheme}://{parsed.hostname}:8080"

    if args.results_dir:
        results_dir = Path(__file__).parent / "results" / args.results_dir
    else:
        results_dir = Path(__file__).parent / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    # ── Folder of traces ──────────────────────────────────────────────
    if args.trace_dir:
        trace_dir = Path(args.trace_dir)
        if not trace_dir.is_dir():
            print(f"[ERROR] Trace directory not found: {args.trace_dir}")
            sys.exit(1)

        trace_files = collect_trace_files(trace_dir)
        if not trace_files:
            print(f"[ERROR] No *_tc.csv trace files found in {args.trace_dir}")
            sys.exit(1)

        print(f"\n{'=' * 70}")
        print(f"  BATCH RUN: {len(trace_files)} trace(s) from {trace_dir}")
        print(f"{'=' * 70}\n")

        succeeded = 0
        failed_traces = []

        for idx, trace_path in enumerate(trace_files, 1):
            print(f"\n{'─' * 70}")
            print(f"  [{idx}/{len(trace_files)}] {trace_path.name}")
            print(f"{'─' * 70}")

            if args.protocol not in ('moq', 'moq2'):
                setup_trace(trace_path, protocol=args.protocol, skip_restart=args.no_shaper_restart)
            url = resolve_url(args.url, args.protocol, shaped=True)

            trace_stem = trace_path.stem  # e.g. trace_12743_3g_tc
            output_path = str(
                results_dir / f"benchmark_{args.protocol}_{trace_stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )

            ok = run_single_benchmark(args.protocol, url, args.duration, output_path,
                                     trace_name=trace_path.name, dash_url=dash_url,
                                     trace_path=str(trace_path))
            if ok:
                succeeded += 1
            else:
                failed_traces.append(trace_path.name)

        # Summary
        print(f"\n{'=' * 70}")
        print(f"  BATCH COMPLETE: {succeeded}/{len(trace_files)} succeeded")
        if failed_traces:
            print(f"  Failed: {', '.join(failed_traces)}")
        print(f"  Results saved to: {results_dir}/")
        print(f"{'=' * 70}\n")
        return

    # ── Single trace ──────────────────────────────────────────────────
    if args.trace:
        trace_path = Path(args.trace)
        if not trace_path.exists():
            print(f"[ERROR] Trace file not found: {args.trace}")
            sys.exit(1)

        if args.protocol not in ('moq', 'moq2'):
            setup_trace(trace_path, protocol=args.protocol, skip_restart=args.no_shaper_restart)
        args.shaped = True

    url = resolve_url(args.url, args.protocol, args.shaped)

    if args.output:
        output_path = str(results_dir / Path(args.output).name)
    else:
        output_path = str(
            results_dir / f"benchmark_{args.protocol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )

    _tp = str(args.trace) if args.trace else None
    ok = run_single_benchmark(args.protocol, url, args.duration, output_path,
                              dash_url=dash_url, trace_path=_tp)
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
