import React from 'react';
import { Clipboard, SearchX } from 'lucide-react';

interface EmptyStateProps {
  isSearch: boolean;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isSearch,
  searchQuery,
  onClearSearch,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center my-auto h-64">
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-yaru-orange">
        {isSearch ? <SearchX className="w-6 h-6" /> : <Clipboard className="w-6 h-6" />}
      </div>

      <h3 className="text-sm font-medium text-white mb-1">
        {isSearch ? 'No matching clipboard items' : 'Clipboard history is empty'}
      </h3>

      <p className="text-xs text-yaru-textMuted max-w-xs mb-4">
        {isSearch
          ? `No items found matching "${searchQuery}". Try searching with different keywords.`
          : 'Items you copy (text, code, URLs, colors) will automatically appear here.'}
      </p>

      {isSearch && onClearSearch && (
        <button
          onClick={onClearSearch}
          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium transition-colors"
        >
          Clear search query
        </button>
      )}
    </div>
  );
};
