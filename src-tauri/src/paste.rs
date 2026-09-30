use arboard::Clipboard;
use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};

pub struct PasteEngine;

impl PasteEngine {
    pub fn paste_text(app_handle: &AppHandle, text: &str) -> Result<(), String> {
        // 1. Write text into system clipboard
        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
        clipboard.set_text(text).map_err(|e| e.to_string())?;

        // 2. Hide the Copyboard window
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.hide();
        }

        // 3. Allow GNOME/Wayland window manager ~100ms to restore focus to target app
        let text_len = text.len();
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(120));

            // 4. Try Wayland paste simulation with `wtype`
            let wayland_status = Command::new("wtype")
                .args(["-M", "ctrl", "-k", "v", "-m", "ctrl"])
                .status();

            if wayland_status.is_err() || !wayland_status.unwrap().success() {
                // Method 2: Try xdotool (for X11 / Xwayland)
                let _ = Command::new("xdotool")
                    .args(["key", "--clearmodifiers", "ctrl+v"])
                    .status();
            }

            println!("[Copyboard] Injected paste command for item ({} chars)", text_len);
        });

        Ok(())
    }
}
