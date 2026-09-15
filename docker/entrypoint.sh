#!/usr/bin/env bash
set -euo pipefail

node server.js &
node_pid=$!

nginx -g "daemon off;" &
nginx_pid=$!

shutdown() {
    nginx -s quit >/dev/null 2>&1 || true
    kill -TERM "$node_pid" >/dev/null 2>&1 || true
}

trap shutdown INT TERM EXIT

set +e
wait -n "$node_pid" "$nginx_pid"
exit_code=$?
set -e

shutdown
wait "$node_pid" "$nginx_pid" 2>/dev/null || true
exit "$exit_code"
