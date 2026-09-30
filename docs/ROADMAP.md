# Copyboard Product Roadmap (v1, v2, v3)

Copyboard is built with a modular, extensible architecture designed to evolve into the premier Linux clipboard ecosystem.

---

## 🚀 Version 1.0.0 — Foundation & Parity (Current Milestone)

The objective of v1.0 is delivering 100% feature parity with the Windows 11 `Win + V` clipboard manager, tailored with Ubuntu Yaru aesthetics.

- [x] **Clipboard History Engine**:
  - Persistent SQLite storage with FTS5 instant search.
  - Automatic clipboard listening daemon.
  - SHA-256 deduplication and copy frequency counting.
- [x] **Windows 11-Style Floating UI**:
  - Centered floating window with acrylic blur and dark/light Yaru themes.
  - Full keyboard-first navigation (Arrow keys, Esc, 1–9 instant paste hotkeys).
  - Quick action bar (Private Mode, Clear history, Settings).
- [x] **Smart Categorization**:
  - Automatic detection of Code, URLs, Emails, Colors, and Plain Text.
  - Interactive color chips for HEX and RGB codes.
- [x] **Pinning & Favorites**:
  - Pinned items protected from auto-pruning and manual clear.
  - Dedicated "Pinned" and "Favorites" filter tabs.
- [x] **Privacy Safeguards**:
  - One-click Private Mode (suspends clipboard logging).
  - Built-in password & API key heuristic filter.
  - Configurable retention limits (100–10,000 items) and auto-delete timers.
- [x] **Ubuntu Desktop Integration**:
  - `Super + V` global hotkey via GNOME `gsettings` and Desktop Portal.
  - Debian (`.deb`) and AppImage packaging scripts.

---

## 🌟 Version 2.0.0 — Rich Media, Sync & Templates

Expanding Copyboard to handle rich visual media, multi-device sync, and reusable snippets.

- [ ] **Image & Rich Media Clipboard**:
  - Capture and render copied images (PNG, JPEG, WebP, SVG).
  - Disk-backed thumbnail cache with lazy loading.
  - Color palette extraction from copied screenshots.
- [ ] **End-to-End Encrypted Peer-to-Peer Sync**:
  - Zero-knowledge sync between Linux, macOS, Windows, and Android.
  - Local Wi-Fi discovery (mDNS) and WebRTC data channels.
  - Encrypted with AES-256-GCM using user passphrase.
- [ ] **Snippet Templates & Macro Expansion**:
  - Reusable boilerplates (email signatures, markdown templates, license headers).
  - Dynamic placeholders: `{{date}}`, `{{time}}`, `{{clipboard}}`, `{{uuid}}`.
- [ ] **Native GNOME Shell Extension**:
  - Companion GNOME extension providing seamless Top Bar icon and instant shell-level window summoning.

---

## 🔮 Version 3.0.0 — AI & Plugin Ecosystem

Leveraging modern on-device intelligence and extensible developer plugins.

- [ ] **On-Device Semantic & AI Search**:
  - Local vector embeddings (using ONNX runtime / candle) for natural language search (e.g., "Find that Docker run command with port 8080").
  - Clipboard OCR: Extract searchable text automatically from copied screenshot images.
- [ ] **WASM Plugin Architecture**:
  - Write custom transformers in Rust, TypeScript, or Go compiled to WebAssembly.
  - Example plugins:
    - JSON formatter & validator on copy.
    - Base64 encoder / decoder.
    - Markdown table converter.
    - URL query parameter stripper.
- [ ] **Cloud Backup & Team Workspaces**:
  - Self-hosted Nextcloud / MinIO sync support.
  - Shared clipboard vaults for development teams.
