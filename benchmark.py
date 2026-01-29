#!/usr/bin/env python3
"""
DASH Streaming Benchmark Tool

Measures streaming performance metrics:
- Average/min/max bitrate and variance
- Bitrate switches and switch magnitude
- Rebuffering time, ratio, and frequency
- Startup delay
- Throughput statistics
- Buffer health metrics
- Bandwidth utilization

No composite QoE score - individual metrics for detailed analysis.
"""

import argparse
import json
import time
import sys
import shutil
import subprocess
import requests
import xml.etree.ElementTree as ET
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
        """
        # While downloading, buffer drains at playback rate
        playback_during_download = download_time_ms
        
        if self.buffer_level_ms >= playback_during_download:
            # No stall - buffer had enough
            self.buffer_level_ms -= playback_during_download
            self.buffer_level_ms += self.segment_duration_ms
            return False, 0
        else:
            # Stall occurred
            stall_duration = playback_during_download - self.buffer_level_ms
            self.buffer_level_ms = self.segment_duration_ms  # Refilled after download
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
        
        # Calculate segments
        total_duration = parser.get_duration_seconds()
        if self.max_duration:
            total_duration = min(total_duration, self.max_duration)
        
        rep = representations[0]
        if 'timeline' in rep:
            segment_count = len(rep['timeline'])
            if rep['timescale'] > 0:
                self.segment_duration_ms = rep['timeline'][0]['d'] / rep['timescale'] * 1000
        elif rep.get('duration') and rep.get('timescale'):
            self.segment_duration_ms = rep['duration'] / rep['timescale'] * 1000
            segment_count = int(total_duration * 1000 / self.segment_duration_ms) + 1
        else:
            segment_count = int(total_duration / 4) + 1
        
        if self.max_duration:
            segment_count = min(segment_count, int(self.max_duration * 1000 / self.segment_duration_ms) + 1)
        
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
                
                # Track throughput and buffer samples
                self.metrics.throughput_samples.append(throughput_kbps)
                self.metrics.buffer_samples.append(self.buffer_level_ms)
                
                # Report to ABR
                abr.report_download(size_bytes, download_time_ms)
                
                # Simulate playback
                stalled, stall_duration = self.simulate_playback(download_time_ms)
                
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


def main():
    parser = argparse.ArgumentParser(
        description="DASH Streaming Benchmark Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python benchmark.py                           # Test localhost:8080
  python benchmark.py --shaped                  # Test through shaper (port 9080)
  python benchmark.py --trace traces/trace_12743_3g_tc.csv  # Use specific trace
  python benchmark.py --duration 60             # Test first 60 seconds
  python benchmark.py --output results.json     # Save to specific file
        """
    )
    parser.add_argument("--url", default="http://localhost:8080",
                       help="Base URL of DASH server")
    parser.add_argument("--duration", type=float, default=None,
                       help="Max duration to test (seconds)")
    parser.add_argument("--output", "-o", default=None,
                       help="Output JSON file")
    parser.add_argument("--shaped", action="store_true",
                       help="Use shaped port (9080)")
    parser.add_argument("--trace", type=str, default=None,
                       help="Path to trace file (e.g., traces/trace_12743_3g_tc.csv)")
    
    args = parser.parse_args()
    
    # Handle trace file setup
    if args.trace:
        trace_path = Path(args.trace)
        if not trace_path.exists():
            print(f"[ERROR] Trace file not found: {args.trace}")
            sys.exit(1)
        
        # Copy trace to shaper directory
        shaper_trace = Path(__file__).parent / "shaper" / "trace" / "trace.csv"
        shaper_trace.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(trace_path, shaper_trace)
        print(f"[TRACE] {trace_path.name}")
        
        # Restart shaper to pick up new trace
        print("[SHAPER] Restarting...")
        subprocess.run(["docker", "compose", "restart", "shaper"], 
                      capture_output=True, cwd=Path(__file__).parent)
        time.sleep(3)  # Wait for shaper to restart
        
        # Auto-enable shaped mode when using a trace
        args.shaped = True
    
    url = args.url
    if args.shaped and "8080" in url:
        url = url.replace("8080", "9080")
    
    benchmark = StreamingBenchmark(url, args.duration)
    
    try:
        benchmark.run()
        benchmark.print_results()
        
        # Save results to results/ directory
        results_dir = Path(__file__).parent / "results"
        results_dir.mkdir(parents=True, exist_ok=True)
        
        if args.output:
            output = results_dir / Path(args.output).name
        else:
            output = results_dir / f"benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        benchmark.save_results(str(output))
        
    except KeyboardInterrupt:
        print("\n\n[INTERRUPTED] Benchmark stopped")
        benchmark.metrics.calculate_statistics(benchmark.max_bitrate)
        benchmark.print_results()
    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] Cannot connect to {url}")
        print("        Run: docker compose up -d")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Benchmark failed: {e}")
        raise


if __name__ == "__main__":
    main()
