#!/usr/bin/env bash
# Package BigBuckBunny sources into LL-CMAF segments using GPAC MP4Box.
# Run once after encoding: ./package_content.sh
# Output goes to CONTENT_DIR (default ../content/gpac-ll/).
set -e

MP4BOX=${MP4BOX:-/tmp/gpac-build/bin/MP4Box}
CONTENT=${CONTENT_DIR:-$(dirname "$0")/../content}
SRC_DIR=$CONTENT
OUT_DIR=$CONTENT/gpac-ll

mkdir -p "$OUT_DIR"

# Segment duration 2s, fragment (sub-segment) duration 0.5s → true LL-CMAF
SEG_DUR=2000   # ms
FRAG_DUR=500   # ms  (4 sub-segments per segment)

echo "[GPAC] Packaging LL-CMAF: seg=${SEG_DUR}ms frag=${FRAG_DUR}ms"

# Build input list — only include streams that were encoded
INPUTS=""
for i in 0 1 2 3 4 5; do
    f="$SRC_DIR/gpac-src-stream${i}.mp4"
    if [ -f "$f" ]; then
        INPUTS="$INPUTS $f"
    else
        echo "[WARN] $f missing, skipping stream $i"
    fi
done

if [ -z "$INPUTS" ]; then
    echo "[ERROR] No source streams found in $SRC_DIR"
    exit 1
fi

$MP4BOX \
    -dash $SEG_DUR \
    -frag $FRAG_DUR \
    -profile live \
    -bs-switching no \
    -segment-name "seg_\$RepresentationID\$_\$Number%05d\$" \
    -init-segment-ext mp4 \
    -out "$OUT_DIR/manifest.mpd" \
    $INPUTS

echo "[GPAC] Done. Manifest: $OUT_DIR/manifest.mpd"
ls -lh "$OUT_DIR/"*.mpd
