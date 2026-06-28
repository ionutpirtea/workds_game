#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAVE_DIR="$ROOT_DIR/save"
LOG_FILE="$SAVE_DIR/app.log"
PID_FILE="$SAVE_DIR/app.pid"

mkdir -p "$SAVE_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 20.19+ or 22.12+ before starting."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed. Install npm and try again."
  exit 1
fi

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
APP_CMD="${APP_CMD:-$NPM_BIN run dev}"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]')"

if (( NODE_MAJOR < 20 )) || (( NODE_MAJOR == 20 && NODE_MINOR < 19 )); then
  echo "Detected Node.js $(node -v). Vite requires Node.js 20.19+ or 22.12+."
  echo "Upgrade Node.js on the VM, then run npm run start:vm again."
  exit 1
fi

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "node_modules missing, installing dependencies..."
  "$NPM_BIN" install --include=dev
fi

if [[ "$APP_CMD" == "$NPM_BIN run dev" && ! -x "$ROOT_DIR/node_modules/.bin/vite" ]]; then
  echo "Vite not found in node_modules/.bin, installing dev dependencies..."
  "$NPM_BIN" install --include=dev
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

echo "Starting with Node: $NODE_BIN ($(node -v))"
echo "Starting with npm: $NPM_BIN"

# Keep current PATH and binaries so the background process does not fall back to an older Node.
nohup env PATH="$PATH" bash -c "$APP_CMD" >> "$LOG_FILE" 2>&1 &
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