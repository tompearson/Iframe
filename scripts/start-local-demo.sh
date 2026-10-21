#!/usr/bin/env bash
# Start RAG API (documentation-helper) + embed dev server (this repo) for local /demo.
#
# Default: reuse servers if they already respond correctly (do not kill).
#
# Usage:
#   ./scripts/start-local-demo.sh              # reuse or start
#   ./scripts/start-local-demo.sh --open       # also open demo in browser
#   ./scripts/start-local-demo.sh --kill       # free ports 8000/8780 then start fresh
#   RAG_PORT=8001 EMBED_DEV_PORT=8781 ./scripts/start-local-demo.sh
#
# Stop: Ctrl+C (stops only processes this script started; use --kill to replace old listeners)

set -euo pipefail

log() { printf '%s\n' "$*"; }

OPEN_BROWSER=0
KILL_PORTS=0
for arg in "$@"; do
  case "${arg}" in
    --open) OPEN_BROWSER=1 ;;
    --kill) KILL_PORTS=1 ;;
    -h | --help)
      sed -n '2,14p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      log "Unknown option: ${arg} (try --help)"
      exit 1
      ;;
  esac
done

export PATH="${HOME}/.local/bin:${PATH}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IFRAME_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOC_HELPER="$(cd "${IFRAME_ROOT}/../documentation-helper" && pwd)"

RAG_HOST="${RAG_HOST:-127.0.0.1}"
RAG_PORT="${RAG_PORT:-8000}"
EMBED_HOST="${EMBED_DEV_HOST:-127.0.0.1}"
EMBED_PORT="${EMBED_DEV_PORT:-8780}"
RAG_URL="http://${RAG_HOST}:${RAG_PORT}"
DEMO_URL="http://${EMBED_HOST}:${EMBED_PORT}/demo/"

RAG_PID=""
EMBED_PID=""
STARTED_RAG=0
STARTED_EMBED=0

cleanup() {
  log ""
  log "Shutting down..."
  if [[ -n "${EMBED_PID}" ]] && kill -0 "${EMBED_PID}" 2>/dev/null; then
    kill "${EMBED_PID}" 2>/dev/null || true
    wait "${EMBED_PID}" 2>/dev/null || true
  fi
  if [[ ${STARTED_RAG} -eq 1 ]] && [[ -n "${RAG_PID}" ]] && kill -0 "${RAG_PID}" 2>/dev/null; then
    kill "${RAG_PID}" 2>/dev/null || true
    wait "${RAG_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

port_in_use() {
  local port=$1
  ss -ltn 2>/dev/null | grep -q ":${port} " && return 0
  return 1
}

kill_port() {
  local port=$1
  if ! port_in_use "${port}"; then
    return 0
  fi
  if command -v fuser >/dev/null 2>&1; then
    log "Killing listener(s) on port ${port}..."
    fuser -k "${port}/tcp" >/dev/null 2>&1 || true
    sleep 1
  else
    log "ERROR: port ${port} is in use and fuser is not available. Stop the process manually or use another port."
    exit 1
  fi
}

rag_healthy() {
  curl -sf "${RAG_URL}/health" 2>/dev/null | grep -q documentation-helper-gemini
}

embed_up() {
  curl -sf "http://${EMBED_HOST}:${EMBED_PORT}/embed/" >/dev/null 2>&1
}

embed_timeout_status() {
  local inject_ms
  inject_ms="$(curl -sf "http://${EMBED_HOST}:${EMBED_PORT}/embed/" 2>/dev/null \
    | sed -n 's/.*EMBED_QUERY_TIMEOUT_MS=\([0-9][0-9]*\).*/\1/p' | head -1)"
  if [[ -n "${inject_ms}" ]]; then
    log "  Query timeout (browser): $((inject_ms / 1000))s (EMBED_QUERY_TIMEOUT_MS=${inject_ms} in /embed/)"
  else
    log "  Query timeout (browser): not injected — open /embed/ directly or restart dev_server"
  fi
  if [[ -f "${IFRAME_ROOT}/.env" ]] && grep -qE '^[[:space:]]*EMBED_QUERY_TIMEOUT_SECONDS=' "${IFRAME_ROOT}/.env" 2>/dev/null; then
    log "  (.env has EMBED_QUERY_TIMEOUT_SECONDS — restart embed with --kill if you just changed it)"
  fi
}

if [[ ! -d "${DOC_HELPER}" ]]; then
  log "ERROR: documentation-helper not found at ${DOC_HELPER}"
  exit 1
fi

if [[ ! -f "${IFRAME_ROOT}/.env" ]]; then
  log "WARNING: ${IFRAME_ROOT}/.env missing — copy .env.example and set RAG_SERVICE_SECRET"
  log "  cp .env.example .env"
fi

if ! command -v pipenv >/dev/null 2>&1; then
  log "ERROR: pipenv not on PATH. Try: export PATH=\"\$HOME/.local/bin:\$PATH\""
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  log "ERROR: python3 not found"
  exit 1
fi

if [[ ${KILL_PORTS} -eq 1 ]]; then
  kill_port "${RAG_PORT}"
  kill_port "${EMBED_PORT}"
fi

# --- RAG API ---
if rag_healthy; then
  log "Reusing RAG API at ${RAG_URL}/health"
elif port_in_use "${RAG_PORT}"; then
  log "ERROR: Port ${RAG_PORT} is in use but ${RAG_URL}/health is not our RAG API."
  log "  Fix: stop that process, or run with --kill, or use another port:"
  log "  RAG_PORT=8001 ./scripts/start-local-demo.sh"
  log "  (and set RAG_API_URL=http://127.0.0.1:8001 in Iframe/.env if not using defaults)"
  exit 1
else
  log "Starting RAG API in ${DOC_HELPER} on ${RAG_URL} ..."
  (
    cd "${DOC_HELPER}"
    exec pipenv run uvicorn rag_api:app --host "${RAG_HOST}" --port "${RAG_PORT}"
  ) &
  RAG_PID=$!
  STARTED_RAG=1

  log "Waiting for ${RAG_URL}/health ..."
  for _ in $(seq 1 90); do
    if rag_healthy; then
      log "RAG API is up."
      break
    fi
    if ! kill -0 "${RAG_PID}" 2>/dev/null; then
      log "ERROR: RAG process exited before /health succeeded. Check pipenv/uvicorn in documentation-helper."
      exit 1
    fi
    sleep 1
  done
  if ! rag_healthy; then
    log "ERROR: Timed out waiting for RAG /health at ${RAG_URL}"
    exit 1
  fi
fi

# --- Embed dev server ---
if embed_up; then
  log "Reusing embed dev server on http://${EMBED_HOST}:${EMBED_PORT}/"
  log ""
  log "Ready:"
  log "  Demo: ${DEMO_URL}"
  log "  RAG:  ${RAG_URL}/docs"
  embed_timeout_status
  if [[ ${STARTED_RAG} -eq 0 ]] && [[ ${STARTED_EMBED} -eq 0 ]]; then
    log ""
    log "Both servers were already running. Ctrl+C exits this script only (does not stop them)."
    log "To restart clean: ./scripts/start-local-demo.sh --kill"
    if [[ ${OPEN_BROWSER} -eq 1 ]] && command -v xdg-open >/dev/null 2>&1; then
      xdg-open "${DEMO_URL}" >/dev/null 2>&1 || true
    fi
    sleep infinity
  fi
elif port_in_use "${EMBED_PORT}"; then
  log "ERROR: Port ${EMBED_PORT} is in use but /embed/ is not our dev server."
  log "  Fix: --kill, or EMBED_DEV_PORT=8781 ./scripts/start-local-demo.sh"
  exit 1
else
  log "Starting embed dev server on http://${EMBED_HOST}:${EMBED_PORT}/ ..."
  (
    cd "${IFRAME_ROOT}"
    export EMBED_DEV_HOST="${EMBED_HOST}"
    export EMBED_DEV_PORT="${EMBED_PORT}"
    export RAG_API_URL="${RAG_URL}"
    exec python3 dev_server.py
  ) &
  EMBED_PID=$!
  STARTED_EMBED=1

  for _ in $(seq 1 30); do
    if embed_up; then
      break
    fi
    if ! kill -0 "${EMBED_PID}" 2>/dev/null; then
      log "ERROR: embed dev_server exited early (port ${EMBED_PORT} conflict?)"
      exit 1
    fi
    sleep 0.5
  done
  if ! embed_up; then
    log "ERROR: Timed out waiting for embed server on port ${EMBED_PORT}"
    exit 1
  fi
fi

log ""
log "Ready:"
log "  Demo (parent + iframe): ${DEMO_URL}"
log "  Widget only:            http://${EMBED_HOST}:${EMBED_PORT}/embed/"
log "  RAG API:                ${RAG_URL}/docs"
embed_timeout_status
log ""
if [[ ${STARTED_RAG} -eq 1 ]] || [[ ${STARTED_EMBED} -eq 1 ]]; then
  log "Press Ctrl+C to stop service(s) started by this script."
else
  log "Press Ctrl+C to exit."
fi

if [[ ${OPEN_BROWSER} -eq 1 ]] && command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${DEMO_URL}" >/dev/null 2>&1 || true
fi

if [[ ${STARTED_EMBED} -eq 1 ]]; then
  wait "${EMBED_PID}"
elif [[ ${STARTED_RAG} -eq 1 ]]; then
  wait "${RAG_PID}"
else
  sleep infinity
fi
