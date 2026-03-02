#!/bin/bash
#
# Run WebRTC benchmark on all traces in 2025-12-05/
#

cd /home/ubuntu/.ipython/Benchmarking

RESULTS_DIR="results/2025-15-05-results"
TRACE_DIR="2025-12-05"
DURATION=180

echo "=============================================="
echo "  WEBRTC BENCHMARK - ALL TRACES"
echo "=============================================="

mapfile -t ALL_TRACES < <(ls -1 "$TRACE_DIR"/*_tc.csv | sort)
TOTAL=${#ALL_TRACES[@]}

echo "Total traces: $TOTAL"

COUNT=0
SKIP=0
for trace_file in "${ALL_TRACES[@]}"; do
    stem=$(basename "$trace_file" .csv)
    
    # Check if already done
    if ls "$RESULTS_DIR"/benchmark_webrtc_${stem}_*.json 1>/dev/null 2>&1; then
        SKIP=$((SKIP + 1))
        echo "  [SKIP] Already done: $stem"
        continue
    fi
    
    COUNT=$((COUNT + 1))
    echo ""
    echo "── WebRTC [$((SKIP + COUNT))/$TOTAL] $stem ──"
    python3 benchmark.py -p webrtc --duration $DURATION --trace "$trace_file" --results-dir 2025-15-05-results
done

echo ""
echo "=============================================="
echo "  WEBRTC BENCHMARK COMPLETE"
echo "  Results in: $RESULTS_DIR/"
echo "=============================================="
echo "WebRTC files: $(ls $RESULTS_DIR/benchmark_webrtc_*.json 2>/dev/null | wc -l) / $TOTAL"
