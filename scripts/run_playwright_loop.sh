#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-http://127.0.0.1:5173}"
DEV_CMD="${DEV_CMD:-npm run dev}"
PW_CMD="${PW_CMD:-npx playwright test}"
READY_TIMEOUT="${READY_TIMEOUT:-60}"

SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[loop] starting dev server: ${DEV_CMD}"
bash -lc "${DEV_CMD}" >/tmp/phaser-dev.log 2>&1 &
SERVER_PID="$!"

echo "[loop] waiting for ${APP_URL} (timeout: ${READY_TIMEOUT}s)"
for _ in $(seq 1 "${READY_TIMEOUT}"); do
  if curl -fsS "${APP_URL}" >/dev/null 2>&1; then
    echo "[loop] app is ready"
    break
  fi
  sleep 1
done

if ! curl -fsS "${APP_URL}" >/dev/null 2>&1; then
  echo "[loop] app did not become ready; check /tmp/phaser-dev.log"
  exit 1
fi

echo "[loop] running playwright: ${PW_CMD}"
bash -lc "${PW_CMD}"
echo "[loop] completed"
