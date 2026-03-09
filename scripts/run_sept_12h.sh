#!/usr/bin/env bash
# 12-hour DASH benchmark on FCC 2016 Sept traces
export TMPDIR="/tmp/ajhunjh1_tmp"
mkdir -p "$TMPDIR"
cd /srv/disk00/ajhunjh1/Benchmarking

exec python3 -u benchmark.py \
    --trace-dir traces/fcc-2016-sept \
    --duration 43200 \
    --results-dir fcc-2016-sept-12h \
    >> results/fcc-2016-sept-12h_run.log 2>&1
