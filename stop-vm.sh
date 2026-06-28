#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/save/app.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file found. Application may already be stopped."
  exit 0
fi

PID="$(cat "$PID_FILE")"

if ! kill -0 "$PID" 2>/dev/null; then
  echo "Process $PID is not running. Cleaning stale PID file."
  rm -f "$PID_FILE"
  exit 0
fi

kill "$PID"

for _ in {1..10}; do
  if ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "Application stopped (PID $PID)."
    exit 0
  fi
  sleep 1
done

kill -9 "$PID"
rm -f "$PID_FILE"
echo "Application force-stopped (PID $PID)."