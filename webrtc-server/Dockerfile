FROM node:20-slim

# Install build dependencies for mediasoup (requires native compilation)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    make \
    g++ \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install --production

# Copy server code
COPY server.js .

# Default ports
ENV PORT=3000
ENV HOST=0.0.0.0
ENV CONTENT_DIR=/app/content
ENV ANNOUNCED_IP=127.0.0.1

# Expose HTTP signaling port and RTP ports
EXPOSE 3000
EXPOSE 10000-10100/udp
EXPOSE 10000-10100/tcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
