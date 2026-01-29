#!/usr/bin/env python3
"""
Download bandwidth traces from public datasets for DASH streaming benchmarking.

Datasets:
1. HSDPA 3G Dataset (Riiser et al., ACM IMC 2013)
   Paper: https://dl.acm.org/doi/10.1145/2483977.2483991
   - Real-world 3G/HSDPA mobile network traces
   - Collected in Norway (bus/metro/tram/train/ferry/car)
   
2. FCC Broadband Dataset (confiwent GitHub)
   Source: https://github.com/confiwent/Real-world-bandwidth-traces
   - FCC Measuring Broadband America traces
   - Various ISPs and network conditions
"""

import os
import sys
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from typing import List, Tuple

# Base directories
SCRIPT_DIR = Path(__file__).parent
TRACES_DIR = SCRIPT_DIR.parent / "traces"

# HSDPA 3G Dataset URLs (from Riiser et al. IMC 2013)
# Original dataset: http://home.ifi.uio.no/paalh/dataset/hsdpa-tcp-logs/
HSDPA_3G_BASE = "http://home.ifi.uio.no/paalh/dataset/hsdpa-tcp-logs/"

# Sample 3G traces (representative subset)
HSDPA_3G_TRACES = [
    # Bus routes
    "bus.ljansbansen.1.log",
    "bus.ljansbansen.2.log",
    "bus.ljansbansen.3.log",
    # Metro
    "metro.1.log",
    "metro.2.log",
    "metro.3.log",
    # Tram
    "tram.1.log",
    "tram.2.log",
    "tram.3.log",
    # Train
    "train.1.log",
    "train.2.log",
    "train.3.log",
    # Ferry
    "ferry.1.log",
    "ferry.2.log",
    # Car
    "car.1.log",
    "car.2.log",
    "car.3.log",
]

# FCC Broadband traces from GitHub
FCC_BASE = "https://raw.githubusercontent.com/confiwent/Real-world-bandwidth-traces/master/fcc_ori/test_traces/"

FCC_TRACES = [
    "trace_797466_http---www.amazon_part1.log",
    "trace_797466_http---www.amazon_part2.log",
    "trace_799296_http---www.amazon_part0.log",
    "trace_799296_http---www.amazon_part1.log",
    "trace_799448_http---www.facebook_part6.log",
    "trace_799448_http---www.facebook_part7.log",
    "trace_806172_http---www.amazon_part0.log",
    "trace_806330_http---www.amazon_part0.log",
    "trace_849842_http---www.facebook_part1.log",
    "trace_849842_http---www.facebook_part2.log",
    "trace_901648_http---www.amazon_part1.log",
    "trace_901648_http---www.amazon_part3.log",
    "trace_925800_http---www.ebay_part0.log",
    "trace_925800_http---www.ebay_part1.log",
    "trace_939562_http---www.google_part1.log",
    "trace_939562_http---www.google_part2.log",
    "trace_939592_http---www.facebook_part0.log",
    "trace_939592_http---www.facebook_part1.log",
]


def download_file(url: str, dest_path: Path, verbose: bool = True) -> bool:
    """Download a file from URL to destination path."""
    try:
        if verbose:
            print(f"  Downloading: {url}")
        
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=30) as response:
            content = response.read()
        
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(content)
        
        if verbose:
            print(f"  ✓ Saved: {dest_path.name} ({len(content)} bytes)")
        return True
        
    except urllib.error.HTTPError as e:
        if verbose:
            print(f"  ✗ HTTP Error {e.code}: {url}")
        return False
    except urllib.error.URLError as e:
        if verbose:
            print(f"  ✗ URL Error: {e.reason}")
        return False
    except Exception as e:
        if verbose:
            print(f"  ✗ Error: {e}")
        return False


def convert_hsdpa_trace(input_path: Path, output_path: Path) -> bool:
    """
    Convert HSDPA trace to standard format.
    
    HSDPA format: timestamp(s) throughput(Mbps)
    Standard format: timestamp(s) throughput(Mbps)
    """
    try:
        lines = input_path.read_text().strip().split('\n')
        output_lines = []
        
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 2:
                try:
                    timestamp = float(parts[0])
                    throughput = float(parts[1])
                    output_lines.append(f"{timestamp}\t{throughput}")
                except ValueError:
                    continue
        
        output_path.write_text('\n'.join(output_lines))
        return True
    except Exception as e:
        print(f"  ✗ Conversion error: {e}")
        return False


def convert_fcc_trace(input_path: Path, output_path: Path) -> bool:
    """
    Convert FCC trace to standard format.
    
    FCC format: timestamp(s) throughput(Mbps)
    Standard format: timestamp(s) throughput(Mbps)
    """
    try:
        lines = input_path.read_text().strip().split('\n')
        output_lines = []
        
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 2:
                try:
                    timestamp = float(parts[0])
                    throughput = float(parts[1])
                    output_lines.append(f"{timestamp}\t{throughput}")
                except ValueError:
                    continue
        
        output_path.write_text('\n'.join(output_lines))
        return True
    except Exception as e:
        print(f"  ✗ Conversion error: {e}")
        return False


def download_hsdpa_3g_traces(output_dir: Path, verbose: bool = True) -> Tuple[int, int]:
    """Download HSDPA 3G traces."""
    print("\n" + "=" * 60)
    print("  📡 Downloading HSDPA 3G Dataset (Riiser et al., IMC 2013)")
    print("=" * 60)
    print(f"  Source: {HSDPA_3G_BASE}")
    print(f"  Destination: {output_dir}")
    print()
    
    raw_dir = output_dir / "raw"
    converted_dir = output_dir / "converted"
    raw_dir.mkdir(parents=True, exist_ok=True)
    converted_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    fail_count = 0
    
    for trace in HSDPA_3G_TRACES:
        url = HSDPA_3G_BASE + trace
        raw_path = raw_dir / trace
        converted_path = converted_dir / trace.replace('.log', '.txt')
        
        if converted_path.exists():
            if verbose:
                print(f"  ⏭ Already exists: {converted_path.name}")
            success_count += 1
            continue
        
        if download_file(url, raw_path, verbose):
            if convert_hsdpa_trace(raw_path, converted_path):
                success_count += 1
            else:
                fail_count += 1
        else:
            fail_count += 1
    
    print(f"\n  Summary: {success_count} succeeded, {fail_count} failed")
    return success_count, fail_count


def download_fcc_traces(output_dir: Path, verbose: bool = True) -> Tuple[int, int]:
    """Download FCC broadband traces."""
    print("\n" + "=" * 60)
    print("  📡 Downloading FCC Broadband Traces")
    print("=" * 60)
    print(f"  Source: {FCC_BASE}")
    print(f"  Destination: {output_dir}")
    print()
    
    raw_dir = output_dir / "raw"
    converted_dir = output_dir / "converted"
    raw_dir.mkdir(parents=True, exist_ok=True)
    converted_dir.mkdir(parents=True, exist_ok=True)
    
    success_count = 0
    fail_count = 0
    
    for trace in FCC_TRACES:
        url = FCC_BASE + trace
        raw_path = raw_dir / trace
        converted_path = converted_dir / trace.replace('.log', '.txt')
        
        if converted_path.exists():
            if verbose:
                print(f"  ⏭ Already exists: {converted_path.name}")
            success_count += 1
            continue
        
        if download_file(url, raw_path, verbose):
            if convert_fcc_trace(raw_path, converted_path):
                success_count += 1
            else:
                fail_count += 1
        else:
            fail_count += 1
    
    print(f"\n  Summary: {success_count} succeeded, {fail_count} failed")
    return success_count, fail_count


def use_existing_traces(traces_dir: Path) -> Tuple[List[Path], List[Path]]:
    """Use existing traces already in the traces directory."""
    hsdpa_traces = []
    fcc_traces = []
    
    # Check for existing HSDPA 3G traces
    hsdpa_dir = traces_dir / "hsdpa_3g"
    if hsdpa_dir.exists():
        for trace_file in hsdpa_dir.glob("*"):
            if trace_file.is_file() and not trace_file.name.startswith('.'):
                hsdpa_traces.append(trace_file)
    
    # Check for existing FCC traces
    fcc_dir = traces_dir / "fcc"
    if fcc_dir.exists():
        for trace_file in fcc_dir.glob("*.log"):
            fcc_traces.append(trace_file)
    
    return hsdpa_traces, fcc_traces


def create_synthetic_traces(output_dir: Path) -> int:
    """Create synthetic traces for testing when downloads fail."""
    print("\n" + "=" * 60)
    print("  🔧 Creating Synthetic Traces for Testing")
    print("=" * 60)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    import random
    
    traces = [
        # Low bandwidth, stable
        ("synthetic_low_stable.txt", 0.5, 1.5, 0.1),
        # Medium bandwidth, stable  
        ("synthetic_medium_stable.txt", 2.0, 4.0, 0.2),
        # High bandwidth, stable
        ("synthetic_high_stable.txt", 5.0, 10.0, 0.5),
        # Variable bandwidth (simulating mobile)
        ("synthetic_variable.txt", 1.0, 8.0, 2.0),
        # Degrading bandwidth
        ("synthetic_degrading.txt", 5.0, 1.0, 0.5),
    ]
    
    created = 0
    for name, start_bw, end_bw, noise in traces:
        path = output_dir / name
        lines = []
        
        duration = 300  # 5 minutes
        interval = 1.0
        
        for i in range(int(duration / interval)):
            t = i * interval
            # Linear interpolation with noise
            progress = t / duration
            base_bw = start_bw + (end_bw - start_bw) * progress
            bw = max(0.1, base_bw + random.uniform(-noise, noise))
            lines.append(f"{t:.1f}\t{bw:.6f}")
        
        path.write_text('\n'.join(lines))
        print(f"  ✓ Created: {name}")
        created += 1
    
    return created


def list_available_traces(traces_dir: Path):
    """List all available traces."""
    print("\n" + "=" * 60)
    print("  📋 Available Traces")
    print("=" * 60)
    
    for dataset_dir in sorted(traces_dir.iterdir()):
        if dataset_dir.is_dir() and not dataset_dir.name.startswith('.'):
            print(f"\n  📁 {dataset_dir.name}/")
            
            # Check for converted subdirectory
            converted_dir = dataset_dir / "converted"
            if converted_dir.exists():
                traces = list(converted_dir.glob("*.txt"))
            else:
                traces = list(dataset_dir.glob("*"))
                traces = [t for t in traces if t.is_file() and not t.name.startswith('.')]
            
            for trace in sorted(traces)[:10]:
                print(f"    • {trace.name}")
            
            if len(traces) > 10:
                print(f"    ... and {len(traces) - 10} more")


def main():
    parser = argparse.ArgumentParser(
        description="Download bandwidth traces for DASH streaming benchmarking",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Datasets:
  HSDPA 3G:  Real-world mobile traces from Riiser et al. (ACM IMC 2013)
             https://dl.acm.org/doi/10.1145/2483977.2483991
             
  FCC:       FCC Measuring Broadband America traces
             https://github.com/confiwent/Real-world-bandwidth-traces

Examples:
  python download_traces.py --all          # Download all traces
  python download_traces.py --hsdpa        # Download only HSDPA 3G traces
  python download_traces.py --fcc          # Download only FCC traces
  python download_traces.py --list         # List available traces
  python download_traces.py --synthetic    # Create synthetic traces for testing
        """
    )
    
    parser.add_argument("--all", action="store_true",
                       help="Download all trace datasets")
    parser.add_argument("--hsdpa", action="store_true",
                       help="Download HSDPA 3G dataset")
    parser.add_argument("--fcc", action="store_true",
                       help="Download FCC broadband dataset")
    parser.add_argument("--synthetic", action="store_true",
                       help="Create synthetic traces for testing")
    parser.add_argument("--list", action="store_true",
                       help="List available traces")
    parser.add_argument("--output", "-o", type=Path, default=TRACES_DIR,
                       help=f"Output directory (default: {TRACES_DIR})")
    parser.add_argument("--quiet", "-q", action="store_true",
                       help="Suppress verbose output")
    
    args = parser.parse_args()
    
    verbose = not args.quiet
    output_dir = args.output
    
    if args.list:
        list_available_traces(output_dir)
        return
    
    if not any([args.all, args.hsdpa, args.fcc, args.synthetic]):
        # Default: show help and list existing traces
        parser.print_help()
        list_available_traces(output_dir)
        return
    
    total_success = 0
    total_fail = 0
    
    if args.all or args.hsdpa:
        s, f = download_hsdpa_3g_traces(output_dir / "hsdpa_3g_downloaded", verbose)
        total_success += s
        total_fail += f
    
    if args.all or args.fcc:
        s, f = download_fcc_traces(output_dir / "fcc_downloaded", verbose)
        total_success += s
        total_fail += f
    
    if args.synthetic:
        s = create_synthetic_traces(output_dir / "synthetic")
        total_success += s
    
    print("\n" + "=" * 60)
    print(f"  ✅ Download Complete: {total_success} traces available")
    if total_fail > 0:
        print(f"  ⚠️  {total_fail} traces failed to download")
    print("=" * 60)
    
    list_available_traces(output_dir)


if __name__ == "__main__":
    main()
