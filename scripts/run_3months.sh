#!/usr/bin/env bash
set -e

# Run 3 months of DASH benchmarks, then 3 months of WebRTC benchmarks
# Months: June 2016, July 2016, September 2016 (10 traces each = 30 per protocol)

TRACE_BASE="traces/fcc/raw-2016"
MONTHS=("converted-jun" "converted-jul" "converted-sept")
RESULT_NAMES=("fcc-2016-jun" "fcc-2016-jul" "fcc-2016-sept")

echo "============================================================"
echo "  3-Month Benchmark Run: DASH then WebRTC"
echo "  Traces: ${#MONTHS[@]} months × 10 traces = 30 per protocol"
echo "  Total: 60 benchmark runs"
echo "============================================================"
echo ""

# ── DASH runs ──────────────────────────────────────────────────────
echo "========================================"
echo "  PHASE 1: DASH (3 months)"
echo "========================================"
DASH_START=$(date +%s)

for i in "${!MONTHS[@]}"; do
    month="${MONTHS[$i]}"
    result_dir="${RESULT_NAMES[$i]}"
    trace_dir="${TRACE_BASE}/${month}"

    echo ""
    echo "──── DASH: ${month} ────"
    python3 -u benchmark.py \
        --protocol dash \
        --trace-dir "$trace_dir" \
        --shaped \
        --results-dir "$result_dir"
done

DASH_END=$(date +%s)
DASH_ELAPSED=$(( DASH_END - DASH_START ))
echo ""
echo "DASH complete in ${DASH_ELAPSED}s ($(( DASH_ELAPSED / 60 ))m $(( DASH_ELAPSED % 60 ))s)"
echo ""

# ── WebRTC runs ────────────────────────────────────────────────────
echo "========================================"
echo "  PHASE 2: WebRTC (3 months)"
echo "========================================"
WEBRTC_START=$(date +%s)

for i in "${!MONTHS[@]}"; do
    month="${MONTHS[$i]}"
    result_dir="${RESULT_NAMES[$i]}"
    trace_dir="${TRACE_BASE}/${month}"

    echo ""
    echo "──── WebRTC: ${month} ────"
    python3 -u benchmark.py \
        --protocol webrtc \
        --trace-dir "$trace_dir" \
        --shaped \
        --results-dir "$result_dir"
done

WEBRTC_END=$(date +%s)
WEBRTC_ELAPSED=$(( WEBRTC_END - WEBRTC_START ))
TOTAL_ELAPSED=$(( WEBRTC_END - DASH_START ))

echo ""
echo "============================================================"
echo "  ALL DONE"
echo "  DASH:   ${DASH_ELAPSED}s ($(( DASH_ELAPSED / 60 ))m)"
echo "  WebRTC: ${WEBRTC_ELAPSED}s ($(( WEBRTC_ELAPSED / 60 ))m)"
echo "  Total:  ${TOTAL_ELAPSED}s ($(( TOTAL_ELAPSED / 60 ))m)"
echo "============================================================"
echo ""
echo "Results in:"
for r in "${RESULT_NAMES[@]}"; do
    echo "  results/$r/"
done
