# Wayland & Ubuntu GNOME Integration Guide

This guide describes how **Copyboard** achieves smooth, responsive clipboard capture and paste simulation on modern Ubuntu Wayland sessions (Ubuntu 22.04, 24.04, and 26.04 LTS).

---

## The Wayland Challenge

Unlike legacy X11, Wayland enforces strict security isolation between graphical client windows:
1. **No background key logging**: Applications cannot bind arbitrary global hotkeys without desktop compositor cooperation.
2. **Restricted clipboard snooping**: Wayland clients can only read the selection buffer when their window currently holds keyboard focus, or via an authorized clipboard daemon protocol.
3. **No direct synthetic keystroke injection**: Applications cannot send simulated `Ctrl + V` keypresses directly to other windows without input synthesis tooling or compositor privileges.

---

## How Copyboard Solves It

### 1. Global Shortcut: Super + V
Copyboard provides two complementary methods for activating via `Super + V`:

#### A. GNOME Shell Custom Keybinding (Built-in Script)
Copyboard ships with `scripts/setup-gnome-shortcut.sh`, which configures GNOME's native `media-keys` subsystem:
```bash
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings \
  "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyboard/']"

gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyboard/ \
  name "Copyboard History"
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyboard/ \
  command "copyboard --toggle"
gsettings set org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyboard/ \
  binding "<Super>v"
```

#### B. XDG Desktop Portal: GlobalShortcuts
For modern Wayland compositors (GNOME 45+ in Ubuntu 24.04+), Copyboard connects to `org.freedesktop.portal.GlobalShortcuts` via D-Bus, requesting a registered shortcut.

---

### 2. Clipboard Monitoring
Under Wayland, clipboard changes are captured via:
- **`arboard`**: Cross-platform Rust crate with Wayland protocol support.
- **Fallback Daemon**: A background thread using `wl-paste --watch` from the standard `wl-clipboard` package.

---

### 3. Quick-Paste Simulation
When an item is chosen in Copyboard:
1. Copyboard writes the item text to the clipboard selection (`wl-copy`).
2. The Copyboard window hides (`window.hide()`).
3. GNOME immediately restores focus to the previously active window.
4. Paste is triggered:
   - **Method 1 (`wtype` - Recommended)**: Invokes `wtype -M ctrl -k v -m ctrl` to emit virtual Wayland key events.
   - **Method 2 (`ydotool`)**: Uses the `uinput` kernel device via daemon.
   - **Method 3 (Xwayland / `xdotool`)**: If the target application is running in Xwayland.
   - **Method 4 (Auto-copy fallback)**: If automated paste is disabled, Copyboard copies the text, flashes a toast notification, and user presses `Ctrl+V`.
