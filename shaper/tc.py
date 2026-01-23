#!/usr/bin/env python3
"""
TC/Netem traffic shaping utility for network emulation.

This module provides functions to initialize, configure, and reset
traffic control (tc) queuing disciplines using HTB and netem.
"""

import os
import subprocess
import time
from datetime import datetime

# Network interface to apply shaping to
ETHERNET = os.getenv("ETHERNET", "eth0")

# Default network parameters
DEFAULT_RATE = os.getenv("DEFAULT_RATE", "100mbit")
DEFAULT_DELAY = os.getenv("DEFAULT_DELAY", "40ms")
DEFAULT_LOSS = os.getenv("DEFAULT_LOSS", "0.1%")


def run_tc(*args):
    """Execute a tc command with error handling."""
    cmd = ["tc"] + list(args)
    try:
        subprocess.check_output(cmd, stderr=subprocess.STDOUT)
        return True
    except subprocess.CalledProcessError as e:
        print(f"TC command failed: {' '.join(cmd)}")
        print(f"Error: {e.output.decode() if e.output else str(e)}")
        return False


def tc_init():
    """
    Initialize tc qdisc structure with HTB + netem.
    
    Structure:
    - root: HTB qdisc for rate limiting
    - child: netem qdisc for delay/loss emulation
    """
    print(f"Initializing tc on interface {ETHERNET}")
    
    # First, try to delete any existing qdisc
    run_tc("qdisc", "del", "dev", ETHERNET, "root")
    
    # Add root HTB qdisc
    run_tc("qdisc", "add", "dev", ETHERNET, "root", "handle", "1:", "htb", "default", "1")
    
    # Add HTB class for rate limiting
    run_tc("class", "add", "dev", ETHERNET, "parent", "1:", "classid", "1:1", 
           "htb", "rate", DEFAULT_RATE, "ceil", "50mbit")
    
    # Add netem qdisc for delay/loss
    run_tc("qdisc", "add", "dev", ETHERNET, "parent", "1:1", "handle", "10:", 
           "netem", "delay", DEFAULT_DELAY, "loss", DEFAULT_LOSS)
    
    print(f"TC initialized: rate={DEFAULT_RATE}, delay={DEFAULT_DELAY}, loss={DEFAULT_LOSS}")


def tc_set(rate=None, delay=None, loss=None, jitter=None):
    """
    Update tc parameters dynamically.
    
    Args:
        rate: Bandwidth rate (e.g., "50mbit", "10mbit")
        delay: Network delay (e.g., "100ms", "50ms")
        loss: Packet loss percentage (e.g., "1%", "5%")
        jitter: Delay variation (e.g., "10ms")
    """
    rate = rate or DEFAULT_RATE
    delay = delay or DEFAULT_DELAY
    loss = loss or DEFAULT_LOSS
    
    # Update HTB class for rate
    run_tc("class", "change", "dev", ETHERNET, "parent", "1:", "classid", "1:1",
           "htb", "rate", rate, "ceil", rate)
    
    # Build netem command
    netem_args = ["qdisc", "change", "dev", ETHERNET, "parent", "1:1", 
                  "handle", "10:", "netem", "delay", delay]
    
    if jitter:
        netem_args.extend([jitter, "25%"])  # 25% correlation
    
    netem_args.extend(["loss", loss])
    
    run_tc(*netem_args)


def tc_reset():
    """Reset tc to default parameters."""
    tc_set(rate=DEFAULT_RATE, delay=DEFAULT_DELAY, loss=DEFAULT_LOSS)


def tc_del():
    """Remove all tc qdisc from interface."""
    run_tc("qdisc", "del", "dev", ETHERNET, "root")
    print(f"TC qdisc removed from {ETHERNET}")


def tc_show():
    """Display current tc configuration."""
    print("\n=== TC Qdisc ===")
    subprocess.run(["tc", "qdisc", "show", "dev", ETHERNET])
    print("\n=== TC Class ===")
    subprocess.run(["tc", "class", "show", "dev", ETHERNET])


if __name__ == "__main__":
    # Simulated handover times (seconds within each minute)
    HANDOVER_SECONDS = [12, 27, 42, 57]
    HANDOVER_DURATION = 0

    def get_handover_times():
        """Calculate all seconds that are within handover periods."""
        handover = []
        for t in HANDOVER_SECONDS:
            for i in range(HANDOVER_DURATION + 1):
                handover.append(t - i if t - i >= 0 else t - i + 60)
                handover.append(t + i if t + i < 60 else t + i - 60)
        return set(handover)

    def is_handover(now, handover_set):
        """Check if current second is within a handover period."""
        return now in handover_set

    # Initialize tc
    tc_init()
    handover = get_handover_times()

    print("Starting handover simulation...")
    while True:
        now = datetime.now().second
        if is_handover(now, handover):
            # Simulate poor network during handover
            tc_set(rate="50mbit", delay="100ms", loss="1%", jitter="10ms")
        else:
            # Normal network conditions
            tc_reset()
        
        time.sleep(0.1)

