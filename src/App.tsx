import { useState, useCallback, useMemo, useRef } from 'react';
import { useClipboardHistory } from './hooks/useClipboardHistory';
import { useFuzzySearch } from './hooks/useFuzzySearch';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useSettings } from './hooks/useSettings';
import { CategoryFilter, ClipboardItem, ToastMessage } from './lib/types';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { ClipboardCard } from './components/ClipboardCard';
import { QuickActionsBar } from './components/QuickActionsBar';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { IPC } from './lib/ipc';

export function App() {
  const {
    items,
    isLoading,
    isPrivateMode,
    paste,
    togglePin,
    toggleFavorite,
    deleteItem,
    clearHistory,
    togglePrivateMode,
  } = useClipboardHistory();

  const { settings, updateSetting } = useSettings();

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [isClearAll, setIsClearAll] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ id: String(Date.now()), text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 1500);
  }, []);


  // Filter items using fuzzy search and category
  const filteredItems = useFuzzySearch(items, searchQuery, selectedCategory);

  const categoryCounts = useMemo(() => {
    return {
      all: items.length,
      pinned: items.filter((i) => i.is_pinned).length,
      code: items.filter((i) => i.category === 'code').length,
      url: items.filter((i) => i.category === 'url').length,
      color: items.filter((i) => i.category === 'color').length,
      text: items.filter((i) => i.category === 'text').length,
      favorites: items.filter((i) => i.is_favorite).length,
    };
  }, [items]);

  // Click on card: copy to clipboard and close window immediately!
  const handlePaste = useCallback(
    async (item: ClipboardItem) => {
      await paste(item);
      IPC.hideWindow();
    },
    [paste]
  );

  const handleTogglePin = useCallback(
    async (id: string) => {
      await togglePin(id);
      const item = items.find((i) => i.id === id);
      showToast(item?.is_pinned ? 'Unpinned' : 'Pinned');
    },
    [togglePin, items, showToast]
  );

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      await toggleFavorite(id);
      const item = items.find((i) => i.id === id);
      showToast(item?.is_favorite ? 'Removed from favorites' : 'Saved to favorites');
    },
    [toggleFavorite, items, showToast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem(id);
      showToast('Item deleted', 'info');
    },
    [deleteItem, showToast]
  );

  const handleTogglePrivate = useCallback(async () => {
    await togglePrivateMode();
    showToast(!isPrivateMode ? 'Private Mode ON 🔒' : 'Private Mode OFF 🔓', 'info');
  }, [togglePrivateMode, isPrivateMode, showToast]);

  const unpinnedCount = useMemo(() => items.filter((i) => !i.is_pinned).length, [items]);
  const pinnedCount = useMemo(() => items.filter((i) => i.is_pinned).length, [items]);

  const handleConfirmClear = useCallback(async () => {
    await clearHistory(isClearAll);
    showToast(isClearAll ? 'All copy history cleared' : 'Clipboard history cleared', 'info');
  }, [clearHistory, isClearAll, showToast]);

  const { selectedIndex, setSelectedIndex } = useKeyboardNavigation({
    items: filteredItems,
    searchQuery,
    setSearchQuery,
    onPaste: handlePaste,
    onTogglePin: handleTogglePin,
    onToggleFavorite: handleToggleFavorite,
    onDelete: handleDelete,
    onClearHistory: () => {
      if (items.length > 0) {
        setIsClearAll(true);
        setIsClearConfirmOpen(true);
      }
    },
    onTogglePrivate: handleTogglePrivate,
    onOpenSettings: () => setIsSettingsOpen(true),
    isModalOpen: isSettingsOpen || isShortcutsOpen || isClearConfirmOpen,
  });

  return (
    <div className="w-screen h-screen flex flex-col copyboard-window select-none overflow-hidden text-white font-ubuntu border border-white/10">
      {/* Header with window controls, clear action & search input */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setSelectedIndex(0);
        }}
        onClose={() => IPC.hideWindow()}
        onMinimize={() => IPC.hideWindow()}
        totalItems={items.length}
        unpinnedCount={unpinnedCount}
        onClearHistory={() => {
          setIsClearAll(true);
          setIsClearConfirmOpen(true);
        }}
      />

      {/* Text Category Tabs with active underline */}
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setSelectedIndex(0);
        }}
        counts={categoryCounts}
      />

      {/* History Cards Scrollable Area */}
      <main className="flex-1 overflow-y-auto py-2 no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-xs text-white/40 animate-pulse">
            Loading clipboard history...
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            isSearch={Boolean(searchQuery)}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
          />
        ) : (
          filteredItems.map((item, idx) => (
            <ClipboardCard
              key={item.id}
              item={item}
              index={idx}
              isSelected={selectedIndex === idx}
              onSelect={() => setSelectedIndex(idx)}
              onPaste={() => handlePaste(item)}
              onTogglePin={() => handleTogglePin(item.id)}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          ))
        )}
      </main>

      {/* Bottom Quick Actions Bar */}
      <QuickActionsBar
        totalItems={items.length}
        unpinnedCount={unpinnedCount}
        isPrivateMode={isPrivateMode}
        onTogglePrivate={handleTogglePrivate}
        onClearHistory={() => {
          setIsClearAll(false);
          setIsClearConfirmOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsShortcutsOpen(true)}
      />

      {/* Clear History Confirmation Modal */}
      <ClearConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleConfirmClear}
        unpinnedCount={unpinnedCount}
        pinnedCount={pinnedCount}
        clearAll={isClearAll}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSetting={updateSetting}
      />

      {/* Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Action Toast */}
      <Toast toast={toast} />
    </div>
  );
}

export default App;

