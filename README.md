# Copyboard 📋

<div align="center">

![Copyboard Icon](public/icons/icon.svg)

### The Modern, Blazing Fast Clipboard History for Ubuntu Linux
**The seamless Windows 11 `Win + V` clipboard experience, natively reimagined for GNOME (Wayland & X11).**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Ubuntu](https://img.shields.io/badge/Platform-Ubuntu%2022.04%20%7C%2024.04%20%7C%2026.04-orange.svg)](https://ubuntu.com)
[![Desktop: GNOME](https://img.shields.io/badge/Desktop-GNOME%20(Wayland%20%26%20X11)-purple.svg)](docs/WAYLAND_GUIDE.md)
[![Built with: Tauri v2 + Rust](https://img.shields.io/badge/Backend-Tauri%20v2%20%2B%20Rust-red.svg)](src-tauri)
[![Frontend: React + TS + Tailwind](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Tailwind-blue.svg)](src)

[Features](#-features) • [Installation](#-installation) • [Keyboard Shortcuts](#-keyboard-shortcuts) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 💡 Why Copyboard?

On Windows 11, pressing `Win + V` instantly brings up a lightweight, responsive clipboard history with search, pinning, and instant pasting. On Ubuntu Linux, existing clipboard managers often look dated (GTK2/3 utility styles), suffer from sluggish search, lack Wayland compatibility, or clutter the desktop.

**Copyboard** bridges this gap:
- 🚀 **Blazing Fast**: Written in native Rust with embedded SQLite + FTS5 full-text indexing.
- 🎨 **Modern Ubuntu Aesthetics**: Sleek floating acrylic panel styled with Ubuntu Yaru dark & light palettes, rounded corners, and micro-animations.
- ⚡ **Instant Keyboard Workflow**: Press `Super + V`, tap `1`–`9` or `Enter` to paste into your focused application.
- 🛡️ **Privacy-First**: Automatic password manager detection, sensitive token filtering, and a 1-click Incognito Private Mode.
- 🐧 **Native Wayland Support**: Engineered from the ground up for Ubuntu GNOME Wayland sessions and X11.

---

## ✨ Features

- **Automatic Clipboard Recording**: Watches copied text in the background with SHA-256 deduplication and frequency tracking.
- **Instant Search**: Sub-millisecond fuzzy search and SQLite FTS5 queries across thousands of items.
- **Smart Content Detection**:
  - **Code**: Automatic detection with syntax snippet view.
  - **URLs / Links**: Detects domains and provides 1-click browser opening.
  - **Colors**: Detects `#HEX` and `rgb(...)` values with live interactive color swatches.
  - **Emails**: Identifies addresses with mailto action chips.
  - **Text**: Formatted text snippets with word and character counters.
- **Pinning & Favorites**: Pin your most critical snippets (SSH keys, commands, templates) to keep them permanently safe even after clearing history.
- **Privacy Shield & Incognito Mode**:
  - Automatically ignores clipboard events flagged with `x-kde-passwordManagerHint`.
  - Regex detection for API keys, bearer tokens, and credentials.
  - Private Mode toggle suspends all clipboard logging.
- **Configurable Retention**: Choose auto-delete timeframes (1 hour, 24 hours, 7 days, 30 days) and history size limits (100 to 5,000 items).
- **Global Shortcut**: Summon instantly with `Super + V` anywhere on your desktop.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Super + V` | Open or toggle Copyboard popup |
| `1` – `9` | Instantly paste item at index 1 through 9 |
| `↑` / `↓` | Navigate through clipboard items |
| `Enter` | Paste selected item into active application |
| `P` | Toggle Pin / Unpin on selected item |
| `F` | Toggle Favorite on selected item |
| `Delete` / `Backspace` | Delete selected item from history |
| `Ctrl + F` / `/` | Focus search bar |
| `Ctrl + Shift + P` | Toggle Private / Incognito Mode |
| `Ctrl + Shift + Delete` | Clear all unpinned items |
| `Esc` | Hide Copyboard popup |

---

## 📦 Installation

### Option 1: Debian Package (`.deb`)

Download the latest `.deb` from the [Releases](https://github.com/your-username/copyboard/releases) page and install:
```bash
sudo dpkg -i copyboard_1.0.0_amd64.deb
sudo apt install -f # Install any missing runtime libraries
```

### Option 2: Setup Global `Super + V` Shortcut in GNOME

Run the included automated shortcut script:
```bash
./scripts/setup-gnome-shortcut.sh
```

---

## 🏗️ Architecture

Copyboard is built with a dual-tier architecture:

```
[ GNOME Wayland / X11 ]  ──Super+V──►  [ Copyboard Core (Rust / Tauri v2) ]
                                            │
                                            ├─► [ SQLite FTS5 Store ]
                                            ├─► [ Clipboard Monitor Daemon ]
                                            ├─► [ Wayland Paste Simulator ]
                                            ▼
                               [ React 18 + TS Frontend (Vite) ]
```

Read the full technical specification in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the Wayland deep-dive in [docs/WAYLAND_GUIDE.md](docs/WAYLAND_GUIDE.md).

---

## 🛠️ Development Setup

### 1. Run Frontend in Browser (Mock IPC Mode)
Copyboard includes a dual-mode IPC system. You can test and develop the full UI in your browser without compiling Rust:
```bash
git clone https://github.com/your-username/copyboard.git
cd copyboard
npm install
npm run dev
```
Navigate to `http://localhost:1420`.

### 2. Run Native Desktop App (Tauri Mode)
Requires Rust 1.75+:
```bash
npm run tauri dev
```

### 3. Build Production Debian Package
```bash
npm run build
npm run tauri build
./scripts/package-deb.sh
```

---

## 📚 Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Database & FTS5 Schema](docs/DATABASE.md)
- [Wayland & GNOME Guide](docs/WAYLAND_GUIDE.md)
- [Product Roadmap (v1, v2, v3)](docs/ROADMAP.md)

---

## 🤝 Contributing

Contributions are warmly welcomed! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
