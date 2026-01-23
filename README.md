# Benchmarking

A containerized DASH video streaming testbed with network emulation for researching adaptive bitrate streaming under various network conditions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Docker Network                                 │
│                                192.168.100.0/24                             │
│                                                                             │
│  ┌─────────────────────────────┐      ┌────────────────────────────────┐    │
│  │      Traffic Shaper         │      │       DASH Server              │    │
│  │    (192.168.100.10)         │      │     (192.168.100.20)           │    │
│  │                             │      │                                │    │
│  │  ┌─────────┐  ┌──────────┐  │      │  ┌─────────────────────────┐   │    │
│  │  │  nginx  │──│tc/netem  │  │─────▶│  │  Python HTTP Server     │   │    │
│  │  │ (proxy) │  │(shaping) │  │      │  │  - DASH MIME types      │   │    │
│  │  └─────────┘  └──────────┘  │      │  │  - CORS headers         │   │    │
│  │       │                     │      │  │  - Health check         │   │    │
│  │       │ Applies:            │      │  └─────────────────────────┘   │    │
│  │       │ - Latency           │      │              │                 │    │
│  │       │ - Packet loss       │      │              ▼                 │    │
│  │       │ - Bandwidth limits  │      │  ┌─────────────────────────┐   │    │
│  │       │                     │      │  │    Video Content        │   │    │
│  └───────┼─────────────────────┘      │  │  - manifest.mpd         │   │    │
│          │                            │  │  - *.m4s segments       │   │    │
│          │                            │  └─────────────────────────┘   │    │
└──────────┼────────────────────────────┴────────────────────────────────┘    │
           │                                            │                     │
           ▼                                            ▼                     │
    Port 9080 (shaped)                           Port 8080 (direct)           │
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- **Linux host** (required for tc/netem - won't work on Docker Desktop for macOS/Windows)
- FFmpeg (for generating DASH content)

### 1. Generate DASH Content (if needed)

If you don't have DASH content yet:

```bash
# Download sample video
curl -O https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4

# Generate DASH segments
mkdir -p Benchmarking/output
ffmpeg -i BigBuckBunny_320x180.mp4 \
  -c:v libx264 -preset fast \
  -f dash -seg_duration 4 \
  Benchmarking/output/manifest.mpd
```

### 2. Start the Services

```bash
# Build and start all containers
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access the Player

| URL | Description |
|-----|-------------|
| http://localhost:8080 | **Direct access** - No traffic shaping |
| http://localhost:9080 | **Shaped access** - Traffic goes through tc/netem |

Open your browser to either URL to view the DASH player with real-time metrics.

## Services

### DASH Server (`netsail/server`)

A Python HTTP server optimized for DASH streaming:

- Proper MIME types for `.mpd` and `.m4s` files
- CORS headers for cross-origin requests
- Health check endpoint at `/health`
- Built-in video player at `/`

**Environment Variables:**
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `CONTENT_DIR` | `/app/content` | Path to DASH content |

### Traffic Shaper (`netsail/shaper`)

Linux tc/netem-based network emulator:

- Trace-driven latency from CSV files
- HTB for bandwidth limiting
- netem for delay/loss/jitter
- Nginx reverse proxy

**Environment Variables:**
| Variable | Default | Description |
|----------|---------|-------------|
| `ETHERNET` | `eth0` | Network interface |
| `INTERVAL` | `0.01` | TC update interval (seconds) |
| `DEFAULT_RATE` | `100mbit` | Bandwidth rate |
| `DEFAULT_CEIL` | `50mbit` | Bandwidth ceiling |
| `DEFAULT_DELAY` | `40ms` | Network delay |
| `DEFAULT_LOSS` | `0.1%` | Packet loss percentage |

## Network Trace Files

The shaper reads network conditions from CSV trace files:

```csv
since,relative_seconds,rtt
0.0,0.0,40.0
0.1,0.1,45.2
0.2,0.1,38.5
...
```

### Available Traces

| File | Description |
|------|-------------|
| `shaper/trace/sample-trace.csv` | Simple 3-second sample |
| `shaper/trace/starlink-isl-trace.csv` | Real Starlink ISL measurements (353K samples) |

### Using a Different Trace

Edit `docker-compose.yaml`:

```yaml
shaper:
  volumes:
    - ./shaper/trace/starlink-isl-trace.csv:/trace/trace.csv:ro
```

### Creating Custom Traces

Create a CSV with columns:
- `since`: Absolute timestamp (seconds)
- `relative_seconds`: Time since previous sample
- `rtt`: Round-trip time in milliseconds

## Common Operations

### Rebuild Containers

```bash
docker-compose build --no-cache
docker-compose up -d
```

### View Shaper Logs

```bash
docker logs -f netsail-shaper
```

### Check Health

```bash
# Server health
curl http://localhost:8080/health

# Shaper health
curl http://localhost:9080/shaper/health
```

### Stop Everything

```bash
docker-compose down
```

### Run Server Only (No Shaping)

```bash
docker-compose up -d server
```

## Development

### Local Server (Without Docker)

```bash
cd Benchmarking/output
python3 ../server/server.py
```

### Modifying the Player

Edit `server/index.html` - changes require container rebuild:

```bash
docker-compose build server
docker-compose up -d server
```

### Custom Network Conditions

For static conditions, edit environment variables in `docker-compose.yaml`:

```yaml
shaper:
  environment:
    DEFAULT_DELAY: "200ms"  # High latency
    DEFAULT_LOSS: "5%"      # 5% packet loss
    DEFAULT_RATE: "10mbit"  # Limited bandwidth
```

## Project Structure

```
NetSail/
├── docker-compose.yaml       # Main orchestration file
├── README.md                 # This file
├── BigBuckBunny_320x180.mp4  # Sample video source
│
├── content/                  # DASH video content (generated)
│   ├── manifest.mpd          # DASH manifest
│   ├── init-*.m4s            # Init segments
│   └── chunk-*.m4s           # Video/audio segments
│
├── server/                   # DASH streaming server
│   ├── Dockerfile
│   ├── server.py             # Python HTTP server
│   └── index.html            # Video player UI
│
├── shaper/                   # Traffic shaper (tc/netem)
│   ├── Dockerfile
│   ├── entrypoint.sh         # Container entry point
│   ├── supervisord.conf      # Process manager config
│   ├── nginx.conf            # Default nginx config
│   ├── nginx-proxy.conf      # Proxy config for server
│   ├── tc.py                 # TC utility functions
│   ├── tc-trace.py           # Trace-driven TC control
│   ├── README.md             # Shaper documentation
│   └── trace/                # Network trace files
│       ├── sample-trace.csv
│       └── starlink-isl-trace.csv
│
└── Benchmarking/             # Content generation tools
    ├── README.md
    └── scripts/
        ├── generate-dash.sh  # Generate DASH from video
        └── download-sample.sh # Download test videos
```

