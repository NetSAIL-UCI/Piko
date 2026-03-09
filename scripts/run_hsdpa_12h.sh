#!/usr/bin/env bash
# 12-hour DASH benchmark on HSDPA traces
# Waits for any existing benchmark process to finish first
export TMPDIR="/tmp/ajhunjh1_tmp"
mkdir -p "$TMPDIR"
cd /srv/disk00/ajhunjh1/Benchmarking

# Wait for any running benchmark to finish
while pgrep -f "benchmark.py.*--trace-dir" > /dev/null 2>&1; do
    echo "[HSDPA] Waiting for running benchmark to finish... ($(date))"
    sleep 60
done

echo "[HSDPA] Starting HSDPA 12h benchmark at $(date)"

exec python3 -u benchmark.py \
    --trace-dir traces/hsdpa \
    --duration 43200 \
    --results-dir hsdpa-12h \
    >> results/hsdpa_12h_run.log 2>&1
