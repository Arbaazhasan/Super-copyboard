#!/usr/bin/env bash
# Copyboard GNOME Shortcut Installer
# Binds 'Super+V' (Windows + V) to activate Copyboard instantly, matching Windows 11 Win+V.

set -euo pipefail

echo "==> Configuring GNOME Shortcut for Copyboard (Super + V)..."

# 1. Free <Super>v if bound to GNOME notification/message tray
CURRENT_TRAY=$(gsettings get org.gnome.shell.keybindings toggle-message-tray 2>/dev/null || echo "[]")
if [[ "$CURRENT_TRAY" == *"Super>v"* ]]; then
    echo "Reassigning GNOME Message Tray shortcut to Super+M..."
    gsettings set org.gnome.shell.keybindings toggle-message-tray "['<Super>m']"
fi

# 2. Install desktop launcher into ~/.local/bin/copyboard
mkdir -p "$HOME/.local/bin"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat << EOF > "$HOME/.local/bin/copyboard"
#!/usr/bin/env bash
set -euo pipefail

if [ -d "/usr/share/copyboard" ]; then
    APP_DIR="/usr/share/copyboard"
elif [ -n "\${COPYBOARD_DIR:-}" ]; then
    APP_DIR="\$COPYBOARD_DIR"
elif [ -d "$APP_DIR" ]; then
    APP_DIR="$APP_DIR"
else
    APP_DIR="\$HOME/.local/share/copyboard"
fi

# 1. If native compiled Tauri binary exists, run it
if [ -f "\$APP_DIR/src-tauri/target/release/copyboard" ]; then
    exec "\$APP_DIR/src-tauri/target/release/copyboard" "\$@"
fi

# 2. If daemon is running, toggle window visibility instantly (<5ms)
if curl -s --max-time 0.4 http://127.0.0.1:1421/api/status > /dev/null 2>&1; then
    curl -s http://127.0.0.1:1421/api/toggle > /dev/null 2>&1 &
    exit 0
fi

# 3. Otherwise, ensure frontend build exists and start daemon with --show
if [ ! -d "\$APP_DIR/dist" ]; then
    (cd "\$APP_DIR" && npm run build > /dev/null 2>&1)
fi

export WEBKIT_DISABLE_DMABUF_RENDERER=1
nohup python3 "\$APP_DIR/scripts/clipboard-daemon.py" --show > /tmp/copyboard-daemon.log 2>&1 &
EOF


chmod +x "$HOME/.local/bin/copyboard"
echo "Installed launcher to $HOME/.local/bin/copyboard"

# 3. Register custom keybinding in GNOME settings
SCHEMA="org.gnome.settings-daemon.plugins.media-keys"
KEY_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyboard/"

CURRENT_BINDINGS=$(gsettings get "$SCHEMA" custom-keybindings)

if [[ "$CURRENT_BINDINGS" != *"$KEY_PATH"* ]]; then
    if [[ "$CURRENT_BINDINGS" == "@as []" || "$CURRENT_BINDINGS" == "[]" ]]; then
        NEW_BINDINGS="['$KEY_PATH']"
    else
        NEW_BINDINGS="${CURRENT_BINDINGS%]}, '$KEY_PATH']"
    fi
    gsettings set "$SCHEMA" custom-keybindings "$NEW_BINDINGS"
fi

gsettings set "${SCHEMA}.custom-keybinding:${KEY_PATH}" name "Copyboard Clipboard History"
gsettings set "${SCHEMA}.custom-keybinding:${KEY_PATH}" command "$HOME/.local/bin/copyboard"
gsettings set "${SCHEMA}.custom-keybinding:${KEY_PATH}" binding "<Super>v"

echo "✅ Super + V shortcut successfully configured for Copyboard!"
echo "Press Super + V (Windows + V) now to open Copyboard anywhere in Ubuntu."
