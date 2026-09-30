import React from 'react';
import { Trash2, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ClearConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  unpinnedCount: number;
  pinnedCount: number;
  clearAll?: boolean;
}

export const ClearConfirmModal: React.FC<ClearConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  unpinnedCount,
  pinnedCount,
  clearAll = false,
}) => {
  if (!isOpen) return null;

  const totalCount = unpinnedCount + pinnedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#1c1622] border border-white/15 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center space-x-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-white">
              {clearAll ? 'Clear All Copy History?' : 'Clear Clipboard History?'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cancel"
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs text-white/70">
          {clearAll ? (
            <p>
              This will permanently remove{' '}
              <strong className="text-white font-semibold">
                all {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </strong>{' '}
              from your copy history{pinnedCount > 0 ? ', including pinned snippets' : ''}.
            </p>
          ) : (
            <>
              <p>
                This will permanently remove{' '}
                <strong className="text-white font-semibold">
                  {unpinnedCount} unpinned {unpinnedCount === 1 ? 'item' : 'items'}
                </strong>{' '}
                from your history.
              </p>

              {pinnedCount > 0 && (
                <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Your <strong className="font-semibold">{pinnedCount} pinned</strong> snippets
                    will remain safe and untouched.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearAll ? 'Clear All History' : 'Clear History'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
