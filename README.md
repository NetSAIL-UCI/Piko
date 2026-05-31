# Streaming Benchmark

Measure video streaming QoE (HLS, DASH & WebRTC) under emulated network conditions.
[View the NetSAIL System Diagram (PDF)](./Netsail%20diagram.pdf)
## Prerequisites

- **Python 3.8+** and **pip**
- **Docker** with the Compose plugin (`docker compose`). If your user isn't in
  the `docker` group, the tooling uses `sudo docker compose` automatically and
  will prompt for your password.
- **ffmpeg / ffprobe** for content generation (`sudo apt install ffmpeg`).
  ffmpeg ≥ 4.3 is needed for the optional LL-DASH content; plain DASH/HLS work
  on older ffmpeg (the LL-DASH step is skipped automatically).
- **Playwright Chromium** for the browser-based players (DASH/HLS/MOQ).

## Setup

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Install the headless browser used by the DASH/HLS players
playwright install chromium

# 3. (Optional) Pre-generate streaming content. benchmark.py also does this
#    automatically on first run, but you can do it ahead of time:
./setup_content.sh            # downloads BigBuckBunny + encodes DASH/HLS/LL-DASH

# 4. (Optional) Start the servers. benchmark.py will auto-start them too.
sudo docker compose up -d     # or: docker compose up -d  (if in the docker group)
```

### Zero-config runs

You can skip steps 3 and 4 — `benchmark.py` **auto-generates content** if it's
missing and **auto-starts** the required docker server before each run:

```bash
python3 benchmark.py -p dash --trace traces/starlink-2024/starlink_road_000_tc.csv
```

On the first run this downloads the sample video, encodes the streaming
content, and brings up the server (via `sudo docker compose` if needed), then
runs the benchmark. Use `--no-autocontent` / `--no-autostart` to opt out.

> **H.264 note:** the sample content is H.264. Playwright's bundled Chromium
> doesn't ship the H.264 decoder on every platform; if a DASH/HLS run reports
> dash.js `No streams to play`, re-run with `--browser-channel chrome` to use
> system Google Chrome (which always decodes H.264).

## Run Benchmarks

### HLS Benchmarks

```bash
# HLS with a specific network trace
python3 benchmark.py -p hls --trace traces/trace_12743_3g_tc.csv

# HLS direct (no shaping)
python3 benchmark.py -p hls

# HLS with all traces in a folder
python3 benchmark.py -p hls --trace-dir traces/
```

### DASH Benchmarks

```bash
# DASH with a specific network trace
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv

# DASH direct (no shaping)
python3 benchmark.py

# DASH with all traces in a folder
python3 benchmark.py --trace-dir traces/
```

### WebRTC Benchmarks

```bash
# WebRTC with a specific network trace
python3 benchmark.py -p webrtc --trace traces/trace_12743_3g_tc.csv

# WebRTC direct (60s)
python3 benchmark.py -p webrtc --duration 60

# WebRTC with all traces in a folder
python3 benchmark.py -p webrtc --trace-dir traces/
```

### Protocol Comparison

```bash
# Run same trace on all three protocols
python3 benchmark.py -p hls --trace traces/trace_12743_3g_tc.csv -o hls.json
python3 benchmark.py -p dash --trace traces/trace_12743_3g_tc.csv -o dash.json
python3 benchmark.py -p webrtc --trace traces/trace_12743_3g_tc.csv -o webrtc.json
```

### Custom Options

```bash
# Limit test duration to 30 seconds
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv --duration 30

# Save to a specific output file
python3 benchmark.py --trace traces/trace_12743_3g_tc.csv -o my_result.json

# Use a custom server URL
python3 benchmark.py --url http://192.168.1.10:8080

# Use shaped ports without trace file
python3 benchmark.py --shaped
```

## Download Traces

```bash
# Download all available network traces (3G + FCC broadband)
python3 scripts/download_traces.py --all

# List available trace sets
python3 scripts/download_traces.py --list
```

## CLI Reference

```
python3 benchmark.py [OPTIONS]

--protocol, -p     hls | dash | webrtc | lldash-gpac | moq2   (default: dash)
--trace FILE       Single trace file          (auto-enables shaping)
--trace-dir DIR    Folder of traces           (runs all *_tc.csv files)
--shaped           Use shaped ports           (9080 for HLS/DASH, 9030 for WebRTC)
--duration N       Limit test to N seconds
-o, --output FILE  Output JSON filename
--url URL          Custom server URL

# Output location
--results-root DIR   Root dir for results (default: ./results or
                     $BENCHMARK_RESULTS_DIR). Use a writable path when the
                     in-repo results/ dir is owned by another user.
--results-dir NAME   Results subdirectory under the results root.

# Browser
--browser-channel CH  Playwright channel for the players (e.g. 'chrome').
                      Default: bundled Chromium. Use 'chrome' when bundled
                      Chromium can't decode the H.264 content. Also settable
                      via $BENCHMARK_BROWSER_CHANNEL.

# Bootstrap (auto-on by default)
--no-autostart     Don't auto-start the docker server if it isn't running.
--no-autocontent   Don't auto-generate streaming content if it's missing.
--rebuild          Pass --build to `docker compose up` (e.g. after pulling
                   changes to a server image).
--no-shaper-restart  Reuse the running shaper instead of restarting it.
```

## Docker

If your user is in the `docker` group, drop the `sudo`. `benchmark.py` picks
the right form automatically (preferring `sudo docker compose` when it can't
reach the daemon directly).

```bash
sudo docker compose up -d            # Start services
sudo docker compose down             # Stop services
sudo docker compose logs -f          # View logs
sudo docker compose restart shaper   # Restart shaper after config change

# After pulling server-side changes, rebuild the affected image, e.g.:
sudo docker compose up -d --build webrtc-server
```

## Ports

| Service | Direct | Shaped |
|---------|--------|--------|
| HLS/DASH Server | 8080 | 9080 |
| LL-DASH Server | 8081 | 9081 |
| WebRTC Server | 3000 | 9030 |

## LL-DASH Service

The repository now includes a dedicated LL-DASH module under `lldash-server/`.

- Direct player URL: `http://localhost:8081`
- Shaped player URL: `http://localhost:9081`
- Default manifest path in the LL player: `/manifest_ll.mpd`
- Override manifest from URL: `http://localhost:8081/?mpd=/manifest.mpd`

> LL-DASH content requires **ffmpeg ≥ 4.3** (for the `-ldash` muxer option).
> On older ffmpeg, `setup_content.sh` skips LL-DASH generation but still
> produces the regular DASH and HLS content.

## Troubleshooting

- **dash.js `No streams to play` (DASH/HLS):** the bundled Chromium can't
  decode the H.264 content on this host. Re-run with `--browser-channel chrome`.
- **`PermissionError` writing results:** the in-repo `results/` dir is owned by
  another user. Use `--results-root <writable dir>` or set
  `$BENCHMARK_RESULTS_DIR`.
- **Server won't start / `sudo` password prompt:** docker needs elevated
  permissions. Either add your user to the `docker` group, or let the prompt
  appear and enter your password. You can also start it manually with
  `sudo docker compose up -d <service>`.
- **WebRTC reports 0 kbps:** make sure you rebuilt the server after pulling
  (`sudo docker compose up -d --build webrtc-server`); the shaper must not run
  during the ICE/DTLS handshake.
