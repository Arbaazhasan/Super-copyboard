# Contributing to Copyboard

Thank you for your interest in contributing to Copyboard! We welcome community contributions, bug reports, feature requests, and pull requests.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please treat all contributors and users with respect.

---

## Getting Started

### Prerequisites

- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **Rust**: v1.75.0 or higher (with `cargo`)
- **Linux Packages** (Ubuntu/Debian):
  ```bash
  sudo apt install -y build-essential libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ```

### Development Workflow

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/your-username/copyboard.git
   cd copyboard
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Run Frontend Development Server (Mock IPC Mode)**:
   You can develop and inspect the entire UI in any browser without needing to compile Rust:
   ```bash
   npm run dev
   ```

4. **Run Native Tauri App (Full Desktop Mode)**:
   ```bash
   npm run tauri dev
   ```

5. **Typecheck and Lint**:
   ```bash
   npm run build
   ```

---

## Submitting Pull Requests

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with clear, descriptive commit messages following the Conventional Commits specification:
   - `feat: add markdown syntax preview to cards`
   - `fix: prevent duplicate history entries on quick copy`
   - `docs: update Wayland shortcut guide`
3. Push to your fork and open a Pull Request against `main`.
4. Ensure all CI checks pass.
