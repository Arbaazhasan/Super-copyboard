#!/usr/bin/env bash
# Standalone Debian/Ubuntu .deb packager for Copyboard
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

VERSION="1.0.0"
ARCH="amd64"
PKG_NAME="copyboard_${VERSION}_${ARCH}"
BUILD_DIR="/tmp/${PKG_NAME}"
OUTPUT_DIR="${ROOT_DIR}/dist-deb"

echo "==> Building Debian package for Copyboard v${VERSION}..."

# 1. Ensure frontend dist exists
if [ ! -d "${ROOT_DIR}/dist" ]; then
    echo "Building frontend bundle..."
    (cd "${ROOT_DIR}" && npm run build)
fi

# 2. Prepare staging tree
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/DEBIAN"
mkdir -p "${BUILD_DIR}/usr/bin"
mkdir -p "${BUILD_DIR}/usr/share/copyboard"
mkdir -p "${BUILD_DIR}/usr/share/applications"
mkdir -p "${BUILD_DIR}/usr/share/icons/hicolor/scalable/apps"
mkdir -p "${BUILD_DIR}/usr/share/icons/hicolor/32x32/apps"
mkdir -p "${BUILD_DIR}/usr/share/icons/hicolor/64x64/apps"
mkdir -p "${BUILD_DIR}/usr/share/icons/hicolor/128x128/apps"

# 3. Control file
cat <<EOF > "${BUILD_DIR}/DEBIAN/control"
Package: copyboard
Version: ${VERSION}
Section: utils
Priority: optional
Architecture: ${ARCH}
Maintainer: Copyboard Team <support@copyboard.org>
Depends: python3, python3-gi, gir1.2-gtk-3.0, gir1.2-webkit2-4.1 | gir1.2-webkit2-4.0, libayatana-appindicator3-1, curl
Recommends: wl-clipboard, xclip
Description: Modern, fast clipboard history manager for Ubuntu Linux
 Copyboard provides the seamless, smooth experience of Windows 11
 Clipboard History (Win + V) directly on Ubuntu GNOME (Wayland & X11).
 Features instant floating search, dark mode, snippet pinning, and zero crash footprint.
EOF

# 4. Maintainer postinst and postrm scripts
cat <<'EOF' > "${BUILD_DIR}/DEBIAN/postinst"
#!/bin/sh
set -e
if [ "$1" = "configure" ]; then
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q /usr/share/applications || true
    command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
exit 0
EOF
chmod 755 "${BUILD_DIR}/DEBIAN/postinst"

cat <<'EOF' > "${BUILD_DIR}/DEBIAN/postrm"
#!/bin/sh
set -e
if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q /usr/share/applications || true
    command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
exit 0
EOF
chmod 755 "${BUILD_DIR}/DEBIAN/postrm"

# 5. Application payload
if [ -f "${ROOT_DIR}/src-tauri/target/release/copyboard" ]; then
    echo "Packaging native Tauri binary..."
    cp "${ROOT_DIR}/src-tauri/target/release/copyboard" "${BUILD_DIR}/usr/bin/copyboard"
    chmod 755 "${BUILD_DIR}/usr/bin/copyboard"
else
    echo "Packaging standalone GTK/WebKit runtime and frontend..."
    cp -r "${ROOT_DIR}/dist" "${BUILD_DIR}/usr/share/copyboard/"
    mkdir -p "${BUILD_DIR}/usr/share/copyboard/scripts"
    cp "${ROOT_DIR}/scripts/clipboard-daemon.py" "${BUILD_DIR}/usr/share/copyboard/scripts/"
    chmod 755 "${BUILD_DIR}/usr/share/copyboard/scripts/clipboard-daemon.py"
    cp "${ROOT_DIR}/scripts/copyboard-launch.sh" "${BUILD_DIR}/usr/bin/copyboard"
    chmod 755 "${BUILD_DIR}/usr/bin/copyboard"
fi

# 6. Desktop Entry & Icons
cp "${ROOT_DIR}/copyboard.desktop" "${BUILD_DIR}/usr/share/applications/"
if [ -f "${ROOT_DIR}/public/icons/icon.svg" ]; then
    cp "${ROOT_DIR}/public/icons/icon.svg" "${BUILD_DIR}/usr/share/icons/hicolor/scalable/apps/copyboard.svg"
fi
if [ -f "${ROOT_DIR}/src-tauri/icons/32x32.png" ]; then
    cp "${ROOT_DIR}/src-tauri/icons/32x32.png" "${BUILD_DIR}/usr/share/icons/hicolor/32x32/apps/copyboard.png"
fi
if [ -f "${ROOT_DIR}/src-tauri/icons/64x64.png" ]; then
    cp "${ROOT_DIR}/src-tauri/icons/64x64.png" "${BUILD_DIR}/usr/share/icons/hicolor/64x64/apps/copyboard.png"
fi
if [ -f "${ROOT_DIR}/src-tauri/icons/128x128.png" ]; then
    cp "${ROOT_DIR}/src-tauri/icons/128x128.png" "${BUILD_DIR}/usr/share/icons/hicolor/128x128/apps/copyboard.png"
fi

# 7. Build .deb package
mkdir -p "${OUTPUT_DIR}"
dpkg-deb --build --root-owner-group "${BUILD_DIR}" "${OUTPUT_DIR}/${PKG_NAME}.deb"
rm -rf "${BUILD_DIR}"

echo "✅ Successfully built Debian package: ${OUTPUT_DIR}/${PKG_NAME}.deb"
dpkg-deb --info "${OUTPUT_DIR}/${PKG_NAME}.deb"
