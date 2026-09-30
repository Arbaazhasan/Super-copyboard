use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub id: String,
    pub content: String,
    pub content_type: String,
    pub category: String,
    pub char_count: i64,
    pub word_count: i64,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub is_sensitive: bool,
    pub copy_count: i64,
    pub metadata: Option<String>,
    pub created_at: i64,
    pub last_used_at: i64,
}

pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(custom_path: Option<PathBuf>) -> Result<Self> {
        let db_path = match custom_path {
            Some(p) => p,
            None => {
                let data_dir = dirs::data_local_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join("copyboard");
                std::fs::create_dir_all(&data_dir).ok();
                data_dir.join("copyboard.db")
            }
        };

        let conn = Connection::open(db_path)?;
        let db = Database {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_schema()?;
        Ok(db)
    }

    pub fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // 1. Create main table
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS clipboard_items (
                id TEXT PRIMARY KEY NOT NULL,
                content TEXT NOT NULL,
                content_type TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'text',
                char_count INTEGER NOT NULL,
                word_count INTEGER NOT NULL,
                is_pinned INTEGER NOT NULL DEFAULT 0,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                is_sensitive INTEGER NOT NULL DEFAULT 0,
                copy_count INTEGER NOT NULL DEFAULT 1,
                metadata TEXT,
                created_at INTEGER NOT NULL,
                last_used_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_items_created_at ON clipboard_items (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_items_last_used ON clipboard_items (last_used_at DESC);
            CREATE INDEX IF NOT EXISTS idx_items_is_pinned ON clipboard_items (is_pinned);
            CREATE INDEX IF NOT EXISTS idx_items_category ON clipboard_items (category);
            CREATE INDEX IF NOT EXISTS idx_items_content ON clipboard_items (content);

            CREATE VIRTUAL TABLE IF NOT EXISTS clipboard_fts USING fts5(
                id UNINDEXED,
                content,
                category,
                tokenize='unicode61 remove_diacritics 1'
            );

            CREATE TRIGGER IF NOT EXISTS trg_clipboard_ai AFTER INSERT ON clipboard_items BEGIN
                INSERT INTO clipboard_fts(id, content, category) VALUES (new.id, new.content, new.category);
            END;

            CREATE TRIGGER IF NOT EXISTS trg_clipboard_ad AFTER DELETE ON clipboard_items BEGIN
                DELETE FROM clipboard_fts WHERE id = old.id;
            END;

            CREATE TRIGGER IF NOT EXISTS trg_clipboard_au AFTER UPDATE ON clipboard_items BEGIN
                DELETE FROM clipboard_fts WHERE id = old.id;
                INSERT INTO clipboard_fts(id, content, category) VALUES (new.id, new.content, new.category);
            END;

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL
            );
            "#,
        )?;

        Ok(())
    }

    pub fn insert_or_update_item(
        &self,
        content: &str,
        content_type: &str,
        category: &str,
        is_sensitive: bool,
        metadata: Option<&str>,
    ) -> Result<ClipboardItem> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();

        // Check if identical content exists
        let mut check_stmt = conn.prepare(
            "SELECT id, is_pinned, is_favorite, copy_count, created_at FROM clipboard_items WHERE content = ?1 LIMIT 1",
        )?;

        let mut rows = check_stmt.query(params![content])?;

        if let Some(row) = rows.next()? {
            let id: String = row.get(0)?;
            let is_pinned: bool = row.get::<_, i64>(1)? == 1;
            let is_favorite: bool = row.get::<_, i64>(2)? == 1;
            let copy_count: i64 = row.get(3)?;
            let created_at: i64 = row.get(4)?;

            let new_copy_count = copy_count + 1;
            conn.execute(
                "UPDATE clipboard_items SET copy_count = ?1, last_used_at = ?2 WHERE id = ?3",
                params![new_copy_count, now, id],
            )?;

            return Ok(ClipboardItem {
                id,
                content: content.to_string(),
                content_type: content_type.to_string(),
                category: category.to_string(),
                char_count: content.chars().count() as i64,
                word_count: content.split_whitespace().count() as i64,
                is_pinned,
                is_favorite,
                is_sensitive,
                copy_count: new_copy_count,
                metadata: metadata.map(|s| s.to_string()),
                created_at,
                last_used_at: now,
            });
        }

        // Insert fresh item
        let id = Uuid::new_v4().to_string();
        let char_count = content.chars().count() as i64;
        let word_count = content.split_whitespace().count() as i64;

        conn.execute(
            r#"
            INSERT INTO clipboard_items (
                id, content, content_type, category, char_count, word_count,
                is_pinned, is_favorite, is_sensitive, copy_count, metadata,
                created_at, last_used_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 0, ?7, 1, ?8, ?9, ?10)
            "#,
            params![
                id,
                content,
                content_type,
                category,
                char_count,
                word_count,
                if is_sensitive { 1 } else { 0 },
                metadata,
                now,
                now,
            ],
        )?;

        Ok(ClipboardItem {
            id,
            content: content.to_string(),
            content_type: content_type.to_string(),
            category: category.to_string(),
            char_count,
            word_count,
            is_pinned: false,
            is_favorite: false,
            is_sensitive,
            copy_count: 1,
            metadata: metadata.map(|s| s.to_string()),
            created_at: now,
            last_used_at: now,
        })
    }

    pub fn get_items(&self, limit: i64, category: Option<&str>) -> Result<Vec<ClipboardItem>> {
        let conn = self.conn.lock().unwrap();

        let mut items = Vec::new();

        if let Some(cat) = category {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, content, content_type, category, char_count, word_count,
                       is_pinned, is_favorite, is_sensitive, copy_count, metadata,
                       created_at, last_used_at
                FROM clipboard_items
                WHERE category = ?1
                ORDER BY is_pinned DESC, last_used_at DESC
                LIMIT ?2
                "#,
            )?;
            let rows = stmt.query_map(params![cat, limit], |row| Self::row_to_item(row))?;
            for item in rows {
                items.push(item?);
            }
        } else {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, content, content_type, category, char_count, word_count,
                       is_pinned, is_favorite, is_sensitive, copy_count, metadata,
                       created_at, last_used_at
                FROM clipboard_items
                ORDER BY is_pinned DESC, last_used_at DESC
                LIMIT ?1
                "#,
            )?;
            let rows = stmt.query_map(params![limit], |row| Self::row_to_item(row))?;
            for item in rows {
                items.push(item?);
            }
        }

        Ok(items)
    }

    pub fn search_items(&self, query: &str, limit: i64) -> Result<Vec<ClipboardItem>> {
        let conn = self.conn.lock().unwrap();
        let mut items = Vec::new();

        // Use FTS5 match query
        let fts_query = format!("{}*", query.replace("'", "''"));
        let mut stmt = conn.prepare(
            r#"
            SELECT i.id, i.content, i.content_type, i.category, i.char_count, i.word_count,
                   i.is_pinned, i.is_favorite, i.is_sensitive, i.copy_count, i.metadata,
                   i.created_at, i.last_used_at
            FROM clipboard_items i
            JOIN clipboard_fts fts ON i.id = fts.id
            WHERE clipboard_fts MATCH ?1
            ORDER BY i.is_pinned DESC, i.last_used_at DESC
            LIMIT ?2
            "#,
        )?;

        let rows = stmt.query_map(params![fts_query, limit], |row| Self::row_to_item(row))?;
        for item in rows {
            items.push(item?);
        }

        // Fallback to LIKE if FTS yielded no results (e.g. punctuation queries)
        if items.is_empty() {
            let like_query = format!("%{}%", query);
            let mut like_stmt = conn.prepare(
                r#"
                SELECT id, content, content_type, category, char_count, word_count,
                       is_pinned, is_favorite, is_sensitive, copy_count, metadata,
                       created_at, last_used_at
                FROM clipboard_items
                WHERE content LIKE ?1
                ORDER BY is_pinned DESC, last_used_at DESC
                LIMIT ?2
                "#,
            )?;
            let like_rows = like_stmt.query_map(params![like_query, limit], |row| Self::row_to_item(row))?;
            for item in like_rows {
                items.push(item?);
            }
        }

        Ok(items)
    }

    pub fn toggle_pin(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE clipboard_items SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?1",
            params![id],
        )?;

        let mut stmt = conn.prepare("SELECT is_pinned FROM clipboard_items WHERE id = ?1")?;
        let is_pinned: i64 = stmt.query_row(params![id], |r| r.get(0))?;
        Ok(is_pinned == 1)
    }

    pub fn toggle_favorite(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE clipboard_items SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?1",
            params![id],
        )?;

        let mut stmt = conn.prepare("SELECT is_favorite FROM clipboard_items WHERE id = ?1")?;
        let is_favorite: i64 = stmt.query_row(params![id], |r| r.get(0))?;
        Ok(is_favorite == 1)
    }

    pub fn delete_item(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM clipboard_items WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn clear_unpinned(&self) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let count = conn.execute("DELETE FROM clipboard_items WHERE is_pinned = 0", [])?;
        Ok(count)
    }

    pub fn prune_old_items(&self, max_items: i64, cutoff_ms: Option<i64>) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let mut pruned = 0;

        if let Some(cutoff) = cutoff_ms {
            pruned += conn.execute(
                "DELETE FROM clipboard_items WHERE is_pinned = 0 AND created_at < ?1",
                params![cutoff],
            )?;
        }

        pruned += conn.execute(
            r#"
            DELETE FROM clipboard_items
            WHERE id IN (
                SELECT id FROM clipboard_items
                WHERE is_pinned = 0
                ORDER BY last_used_at DESC
                LIMIT -1 OFFSET ?1
            )
            "#,
            params![max_items],
        )?;

        Ok(pruned)
    }

    fn row_to_item(row: &rusqlite::Row) -> Result<ClipboardItem> {
        Ok(ClipboardItem {
            id: row.get(0)?,
            content: row.get(1)?,
            content_type: row.get(2)?,
            category: row.get(3)?,
            char_count: row.get(4)?,
            word_count: row.get(5)?,
            is_pinned: row.get::<_, i64>(6)? == 1,
            is_favorite: row.get::<_, i64>(7)? == 1,
            is_sensitive: row.get::<_, i64>(8)? == 1,
            copy_count: row.get(9)?,
            metadata: row.get(10)?,
            created_at: row.get(11)?,
            last_used_at: row.get(12)?,
        })
    }
}
