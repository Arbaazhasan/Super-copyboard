use tauri::{AppHandle, Manager};

pub struct HotkeyManager;

impl HotkeyManager {
    pub fn toggle_window(app_handle: &AppHandle) {
        if let Some(window) = app_handle.get_webview_window("main") {
            if let Ok(is_visible) = window.is_visible() {
                if is_visible {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.center();
                }
            }
        }
    }
}
