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
import shutil
import subprocess
import requests
import xml.etree.ElementTree as ET
import asyncio
import uuid
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from datetime import datetime
from collections import deque
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
    """Simple progress bar fallback."""
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
    avg_bitrate_kbps: float = 0
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
    bandwidth_utilization: float = 0  # avg_bitrate / avg_throughput
    
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
            self.avg_throughput_kbps = sum(self.throughput_samples) / len(self.throughput_samples)
            self.min_throughput_kbps = min(self.throughput_samples)
            self.max_throughput_kbps = max(self.throughput_samples)
            if len(self.throughput_samples) > 1:
                tp_mean = self.avg_throughput_kbps
                self.throughput_variance = sum((x - tp_mean) ** 2 for x in self.throughput_samples) / len(self.throughput_samples)
                self.throughput_std_dev = self.throughput_variance ** 0.5
        
        # Buffer statistics
        if self.buffer_samples:
            self.avg_buffer_level_ms = sum(self.buffer_samples) / len(self.buffer_samples)
            self.min_buffer_level_ms = min(self.buffer_samples)
            self.max_buffer_level_ms = max(self.buffer_samples)
        
        # Bandwidth utilization
        if self.avg_throughput_kbps > 0:
            self.bandwidth_utilization = self.avg_bitrate_kbps / self.avg_throughput_kbps
        
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


class ThroughputBasedABR:
    """Throughput-based ABR algorithm (similar to dash.js default)."""
    
    def __init__(self, representations: List[dict], buffer_target_ms: float = 30000):
        self.representations = sorted(representations, key=lambda x: x['bandwidth'])
        self.throughput_history: deque = deque(maxlen=5)
        self.buffer_target_ms = buffer_target_ms
        self.safety_factor = 0.9
        self.current_index = 0  # Start at lowest
    
    def select_representation(self, buffer_level_ms: float) -> Tuple[dict, int]:
        """Select quality based on throughput and buffer."""
        if not self.throughput_history:
            return self.representations[0], 0
        
        # Harmonic mean of recent throughput (more conservative)
        harmonic_sum = sum(1/t for t in self.throughput_history if t > 0)
        if harmonic_sum > 0:
            avg_throughput_kbps = len(self.throughput_history) / harmonic_sum
        else:
            avg_throughput_kbps = 0
        
        safe_throughput_bps = avg_throughput_kbps * 1000 * self.safety_factor
        
        # Buffer-based adjustment
        buffer_ratio = buffer_level_ms / self.buffer_target_ms
        if buffer_ratio < 0.5:
            # Low buffer - be more conservative
            safe_throughput_bps *= 0.7
        elif buffer_ratio > 1.5:
            # High buffer - can be more aggressive
            safe_throughput_bps *= 1.1
        
        # Select highest quality that fits
        selected_index = 0
        for i, rep in enumerate(self.representations):
            if rep['bandwidth'] <= safe_throughput_bps:
                selected_index = i
        
        self.current_index = selected_index
        return self.representations[selected_index], selected_index
    
    def report_download(self, size_bytes: int, time_ms: float):
        """Report completed download for throughput estimation."""
        if time_ms > 0:
            throughput_kbps = (size_bytes * 8 / 1000) / (time_ms / 1000)
            self.throughput_history.append(throughput_kbps)


class StreamingBenchmark:
    """DASH streaming performance benchmark runner."""
    
    def __init__(self, base_url: str, max_duration: Optional[float] = None):
        self.base_url = base_url.rstrip('/')
        self.max_duration = max_duration
        self.session = requests.Session()
        self.metrics = StreamingMetrics()
        
        # Playback simulation state
        self.buffer_level_ms: float = 0
        self.segment_duration_ms: float = 4000
        self.buffer_target_ms: float = 30000
        self.buffer_max_ms: float = 60000
        self.is_startup: bool = True
        
        self.last_bitrate: Optional[int] = None
        self.max_bitrate: int = 3000
    
    def fetch_manifest(self) -> DASHManifestParser:
        """Fetch and parse MPD manifest."""
        url = f"{self.base_url}/manifest.mpd"
        response = self.session.get(url, timeout=10)
        response.raise_for_status()
        return DASHManifestParser(response.text)
    
    def download_segment(self, url: str) -> Tuple[bytes, float]:
        """Download segment and return content + time in ms."""
        full_url = f"{self.base_url}/{url}"
        start = time.time()
        response = self.session.get(full_url, timeout=60)
        response.raise_for_status()
        elapsed_ms = (time.time() - start) * 1000
        return response.content, elapsed_ms
    
    def simulate_playback(self, download_time_ms: float) -> Tuple[bool, float]:
        """
        Simulate playback during download.
        Returns (stalled, stall_duration_ms)
        
        During startup (before the first segment is buffered), the download
        time is part of the startup delay, not a rebuffering event.
        """
        playback_during_download = download_time_ms
        
        if self.is_startup:
            self.is_startup = False
            self.buffer_level_ms = self.segment_duration_ms
            return False, 0
        
        if self.buffer_level_ms >= playback_during_download:
            self.buffer_level_ms -= playback_during_download
            self.buffer_level_ms += self.segment_duration_ms
            return False, 0
        else:
            stall_duration = playback_during_download - self.buffer_level_ms
            self.buffer_level_ms = self.segment_duration_ms
            return True, stall_duration
    
    def run(self) -> StreamingMetrics:
        """Run the benchmark."""
        print("\n" + "=" * 70)
        print("  DASH Streaming QoE Benchmark")
        print("=" * 70)
        print(f"  Server: {self.base_url}")
        print("=" * 70 + "\n")
        
        # Fetch manifest
        print("📡 Fetching manifest...")
        startup_start = time.time()
        parser = self.fetch_manifest()
        representations = parser.get_representations()
        
        if not representations:
            print("[ERROR] No video representations found")
            return self.metrics
        
        self.max_bitrate = max(r['bandwidth'] // 1000 for r in representations)
        
        print(f"\n[QUALITY LEVELS] ({len(representations)})")
        for rep in representations:
            print(f"   • {rep['id']}: {rep['bandwidth']//1000:4} kbps @ {rep['width']}x{rep['height']}")
        
        # Initialize ABR
        abr = ThroughputBasedABR(representations, self.buffer_target_ms)
        
        # Calculate segments using minimum count across all representations
        # to avoid requesting segments that don't exist for higher-bitrate reps.
        total_duration = parser.get_duration_seconds()
        if self.max_duration:
            total_duration = min(total_duration, self.max_duration)
        
        rep = representations[0]
        if 'timeline' in rep:
            per_rep_counts = [len(r['timeline']) for r in representations if 'timeline' in r]
            segment_count = min(per_rep_counts) if per_rep_counts else len(rep['timeline'])
            if rep['timescale'] > 0:
                self.segment_duration_ms = rep['timeline'][0]['d'] / rep['timescale'] * 1000
        elif rep.get('duration') and rep.get('timescale'):
            self.segment_duration_ms = rep['duration'] / rep['timescale'] * 1000
            segment_count = int(total_duration * 1000 / self.segment_duration_ms)
        else:
            segment_count = int(total_duration / 4)
        
        if self.max_duration:
            segment_count = min(segment_count, int(self.max_duration * 1000 / self.segment_duration_ms))
        
        print(f"\n[DURATION] {total_duration:.1f}s ({segment_count} segments @ {self.segment_duration_ms/1000:.1f}s each)")
        
        # Download init segment
        selected, _ = abr.select_representation(0)
        init_url = selected['init'].replace('$RepresentationID$', selected['id'])
        print(f"\n[INIT] Loading stream...")
        
        try:
            _, init_time = self.download_segment(init_url)
            self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
        except Exception as e:
            print(f"   [WARN] Init segment error: {e}")
            self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
        
        print(f"   Startup delay: {self.metrics.startup_delay_ms:.0f}ms\n")
        
        # Progress bar setup
        print("[DOWNLOAD] Fetching segments:\n")
        
        start_number = rep.get('startNumber', 1)
        
        if HAS_TQDM:
            progress = tqdm(range(segment_count), desc="   Progress", unit="seg",
                          bar_format="   {l_bar}{bar:40}{r_bar}")
        else:
            progress = range(segment_count)
        
        for i in progress:
            segment_number = start_number + i
            
            # Buffer cap: pause fetching while buffer exceeds maximum,
            # draining in real-time like a real player would.
            while self.buffer_level_ms > self.buffer_max_ms:
                wait_ms = self.buffer_level_ms - self.buffer_max_ms + self.segment_duration_ms
                time.sleep(wait_ms / 1000)
                self.buffer_level_ms -= wait_ms
                self.metrics.total_playback_time_ms += wait_ms
            
            # Select quality
            selected, quality_idx = abr.select_representation(self.buffer_level_ms)
            bitrate_kbps = selected['bandwidth'] // 1000
            
            # Track bitrate switch
            if self.last_bitrate is not None and self.last_bitrate != bitrate_kbps:
                self.metrics.bitrate_switches += 1
                self.metrics.switch_magnitude_total += abs(bitrate_kbps - self.last_bitrate)
                if bitrate_kbps > self.last_bitrate:
                    self.metrics.switch_up_count += 1
                else:
                    self.metrics.switch_down_count += 1
            
            self.last_bitrate = bitrate_kbps
            self.metrics.bitrate_samples.append(bitrate_kbps)
            
            # Build segment URL
            segment_url = selected['media'].replace('$RepresentationID$', selected['id'])
            segment_url = segment_url.replace('$Number$', str(segment_number))
            segment_url = segment_url.replace('$Number%05d$', f"{segment_number:05d}")
            
            try:
                content, download_time_ms = self.download_segment(segment_url)
                size_bytes = len(content)
                throughput_kbps = (size_bytes * 8 / 1000) / (download_time_ms / 1000) if download_time_ms > 0 else 0
                
                self.metrics.throughput_samples.append(throughput_kbps)
                
                # Report to ABR
                abr.report_download(size_bytes, download_time_ms)
                
                # Simulate playback
                stalled, stall_duration = self.simulate_playback(download_time_ms)
                
                # Record buffer level AFTER playback simulation
                self.metrics.buffer_samples.append(self.buffer_level_ms)
                
                if stalled:
                    self.metrics.rebuffer_count += 1
                    self.metrics.rebuffer_time_ms += stall_duration
                    self.metrics.rebuffer_durations.append(stall_duration)
                
                self.metrics.total_playback_time_ms += self.segment_duration_ms
                
                # Record segment metrics
                seg_metrics = SegmentMetrics(
                    segment_number=segment_number,
                    timestamp=time.time(),
                    bitrate_kbps=bitrate_kbps,
                    resolution=f"{selected['width']}x{selected['height']}",
                    size_bytes=size_bytes,
                    download_time_ms=download_time_ms,
                    throughput_kbps=throughput_kbps,
                    buffer_level_ms=self.buffer_level_ms,
                    stalled=stalled,
                    stall_duration_ms=stall_duration
                )
                self.metrics.segments.append(seg_metrics)
                
                # Update progress bar description
                status = "STALL" if stalled else "OK"
                if HAS_TQDM:
                    progress.set_postfix({
                        'bitrate': f"{bitrate_kbps}k",
                        'buffer': f"{self.buffer_level_ms/1000:.1f}s",
                        'status': status
                    })
                else:
                    print_progress(i + 1, segment_count, 
                                 prefix="   Progress",
                                 suffix=f"| {bitrate_kbps}kbps | buf:{self.buffer_level_ms/1000:.1f}s | {status}")
                
            except Exception as e:
                self.metrics.failed_segments += 1
                if not HAS_TQDM:
                    print(f"\n   [ERROR] Segment {segment_number}: {e}")
        
        # Calculate final statistics
        self.metrics.calculate_statistics(self.max_bitrate)
        
        return self.metrics
    
    def print_results(self):
        """Print formatted results."""
        m = self.metrics
        
        print("\n" + "=" * 70)
        print("  BENCHMARK RESULTS")
        print("=" * 70)
        
        # Timing
        print("\n  [TIMING]")
        print(f"      Startup delay:     {m.startup_delay_ms:,.0f} ms")
        print(f"      Playback time:     {m.total_playback_time_ms/1000:,.1f} s")
        
        # Bitrate
        print("\n  [BITRATE]")
        print(f"      Average:           {m.avg_bitrate_kbps:,.0f} kbps")
        print(f"      Min / Max:         {m.min_bitrate_kbps:,.0f} / {m.max_bitrate_kbps:,.0f} kbps")
        print(f"      Median:            {m.bitrate_median:,.0f} kbps")
        print(f"      Std deviation:     {m.bitrate_std_dev:,.1f} kbps")
        print(f"      Variance:          {m.bitrate_variance:,.1f}")
        print(f"      25th/75th %ile:    {m.bitrate_25th_percentile:,.0f} / {m.bitrate_75th_percentile:,.0f} kbps")
        
        # Switching
        print("\n  [SWITCHES]")
        print(f"      Total count:       {m.bitrate_switches}")
        print(f"      Up / Down:         {m.switch_up_count} / {m.switch_down_count}")
        print(f"      Avg magnitude:     {m.avg_switch_magnitude:,.0f} kbps")
        
        # Rebuffering
        print("\n  [REBUFFERING]")
        print(f"      Events:            {m.rebuffer_count}")
        print(f"      Total time:        {m.rebuffer_time_ms:,.0f} ms")
        print(f"      Ratio:             {m.rebuffer_ratio*100:.4f}%")
        print(f"      Frequency:         {m.rebuffer_frequency:.3f} per minute")
        if m.rebuffer_count > 0:
            print(f"      Avg duration:      {m.avg_rebuffer_duration_ms:,.0f} ms")
            print(f"      Max duration:      {m.max_rebuffer_duration_ms:,.0f} ms")
        
        # Throughput
        print("\n  [THROUGHPUT]")
        print(f"      Average:           {m.avg_throughput_kbps:,.0f} kbps")
        print(f"      Min / Max:         {m.min_throughput_kbps:,.0f} / {m.max_throughput_kbps:,.0f} kbps")
        print(f"      Std deviation:     {m.throughput_std_dev:,.1f} kbps")
        
        # Buffer
        print("\n  [BUFFER]")
        print(f"      Average level:     {m.avg_buffer_level_ms/1000:,.1f} s")
        print(f"      Min / Max:         {m.min_buffer_level_ms/1000:,.1f} / {m.max_buffer_level_ms/1000:,.1f} s")
        
        # Utilization
        print("\n  [UTILIZATION]")
        print(f"      Bandwidth:         {m.bandwidth_utilization*100:.1f}%")
        
        # Segments
        print("\n  [SEGMENTS]")
        print(f"      Total:             {m.total_segments}")
        print(f"      Failed:            {m.failed_segments}")
        
        print("\n" + "=" * 70)
    
    def save_results(self, filename: str):
        """Save results to JSON."""
        results = {
            "timestamp": datetime.now().isoformat(),
            "server": self.base_url,
            "protocol": "dash",
            "config": {
                "segment_duration_ms": self.segment_duration_ms,
                "buffer_target_ms": self.buffer_target_ms,
                "max_bitrate_kbps": self.max_bitrate,
            },
            "metrics": self.metrics.to_dict()
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
                        ],
                    },
                    {
                        'mimeType': 'video/H264',
                        'kind': 'video',
                        'clockRate': 90000,
                        'preferredPayloadType': 97,
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
                        ],
                    },
                ],
                'headerExtensions': [],
            }
            
            consume_info = None
            try:
                consume_info = self._api_post('/consume', {
                    'clientId': self.client_id,
                    'rtpCapabilities': consumer_rtp_caps,
                })
                self.consumer_id = consume_info['id']
                print(f"   Consumer created: {self.consumer_id[:8]}...")
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
        self.metrics.calculate_statistics()
        
        return self.metrics
    
    @staticmethod
    def _build_server_sdp(ice_params, ice_candidates, dtls_params, rtp_params):
        """Synthesize an SDP offer from mediasoup server transport+consumer params."""
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

        fp = dtls_params['fingerprints'][-1]
        fp_line = f"a=fingerprint:{fp['algorithm']} {fp['value']}"

        cand_lines = []
        for i, c in enumerate(ice_candidates):
            proto = c.get('protocol', 'udp')
            cand_lines.append(
                f"a=candidate:{i} 1 {proto} {c['priority']} "
                f"{c['ip']} {c['port']} typ host"
            )

        rtpmap = f"a=rtpmap:{pt} {codec_name}/{clock_rate}"
        fb_lines = []
        for fb in codec.get('rtcpFeedback', []):
            param = f" {fb['parameter']}" if fb.get('parameter') else ''
            fb_lines.append(f"a=rtcp-fb:{pt} {fb['type']}{param}")

        fmtp_parts = []
        for k, v in codec.get('parameters', {}).items():
            fmtp_parts.append(f"{k}={v}")
        fmtp_line = f"a=fmtp:{pt} {';'.join(fmtp_parts)}" if fmtp_parts else ''

        port = ice_candidates[0]['port'] if ice_candidates else 9
        ip = ice_candidates[0]['ip'] if ice_candidates else '127.0.0.1'

        sdp_parts = [
            "v=0",
            "o=- 1 1 IN IP4 0.0.0.0",
            "s=-",
            "t=0 0",
            "a=group:BUNDLE 0",
            "a=msid-semantic: WMS *",
            f"m=video {port} UDP/TLS/RTP/SAVPF {pt}",
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
            rtpmap,
        ] + fb_lines

        if fmtp_line:
            sdp_parts.append(fmtp_line)

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
        
        prev_bytes = 0
        prev_time = start_time
        
        for i in progress:
            await asyncio.sleep(sample_interval)
            
            current_time = time.time()
            elapsed = current_time - prev_time
            
            # Get stats from server (mediasoup side)
            try:
                stats = self._api_get(f'/stats/{self.client_id}')
                
                # Extract consumer stats
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
                            self.metrics.throughput_samples.append(bitrate_kbps)
                        elif byte_count > prev_bytes:
                            bitrate_bps = (byte_count - prev_bytes) * 8 / elapsed
                            bitrate_kbps = bitrate_bps / 1000
                            self.metrics.bitrate_samples.append(int(bitrate_kbps))
                            self.metrics.throughput_samples.append(bitrate_kbps)

                        prev_bytes = byte_count if byte_count > prev_bytes else prev_bytes

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
                        if rtt:
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
            
            # Track playback time
            self.metrics.total_playback_time_ms += sample_interval * 1000
            
            # Track quality switches (simplified - check if bitrate changed significantly)
            if len(self.metrics.bitrate_samples) >= 2:
                prev_br = self.metrics.bitrate_samples[-2]
                curr_br = self.metrics.bitrate_samples[-1]
                if abs(curr_br - prev_br) > 200:  # 200 kbps threshold
                    self.metrics.bitrate_switches += 1
                    self.metrics.switch_magnitude_total += abs(curr_br - prev_br)
                    if curr_br > prev_br:
                        self.metrics.switch_up_count += 1
                    else:
                        self.metrics.switch_down_count += 1
            
            prev_time = current_time
            
            # Update progress
            if HAS_TQDM:
                bitrate_str = f"{self.metrics.bitrate_samples[-1]}k" if self.metrics.bitrate_samples else "N/A"
                jitter_str = f"{self.jitter_samples[-1]:.1f}ms" if self.jitter_samples else "N/A"
                progress.set_postfix({
                    'bitrate': bitrate_str,
                    'jitter': jitter_str,
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
            print(f"      Average:           {m.avg_bitrate_kbps:,.0f} kbps")
            print(f"      Min / Max:         {m.min_bitrate_kbps:,.0f} / {m.max_bitrate_kbps:,.0f} kbps")
            print(f"      Median:            {m.bitrate_median:,.0f} kbps")
            print(f"      Std deviation:     {m.bitrate_std_dev:,.1f} kbps")
        
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
            print("\n  [THROUGHPUT]")
            print(f"      Average:           {m.avg_throughput_kbps:,.0f} kbps")
            print(f"      Min / Max:         {m.min_throughput_kbps:,.0f} / {m.max_throughput_kbps:,.0f} kbps")
        
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
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n[SAVED] {filename}")


def setup_trace(trace_path: Path, protocol: str = "dash") -> None:
    """Copy a trace file to the shaper directory and restart the shaper.

    For WebRTC, also starts a tc-trace replay inside the webrtc container
    so that UDP/RTP traffic is shaped identically to the HTTP shaper path.
    """
    shaper_trace = Path(__file__).parent / "shaper" / "trace" / "trace.csv"
    shaper_trace.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(trace_path, shaper_trace)
    print(f"[TRACE] {trace_path.name}")

    print("[SHAPER] Restarting...")
    subprocess.run(
        ["sudo", "docker", "compose", "restart", "shaper"],
        capture_output=True,
        cwd=Path(__file__).parent,
    )

    if protocol == "webrtc":
        print("[WEBRTC-SHAPER] Starting tc-trace on webrtc container...")
        subprocess.run(
            ["sudo", "docker", "exec", "netsail-webrtc",
             "pkill", "-f", "tc-trace.py"],
            capture_output=True,
        )
        time.sleep(0.5)
        subprocess.Popen(
            ["sudo", "docker", "exec", "netsail-webrtc",
             "python3", "/app/tc-trace.py"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    time.sleep(3)


def resolve_url(base_url: str, protocol: str, shaped: bool) -> str:
    """Return the final URL after applying shaped-port mapping."""
    url = base_url
    if shaped and protocol == "dash" and "8080" in url:
        url = url.replace("8080", "9080")
    return url


def run_single_benchmark(protocol: str, url: str, duration, output_path: str,
                         trace_name: str = None, dash_url: str = None):
    """Run a single benchmark and save results. Returns True on success."""
    if protocol == "dash":
        benchmark = StreamingBenchmark(url, duration)
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
        description="Streaming Benchmark Tool (DASH + WebRTC)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single trace
  python benchmark.py --trace traces/trace_12743_3g_tc.csv

  # All traces in a folder
  python benchmark.py --trace-dir traces/

  # WebRTC with a folder of traces
  python benchmark.py -p webrtc --trace-dir traces/

  # Direct (no shaping)
  python benchmark.py
  python benchmark.py -p webrtc --duration 60
        """
    )
    parser.add_argument("--protocol", "-p", choices=["dash", "webrtc"], default="dash",
                       help="Streaming protocol to benchmark (default: dash)")
    parser.add_argument("--url", default=None,
                       help="Base URL of server (default: auto-detect based on protocol)")
    parser.add_argument("--duration", type=float, default=None,
                       help="Max duration to test (seconds)")
    parser.add_argument("--output", "-o", default=None,
                       help="Output JSON file (ignored when using --trace-dir)")
    parser.add_argument("--shaped", action="store_true",
                       help="Use shaped port (9080 for DASH, 9030 for WebRTC)")
    parser.add_argument("--trace", type=str, default=None,
                       help="Path to a single trace file (e.g., traces/trace_12743_3g_tc.csv)")
    parser.add_argument("--trace-dir", type=str, default=None,
                       help="Path to a folder of trace files; runs benchmark on every *_tc.csv in the folder")
    parser.add_argument("--results-dir", type=str, default=None,
                       help="Custom results subdirectory (e.g., 2025-15-05-results)")

    args = parser.parse_args()

    # --trace and --trace-dir are mutually exclusive
    if args.trace and args.trace_dir:
        print("[ERROR] --trace and --trace-dir are mutually exclusive. Use one or the other.")
        sys.exit(1)

    # Set default URL based on protocol
    if args.url is None:
        if args.protocol == "dash":
            args.url = "http://localhost:8080"
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

            setup_trace(trace_path, protocol=args.protocol)
            url = resolve_url(args.url, args.protocol, shaped=True)

            trace_stem = trace_path.stem  # e.g. trace_12743_3g_tc
            output_path = str(
                results_dir / f"benchmark_{args.protocol}_{trace_stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )

            ok = run_single_benchmark(args.protocol, url, args.duration, output_path,
                                     trace_name=trace_path.name, dash_url=dash_url)
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

        setup_trace(trace_path, protocol=args.protocol)
        args.shaped = True

    url = resolve_url(args.url, args.protocol, args.shaped)

    if args.output:
        output_path = str(results_dir / Path(args.output).name)
    else:
        output_path = str(
            results_dir / f"benchmark_{args.protocol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )

    ok = run_single_benchmark(args.protocol, url, args.duration, output_path, dash_url=dash_url)
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
