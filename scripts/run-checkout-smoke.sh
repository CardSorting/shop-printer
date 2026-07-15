#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${CHECKOUT_SMOKE_PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
STARTED_DEV=0
DEV_PID=""

cleanup() {
  if [[ "$STARTED_DEV" == "1" && -n "$DEV_PID" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

server_ready() {
  local status="000"
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL" 2>/dev/null) || status="000"
  [[ "$status" =~ ^[0-9]{3}$ && "$status" != "000" ]]
}

port_in_use() {
  lsof -ti:"$PORT" >/dev/null 2>&1
}

clear_stale_port() {
  if port_in_use && ! server_ready; then
    echo "⚠️  Port ${PORT} is occupied but not responding — clearing stale process..."
    "$ROOT_DIR/scripts/cleanup-ports.sh"
    sleep 1
  fi
}

clear_stale_port

if port_in_use; then
  echo "🧹 Clearing port ${PORT} for an isolated smoke dev server..."
  "$ROOT_DIR/scripts/cleanup-ports.sh"
  sleep 1
fi

echo "🌿 Starting isolated storefront smoke server on ${BASE_URL}..."
DEV_LOG="${TMPDIR:-/tmp}/storefront-smoke-dev.log"
NEXT_PUBLIC_E2E_MOCK_CHECKOUT=1 \
NEXT_TELEMETRY_DISABLED=1 \
npx next dev --turbo -p "$PORT" >"$DEV_LOG" 2>&1 &
DEV_PID=$!
STARTED_DEV=1
echo "   Dev logs: $DEV_LOG"

for _ in $(seq 1 60); do
  if server_ready; then
    echo "✅ Dev server ready."
    break
  fi
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "❌ Dev server exited before becoming ready."
    tail -40 "$DEV_LOG" || true
    exit 1
  fi
  sleep 2
done

if ! server_ready; then
  echo "❌ Dev server did not become ready within 120s."
  tail -40 "$DEV_LOG" || true
  exit 1
fi

npx playwright test --config=playwright.checkout-smoke.config.ts "$@"
