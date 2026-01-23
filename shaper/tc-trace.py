#!/usr/bin/env python3
"""
TC/Netem trace-driven traffic shaping.

Reads a CSV trace file with network latency measurements and
applies them in real-time using tc/netem.

Trace format (CSV):
    since,relative_seconds,rtt
    0.0,0.0,186.84
    0.023,0.023,192.76
    ...

Environment variables:
    ETHERNET: Network interface (default: eth0)
    INTERVAL: Update interval in seconds (default: 0.01)
    TRACE_FILE: Path to trace file (default: /trace/trace.csv)
"""

import os
import sys
import time
import subprocess
from datetime import datetime

# Configuration from environment
ETHERNET = os.getenv("ETHERNET", "eth0")
INTERVAL = float(os.getenv("INTERVAL", "0.01"))
TRACE_FILE = os.getenv("TRACE_FILE", "/trace/trace.csv")
DEFAULT_RATE = os.getenv("DEFAULT_RATE", "100mbit")
DEFAULT_CEIL = os.getenv("DEFAULT_CEIL", "50mbit")


def run_tc(*args, check=True):
    """Execute a tc command."""
    cmd = ["tc"] + list(args)
    try:
        subprocess.check_output(cmd, stderr=subprocess.STDOUT)
        return True
    except subprocess.CalledProcessError as e:
        if check:
            print(f"TC command failed: {' '.join(cmd)}")
            print(f"Error: {e.output.decode() if e.output else str(e)}")
        return False


def tc_init():
    """Initialize tc qdisc structure."""
    print(f"Initializing tc on {ETHERNET}")
    
    # Remove existing qdisc
    run_tc("qdisc", "del", "dev", ETHERNET, "root", check=False)
    
    # Add root HTB qdisc
    run_tc("qdisc", "add", "dev", ETHERNET, "root", "handle", "1:", "htb", "default", "1")
    
    # Add HTB class
    run_tc("class", "add", "dev", ETHERNET, "parent", "1:", "classid", "1:1",
           "htb", "rate", DEFAULT_RATE, "ceil", DEFAULT_CEIL)
    
    # Add netem for delay
    run_tc("qdisc", "add", "dev", ETHERNET, "parent", "1:1", "handle", "10:",
           "netem", "delay", "40ms", "loss", "0.1%")
    
    print("TC initialized successfully")


def set_delay(rtt_ms, loss_pct=0.1):
    """
    Set network delay based on RTT.
    
    Args:
        rtt_ms: Round-trip time in milliseconds
        loss_pct: Packet loss percentage
    """
    # Handle invalid RTT values
    if rtt_ms <= 0 or rtt_ms == -1:
        rtt_ms = 100
        loss_pct = 100  # Simulate disconnection
    
    # Update HTB class
    run_tc("class", "change", "dev", ETHERNET, "parent", "1:", "classid", "1:1",
           "htb", "rate", DEFAULT_RATE, "ceil", "20mbit", check=False)
    
    # Update netem delay/loss
    run_tc("qdisc", "change", "dev", ETHERNET, "parent", "1:1", "handle", "10:",
           "netem", "delay", f"{int(rtt_ms)}ms", "loss", f"{loss_pct}%", check=False)


def tc_reset():
    """Reset to default network conditions."""
    run_tc("class", "change", "dev", ETHERNET, "parent", "1:", "classid", "1:1",
           "htb", "rate", DEFAULT_RATE, "ceil", DEFAULT_CEIL, check=False)
    run_tc("qdisc", "change", "dev", ETHERNET, "parent", "1:1", "handle", "10:",
           "netem", "delay", "40ms", "loss", "0.1%", check=False)


def load_trace(filepath):
    """
    Load latency trace from CSV file.
    
    Returns:
        dict: {timestamp: rtt_ms}
    """
    trace = {}
    try:
        with open(filepath, "r") as f:
            for i, line in enumerate(f):
                if i == 0:  # Skip header
                    continue
                parts = line.strip().split(",")
                if len(parts) >= 3:
                    since = float(parts[0])
                    rtt = float(parts[2])
                    trace[since] = int(rtt)
        print(f"Loaded {len(trace)} trace entries from {filepath}")
    except FileNotFoundError:
        print(f"Trace file not found: {filepath}")
        print("Running with static delay mode")
    except Exception as e:
        print(f"Error loading trace: {e}")
    
    return trace


def main():
    """Main entry point for trace-driven traffic shaping."""
    
    # Initialize tc
    tc_init()
    
    # Load trace file
    trace = load_trace(TRACE_FILE)
    
    if not trace:
        print("No trace data - using static delay mode (40ms, 0.1% loss)")
        while True:
            time.sleep(1)
    
    # Get start time
    init_time = datetime.now()
    print(f"Starting trace replay at {init_time}")
    
    # Main loop - replay trace
    while True:
        time.sleep(INTERVAL)
        
        # Calculate elapsed time
        elapsed = (datetime.now() - init_time).total_seconds()
        
        # Find closest trace entry
        closest_time = min(trace.keys(), key=lambda x: abs(x - elapsed))
        rtt = trace[closest_time]
        
        # Log periodically
        if int(elapsed * 10) % 100 == 0:  # Every 10 seconds
            print(f"t={elapsed:.1f}s, trace_t={closest_time:.3f}s, rtt={rtt}ms")
        
        # Apply delay
        set_delay(rtt)
        
        # Loop trace if we've exceeded it
        max_time = max(trace.keys())
        if elapsed > max_time:
            init_time = datetime.now()
            print(f"Trace complete, looping from start")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nShutting down...")
        sys.exit(0)

