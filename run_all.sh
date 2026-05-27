#!/usr/bin/env bash
# Run all protocols across all available trace sets sequentially.
# Usage: bash run_all.sh [results-tag]
# Logs per-combo to results/run_all_<tag>/logs/<protocol>_<set>.log

set -uo pipefail
cd "$(dirname "$0")"

TAG="${1:-$(date +%Y%m%d_%H%M%S)}"
OUT="results/run_all_${TAG}"
LOG_DIR="${OUT}/logs"
mkdir -p "$LOG_DIR"

PROTOCOLS=(dash lldash-gpac hls webrtc moq2)
TRACE_SETS=(
  "5g-ireland:traces/5g-ireland"
  "starlink-2024:traces/starlink-2024"
  "fcc:traces/fcc"
)

DURATION=120

total=0
done_count=0
fail_count=0

# count total combos (only non-empty trace dirs)
for entry in "${TRACE_SETS[@]}"; do
  set_id="${entry%%:*}"
  dir="${entry##*:}"
  count=$(ls "${dir}"/*.csv 2>/dev/null | wc -l)
  if [ "$count" -gt 0 ]; then
    total=$(( total + ${#PROTOCOLS[@]} ))
  fi
done

echo "================================================================"
echo " Benchmark All — tag: ${TAG}"
echo " Protocols : ${PROTOCOLS[*]}"
echo " Trace sets: $(for e in "${TRACE_SETS[@]}"; do echo -n "${e%%:*} "; done)"
echo " Duration  : ${DURATION}s per trace"
echo " Total runs: ${total} protocol×set combos"
echo " Results   : ${OUT}/"
echo "================================================================"
echo

combo=0
for entry in "${TRACE_SETS[@]}"; do
  for proto in "${PROTOCOLS[@]}"; do
    set_id="${entry%%:*}"
    dir="${entry##*:}"
    count=$(ls "${dir}"/*.csv 2>/dev/null | wc -l)
    if [ "$count" -eq 0 ]; then
      echo "[SKIP] ${proto} / ${set_id} — no traces"
      continue
    fi

    combo=$(( combo + 1 ))
    res_dir="${OUT}/${proto}_${set_id}"
    log="${LOG_DIR}/${proto}_${set_id}.log"
    echo "[${combo}/${total}] $(date '+%H:%M:%S') — ${proto} on ${set_id} (${count} traces)"

    python3 -u benchmark.py \
      --protocol "${proto}" \
      --duration "${DURATION}" \
      --trace-dir "${dir}" \
      --results-dir "${res_dir}" \
      2>&1 | tee "${log}"

    exit_code="${PIPESTATUS[0]}"
    if [ "$exit_code" -eq 0 ]; then
      done_count=$(( done_count + 1 ))
      echo "[OK] ${proto} / ${set_id}"
    else
      fail_count=$(( fail_count + 1 ))
      echo "[FAIL] ${proto} / ${set_id} — exit ${exit_code}"
    fi
    echo
  done
done

echo "================================================================"
echo " Done: ${done_count} OK, ${fail_count} failed"
echo " Results in: ${OUT}/"
echo "================================================================"
