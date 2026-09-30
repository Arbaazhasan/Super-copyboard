# Copyboard System Architecture

## Overview

**Copyboard** is an open-source, ultra-fast, lightweight clipboard history manager tailored for Ubuntu Linux (GNOME Desktop on Wayland and X11). It mirrors the seamless usability of Windows 11 Clipboard History (`Win + V` / `Super + V`) while strictly respecting modern Linux desktop paradigms, Wayland security constraints, and privacy-first local storage.

---

## Architectural Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Ubuntu Desktop Session                        │
│                                                                        │
│   ┌───────────────────────────┐      ┌──────────────────────────────┐  │
│   │   GNOME Wayland / X11     │      │   Target Application         │  │
│   │   Desktop Shell           │      │   (Browser, IDE, Terminal)   │  │
│   └─────────────┬─────────────┘      └──────────────▲───────────────┘  │
│                 │ Super + V                         │ Simulated Paste  │
│                 ▼                                   │ (wtype / enigo)  │
├─────────────────┼───────────────────────────────────┼──────────────────┤
│ Copyboard Core  │ (Tauri v2 / Rust Engine)          │                  │
│                 ▼                                   │                  │
│   ┌───────────────────────────┐                     │                  │
│   │ Global Shortcut Listener  │                     │                  │
│   │ (Portal / gsettings hook) │                     │                  │
│   └─────────────┬─────────────┘                     │                  │
│                 │ Toggle visibility                 │                  │
│                 ▼                                   │                  │
│   ┌───────────────────────────┐      ┌──────────────┴──────────────┐   │
│   │  Floating Window Manager  │      │   Paste Simulation Worker   │   │
│   │  - Frameless, Acrylic     │      │   - Clipboard write         │   │
│   │  - Centered / Near Cursor │      │   - Restore target focus    │   │
│   │  - Auto-hide on blur      │      │   - Inject Ctrl+V keystroke │   │
│   └─────────────┬─────────────┘      └──────────────▲──────────────┘   │
│                 │                                   │                  │
│                 │ Events & Commands                 │ Paste Command    │
│                 ▼                                   │                  │
│   ┌───────────────────────────┐      ┌──────────────┴──────────────┐   │
│   │      Tauri IPC Bridge     │◄────►│  Clipboard Monitor Daemon   │   │
│   └─────────────┬─────────────┘      │  - arboard polling loop     │   │
│                 │                    │  - SHA-256 deduplication    │   │
│                 │                    │  - Password & regex filter  │   │
│                 │                    └──────────────▲──────────────┘   │
│                 │                                   │                  │
│                 ▼                                   │                  │
│   ┌─────────────────────────────────────────────────┴──────────────┐   │
│   │                   SQLite Persistence Engine                    │   │
│   │   - Table: clipboard_items                                     │   │
│   │   - Virtual Table: clipboard_fts (FTS5 Full-Text Search)       │   │
│   │   - Auto-retention pruner & sensitive field filter             │   │
│   └─────────────────────────────┬──────────────────────────────────┘   │
├─────────────────────────────────┼──────────────────────────────────────┤
│ Frontend Presentation Layer     ▼ (React 18 + TS + Tailwind CSS)       │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Header: Search Input (Fuzzy matching) & Incognito indicator   │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ Category Tabs: All, Pinned 📌, Code </>, Links 🔗, Colors 🎨    │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ Virtualized Stream: Cards with syntax highlight & color swatches│  │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ Keyboard Handler: 1-9 direct paste, Arrows, Esc, Del, P (Pin)  │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ Drawer: Settings, Retention, Privacy controls, Wayland configs │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Clipboard Monitor Daemon (`src-tauri/src/clipboard.rs`)
- Continuously polls clipboard content on a background thread with an adaptive tick rate (200ms default).
- Calculates SHA-256 digests of copied text to guarantee deduplication. If duplicate text is detected, it increments `copy_count` and updates `last_used_at` instead of spamming history.
- Performs privacy scanning:
  - Detects clipboard manager hints (`x-kde-passwordManagerHint`, `text/x-moz-url-privatemode`).
  - Regex checks for sensitive keys, passwords, and private tokens.
  - Skips storage when **Private Mode** is active.
- Emits real-time `clipboard-updated` events to connected frontend clients via Tauri IPC.

### 2. Wayland & X11 Shortcut Bridge (`src-tauri/src/hotkey.rs`)
- On X11 and compatible Wayland environments, registers `Super + V` globally using Tauri's shortcut plugin.
- Under GNOME Wayland, provides a native bridge via `gsettings set org.gnome.settings-daemon.plugins.media-keys` and standard Freedesktop GlobalShortcuts portal (`org.freedesktop.portal.GlobalShortcuts`).

### 3. Quick Paste Simulation (`src-tauri/src/paste.rs`)
- When a user presses `Enter` or clicks an entry:
  1. Selected text is written to the system clipboard.
  2. The Copyboard window hides immediately.
  3. Window manager focus is returned to the previously active application.
  4. Synthesizes a paste keystroke (`Ctrl + V`) via `wtype` (on Wayland) or `enigo` (on X11).

### 4. SQLite + FTS5 Search Engine (`src-tauri/src/db.rs`)
- Operates embedded SQLite with `unicode61` tokenized FTS5.
- Sub-millisecond text search queries across 10,000+ records.
- Configurable retention pruning: automatically deletes unpinned records exceeding limits (100, 500, 1000 items) or age thresholds (1h, 24h, 7d, 30d).

### 5. React Frontend with Dual-Mode IPC (`src/lib/ipc.ts`)
- In desktop mode, calls native Rust IPC commands (`get_items`, `paste_item`, `toggle_pin`, `delete_item`, `clear_history`, `set_private_mode`).
- In browser dev mode (`npm run dev`), seamlessly falls back to an interactive in-memory/localStorage mock database loaded with realistic developer clipboard entries.

---

## Security & Privacy Model

- **Zero Cloud Leakage**: All clipboard items, metadata, and settings are stored strictly in `~/.local/share/copyboard/copyboard.db`.
- **Private / Incognito Mode**: When enabled from the UI or tray menu, the clipboard watcher drops all incoming entries.
- **Sensitive Content Masking**: Passwords and secret keys can be masked visually or excluded from persistence.
- **Protected Pinned Items**: Clearing clipboard history explicitly preserves all pinned entries.
