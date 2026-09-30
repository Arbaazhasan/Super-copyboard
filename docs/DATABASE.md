# Copyboard Database Schema & Storage Architecture

## Storage Engine

Copyboard uses embedded **SQLite 3** with the **FTS5** (Full-Text Search 5) extension. The database file is located according to the XDG Base Directory specification:

```
$XDG_DATA_HOME/copyboard/copyboard.db
# Defaults to: ~/.local/share/copyboard/copyboard.db
```

---

## Schema Definition

```sql
-- 1. Main clipboard history table
CREATE TABLE IF NOT EXISTS clipboard_items (
    id TEXT PRIMARY KEY NOT NULL,              -- UUIDv4 string identifier
    content TEXT NOT NULL,                     -- Full text or snippet payload
    content_type TEXT NOT NULL,                -- 'text', 'code', 'url', 'email', 'color'
    category TEXT NOT NULL DEFAULT 'text',     -- Filter category
    char_count INTEGER NOT NULL,               -- Length of content
    word_count INTEGER NOT NULL,               -- Word count
    is_pinned BOOLEAN NOT NULL DEFAULT 0,      -- 1 = Pinned, 0 = Unpinned
    is_favorite BOOLEAN NOT NULL DEFAULT 0,    -- 1 = Favorite, 0 = Standard
    is_sensitive BOOLEAN NOT NULL DEFAULT 0,   -- 1 = Masked/Sensitive password/token
    copy_count INTEGER NOT NULL DEFAULT 1,     -- Times copied or selected
    metadata TEXT,                             -- JSON payload: { language, domain, hex, rgb }
    created_at INTEGER NOT NULL,               -- Milliseconds since Unix epoch
    last_used_at INTEGER NOT NULL              -- Milliseconds since Unix epoch
);

-- 2. Performance Indices
CREATE INDEX IF NOT EXISTS idx_items_created_at ON clipboard_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_last_used ON clipboard_items (last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_is_pinned ON clipboard_items (is_pinned);
CREATE INDEX IF NOT EXISTS idx_items_category ON clipboard_items (category);
CREATE INDEX IF NOT EXISTS idx_items_content ON clipboard_items (content);

-- 3. Full-Text Search (FTS5) Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS clipboard_fts USING fts5(
    id UNINDEXED,
    content,
    category,
    tokenize='unicode61 remove_diacritics 1'
);

-- 4. FTS Synchronization Triggers
CREATE TRIGGER IF NOT EXISTS trg_clipboard_insert AFTER INSERT ON clipboard_items BEGIN
    INSERT INTO clipboard_fts(id, content, category) VALUES (new.id, new.content, new.category);
END;

CREATE TRIGGER IF NOT EXISTS trg_clipboard_delete AFTER DELETE ON clipboard_items BEGIN
    DELETE FROM clipboard_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_clipboard_update AFTER UPDATE ON clipboard_items BEGIN
    DELETE FROM clipboard_fts WHERE id = old.id;
    INSERT INTO clipboard_fts(id, content, category) VALUES (new.id, new.content, new.category);
END;

-- 5. Persistent Key-Value Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
```

---

## Example Queries

### 1. Fetching Recent History with Pagination
```sql
SELECT * FROM clipboard_items
ORDER BY is_pinned DESC, last_used_at DESC
LIMIT 50 OFFSET 0;
```

### 2. High-Performance Full-Text Search
```sql
SELECT i.* FROM clipboard_items i
JOIN clipboard_fts fts ON i.id = fts.id
WHERE clipboard_fts MATCH 'cargo build*'
ORDER BY i.is_pinned DESC, i.last_used_at DESC
LIMIT 50;
```

### 3. Category Filter
```sql
SELECT * FROM clipboard_items
WHERE category = 'code'
ORDER BY is_pinned DESC, last_used_at DESC
LIMIT 50;
```

### 4. Pruning History (Preserving Pinned Items)
```sql
-- Delete unpinned items older than 7 days
DELETE FROM clipboard_items
WHERE is_pinned = 0 AND created_at < :cutoff_timestamp;

-- Enforce maximum history limit (e.g., 500 items)
DELETE FROM clipboard_items
WHERE id IN (
    SELECT id FROM clipboard_items
    WHERE is_pinned = 0
    ORDER BY last_used_at DESC
    LIMIT -1 OFFSET 500
);
```
