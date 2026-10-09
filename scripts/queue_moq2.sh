#!/usr/bin/env bash
# Waits for host load < 150, then reruns MoQ2 on the corrected content (slots 13-16).
cd "$(dirname "$0")/.."
log(){ echo "[$(date '+%F %T')] $*"; }
while [ "$(awk '{print int($1)}' /proc/loadavg)" -ge 150 ]; do sleep 60; done
log "load ok ($(cut -d' ' -f1 /proc/loadavg)); starting moq2 suite"
python3 -u scripts/dispatch_parallel.py -p moq2 --workers 4 --worker-offset 12 --trace-list traces/six_bins_traces.txt --duration 60 --force-rerun --results-tag moq2_fixed_20261008
log "moq2 suite finished"
