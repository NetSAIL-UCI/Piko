#!/bin/bash
#
# Resume DASH benchmark from where it stopped, then run all WebRTC benchmarks.
# Uses nohup-safe design -- won't die if SSH/terminal drops.
#

cd /home/ubuntu/.ipython/Benchmarking

RESULTS_DIR="results/2025-15-05-results"
TRACE_DIR="2025-12-05"
DURATION=180

echo "=============================================="
echo "  RESUMING DASH BENCHMARK"
echo "=============================================="

# Get list of all _tc.csv trace files sorted
mapfile -t ALL_TRACES < <(ls -1 "$TRACE_DIR"/*_tc.csv | sort)
TOTAL=${#ALL_TRACES[@]}

# Get list of already completed DASH traces
mapfile -t DONE_DASH < <(ls -1 "$RESULTS_DIR"/benchmark_dash_*.json 2>/dev/null | xargs -I{} basename {} | sed 's/benchmark_dash_//' | sed 's/_[0-9]\{8\}_[0-9]\{6\}\.json//')

echo "Total traces: $TOTAL"
echo "DASH already done: ${#DONE_DASH[@]}"

# Run remaining DASH traces
DASH_COUNT=0
for trace_file in "${ALL_TRACES[@]}"; do
    stem=$(basename "$trace_file" .csv)
    # Check if already done
    skip=false
    for done in "${DONE_DASH[@]}"; do
        if [ "$stem" = "$done" ]; then
            skip=true
            break
        fi
    done
    if $skip; then
        continue
    fi
    
    DASH_COUNT=$((DASH_COUNT + 1))
    REMAINING=$((TOTAL - ${#DONE_DASH[@]} - DASH_COUNT + 1))
    echo ""
    echo "── DASH [$((${#DONE_DASH[@]} + DASH_COUNT))/$TOTAL] $stem (${REMAINING} remaining) ──"
    python3 benchmark.py -p dash --duration $DURATION --trace "$trace_file" --results-dir 2025-15-05-results
done

echo ""
echo "=============================================="
echo "  DASH COMPLETE. STARTING WEBRTC BENCHMARK"
echo "=============================================="

# Run all WebRTC traces
WEBRTC_COUNT=0
for trace_file in "${ALL_TRACES[@]}"; do
    stem=$(basename "$trace_file" .csv)
    
    # Check if already done
    if ls "$RESULTS_DIR"/benchmark_webrtc_${stem}_*.json 1>/dev/null 2>&1; then
        echo "  [SKIP] WebRTC already done: $stem"
        continue
    fi
    
    WEBRTC_COUNT=$((WEBRTC_COUNT + 1))
    echo ""
    echo "── WebRTC [$WEBRTC_COUNT/$TOTAL] $stem ──"
    python3 benchmark.py -p webrtc --duration $DURATION --trace "$trace_file" --results-dir 2025-15-05-results
done

echo ""
echo "=============================================="
echo "  ALL BENCHMARKS COMPLETE"
echo "  Results in: $RESULTS_DIR/"
echo "=============================================="
echo "DASH files:   $(ls $RESULTS_DIR/benchmark_dash_*.json 2>/dev/null | wc -l)"
echo "WebRTC files:  $(ls $RESULTS_DIR/benchmark_webrtc_*.json 2>/dev/null | wc -l)"
