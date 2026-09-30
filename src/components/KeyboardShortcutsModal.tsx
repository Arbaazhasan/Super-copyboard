import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Super + V', desc: 'Open / toggle Copyboard popup' },
    { key: '1 - 9', desc: 'Quick paste item by index number' },
    { key: '↑ / ↓', desc: 'Navigate up / down through items' },
    { key: 'Enter', desc: 'Paste currently selected item' },
    { key: 'P', desc: 'Toggle Pin on selected item' },
    { key: 'F', desc: 'Toggle Favorite on selected item' },
    { key: 'Delete / Backspace', desc: 'Delete selected item' },
    { key: 'Ctrl + Shift + Del', desc: 'Clear history (Keeps pinned)' },
    { key: '/ or Ctrl + F', desc: 'Focus search input' },
    { key: 'Ctrl + Shift + P', desc: 'Toggle Incognito / Private Mode' },
    { key: 'Esc', desc: 'Close Copyboard or clear search' },
  ];


  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[88vh] flex flex-col bg-yaru-cardBg border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4 text-yaru-orange" />
            <h2 className="text-sm font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts"
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-white/5 text-xs no-scrollbar">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="py-2 flex items-center justify-between">
              <span className="text-white/70">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[11px] text-white whitespace-nowrap">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-yaru-darkBg/95 border-t border-white/10 text-center">
          <button
            onClick={onClose}
            className="w-full py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

};
