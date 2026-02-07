#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3000}"

if [[ ! -d node_modules ]]; then
  echo "node_modules not found. Installing dependencies..."
  npm install
fi

echo "Starting PVFARM prototype on http://${HOST}:${PORT}"
exec npm run dev -- --host "${HOST}" --port "${PORT}"
