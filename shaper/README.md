# NetSail Traffic Shaper

A Docker container for network emulation using Linux tc/netem. This allows you to simulate various network conditions like latency, packet loss, and bandwidth limitations.

## Overview

This container uses:
- **tc (traffic control)** with HTB (Hierarchical Token Bucket) for rate limiting
- **netem** for network emulation (delay, loss, jitter)
- **supervisord** to manage both nginx and the tc control script
- **nginx** as a reverse proxy (optional, can be customized)

## Quick Start

```bash
# Build and run the shaper
docker-compose up -d shaper

# Check logs
docker logs -f netsail-shaper

# Test the health endpoint
curl http://localhost:8080/health
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ETHERNET` | `eth0` | Network interface to shape |
| `INTERVAL` | `0.01` | TC update interval (seconds) |
| `TRACE_FILE` | `/trace/trace.csv` | Path to latency trace file |
| `DEFAULT_RATE` | `100mbit` | Default bandwidth rate |
| `DEFAULT_CEIL` | `50mbit` | Default bandwidth ceiling |
| `DEFAULT_DELAY` | `40ms` | Default network delay |
| `DEFAULT_LOSS` | `0.1%` | Default packet loss |

### Trace File Format

The trace file is a CSV with the following columns:

```csv
since,relative_seconds,rtt
0.0,0.0,40.0
0.1,0.1,45.2
0.2,0.1,38.5
...
```

- `since`: Absolute timestamp (seconds from start)
- `relative_seconds`: Time since previous entry
- `rtt`: Round-trip time in milliseconds

### Using Your Own Trace

Mount your trace file to `/trace/trace.csv`:

```yaml
volumes:
  - ./my-latency-trace.csv:/trace/trace.csv:ro
```

## Modes of Operation

### 1. Trace-Driven Mode (Default)

Replays network conditions from a trace file. The trace loops when it reaches the end.

### 2. Static Mode

If no trace file is provided, runs with static default values.

### 3. Handover Simulation Mode

Use `tc.py` directly to simulate satellite handovers:

```yaml
# In supervisord.conf, change:
command=python3 /tc.py
```

This simulates periodic network degradation at specific times (seconds 12, 27, 42, 57 of each minute).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Container                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ supervisord │──│   nginx     │  │   tc-trace.py   │ │
│  └─────────────┘  └──────┬──────┘  └────────┬────────┘ │
│                          │                   │          │
│                          │                   ▼          │
│                          │         ┌─────────────────┐  │
│                          │         │  tc/netem       │  │
│                          │         │  (HTB + netem)  │  │
│                          ▼         └────────┬────────┘  │
│                   ┌──────────────┐           │          │
│                   │   eth0       │◄──────────┘          │
│                   └──────┬───────┘                      │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
                      Network Traffic
```

## tc Commands Explained

The shaper sets up a hierarchical qdisc structure:

```bash
# Root HTB qdisc for rate limiting
tc qdisc add dev eth0 root handle 1: htb default 1

# HTB class with rate and ceiling
tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit ceil 50mbit

# Netem qdisc for delay/loss (attached to HTB class)
tc qdisc add dev eth0 parent 1:1 handle 10: netem delay 40ms loss 0.1%
```

To update dynamically:
```bash
# Change rate
tc class change dev eth0 parent 1: classid 1:1 htb rate 50mbit ceil 20mbit

# Change delay/loss
tc qdisc change dev eth0 parent 1:1 handle 10: netem delay 100ms loss 1%
```

## Requirements

- Docker with `NET_ADMIN` capability
- Linux kernel with tc/netem support (standard in most distributions)

**Note**: This container requires Linux. It will not work on Docker Desktop for macOS/Windows with the default VM (tc commands will fail silently). For development on macOS/Windows, use a Linux VM or remote Docker host.

## Example Use Cases

### 1. Satellite Network Emulation
Simulate Starlink-like conditions with variable latency:

```yaml
environment:
  DEFAULT_DELAY: "50ms"
  DEFAULT_LOSS: "0.5%"
```

### 2. Mobile Network Simulation
Simulate 4G/LTE conditions:

```yaml
environment:
  DEFAULT_RATE: "20mbit"
  DEFAULT_DELAY: "80ms"
  DEFAULT_LOSS: "2%"
```

### 3. Poor Network Conditions
Test application behavior under stress:

```yaml
environment:
  DEFAULT_RATE: "1mbit"
  DEFAULT_DELAY: "500ms"
  DEFAULT_LOSS: "10%"
```

## Credits

Based on the network emulation approach from [mmsys24-starlink-livestreaming](https://github.com/clarkzjw/mmsys24-starlink-livestreaming).

