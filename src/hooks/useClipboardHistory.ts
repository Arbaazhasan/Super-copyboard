import { useState, useEffect, useCallback } from 'react';
import { ClipboardItem } from '../lib/types';
import { IPC } from '../lib/ipc';

export function useClipboardHistory() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);

  const loadItems = useCallback(async () => {
    try {
      const data = await IPC.getItems(100);
      setItems((prev) => {
        if (
          prev.length === data.length &&
          prev.every(
            (item, i) =>
              item.id === data[i]?.id &&
              item.last_used_at === data[i]?.last_used_at &&
              item.is_pinned === data[i]?.is_pinned &&
              item.is_favorite === data[i]?.is_favorite
          )
        ) {
          return prev;
        }
        return data;
      });
      const priv = await IPC.getPrivateMode();
      setIsPrivateMode(priv);
    } catch (err) {
      console.error('Failed to load clipboard items:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncClipboardFromOS = useCallback(async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          await IPC.addItem(text.trim());
        }
      }
    } catch {
      // ignore
    }
    await loadItems();
  }, [loadItems]);

  useEffect(() => {
    syncClipboardFromOS();

    // Auto-refresh and sync when window gains focus
    const onFocus = () => syncClipboardFromOS();
    window.addEventListener('focus', onFocus);

    // Periodic refresh from daemon every 800ms
    const timer = setInterval(() => {
      loadItems();
    }, 800);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [syncClipboardFromOS, loadItems]);

  const paste = useCallback(async (item: ClipboardItem) => {
    await IPC.pasteItem(item.content);
  }, []);

  const togglePin = useCallback(async (id: string) => {
    const isPinned = await IPC.togglePin(id);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_pinned: isPinned } : i))
    );
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const isFav = await IPC.toggleFavorite(id);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_favorite: isFav } : i))
    );
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await IPC.deleteItem(id);
  }, []);

  const clearHistory = useCallback(async (clearAll = false) => {
    if (clearAll) {
      setItems([]);
    } else {
      setItems((prev) => prev.filter((i) => i.is_pinned));
    }
    await IPC.clearHistory(clearAll);
  }, []);


  const togglePrivateMode = useCallback(async () => {
    const nextState = !isPrivateMode;
    await IPC.setPrivateMode(nextState);
    setIsPrivateMode(nextState);
  }, [isPrivateMode]);

  return {
    items,
    isLoading,
    isPrivateMode,
    paste,
    togglePin,
    toggleFavorite,
    deleteItem,
    clearHistory,
    togglePrivateMode,
    refresh: loadItems,
  };
}
