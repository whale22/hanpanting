#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${BETTER_AUTH_SECRET:-}" ]]; then
  echo "BETTER_AUTH_SECRET 환경 변수가 필요합니다." >&2
  exit 1
fi

if (( ${#BETTER_AUTH_SECRET} < 32 )); then
  echo "BETTER_AUTH_SECRET은 32자 이상이어야 합니다." >&2
  exit 1
fi

export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://localhost:3000}"
export BETTER_AUTH_TRUSTED_ORIGINS="${BETTER_AUTH_TRUSTED_ORIGINS:-http://localhost:3000,http://16.184.8.18,http://16.184.8.18:3000}"
export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/hanpanting_dev}"

mkdir -p /run/nginx /var/lib/mongodb /var/log/mongodb
chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb

exec /usr/bin/supervisord --configuration /etc/supervisor/conf.d/hanpanting.conf
