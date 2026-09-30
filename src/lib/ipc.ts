import { ClipboardItem } from './types';
import { parseContent } from './parsers';

const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const DAEMON_URL = 'http://127.0.0.1:1421';

async function fetchDaemon<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${DAEMON_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // Daemon not running or network error, fallback to localStorage
  }
  return null;
}

let _saveStorageTimeout: ReturnType<typeof setTimeout> | null = null;
let _cachedLocalItems: ClipboardItem[] | null = null;

function getStoredItems(): ClipboardItem[] {
  if (_cachedLocalItems) {
    return _cachedLocalItems;
  }
  try {
    const stored = localStorage.getItem('copyboard_history');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        _cachedLocalItems = parsed;
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  _cachedLocalItems = [];
  return [];
}

function saveStoredItems(items: ClipboardItem[], immediate = false): void {
  _cachedLocalItems = items;
  if (_saveStorageTimeout) {
    clearTimeout(_saveStorageTimeout);
    _saveStorageTimeout = null;
  }
  const flush = () => {
    try {
      localStorage.setItem('copyboard_history', JSON.stringify(items));
    } catch {
      // ignore
    }
  };
  if (immediate) {
    flush();
  } else {
    _saveStorageTimeout = setTimeout(flush, 200);
  }
}


export const IPC = {
  isNative: isTauriEnv,

  async getItems(limit = 100, category?: string): Promise<ClipboardItem[]> {
    if (isTauriEnv) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<ClipboardItem[]>('get_items', { limit, category });
    }

    // 1. Try local clipboard daemon (captures real Ubuntu OS clipboard)
    const daemonItems = await fetchDaemon<ClipboardItem[]>('/api/items');
    if (daemonItems && Array.isArray(daemonItems)) {
      saveStoredItems(daemonItems); // Sync to local cache
      let filtered = daemonItems;
      if (category && category !== 'all') {
        if (category === 'pinned') filtered = filtered.filter((i) => i.is_pinned);
        else if (category === 'favorites') filtered = filtered.filter((i) => i.is_favorite);
        else filtered = filtered.filter((i) => i.category === category);
      }
      return filtered.slice(0, limit);
    }

    // 2. Fallback to localStorage cache
    const stored = getStoredItems();
    let filtered = stored;
    if (category && category !== 'all') {
      if (category === 'pinned') filtered = filtered.filter((i) => i.is_pinned);
      else if (category === 'favorites') filtered = filtered.filter((i) => i.is_favorite);
      else filtered = filtered.filter((i) => i.category === category);
    }
    return filtered.slice(0, limit);
  },

  async addItem(content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) return;

    // 1. Send to daemon
    fetchDaemon('/api/add', {
      method: 'POST',
      body: JSON.stringify({ content: trimmed }),
    }).catch(() => {});

    // 2. Always update localStorage cache
    const items = getStoredItems();
    const now = Date.now();
    const existingIndex = items.findIndex((i) => i.content === trimmed);

    if (existingIndex > -1) {
      const item = items[existingIndex];
      item.copy_count = (item.copy_count || 1) + 1;
      item.last_used_at = now;
      items.splice(existingIndex, 1);
      items.unshift(item);
    } else {
      const parsed = parseContent(trimmed);
      const newItem: ClipboardItem = {
        id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7),
        content: trimmed,
        content_type: parsed.type,
        category: parsed.category,
        char_count: trimmed.length,
        word_count: trimmed.split(/\s+/).filter(Boolean).length,
        is_pinned: false,
        is_favorite: false,
        is_sensitive: false,
        copy_count: 1,
        metadata: parsed.metadata,
        created_at: now,
        last_used_at: now,
      };
      items.unshift(newItem);
    }

    saveStoredItems(items.slice(0, 1000));
  },

  async pasteItem(content: string): Promise<void> {
    // 1. Copy to browser/DOM clipboard
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(content);
      } catch {
        // ignore
      }
    }

    // 2. In Tauri mode
    if (isTauriEnv) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('paste_item', { content });
      return;
    }

    // 3. In daemon mode: sync to OS clipboard buffer via CopyQ & GTK
    await fetchDaemon('/api/copy', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    // Update copy count locally
    const items = getStoredItems();
    const item = items.find((i) => i.content === content);
    if (item) {
      item.copy_count = (item.copy_count || 1) + 1;
      item.last_used_at = Date.now();
      saveStoredItems(items);
    }
  },

  async togglePin(id: string): Promise<boolean> {
    if (isTauriEnv) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<boolean>('toggle_pin', { id });
    }

    // Update locally
    const items = getStoredItems();
    let isPinned = false;
    const item = items.find((i) => i.id === id);
    if (item) {
      item.is_pinned = !item.is_pinned;
      isPinned = item.is_pinned;
      saveStoredItems(items);
    }

    const res = await fetchDaemon<{ is_pinned: boolean }>('/api/pin', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });

    return res?.is_pinned ?? isPinned;
  },

  async toggleFavorite(id: string): Promise<boolean> {
    if (isTauriEnv) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke<boolean>('toggle_favorite', { id });
    }

    // Update locally
    const items = getStoredItems();
    let isFav = false;
    const item = items.find((i) => i.id === id);
    if (item) {
      item.is_favorite = !item.is_favorite;
      isFav = item.is_favorite;
      saveStoredItems(items);
    }

    const res = await fetchDaemon<{ is_favorite: boolean }>('/api/favorite', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });

    return res?.is_favorite ?? isFav;
  },

  async deleteItem(id: string): Promise<void> {
    if (isTauriEnv) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('delete_item', { id });
    }

    // Update locally with debounced write
    const items = getStoredItems().filter((i) => i.id !== id);
    saveStoredItems(items, false);

    await fetchDaemon('/api/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  async deleteBatch(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    const items = getStoredItems().filter((i) => !idSet.has(i.id));
    saveStoredItems(items, true);

    await fetchDaemon('/api/delete_batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  async clearHistory(clearAll = false): Promise<void> {
    if (isTauriEnv) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('clear_history', { clearAll });
    }

    // Keep pinned items unless clearAll is requested
    const items = clearAll ? [] : getStoredItems().filter((i) => i.is_pinned);
    saveStoredItems(items, true);

    await fetchDaemon('/api/clear', {
      method: 'POST',
      body: JSON.stringify({ all: clearAll }),
    });
  },


  async hideWindow(): Promise<void> {
    // 1. Instant native WebKit message handler
    try {
      (window as any).webkit?.messageHandlers?.copyboard?.postMessage('hide');
    } catch {
      // ignore
    }

    // 2. In Tauri mode
    if (isTauriEnv) {
      const { invoke } = await import('@tauri-apps/api/core');
      return invoke('hide_window');
    }

    // 3. In daemon mode
    try {
      fetch(`${DAEMON_URL}/api/hide`, { method: 'POST' }).catch(() => {});
      fetch(`${DAEMON_URL}/api/close`, { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    }
  },

  async setPrivateMode(enabled: boolean): Promise<boolean> {
    localStorage.setItem('copyboard_private', enabled ? 'true' : 'false');
    return enabled;
  },

  async getPrivateMode(): Promise<boolean> {
    return localStorage.getItem('copyboard_private') === 'true';
  },
};
