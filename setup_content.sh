#!/usr/bin/env bash
#
# First-time content setup for the Streaming Benchmark.
#
# What this does:
#   1. Downloads BigBuckBunny source video if not present
#   2. Encodes GPAC source streams (needed for LL-DASH via GPAC)
#   3. Generates DASH, LL-DASH, and HLS segments via FFmpeg
#   4. Optionally packages GPAC LL-CMAF segments (if MP4Box is available)
#
# Usage:
#   ./setup_content.sh [--skip-gpac] [--force]
#
# Options:
#   --skip-gpac   Skip GPAC LL-CMAF packaging (if MP4Box not installed)
#   --force       Re-generate even if content already exists
#
# Requirements:
#   - ffmpeg, ffprobe
#   - curl
#   - MP4Box (optional, for GPAC LL-DASH track)

set -euo pipefail

# ── config ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTENT_DIR="$SCRIPT_DIR/content"
SOURCE_VIDEO="$CONTENT_DIR/BigBuckBunny.mp4"
VIDEO_URL="https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4"

FFMPEG="${FFMPEG_BIN:-ffmpeg}"
FFPROBE="${FFPROBE_BIN:-ffprobe}"
MP4BOX="${MP4BOX:-/tmp/gpac-build/bin/MP4Box}"

SKIP_GPAC=false
FORCE=false

# ── colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
info() { echo -e "${CYAN}→ $*${NC}"; }
warn() { echo -e "${YELLOW}! $*${NC}"; }
die()  { echo -e "${RED}✗ $*${NC}"; exit 1; }

# ── args ─────────────────────────────────────────────────────────────────────
for arg in "$@"; do
    case "$arg" in
        --skip-gpac) SKIP_GPAC=true ;;
        --force)     FORCE=true ;;
        *) die "Unknown option: $arg" ;;
    esac
done

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Streaming Benchmark — First-time Content Setup${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ── check dependencies ───────────────────────────────────────────────────────
info "Checking dependencies..."
command -v "$FFMPEG"  &>/dev/null || die "ffmpeg not found. Install: sudo apt install ffmpeg"
command -v "$FFPROBE" &>/dev/null || die "ffprobe not found. Install: sudo apt install ffmpeg"
command -v curl       &>/dev/null || die "curl not found. Install: sudo apt install curl"
ok "ffmpeg and curl available"

if [ "$SKIP_GPAC" = false ]; then
    if ! command -v "$MP4BOX" &>/dev/null; then
        warn "MP4Box not found at $MP4BOX — GPAC LL-DASH step will be skipped."
        warn "To build MP4Box: https://wiki.gpac.io/Build/Build-Introduction"
        warn "Or rerun with --skip-gpac to suppress this warning."
        SKIP_GPAC=true
    else
        ok "MP4Box found"
    fi
fi

mkdir -p "$CONTENT_DIR"

# ── step 1: download source video ────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[1/4] Source video${NC}"
if [ -f "$SOURCE_VIDEO" ] && [ "$FORCE" = false ]; then
    ok "BigBuckBunny.mp4 already present ($(du -h "$SOURCE_VIDEO" | cut -f1)). Skipping download."
else
    info "Downloading BigBuckBunny (320x180)..."
    curl -L --progress-bar -o "$SOURCE_VIDEO" "$VIDEO_URL"
    ok "Downloaded to $SOURCE_VIDEO"
fi

# ── step 2: encode GPAC source streams ───────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/4] GPAC source streams (for LL-DASH)${NC}"

GPAC_STREAMS_DONE=true
for i in 0 1 2 3 4 5; do
    [ -f "$CONTENT_DIR/gpac-src-stream${i}.mp4" ] || { GPAC_STREAMS_DONE=false; break; }
done

if [ "$GPAC_STREAMS_DONE" = true ] && [ "$FORCE" = false ]; then
    ok "GPAC source streams already present. Skipping encode."
else
    info "Encoding 6 quality levels for GPAC LL-DASH..."

    X264_COMMON="-profile:v high -level 3.1 -preset fast -g 48 -keyint_min 48 -sc_threshold 0"

    "$FFMPEG" -y -i "$SOURCE_VIDEO" \
        -filter_complex "[0:v]split=6[v0][v1][v2][v3][v4][v5]; \
            [v0]scale=256:144[o0]; \
            [v1]scale=426:240[o1]; \
            [v2]scale=640:360[o2]; \
            [v3]scale=854:480[o3]; \
            [v4]scale=1280:720[o4]; \
            [v5]scale=1280:720[o5]" \
        -map "[o0]" -c:v:0 libx264 -b:v:0 150k  $X264_COMMON -an "$CONTENT_DIR/gpac-src-stream0.mp4" \
        -map "[o1]" -c:v:1 libx264 -b:v:1 400k  $X264_COMMON -an "$CONTENT_DIR/gpac-src-stream1.mp4" \
        -map "[o2]" -c:v:2 libx264 -b:v:2 800k  $X264_COMMON -an "$CONTENT_DIR/gpac-src-stream2.mp4" \
        -map "[o3]" -c:v:3 libx264 -b:v:3 1500k $X264_COMMON -an "$CONTENT_DIR/gpac-src-stream3.mp4" \
        -map "[o4]" -c:v:4 libx264 -b:v:4 3000k $X264_COMMON -an "$CONTENT_DIR/gpac-src-stream4.mp4" \
        -map "[o5]" -c:v:5 libx264 -b:v:5 4500k $X264_COMMON -an "$CONTENT_DIR/gpac-src-stream5.mp4"

    ok "GPAC source streams encoded"
fi

# ── step 3: DASH + LL-DASH + HLS via FFmpeg ──────────────────────────────────
echo ""
echo -e "${YELLOW}[3/4] DASH + LL-DASH + HLS segments${NC}"

if [ -f "$CONTENT_DIR/manifest.mpd" ] && [ -f "$CONTENT_DIR/manifest_ll.mpd" ] \
   && [ -f "$CONTENT_DIR/ll2s-manifest.mpd" ] \
   && [ -d "$CONTENT_DIR/hls" ] && [ "$FORCE" = false ]; then
    ok "DASH, LL-DASH, and HLS already present. Skipping."
else
    info "Running generate-dash.sh..."
    bash "$SCRIPT_DIR/scripts/generate-dash.sh" "$SOURCE_VIDEO" "$CONTENT_DIR" 4
    ok "DASH + LL-DASH + HLS generated"
fi

# ── step 4: GPAC LL-CMAF packaging ───────────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/4] GPAC LL-CMAF packaging${NC}"

if [ "$SKIP_GPAC" = true ]; then
    warn "Skipping GPAC step (--skip-gpac or MP4Box not found)."
elif [ -f "$CONTENT_DIR/gpac-ll/manifest.mpd" ] && [ "$FORCE" = false ]; then
    ok "GPAC LL-CMAF already present. Skipping."
else
    info "Running package_content.sh..."
    bash "$SCRIPT_DIR/lldash-server/package_content.sh"
    ok "GPAC LL-CMAF packaged"
fi

# ── summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Content setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Content directory: $CONTENT_DIR"
echo ""
echo "Next steps:"
echo "  docker compose up -d          # start servers"
echo "  python3 benchmark.py          # run a quick DASH benchmark"
echo "  python3 scripts/download_traces.py --all   # download network traces"
echo ""
