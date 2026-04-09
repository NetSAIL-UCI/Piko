FROM python:3.11-slim

# Install FFmpeg for video processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server code
COPY server.py .
COPY index.html .
COPY hls.html .
COPY hls.min.js .
COPY dash.all.min.js .

# Create directories for video content
RUN mkdir -p /app/content

# Default port
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["python3", "server.py"]

