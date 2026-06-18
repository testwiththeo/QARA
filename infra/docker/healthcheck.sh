#!/bin/bash
# Docker healthcheck script for QARA services
# Usage: healthcheck.sh <service-name> <endpoint>

set -euo pipefail

SERVICE=$1
ENDPOINT=${2:-/health}
TIMEOUT=${3:-5}
MAX_RETRIES=${4:-3}
RETRY_DELAY=${5:-2}

log() {
    echo "[healthcheck:$SERVICE] $*"
}

check() {
    local url="http://localhost${ENDPOINT}"
    
    case "$SERVICE" in
        api)
            curl -sf -o /dev/null --max-time "$TIMEOUT" "$url"
            ;;
        postgres)
            pg_isready -q -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-qara}"
            ;;
        redis)
            redis-cli -e ping > /dev/null 2>&1
            ;;
        minio)
            curl -sf -o /dev/null --max-time "$TIMEOUT" "http://localhost:9000/minio/health/live"
            ;;
        qdrant)
            curl -sf -o /dev/null --max-time "$TIMEOUT" "http://localhost:6333/health"
            ;;
        *)
            curl -sf -o /dev/null --max-time "$TIMEOUT" "$url"
            ;;
    esac
}

for ((i=1; i<=MAX_RETRIES; i++)); do
    if check; then
        log "healthy"
        exit 0
    fi
    log "attempt $i/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
done

log "unhealthy after $MAX_RETRIES attempts"
exit 1
