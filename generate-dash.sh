#!/bin/bash
#
# Generate DASH content from a video file
#
# Usage:
#   ./generate-dash.sh <input_video> [output_dir] [segment_duration]
#
# Example:
#   ./generate-dash.sh ../BigBuckBunny_320x180.mp4 ../content 4
#

set -e

# Configuration
INPUT_VIDEO="${1:-../BigBuckBunny_320x180.mp4}"
OUTPUT_DIR="${2:-../../content}"
SEGMENT_DURATION="${3:-4}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  NetSail DASH Content Generator${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check for FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}Error: FFmpeg is not installed.${NC}"
    echo ""
    echo "Install with:"
    echo "  macOS:  brew install ffmpeg"
    echo "  Ubuntu: sudo apt install ffmpeg"
    echo "  Docker: Use the server container which has FFmpeg"
    exit 1
fi

# Check input file
if [ ! -f "$INPUT_VIDEO" ]; then
    echo -e "${RED}Error: Input video not found: $INPUT_VIDEO${NC}"
    echo ""
    echo "Download a sample video:"
    echo "  curl -O https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}Input:${NC}    $INPUT_VIDEO"
echo -e "${YELLOW}Output:${NC}   $OUTPUT_DIR"
echo -e "${YELLOW}Segment:${NC}  ${SEGMENT_DURATION}s"
echo ""

# Get video info
echo -e "${YELLOW}Video Info:${NC}"
ffprobe -v quiet -show_format -show_streams "$INPUT_VIDEO" 2>/dev/null | grep -E "^(duration|width|height|bit_rate|codec_name)=" | head -10
echo ""

# Generate DASH content with multiple bitrates for ABR (video only)
echo -e "${YELLOW}Generating DASH segments with 10 quality levels...${NC}"
echo ""

# 10 quality levels for adaptive streaming:
#   - 144p @ 100kbps   (ultra-low)
#   - 180p @ 200kbps   (very low)
#   - 240p @ 400kbps   (low)
#   - 270p @ 600kbps   (low-medium)
#   - 360p @ 800kbps   (medium)
#   - 360p @ 1200kbps  (medium-high)
#   - 480p @ 1500kbps  (high)
#   - 480p @ 2000kbps  (high+)
#   - 720p @ 3000kbps  (HD)
#   - 720p @ 4500kbps  (HD+)

ffmpeg -y -i "$INPUT_VIDEO" \
    -filter_complex "[0:v]split=10[v1][v2][v3][v4][v5][v6][v7][v8][v9][v10]; \
        [v1]scale=256:144[v1out]; \
        [v2]scale=320:180[v2out]; \
        [v3]scale=426:240[v3out]; \
        [v4]scale=480:270[v4out]; \
        [v5]scale=640:360[v5out]; \
        [v6]scale=640:360[v6out]; \
        [v7]scale=854:480[v7out]; \
        [v8]scale=854:480[v8out]; \
        [v9]scale=1280:720[v9out]; \
        [v10]scale=1280:720[v10out]" \
    -map "[v1out]" -c:v:0 libx264 -b:v:0 100k -preset fast -g 48 -keyint_min 48 \
    -map "[v2out]" -c:v:1 libx264 -b:v:1 200k -preset fast -g 48 -keyint_min 48 \
    -map "[v3out]" -c:v:2 libx264 -b:v:2 400k -preset fast -g 48 -keyint_min 48 \
    -map "[v4out]" -c:v:3 libx264 -b:v:3 600k -preset fast -g 48 -keyint_min 48 \
    -map "[v5out]" -c:v:4 libx264 -b:v:4 800k -preset fast -g 48 -keyint_min 48 \
    -map "[v6out]" -c:v:5 libx264 -b:v:5 1200k -preset fast -g 48 -keyint_min 48 \
    -map "[v7out]" -c:v:6 libx264 -b:v:6 1500k -preset fast -g 48 -keyint_min 48 \
    -map "[v8out]" -c:v:7 libx264 -b:v:7 2000k -preset fast -g 48 -keyint_min 48 \
    -map "[v9out]" -c:v:8 libx264 -b:v:8 3000k -preset fast -g 48 -keyint_min 48 \
    -map "[v10out]" -c:v:9 libx264 -b:v:9 4500k -preset fast -g 48 -keyint_min 48 \
    -an \
    -f dash \
    -seg_duration "$SEGMENT_DURATION" \
    -use_timeline 1 \
    -use_template 1 \
    -init_seg_name 'init-stream$RepresentationID$.m4s' \
    -media_seg_name 'chunk-stream$RepresentationID$-$Number%05d$.m4s' \
    "$OUTPUT_DIR/manifest.mpd"

echo ""
echo -e "${GREEN}✓ DASH content generated successfully!${NC}"
echo ""
echo "Files created in $OUTPUT_DIR:"
ls -lh "$OUTPUT_DIR" | head -20
echo ""
echo -e "${GREEN}To serve this content:${NC}"
echo "  docker-compose up -d"
echo "  Open http://localhost:8080"

