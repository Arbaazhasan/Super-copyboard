#!/usr/bin/env bash
# Copyboard Desktop Launcher
set -euo pipefail

# Dynamic directory resolution (supports source tree or system-wide install)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "/usr/share/copyboard" ]; then
    APP_DIR="/usr/share/copyboard"
elif [ -f "$SCRIPT_DIR/clipboard-daemon.py" ]; then
    APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [ -n "${COPYBOARD_DIR:-}" ]; then
    APP_DIR="$COPYBOARD_DIR"
else
    APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

# 1. If native compiled Tauri binary exists, run it
if [ -f "$APP_DIR/src-tauri/target/release/copyboard" ]; then
    exec "$APP_DIR/src-tauri/target/release/copyboard" "$@"
fi

# 2. If native daemon is already running, toggle the floating window instantly (<5ms)
if curl -s --max-time 0.4 http://127.0.0.1:1421/api/status > /dev/null 2>&1; then
    curl -s http://127.0.0.1:1421/api/toggle > /dev/null 2>&1 &
    exit 0
fi

# 3. Otherwise, ensure frontend build exists and start daemon with --show
if [ ! -d "$APP_DIR/dist" ]; then
    (cd "$APP_DIR" && npm run build > /dev/null 2>&1)
fi

export WEBKIT_DISABLE_DMABUF_RENDERER=1
nohup python3 "$APP_DIR/scripts/clipboard-daemon.py" --show > /tmp/copyboard-daemon.log 2>&1 &
