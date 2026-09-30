import React from 'react';
import { Search, X, ClipboardList, Trash2 } from 'lucide-react';
import { IPC } from '../lib/ipc';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClose?: () => void;
  onMinimize?: () => void;
  totalItems?: number;
  unpinnedCount?: number;
  onClearHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onClose,
  totalItems,
  unpinnedCount = 0,
  onClearHistory,
}) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      IPC.hideWindow();
    }
  };

  const hasItemsToClear = totalItems !== undefined ? totalItems > 0 : unpinnedCount > 0;

  return (
    <div className="px-5 pt-3.5 pb-2">
      {/* Sleek OS App Header Bar */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-[#E95420]/20 border border-[#E95420]/30 flex items-center justify-center text-[#E95420]">
            <ClipboardList className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-xs tracking-wide text-white/90">Copyboard</span>
          <span className="text-[10px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
            Super+V
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {hasItemsToClear && onClearHistory && (
            <button
              onClick={onClearHistory}
              aria-label="Clear all copy history"
              className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>


      {/* Search Bar matching screenshot */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-white/40 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          id="copyboard-search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }
          }}
          placeholder="Search history or Ctrl+Space"
          autoFocus
          className="w-full pl-10 pr-24 py-2.5 bg-[#17121b]/80 border border-white/10 hover:border-white/20 focus:border-yaru-orange/60 rounded-xl text-sm text-white placeholder-white/40 outline-none transition-all shadow-inner"
        />

        {/* Right Badge: Ctrl + /V */}
        <div className="absolute right-3 flex items-center space-x-1 pointer-events-none">
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="pointer-events-auto p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/50 font-mono">
              <span>Ctrl</span>
              <span>+</span>
              <span>/V</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
