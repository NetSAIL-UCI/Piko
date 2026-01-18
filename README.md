# DASH Streaming Testbed

Basic DASH streaming pipeline for comparing video streaming protocols.

## Setup

1. Install FFmpeg:
```
brew install ffmpeg
```

2. Download test video:
```
curl -O https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4
```

3. Generate DASH segments:
```
mkdir -p output
ffmpeg -i BigBuckBunny_320x180.mp4 -c:v libx264 -preset fast -f dash -seg_duration 4 output/manifest.mpd
```

4. Start the server:
```
cd output
python3 server.py
```

5. Open http://localhost:8080/index.html to view the stream with metrics.

## Files

- `server.py` - HTTP server with DASH MIME types and CORS headers
- `index.html` - Video player with dash.js and metrics display

## Metrics

The player displays:
- Buffer length (seconds of video buffered ahead)
- Current playback time
- Total duration

## Next Steps

- Add traffic shaping to simulate network conditions
- Set up LL-DASH (low-latency mode)
- Add MoQ pipeline for comparison