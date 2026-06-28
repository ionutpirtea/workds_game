#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAVE_DIR="$ROOT_DIR/save"
LOG_FILE="$SAVE_DIR/app.log"
PID_FILE="$SAVE_DIR/app.pid"
APP_CMD="${APP_CMD:-npm run dev}"

mkdir -p "$SAVE_DIR"

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "node_modules missing, installing dependencies..."
  npm install --include=dev
fi

if [[ "$APP_CMD" == "npm run dev" && ! -x "$ROOT_DIR/node_modules/.bin/vite" ]]; then
  echo "Vite not found in node_modules/.bin, installing dev dependencies..."
  npm install --include=dev
fi

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Application already running with PID $EXISTING_PID"
    echo "Log file: $LOG_FILE"
    exit 1
  fi
  rm -f "$PID_FILE"
fi

cd "$ROOT_DIR"

nohup bash -lc "$APP_CMD" >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

sleep 1
if ! kill -0 "$NEW_PID" 2>/dev/null; then
  echo "Application failed to start. Check logs: $LOG_FILE"
  rm -f "$PID_FILE"
  exit 1
fi

echo "Application started in background with PID $NEW_PID"
echo "Log file: $LOG_FILE"