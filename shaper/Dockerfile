FROM nginx:1.25.1

# No interactive frontend during docker build
ENV DEBIAN_FRONTEND=noninteractive \
    DEBCONF_NONINTERACTIVE_SEEN=true

# Install tc/netem dependencies
RUN apt-get update && apt-get install -y \
    vim \
    net-tools \
    iputils-ping \
    iproute2 \
    python3 \
    supervisor \
    iperf3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /etc/nginx

# Generate self-signed SSL certificate
RUN openssl req -nodes -x509 -newkey rsa:2048 -days 365 \
    -subj "/C=US/ST=CA/L=SanFrancisco/O=NetSail/CN=localhost" \
    -keyout server-key.pem -out server-cert.pem

# Copy configuration files
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY supervisord.conf /etc/supervisor/supervisord.conf
COPY tc.py /tc.py
COPY tc-trace.py /tc-trace.py
COPY entrypoint.sh /opt/bin/

# Setup directories and permissions
RUN mkdir -p /var/run/supervisor /var/log/supervisor /trace \
    && chmod +x /opt/bin/entrypoint.sh

# Unbuffered Python output for logging
ENV PYTHONUNBUFFERED=1

# Configurable environment variables
ENV ETHERNET=eth0 \
    INTERVAL=0.01 \
    DEFAULT_RATE=100mbit \
    DEFAULT_DELAY=40ms \
    DEFAULT_LOSS=0.1%

ENTRYPOINT ["/opt/bin/entrypoint.sh"]
CMD ["/opt/bin/entrypoint.sh"]

