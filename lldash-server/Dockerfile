FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server.py .
COPY index.html .
COPY dash.all.min.js .

RUN mkdir -p /app/content

ENV PORT=8081

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:8081/health || exit 1

CMD ["python3", "server.py"]