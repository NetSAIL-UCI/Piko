#!/usr/bin/env bash
# Usage: queue_dash_redo_then_webrtc.sh <dash_dispatcher_pid>
# 1) wait for the running DASH suite to finish
# 2) quarantine DASH runs whose shaper call timed out, rerun them (+ any failures), up to 3 passes
# 3) when WebRTC workers 9-12 are healthy and the host load is low, run the WebRTC suite on them
cd "$(dirname "$0")/.."
TL=traces/six_bins_traces.txt
log(){ echo "[$(date '+%F %T')] $*"; }
DASH_PID="$1"
while kill -0 "$DASH_PID" 2>/dev/null; do sleep 60; done
log "dash dispatcher $DASH_PID finished"
TAG=dash_hybrid_fixed_20261008
python3 scripts/quarantine_runs.py results/$TAG dash --shaper-timeouts
for pass in 1 2 3; do
  pending=$(python3 scripts/dispatch_parallel.py --dry-run -p dash --abr bola --trace-list $TL --duration 60 --force-rerun --results-tag $TAG --workers 8 | awk '/Pending runs/{gsub(",","",$NF);print $NF}')
  log "dash redo pass $pass: pending=$pending"
  [ "$pending" = "0" ] && break
  python3 -u scripts/dispatch_parallel.py -p dash --abr bola --trace-list $TL --duration 60 --force-rerun --results-tag $TAG --workers 8 || true
  python3 scripts/quarantine_runs.py results/$TAG dash --shaper-timeouts
done
log "dash redo done; waiting for webrtc workers 9-12 and load < 150"
while true; do
  ok=1; for p in 3109 3110 3111 3112; do curl -sf -m 5 localhost:$p/health >/dev/null || ok=0; done
  l=$(awk '{print int($1)}' /proc/loadavg)
  [ "$ok" = 1 ] && [ "$l" -lt 150 ] && break
  sleep 60
done
log "starting webrtc suite (4 workers, slots 9-12)"
python3 -u scripts/dispatch_parallel.py -p webrtc --workers 4 --worker-offset 8 --trace-list $TL --duration 60 --force-rerun --results-tag webrtc_real_20261008
log "webrtc suite finished"
