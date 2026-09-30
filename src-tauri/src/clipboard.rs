use crate::db::{ClipboardItem, Database};
use arboard::Clipboard;
use regex::Regex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct ClipboardMonitor {
    db: Arc<Database>,
    is_private_mode: Arc<AtomicBool>,
    last_hash: Arc<parking_lot::Mutex<String>>,
}

// In case parking_lot is not in Cargo, we use std::sync::Mutex
use std::sync::Mutex;

pub struct ClipboardService {
    db: Arc<Database>,
    is_private_mode: Arc<AtomicBool>,
    last_text: Arc<Mutex<String>>,
}

impl ClipboardService {
    pub fn new(db: Arc<Database>, is_private_mode: Arc<AtomicBool>) -> Self {
        Self {
            db,
            is_private_mode,
            last_text: Arc::new(Mutex::new(String::new())),
        }
    }

    pub fn start_monitor(&self, app_handle: AppHandle) {
        let db = Arc::clone(&self.db);
        let is_private = Arc::clone(&self.is_private_mode);
        let last_text = Arc::clone(&self.last_text);

        tokio::spawn(async move {
            let mut clipboard = match Clipboard::new() {
                Ok(cb) => cb,
                Err(e) => {
                    eprintln!("[Copyboard] Failed to initialize clipboard monitor: {}", e);
                    return;
                }
            };

            loop {
                tokio::time::sleep(Duration::from_millis(250)).await;

                // 1. Skip if Private / Incognito Mode is active
                if is_private.load(Ordering::Relaxed) {
                    continue;
                }

                // 2. Fetch current clipboard text
                if let Ok(text) = clipboard.get_text() {
                    let trimmed = text.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    // 3. Deduplication check
                    {
                        let mut last = last_text.lock().unwrap();
                        if *last == trimmed {
                            continue;
                        }
                        *last = trimmed.to_string();
                    }

                    // 4. Sensitivity / Credential Check
                    let is_sensitive = Self::is_sensitive_content(trimmed);

                    // 5. Detect category and metadata
                    let (content_type, category, metadata) = Self::classify_content(trimmed);

                    // 6. Persist to SQLite
                    match db.insert_or_update_item(
                        trimmed,
                        &content_type,
                        &category,
                        is_sensitive,
                        metadata.as_deref(),
                    ) {
                        Ok(item) => {
                            // 7. Emit real-time event to Tauri frontend window
                            let _ = app_handle.emit("clipboard-updated", item);
                        }
                        Err(err) => {
                            eprintln!("[Copyboard] Failed to persist clipboard item: {}", err);
                        }
                    }
                }
            }
        });
    }

    pub fn classify_content(text: &str) -> (String, String, Option<String>) {
        // Color detection: HEX or RGB/HSL
        let hex_color_regex = Regex::new(r"^#(?:[0-9a-fA-F]{3}){1,2}$").unwrap();
        let rgb_color_regex = Regex::new(r"^(?:rgb|hsl)a?\([\d\s,%.]+\)$").unwrap();

        if hex_color_regex.is_match(text) || rgb_color_regex.is_match(text) {
            let meta = serde_json::json!({ "colorHex": text }).to_string();
            return ("color".to_string(), "color".to_string(), Some(meta));
        }

        // URL detection
        let url_regex = Regex::new(r"^https?://[^\s/$.?#].[^\s]*$").unwrap();
        if url_regex.is_match(text) {
            let domain = text
                .split('/')
                .nth(2)
                .unwrap_or("")
                .replace("www.", "");
            let meta = serde_json::json!({ "domain": domain }).to_string();
            return ("url".to_string(), "url".to_string(), Some(meta));
        }

        // Email detection
        let email_regex = Regex::new(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$").unwrap();
        if email_regex.is_match(text) {
            return ("email".to_string(), "email".to_string(), None);
        }

        // Code detection heuristics
        let is_code = text.contains("fn ")
            || text.contains("function ")
            || text.contains("def ")
            || text.contains("import ")
            || text.contains("class ")
            || text.contains("const ")
            || text.contains("let ")
            || text.contains("var ")
            || text.contains("return ")
            || text.contains("SELECT ")
            || text.contains("<html>")
            || (text.contains('{') && text.contains('}') && text.contains(';'))
            || (text.starts_with("git ") || text.starts_with("docker ") || text.starts_with("npm ") || text.starts_with("cargo "));

        if is_code {
            let language = Self::guess_language(text);
            let meta = serde_json::json!({ "language": language }).to_string();
            return ("code".to_string(), "code".to_string(), Some(meta));
        }

        ("text".to_string(), "text".to_string(), None)
    }

    fn guess_language(text: &str) -> &'static str {
        if text.contains("def ") || text.contains("import ") && text.contains(":\n") {
            "python"
        } else if text.contains("fn ") || text.contains("let mut ") || text.contains("println!") {
            "rust"
        } else if text.contains("const ") || text.contains("let ") || text.contains("=>") {
            "javascript"
        } else if text.contains("SELECT ") || text.contains("FROM ") || text.contains("WHERE ") {
            "sql"
        } else if text.starts_with("git ") || text.starts_with("docker ") || text.starts_with("sudo ") {
            "bash"
        } else {
            "code"
        }
    }

    pub fn is_sensitive_content(text: &str) -> bool {
        // Known secret patterns
        let api_key_patterns = [
            r"ghp_[0-9a-zA-Z]{36}",           // GitHub Personal Access Token
            r"sk-[a-zA-Z0-9]{32,}",            // OpenAI / Stripe Secret Key
            r"AKIA[0-9A-Z]{16}",               // AWS Access Key ID
            r"-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----", // Private SSH key
            r"bearer\s+[a-zA-Z0-9_\-\.]{20,}", // Bearer tokens
        ];

        for pattern in api_key_patterns {
            if let Ok(re) = Regex::new(pattern) {
                if re.is_match(text) {
                    return true;
                }
            }
        }

        false
    }
}
