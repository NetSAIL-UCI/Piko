#!/usr/bin/env bash
# ============================================================================
# NetSail 16-Worker Parallel Benchmark Runner
# Dispatches 11,934 traces across 5 protocols to complete in ~2-3 days.
#
# Usage:
#   bash run_parallel.sh [options to pass to dispatch_parallel.py]
#
# Examples:
#   bash run_parallel.sh --duration 45 --workers 16
#   bash run_parallel.sh --protocols dash webrtc --duration 60
#   bash run_parallel.sh --dry-run
# ============================================================================

set -euo pipefail
cd "$(dirname "$0")"

echo "============================================================================"
echo "  NetSail 16-Worker Parallel Benchmark"
echo "============================================================================"

# Check if workers are running
if ! curl -sf http://localhost:8101/health >/dev/null 2>&1; then
    echo ""
    echo "[NOTICE] Worker containers are not currently detected on port 8101."
    echo "To start the 16 isolated worker containers, run (once with sudo):"
    echo ""
    echo "    sudo docker compose -f docker-compose-workers.yaml up -d"
    echo ""
    echo "Then re-run this script to begin parallel execution."
    echo "============================================================================"
    # If dry-run requested, allow proceeding anyway
    for arg in "$@"; do
        if [ "$arg" = "--dry-run" ]; then
            exec python3 -u scripts/dispatch_parallel.py "$@"
        fi
    done
    exit 1
fi

echo "[OK] Workers detected and healthy."
echo "[START] Launching parallel dispatcher..."
exec python3 -u scripts/dispatch_parallel.py "$@"

