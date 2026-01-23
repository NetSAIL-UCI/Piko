#!/bin/bash
#
# Download sample video files for testing
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  NetSail Sample Video Downloader${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

cd "$(dirname "$0")/../.."

echo -e "${YELLOW}Available sample videos:${NC}"
echo ""
echo "1) Big Buck Bunny 320x180 (5.5 MB) - Quick testing"
echo "2) Big Buck Bunny 640x360 (25 MB)  - Medium quality"
echo "3) Big Buck Bunny 1280x720 (65 MB) - HD quality"
echo ""

read -p "Select video (1-3) [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        URL="https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4"
        FILE="BigBuckBunny_320x180.mp4"
        ;;
    2)
        URL="https://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_480p_surround-fix.avi"
        FILE="BigBuckBunny_640x360.avi"
        ;;
    3)
        URL="https://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_720p_h264.mov"
        FILE="BigBuckBunny_1280x720.mov"
        ;;
    *)
        echo "Invalid selection"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}Downloading: $FILE${NC}"
echo "URL: $URL"
echo ""

if command -v curl &> /dev/null; then
    curl -L -o "$FILE" "$URL" --progress-bar
elif command -v wget &> /dev/null; then
    wget -O "$FILE" "$URL"
else
    echo "Error: Neither curl nor wget found"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Downloaded: $FILE${NC}"
echo ""
echo "Next steps:"
echo "  1. Generate DASH content:"
echo "     cd Benchmarking/scripts"
echo "     ./generate-dash.sh ../../$FILE"
echo ""
echo "  2. Start the server:"
echo "     docker-compose up -d"

