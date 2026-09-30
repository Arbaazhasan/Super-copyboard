import React from 'react';
import { Trash2, Settings, HelpCircle, Shield } from 'lucide-react';

interface QuickActionsBarProps {
  totalItems: number;
  unpinnedCount: number;
  isPrivateMode: boolean;
  onTogglePrivate: () => void;
  onClearHistory: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  totalItems,
  unpinnedCount,
  isPrivateMode,
  onTogglePrivate,
  onClearHistory,
  onOpenSettings,
  onOpenHelp,
}) => {
  return (
    <footer className="px-4 py-2 bg-[#17121b]/95 border-t border-white/10 flex items-center justify-between text-xs text-white/50 select-none">
      <div className="flex items-center space-x-2">
        <span className="font-medium text-white/70">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
        {unpinnedCount > 0 && (
          <>
            <span>•</span>
            <button
              onClick={onClearHistory}
              aria-label="Clear unpinned history"
              className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          </>
        )}
      </div>

      <div className="flex items-center space-x-1.5">
        {/* Private Mode quick toggle */}
        <button
          onClick={onTogglePrivate}
          aria-label={isPrivateMode ? 'Disable Private Mode' : 'Enable Private Mode'}
          className={`p-1.5 rounded-lg transition-colors ${
            isPrivateMode
              ? 'text-red-400 bg-red-500/10'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
        </button>

        {/* Keyboard shortcut help */}
        <button
          onClick={onOpenHelp}
          aria-label="View Keyboard Shortcuts"
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Settings gear */}
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};

