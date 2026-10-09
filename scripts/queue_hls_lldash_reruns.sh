#!/usr/bin/env bash
# Usage: queue_hls_lldash_reruns.sh <pid_of_queue_dash_redo_then_webrtc.sh>
# After the DASH redo + WebRTC suite finish: rerun the HLS runs that hit a shaper timeout or are
# missing, plus the missing LL-DASH trace, at the original 45 s duration (so they merge with the
# existing batches), then splice them into results/recomputed_20261008.
cd "$(dirname "$0")/.."
log(){ echo "[$(date '+%F %T')] $*"; }
while kill -0 "$1" 2>/dev/null; do sleep 60; done
log "upstream queue finished; starting HLS/LL-DASH reruns"
R=results/recomputed_20261008; TAG=hls_lldash_rerun_20261008
for pass in 1 2; do
  python3 -u scripts/dispatch_parallel.py -p hls --workers 8 --trace-list $R/rerun_hls_traces.txt --duration 45 --force-rerun --results-tag $TAG || true
  python3 -u scripts/dispatch_parallel.py -p lldash-gpac --workers 4 --worker-offset 8 --trace-list $R/rerun_lldash_traces.txt --duration 45 --force-rerun --results-tag $TAG || true
done
python3 scripts/splice_reruns.py results/$TAG
log "reruns spliced into $R"
