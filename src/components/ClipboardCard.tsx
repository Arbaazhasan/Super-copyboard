import React, { useState } from 'react';
import { ClipboardItem } from '../lib/types';
import { formatRelativeTime } from '../lib/parsers';
import { Pin, Trash2, Bookmark } from 'lucide-react';

interface ClipboardCardProps {
  item: ClipboardItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onPaste: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

export const ClipboardCard: React.FC<ClipboardCardProps> = ({
  item,
  isSelected,
  onPaste,
  onTogglePin,
  onToggleFavorite,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setTimeout(() => {
      onDelete();
    }, 70);
  };

  // Syntax highlighter for code snippet
  const renderCodeSnippet = (code: string) => {
    if (code.includes('def main()') || code.includes('print(')) {
      return (
        <pre className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre font-normal">
          <span>
            <span className="text-[#38bdf8]">def</span>{' '}
            <span className="text-[#a3e635]">main</span>
            <span className="text-white/80">():</span>
          </span>
          {'\n'}
          <span>
            {'    '}
            <span className="text-[#4ade80]">print</span>
            <span className="text-white/80">(</span>
            <span className="text-[#fb923c]">"Copyboard v1.0"</span>
            <span className="text-white/80">)</span>
          </span>
        </pre>
      );
    }

    return (
      <pre className="font-mono text-xs leading-relaxed text-emerald-300/90 whitespace-pre-wrap line-clamp-6 overflow-hidden break-words">
        {code}
      </pre>
    );
  };

  return (
    <div
      onClick={!isDeleting ? onPaste : undefined}
      aria-label="Clipboard entry"
      className={`group relative mx-5 mb-3 p-4 rounded-2xl border transition-all duration-100 cursor-pointer ${
        isDeleting ? 'opacity-0 scale-95 pointer-events-none' : ''
      } ${
        isSelected
          ? 'bg-[#2f2536]/90 border-white/25 shadow-lg scale-[1.008]'
          : 'bg-[#231b27]/70 hover:bg-[#2a2130]/85 border-white/10 hover:border-white/20 active:scale-[0.99]'
      }`}
    >
      <div className="flex items-start justify-between">
        {/* Left Content Area */}
        <div className="flex-1 pr-3 overflow-hidden pointer-events-none">
          {item.content_type === 'color' ? (
            <div className="flex items-center space-x-3.5 py-1">
              <div
                className="w-11 h-11 rounded-xl shadow-md border border-white/15 flex-shrink-0"
                style={{ backgroundColor: item.content }}
              />
              <span className="font-mono text-sm font-normal text-white">
                {item.content}
              </span>
            </div>
          ) : item.content_type === 'url' ? (
            <div className="flex items-center space-x-2.5 py-1">
              <span className="px-2.5 py-0.5 bg-[#10b981] text-white text-[11px] font-bold rounded-full uppercase tracking-wider flex-shrink-0 shadow-sm">
                URL
              </span>
              <span className="font-mono text-xs sm:text-sm text-white/95 truncate">
                {item.content}
              </span>
            </div>
          ) : item.content_type === 'code' ? (
            <div className="py-0.5">{renderCodeSnippet(item.content)}</div>
          ) : (
            <div className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal whitespace-pre-line line-clamp-6 overflow-hidden break-words py-0.5">
              {item.content}
            </div>
          )}
        </div>

        {/* Right Side Icons & Timestamp */}
        <div className="flex flex-col items-end space-y-2 flex-shrink-0 pl-1">
          {/* Top row: relative timestamp, pin, delete */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-white/40 font-normal">
              {formatRelativeTime(item.last_used_at)}
            </span>

            {/* Pin action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              aria-label={item.is_pinned ? 'Unpin item' : 'Pin item'}
              className="p-1 text-white/40 hover:text-white transition-colors"
            >
              <Pin
                className={`w-3.5 h-3.5 ${
                  item.is_pinned
                    ? 'text-white fill-white'
                    : 'text-white/40 hover:text-white -rotate-45'
                }`}
              />
            </button>

            {/* Trash action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
              aria-label="Delete item"
              className="p-1 text-white/40 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom row: Bookmark/favorite action */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              aria-label={item.is_favorite ? 'Remove bookmark' : 'Bookmark snippet'}
              className="p-1 text-white/40 hover:text-white transition-colors"
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  item.is_favorite ? 'text-white/80 fill-white/80' : 'text-white/40'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

