#!/usr/bin/env python3
"""
DASH Streaming QoE Benchmark Tool

Measures Quality of Experience (QoE) metrics:
- Average bitrate (quality)
- Bitrate switches (stability)
- Rebuffering time & ratio (continuity)
- Startup delay
- QoE Score (composite metric)

References:
- ITU-T P.1203 (Video QoE)
- MOS (Mean Opinion Score) estimation
"""

import argparse
import json
import time
import sys
import requests
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from datetime import datetime
from collections import deque

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
class QoEMetrics:
    """Quality of Experience metrics."""
    # Timing
    startup_delay_ms: float = 0
    total_playback_time_ms: float = 0
    
    # Bitrate metrics
    bitrate_samples: List[int] = field(default_factory=list)
    avg_bitrate_kbps: float = 0
    min_bitrate_kbps: float = 0
    max_bitrate_kbps: float = 0
    bitrate_std_dev: float = 0
    
    # Switching metrics
    bitrate_switches: int = 0
    switch_magnitude_total: int = 0  # Sum of |old - new| for all switches
    avg_switch_magnitude: float = 0
    
    # Rebuffering metrics
    rebuffer_count: int = 0
    rebuffer_time_ms: float = 0
    rebuffer_ratio: float = 0  # rebuffer_time / total_time
    
    # Quality scores
    qoe_score: float = 0  # 1-5 MOS scale
    quality_score: float = 0  # Based on bitrate
    stability_score: float = 0  # Based on switches
    continuity_score: float = 0  # Based on rebuffering
    
    # Raw data
    segments: List[SegmentMetrics] = field(default_factory=list)
    
    def calculate_scores(self, max_bitrate: int = 3000):
        """Calculate all QoE scores."""
        if not self.bitrate_samples:
            return
        
        # Basic stats
        self.avg_bitrate_kbps = sum(self.bitrate_samples) / len(self.bitrate_samples)
        self.min_bitrate_kbps = min(self.bitrate_samples)
        self.max_bitrate_kbps = max(self.bitrate_samples)
        
        # Standard deviation
        mean = self.avg_bitrate_kbps
        variance = sum((x - mean) ** 2 for x in self.bitrate_samples) / len(self.bitrate_samples)
        self.bitrate_std_dev = variance ** 0.5
        
        # Average switch magnitude
        if self.bitrate_switches > 0:
            self.avg_switch_magnitude = self.switch_magnitude_total / self.bitrate_switches
        
        # Rebuffer ratio
        total_time = self.total_playback_time_ms + self.rebuffer_time_ms
        if total_time > 0:
            self.rebuffer_ratio = self.rebuffer_time_ms / total_time
        
        # Quality score (1-5): Based on average bitrate relative to max
        bitrate_ratio = self.avg_bitrate_kbps / max_bitrate if max_bitrate > 0 else 0
        self.quality_score = 1 + 4 * bitrate_ratio
        
        # Stability score (1-5): Penalize switches
        # Each switch reduces score, more penalty for larger switches
        switch_penalty = min(1, (self.bitrate_switches * 0.1) + (self.avg_switch_magnitude / max_bitrate * 0.5))
        self.stability_score = 5 - 4 * switch_penalty
        
        # Continuity score (1-5): Based on rebuffering
        # rebuffer_ratio of 0 = 5, rebuffer_ratio of 0.1+ = 1
        rebuffer_penalty = min(1, self.rebuffer_ratio * 10)
        self.continuity_score = 5 - 4 * rebuffer_penalty
        
        # Startup penalty
        startup_penalty = min(1, self.startup_delay_ms / 5000)  # 5s+ startup = max penalty
        startup_score = 5 - 4 * startup_penalty
        
        # Overall QoE (weighted average based on ITU-T P.1203 principles)
        # Quality: 40%, Continuity: 35%, Stability: 15%, Startup: 10%
        self.qoe_score = (
            0.40 * self.quality_score +
            0.35 * self.continuity_score +
            0.15 * self.stability_score +
            0.10 * startup_score
        )
    
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
                "std_dev": round(self.bitrate_std_dev, 2),
            },
            "switching": {
                "count": self.bitrate_switches,
                "total_magnitude": self.switch_magnitude_total,
                "avg_magnitude": round(self.avg_switch_magnitude, 2),
            },
            "rebuffering": {
                "count": self.rebuffer_count,
                "total_time_ms": round(self.rebuffer_time_ms, 2),
                "ratio": round(self.rebuffer_ratio, 4),
            },
            "scores": {
                "qoe_score": round(self.qoe_score, 2),
                "quality_score": round(self.quality_score, 2),
                "stability_score": round(self.stability_score, 2),
                "continuity_score": round(self.continuity_score, 2),
            },
            "bitrate_samples": self.bitrate_samples,
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


class QoEBenchmark:
    """DASH streaming QoE benchmark runner."""
    
    def __init__(self, base_url: str, max_duration: Optional[float] = None):
        self.base_url = base_url.rstrip('/')
        self.max_duration = max_duration
        self.session = requests.Session()
        self.metrics = QoEMetrics()
        
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
    
    def run(self) -> QoEMetrics:
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
            print("❌ ERROR: No video representations found")
            return self.metrics
        
        self.max_bitrate = max(r['bandwidth'] // 1000 for r in representations)
        
        print(f"\n📊 Quality Levels ({len(representations)}):")
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
        
        print(f"\n⏱  Duration: {total_duration:.1f}s ({segment_count} segments @ {self.segment_duration_ms/1000:.1f}s each)")
        
        # Download init segment
        selected, _ = abr.select_representation(0)
        init_url = selected['init'].replace('$RepresentationID$', selected['id'])
        print(f"\n🎬 Initializing stream...")
        
        try:
            _, init_time = self.download_segment(init_url)
            self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
        except Exception as e:
            print(f"   ⚠ Init segment error: {e}")
            self.metrics.startup_delay_ms = (time.time() - startup_start) * 1000
        
        print(f"   Startup delay: {self.metrics.startup_delay_ms:.0f}ms\n")
        
        # Progress bar setup
        print("📥 Downloading segments:\n")
        
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
                
                # Report to ABR
                abr.report_download(size_bytes, download_time_ms)
                
                # Simulate playback
                stalled, stall_duration = self.simulate_playback(download_time_ms)
                
                if stalled:
                    self.metrics.rebuffer_count += 1
                    self.metrics.rebuffer_time_ms += stall_duration
                
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
                status = "🔴 STALL" if stalled else "🟢 OK"
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
                    print(f"\n   ❌ Segment {segment_number} error: {e}")
        
        # Calculate final scores
        self.metrics.calculate_scores(self.max_bitrate)
        
        return self.metrics
    
    def print_results(self):
        """Print formatted results."""
        m = self.metrics
        
        print("\n" + "=" * 70)
        print("  📊 BENCHMARK RESULTS")
        print("=" * 70)
        
        # Timing
        print("\n  ⏱  TIMING")
        print(f"      Startup delay:     {m.startup_delay_ms:,.0f} ms")
        print(f"      Playback time:     {m.total_playback_time_ms/1000:,.1f} s")
        
        # Bitrate
        print("\n  📈 BITRATE")
        print(f"      Average:           {m.avg_bitrate_kbps:,.0f} kbps")
        print(f"      Min / Max:         {m.min_bitrate_kbps:,.0f} / {m.max_bitrate_kbps:,.0f} kbps")
        print(f"      Std deviation:     {m.bitrate_std_dev:,.1f} kbps")
        
        # Switching
        print("\n  🔄 BITRATE SWITCHES")
        print(f"      Count:             {m.bitrate_switches}")
        print(f"      Avg magnitude:     {m.avg_switch_magnitude:,.0f} kbps")
        
        # Rebuffering
        print("\n  ⏸  REBUFFERING")
        print(f"      Events:            {m.rebuffer_count}")
        print(f"      Total time:        {m.rebuffer_time_ms:,.0f} ms")
        print(f"      Ratio:             {m.rebuffer_ratio*100:.2f}%")
        
        # QoE Scores
        print("\n  ⭐ QoE SCORES (1-5 scale)")
        print(f"      Quality:           {m.quality_score:.2f}")
        print(f"      Stability:         {m.stability_score:.2f}")
        print(f"      Continuity:        {m.continuity_score:.2f}")
        print("      " + "-" * 30)
        print(f"      Overall QoE:       {m.qoe_score:.2f}")
        
        # Visual QoE bar
        qoe_bar_len = int(m.qoe_score * 8)
        qoe_bar = "█" * qoe_bar_len + "░" * (40 - qoe_bar_len)
        print(f"\n      [{qoe_bar}] {m.qoe_score:.2f}/5.00")
        
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
        
        print(f"\n💾 Results saved to: {filename}")


def main():
    parser = argparse.ArgumentParser(
        description="DASH Streaming QoE Benchmark Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python benchmark.py                           # Test localhost:8080
  python benchmark.py --shaped                  # Test through shaper (port 9080)
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
    
    args = parser.parse_args()
    
    url = args.url
    if args.shaped and "8080" in url:
        url = url.replace("8080", "9080")
    
    benchmark = QoEBenchmark(url, args.duration)
    
    try:
        benchmark.run()
        benchmark.print_results()
        
        output = args.output or f"qoe_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        benchmark.save_results(output)
        
    except KeyboardInterrupt:
        print("\n\n⚠ Benchmark interrupted")
        benchmark.metrics.calculate_scores(benchmark.max_bitrate)
        benchmark.print_results()
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to {url}")
        print("   Make sure the server is running: docker compose up -d")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Benchmark failed: {e}")
        raise


if __name__ == "__main__":
    main()
