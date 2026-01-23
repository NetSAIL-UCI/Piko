#!/usr/bin/env bash

# Start supervisord in the background
/usr/bin/supervisord --configuration /etc/supervisor/supervisord.conf &

SUPERVISOR_PID=$!

function shutdown {
    echo "Trapped SIGTERM/SIGINT - shutting down supervisord..."
    kill -s SIGTERM ${SUPERVISOR_PID}
    wait ${SUPERVISOR_PID}
    echo "Shutdown complete"
}

trap shutdown SIGTERM SIGINT
wait ${SUPERVISOR_PID}

