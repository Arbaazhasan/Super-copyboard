import { useEffect, useState, useCallback } from 'react';
import { ClipboardItem } from '../lib/types';
import { IPC } from '../lib/ipc';

interface UseKeyboardNavProps {
  items: ClipboardItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onPaste: (item: ClipboardItem) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onClearHistory?: () => void;
  onTogglePrivate: () => void;
  onOpenSettings: () => void;
  isModalOpen: boolean;
}

export function useKeyboardNavigation({
  items,
  searchQuery,
  setSearchQuery,
  onPaste,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  onClearHistory,
  onTogglePrivate,
  onOpenSettings,
  isModalOpen,
}: UseKeyboardNavProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Clamp selection index when items change
  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= items.length) {
      setSelectedIndex(items.length - 1);
    }
  }, [items.length, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept navigation if a modal dialog is open
      if (isModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
        }
        return;
      }

      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      // 1. Global hotkey shortcuts
      if (e.ctrlKey && e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        onClearHistory?.();
        return;
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onTogglePrivate();
        return;
      }

      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        onOpenSettings();
        return;
      }


      // 2. Escape key handling - always close window immediately
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        IPC.hideWindow();
        return;
      }

      // 3. Arrow Navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          items.length > 0 ? (prev - 1 + items.length) % items.length : 0
        );
        return;
      }

      // 4. Enter to Paste
      if (e.key === 'Enter') {
        if (items.length > 0 && selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          onPaste(items[selectedIndex]);
        }
        return;
      }

      // 5. Numeric shortcuts 1-9 (Only if Alt/Ctrl is pressed OR not typing in search bar)
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        // If typing in search, only trigger if Ctrl or Alt is held
        if (!isInputFocused || e.altKey || e.ctrlKey) {
          const targetItem = items[num - 1];
          if (targetItem) {
            e.preventDefault();
            onPaste(targetItem);
            return;
          }
        }
      }

      // 6. Action keys when not focused in search input
      if (!isInputFocused) {
        const currentItem = items[selectedIndex];
        if (!currentItem) return;

        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          onTogglePin(currentItem.id);
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          onToggleFavorite(currentItem.id);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onDelete(currentItem.id);
        } else if (e.key === '/') {
          e.preventDefault();
          const searchInput = document.getElementById('copyboard-search');
          if (searchInput) searchInput.focus();
        }
      }
    },
    [
      isModalOpen,
      items,
      selectedIndex,
      searchQuery,
      setSearchQuery,
      onPaste,
      onTogglePin,
      onToggleFavorite,
      onDelete,
      onTogglePrivate,
      onOpenSettings,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  return { selectedIndex, setSelectedIndex };
}
