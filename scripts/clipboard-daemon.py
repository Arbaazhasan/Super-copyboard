#!/usr/bin/env python3
"""
Copyboard Native Clipboard Daemon & Floating OS Window for Ubuntu GNOME (Wayland & X11)
Monitors OS clipboard events, serves history API on http://127.0.0.1:1421,
and provides a frameless, transparent native GTK 3 + WebKit2 window.
"""

import os
import sys
import json
import time
import uuid
import re
import shutil
import subprocess
import threading
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler

from urllib.parse import parse_qs, urlparse

# Initialize GTK 3 and WebKit2 with Wayland driver safeguards
# WEBKIT_DISABLE_DMABUF_RENDERER prevents DMA-BUF subsurface races with Mutter on Wayland
os.environ.setdefault('WEBKIT_DISABLE_DMABUF_RENDERER', '1')

GTK_VERSION = None
HAS_WEBKIT = False
try:
    import gi
    gi.require_version('Gtk', '3.0')
    gi.require_version('WebKit2', '4.1')
    from gi.repository import Gtk, Gdk, GLib, WebKit2
    GTK_VERSION = 3
    HAS_WEBKIT = True

except Exception as e:
    try:
        import gi
        gi.require_version('Gtk', '3.0')
        from gi.repository import Gtk, Gdk, GLib
        GTK_VERSION = 3
    except Exception as e2:
        print(f"[Copyboard Daemon] Note: GTK not available: {e2}")

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(APP_DIR, 'dist')
DATA_DIR = os.path.expanduser('~/.local/share/copyboard')
DATA_FILE = os.path.join(DATA_DIR, 'history.json')
os.makedirs(DATA_DIR, exist_ok=True)

history_lock = threading.Lock()
last_clipboard_text = ""
gtk_clipboard = None
COPYQ_BIN = shutil.which('copyq')

# Native Window State
native_window = None
native_webview = None
is_window_visible = False

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
}


_cached_history = None
_save_timer = None


def _flush_history_to_disk():
    global _cached_history
    with history_lock:
        if _cached_history is None:
            return
        items_to_save = list(_cached_history)

    try:
        temp_file = DATA_FILE + f".tmp.{os.getpid()}"
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(items_to_save, f, indent=2)
        os.replace(temp_file, DATA_FILE)
    except Exception as e:
        print(f"[Copyboard Daemon] Error saving history: {e}")


def schedule_save(immediate=False):
    global _save_timer
    if _save_timer is not None:
        try:
            _save_timer.cancel()
        except Exception:
            pass
        _save_timer = None

    if immediate:
        _flush_history_to_disk()
    else:
        _save_timer = threading.Timer(0.15, _flush_history_to_disk)
        _save_timer.daemon = True
        _save_timer.start()


def load_history():
    global _cached_history
    with history_lock:
        if _cached_history is not None:
            return list(_cached_history)

        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        demo_snippets = [
                            "def main():\n    print(\"Copyboard v1.0\")",
                            "git clone https://github.com/org/copyboard.git",
                            "#E95420",
                            "Draft new features for Copyboard v1.1.\nRemember to update dependencies."
                        ]
                        cleaned = [item for item in data if item.get("content") not in demo_snippets]
                        _cached_history = cleaned
                        if len(cleaned) != len(data):
                            schedule_save(immediate=True)
                        return list(_cached_history)
            except Exception as e:
                print(f"[Copyboard Daemon] Error reading history: {e}")

        initial = import_from_copyq()
        _cached_history = initial
        schedule_save(immediate=True)
        return list(_cached_history)


def save_history_unlocked(items):
    save_history(items)


def save_history(items, immediate=False):
    global _cached_history
    with history_lock:
        _cached_history = list(items)
    schedule_save(immediate=immediate)



def classify(text):
    text = text.strip()
    if re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", text) or re.match(r"^(?:rgb|hsl)a?\(", text):
        return "color", "color", {"colorHex": text}
    if re.match(r"^https?://", text):
        domain = urlparse(text).netloc.replace("www.", "")
        return "url", "url", {"domain": domain}
    if re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", text):
        return "email", "email", None

    code_kw = [
        "def ", "fn ", "function", "const ", "let ", "var ", "import ", "class ",
        "SELECT ", "git ", "docker ", "npm ", "sudo ", "curl ", "cargo "
    ]
    if any(k in text for k in code_kw) or (text.count("{") > 0 and text.count("}") > 0):
        lang = "code"
        if "def " in text:
            lang = "python"
        elif "fn " in text:
            lang = "rust"
        elif "const " in text or "=>" in text:
            lang = "javascript"
        elif "SELECT " in text.upper():
            lang = "sql"
        elif any(text.startswith(k) for k in ["git ", "docker ", "sudo ", "curl ", "npm "]):
            lang = "bash"
        return "code", "code", {"language": lang}

    return "text", "text", None


def import_from_copyq():
    if not COPYQ_BIN:
        return []
    try:
        script = (
            "var res = []; var n = count(); "
            "for (var i = 0; i < Math.min(n, 100); i++) { "
            "  var t = str(read(i)); "
            "  if (t && t.trim()) res.push(t.trim()); "
            "} "
            "JSON.stringify(res);"
        )
        res = subprocess.run([COPYQ_BIN, 'eval', script], capture_output=True, text=True, timeout=2)
        if res.returncode == 0 and res.stdout.strip():
            raw_items = json.loads(res.stdout)
            now = int(time.time() * 1000)
            seen = set()
            imported = []
            for idx, text in enumerate(raw_items):
                if not text or text in seen:
                    continue
                seen.add(text)
                content_type, category, meta = classify(text)
                imported.append({
                    "id": str(uuid.uuid4()),
                    "content": text,
                    "content_type": content_type,
                    "category": category,
                    "char_count": len(text),
                    "word_count": len(text.split()),
                    "is_pinned": False,
                    "is_favorite": False,
                    "is_sensitive": False,
                    "copy_count": 1,
                    "metadata": meta,
                    "created_at": now - (idx * 5000),
                    "last_used_at": now - (idx * 5000)
                })
            print(f"[Copyboard Daemon] Imported {len(imported)} real items from copyq!")
            return imported
    except Exception as e:
        print(f"[Copyboard Daemon] Error importing from copyq: {e}")
    return []


def add_clipboard_item(text):
    global last_clipboard_text
    if not text or not text.strip():
        return
    text = text.strip()
    if text == last_clipboard_text:
        return
    last_clipboard_text = text

    items = load_history()
    now = int(time.time() * 1000)

    for i, item in enumerate(items):
        if item.get("content") == text:
            item["copy_count"] = item.get("copy_count", 1) + 1
            item["last_used_at"] = now
            items.pop(i)
            items.insert(0, item)
            save_history(items)
            print(f"[Copyboard Daemon] Bumped existing item: {text[:35]}...")
            return

    content_type, category, meta = classify(text)
    new_item = {
        "id": str(uuid.uuid4()),
        "content": text,
        "content_type": content_type,
        "category": category,
        "char_count": len(text),
        "word_count": len(text.split()),
        "is_pinned": False,
        "is_favorite": False,
        "is_sensitive": False,
        "copy_count": 1,
        "metadata": meta,
        "created_at": now,
        "last_used_at": now
    }

    items.insert(0, new_item)
    if len(items) > 1000:
        pinned = [x for x in items if x.get("is_pinned")]
        unpinned = [x for x in items if not x.get("is_pinned")][:900]
        items = pinned + unpinned
    save_history(items)
    print(f"[Copyboard Daemon] Captured clipboard: {text[:35]}...")


def set_system_clipboard(text):
    global last_clipboard_text
    last_clipboard_text = text.strip()

    if COPYQ_BIN:
        try:
            subprocess.run([COPYQ_BIN, 'add', text], timeout=1, check=False)
            subprocess.run([COPYQ_BIN, 'select', '0'], timeout=1, check=False)
        except Exception:
            pass

    if GTK_VERSION == 3 and gtk_clipboard:
        def set_gtk3():
            try:
                gtk_clipboard.set_text(text, -1)
                gtk_clipboard.store()
            except Exception:
                pass
            return False
        GLib.idle_add(set_gtk3)


def poll_copyq_clipboard():
    if not COPYQ_BIN:
        return
    while True:
        try:
            time.sleep(0.4)
            res = subprocess.run([COPYQ_BIN, 'read', '0'], capture_output=True, text=True, timeout=1)
            if res.returncode == 0:
                current_text = res.stdout.strip()
                if current_text and current_text != last_clipboard_text:
                    add_clipboard_item(current_text)
        except Exception:
            time.sleep(1)


# ---------------------------------------------------------------------------
# Native GTK 3 + WebKit2 Floating Window Implementation
# ---------------------------------------------------------------------------

def create_native_window():
    global native_window, native_webview
    if not HAS_WEBKIT:
        print("[Copyboard Daemon] WebKit2 not available, skipping native window.")
        return None

    try:
        win = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        win.set_title("Copyboard")
        win.set_decorated(False)
        win.set_default_size(460, 620)
        win.set_position(Gtk.WindowPosition.CENTER)
        win.set_keep_above(True)
        win.set_skip_taskbar_hint(True)
        win.set_skip_pager_hint(True)
        win.set_type_hint(Gdk.WindowTypeHint.DIALOG)
        win.set_app_paintable(True)

        screen = win.get_screen()
        visual = screen.get_rgba_visual()
        if visual and screen.is_composited():
            win.set_visual(visual)

        css_provider = Gtk.CssProvider()
        css_provider.load_from_data(b"window { background-color: transparent; }")
        Gtk.StyleContext.add_provider_for_screen(
            screen,
            css_provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        web = WebKit2.WebView()
        web.set_background_color(Gdk.RGBA(0, 0, 0, 0))
        settings = web.get_settings()
        settings.set_enable_developer_extras(False)
        settings.set_enable_smooth_scrolling(True)

        # Check if Vite dev server on 1420 is active, else use 1421 internal server
        target_url = "http://127.0.0.1:1421"
        try:
            import urllib.request
            req = urllib.request.Request("http://localhost:1420", method="HEAD")
            with urllib.request.urlopen(req, timeout=0.2):
                target_url = "http://localhost:1420"
        except Exception:
            pass

        # Direct JS-to-GTK native IPC bridge
        user_content = web.get_user_content_manager()
        user_content.register_script_message_handler("copyboard")

        def on_script_message(manager, js_result):
            try:
                msg = ""
                if hasattr(js_result, 'get_js_value'):
                    jsc = js_result.get_js_value()
                    msg = jsc.to_string() if jsc else ""
                elif hasattr(js_result, 'to_value'):
                    val = js_result.to_value()
                    msg = val.to_string() if hasattr(val, 'to_string') else str(val)
                else:
                    msg = str(js_result)
                if 'hide' in msg or 'close' in msg:
                    hide_app_window()
            except Exception as e:
                print(f"[Copyboard Daemon] Script message handler error: {e}")


        user_content.connect("script-message-received::copyboard", on_script_message)

        print(f"[Copyboard Daemon] Webview loading target: {target_url}")
        web.load_uri(target_url)
        win.add(web)

        # Close on Escape key at OS/GTK level
        def on_key_press(w, event):
            if event.keyval in (Gdk.KEY_Escape, 65307):
                hide_app_window()
                return True
            return False

        win.connect("key-press-event", on_key_press)

        # Auto-hide on focus lost (clicking outside the window)
        def on_focus_out(w, event):
            def check_active():
                if not win.is_active():
                    hide_app_window()
                return False
            GLib.timeout_add(150, check_active)

        win.connect("focus-out-event", on_focus_out)

        def on_delete_event(w, event):
            hide_app_window()
            return True

        win.connect("delete-event", on_delete_event)

        native_window = win
        native_webview = web
        return win
    except Exception as e:
        print(f"[Copyboard Daemon] Failed to create native GTK window: {e}")
        return None


def show_app_window():
    global native_window, native_webview, is_window_visible
    if not native_window:
        return
    native_window.show_all()
    native_window.present()
    if native_webview:
        native_webview.grab_focus()
        try:
            native_webview.run_javascript(
                "document.getElementById('copyboard-search')?.focus();",
                None, None, None
            )
        except Exception:
            pass
    is_window_visible = True


def hide_app_window():
    global native_window, is_window_visible
    if not native_window:
        return
    native_window.hide()
    is_window_visible = False


def toggle_app_window():
    global native_window, is_window_visible
    if not native_window:
        return
    if is_window_visible and native_window.get_visible():
        hide_app_window()
    else:
        show_app_window()


# ---------------------------------------------------------------------------
# HTTP API & Static File Server
# ---------------------------------------------------------------------------

class APIHandler(BaseHTTPRequestHandler):
    def _set_cors(self, code=200, content_type="application/json"):
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Connection', 'close')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.close_connection = True

    def do_OPTIONS(self):
        self._set_cors(200)

    def serve_static(self, path):
        if not os.path.exists(DIST_DIR):
            self._set_cors(404, "text/plain")
            self.wfile.write(b"dist folder not found. Run npm run build.")
            return

        rel = path.lstrip('/')
        if not rel or rel == '/':
            rel = 'index.html'

        file_path = os.path.normpath(os.path.join(DIST_DIR, rel))
        if not file_path.startswith(DIST_DIR) or not os.path.isfile(file_path):
            file_path = os.path.join(DIST_DIR, 'index.html')

        if os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            content_type = MIME_TYPES.get(ext, 'application/octet-stream')
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()
                self._set_cors(200, content_type)
                self.wfile.write(content)
            except Exception as e:
                self._set_cors(500, "text/plain")
                self.wfile.write(str(e).encode('utf-8'))
        else:
            self._set_cors(404, "text/plain")
            self.wfile.write(b"404 Not Found")

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == '/api/toggle':
            if GTK_VERSION and 'GLib' in globals():
                GLib.idle_add(toggle_app_window)
            self._set_cors(200)
            self.wfile.write(b'{"success": true, "action": "toggle"}')

        elif parsed.path == '/api/show':
            if GTK_VERSION and 'GLib' in globals():
                GLib.idle_add(show_app_window)
            self._set_cors(200)
            self.wfile.write(b'{"success": true, "action": "show"}')

        elif parsed.path == '/api/hide':
            if GTK_VERSION and 'GLib' in globals():
                GLib.idle_add(hide_app_window)
            self._set_cors(200)
            self.wfile.write(b'{"success": true, "action": "hide"}')

        elif parsed.path == '/api/items':
            query = parse_qs(parsed.query)
            limit = int(query.get('limit', [100])[0])
            category = query.get('category', [None])[0]

            items = load_history()
            if category and category != 'all':
                if category == 'pinned':
                    items = [i for i in items if i.get('is_pinned')]
                elif category == 'favorites':
                    items = [i for i in items if i.get('is_favorite')]
                else:
                    items = [i for i in items if i.get('category') == category]

            self._set_cors(200)
            self.wfile.write(json.dumps(items[:limit]).encode('utf-8'))

        elif parsed.path == '/api/status':
            self._set_cors(200)
            self.wfile.write(b'{"status": "running"}')

        elif not parsed.path.startswith('/api/'):
            self.serve_static(parsed.path)

        else:
            self._set_cors(404)
            self.wfile.write(b'{"error": "not found"}')

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        if parsed.path in ['/api/close', '/api/hide']:
            if GTK_VERSION and 'GLib' in globals():
                GLib.idle_add(hide_app_window)
            self._set_cors(200)
            try:
                self.wfile.write(b'{"success": true}')
            except Exception:
                pass
            return

        elif parsed.path == '/api/add':
            text = data.get('content', '')
            if text and text.strip():
                add_clipboard_item(text)
            self._set_cors(200)
            self.wfile.write(b'{"success": true}')

        elif parsed.path == '/api/copy':
            text = data.get('content', '')
            if text:
                set_system_clipboard(text)
                items = load_history()
                for item in items:
                    if item.get('content') == text:
                        item['copy_count'] = item.get('copy_count', 1) + 1
                        item['last_used_at'] = int(time.time() * 1000)
                        break
                save_history(items)

            self._set_cors(200)
            self.wfile.write(b'{"success": true}')

        elif parsed.path == '/api/pin':
            item_id = data.get('id')
            items = load_history()
            is_pinned = False
            for item in items:
                if item.get('id') == item_id:
                    item['is_pinned'] = not item.get('is_pinned', False)
                    is_pinned = item['is_pinned']
                    break
            save_history(items)
            self._set_cors(200)
            self.wfile.write(json.dumps({"is_pinned": is_pinned}).encode('utf-8'))

        elif parsed.path == '/api/favorite':
            item_id = data.get('id')
            items = load_history()
            is_fav = False
            for item in items:
                if item.get('id') == item_id:
                    item['is_favorite'] = not item.get('is_favorite', False)
                    is_fav = item['is_favorite']
                    break
            save_history(items)
            self._set_cors(200)
            self.wfile.write(json.dumps({"is_favorite": is_fav}).encode('utf-8'))

        elif parsed.path == '/api/delete':
            item_id = data.get('id')
            items = load_history()
            items = [x for x in items if x.get('id') != item_id]
            save_history(items)
            self._set_cors(200)
            self.wfile.write(b'{"success": true}')

        elif parsed.path == '/api/delete_batch':
            ids = set(data.get('ids', []))
            items = load_history()
            items = [x for x in items if x.get('id') not in ids]
            save_history(items)
            self._set_cors(200)
            self.wfile.write(b'{"success": true}')

        elif parsed.path == '/api/clear':
            clear_all = data.get('all', False) or data.get('clear_all', False)
            if clear_all:
                items = []
            else:
                items = load_history()
                items = [x for x in items if x.get('is_pinned')]
            save_history(items, immediate=True)
            self._set_cors(200)
            self.wfile.write(b'{"success": true}')


        else:
            self._set_cors(404)
            self.wfile.write(b'{"error": "not found"}')

    def log_message(self, format, *args):
        return


class RobustThreadingHTTPServer(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True
    allow_reuse_address = True


def run_server():
    server = RobustThreadingHTTPServer(('127.0.0.1', 1421), APIHandler)
    print("[Copyboard Daemon] Multi-threaded API Server running at http://127.0.0.1:1421")
    server.serve_forever()



def main(initial_show=False):
    global gtk_clipboard

    load_history()

    api_thread = threading.Thread(target=run_server, daemon=True)
    api_thread.start()

    if COPYQ_BIN:
        poll_thread = threading.Thread(target=poll_copyq_clipboard, daemon=True)
        poll_thread.start()
        print("[Copyboard Daemon] Monitoring clipboard via CopyQ daemon...")

    if GTK_VERSION == 3:
        try:
            gtk_clipboard = Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)

            def on_owner_change(cb, event):
                try:
                    text = cb.wait_for_text()
                    if text and text.strip():
                        add_clipboard_item(text)
                except Exception:
                    pass

            gtk_clipboard.connect('owner-change', on_owner_change)
            print("[Copyboard Daemon] Connected GTK 3 clipboard listener.")

            # Create native GTK 3 + WebKit2 OS window
            create_native_window()

            if initial_show:
                GLib.timeout_add(200, show_app_window)

            Gtk.main()
            return
        except Exception as e:
            print(f"[Copyboard Daemon] GTK 3 initialization warning: {e}")

    while True:
        time.sleep(1)


if __name__ == '__main__':
    # CLI command routing for fast IPC
    if '--toggle' in sys.argv:
        try:
            import urllib.request
            with urllib.request.urlopen("http://127.0.0.1:1421/api/toggle", timeout=1):
                sys.exit(0)
        except Exception:
            pass
    elif '--show' in sys.argv:
        try:
            import urllib.request
            with urllib.request.urlopen("http://127.0.0.1:1421/api/show", timeout=1):
                sys.exit(0)
        except Exception:
            pass

    should_show = ('--show' in sys.argv or '--toggle' in sys.argv)
    main(initial_show=should_show)
