mod clipboard;
mod db;
mod hotkey;
mod paste;

use clipboard::ClipboardService;
use db::{ClipboardItem, Database};
use hotkey::HotkeyManager;
use paste::PasteEngine;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, State, WindowEvent,
};

pub struct AppState {
    pub db: Arc<Database>,
    pub is_private_mode: Arc<AtomicBool>,
}

#[tauri::command]
fn get_items(state: State<AppState>, limit: Option<i64>, category: Option<String>) -> Result<Vec<ClipboardItem>, String> {
    let cat = category.as_deref().filter(|c| *c != "all" && *c != "pinned");
    state.db.get_items(limit.unwrap_or(100), cat).map_err(|e| e.to_string())
}

#[tauri::command]
fn search_items(state: State<AppState>, query: String, limit: Option<i64>) -> Result<Vec<ClipboardItem>, String> {
    if query.trim().is_empty() {
        return state.db.get_items(limit.unwrap_or(100), None).map_err(|e| e.to_string());
    }
    state.db.search_items(&query, limit.unwrap_or(100)).map_err(|e| e.to_string())
}

#[tauri::command]
fn paste_item(app: AppHandle, content: String) -> Result<(), String> {
    PasteEngine::paste_text(&app, &content)
}

#[tauri::command]
fn toggle_pin(state: State<AppState>, id: String) -> Result<bool, String> {
    state.db.toggle_pin(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_favorite(state: State<AppState>, id: String) -> Result<bool, String> {
    state.db.toggle_favorite(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_item(state: State<AppState>, id: String) -> Result<(), String> {
    state.db.delete_item(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_history(state: State<AppState>) -> Result<usize, String> {
    state.db.clear_unpinned().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_private_mode(state: State<AppState>, enabled: bool) -> Result<bool, String> {
    state.is_private_mode.store(enabled, Ordering::Relaxed);
    Ok(enabled)
}

#[tauri::command]
fn get_private_mode(state: State<AppState>) -> Result<bool, String> {
    Ok(state.is_private_mode.load(Ordering::Relaxed))
}

#[tauri::command]
fn toggle_window_visibility(app: AppHandle) -> Result<(), String> {
    HotkeyManager::toggle_window(&app);
    Ok(())
}

#[tauri::command]
fn hide_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database = Arc::new(Database::new(None).expect("Failed to initialize SQLite database"));
    let is_private_mode = Arc::new(AtomicBool::new(false));

    let clipboard_svc = ClipboardService::new(Arc::clone(&database), Arc::clone(&is_private_mode));

    tauri::Builder::default()
        .manage(AppState {
            db: Arc::clone(&database),
            is_private_mode: Arc::clone(&is_private_mode),
        })
        .setup(move |app| {
            // Start clipboard listener thread
            clipboard_svc.start_monitor(app.handle().clone());

            // Build Tray Menu
            let show_i = MenuItem::with_id(app, "show", "Open Copyboard (Super+V)", true, None::<&str>)?;
            let private_i = MenuItem::with_id(app, "private", "Toggle Private Mode", true, None::<&str>)?;
            let clear_i = MenuItem::with_id(app, "clear", "Clear History (Keeps Pinned)", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_i, &private_i, &clear_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        HotkeyManager::toggle_window(app);
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => HotkeyManager::toggle_window(app),
                    "clear" => {
                        let state = app.state::<AppState>();
                        let _ = state.db.clear_unpinned();
                    }
                    "quit" => std::process::exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Focused(false) = event {
                // Auto-hide floating popup when user clicks outside
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_items,
            search_items,
            paste_item,
            toggle_pin,
            toggle_favorite,
            delete_item,
            clear_history,
            set_private_mode,
            get_private_mode,
            toggle_window_visibility,
            hide_window
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Copyboard application");
}
