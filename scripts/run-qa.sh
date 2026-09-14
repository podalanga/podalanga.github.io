#!/usr/bin/env bash
# Builds, boots a preview server, runs the QA screenshot/console-error check
# against it, then always tears the server down.
set -euo pipefail

PORT=4322
BASE_URL="http://localhost:${PORT}"

npm run build

npx astro preview --port "$PORT" >/tmp/qa-preview.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -sf "$BASE_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

QA_BASE_URL="$BASE_URL" node scripts/qa.mjs
