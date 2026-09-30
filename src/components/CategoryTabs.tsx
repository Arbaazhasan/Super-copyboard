import React from 'react';
import { CategoryFilter } from '../lib/types';

interface CategoryTabsProps {
  selectedCategory: CategoryFilter;
  onSelectCategory: (category: CategoryFilter) => void;
  counts?: Record<CategoryFilter, number>;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const tabs: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pinned', label: 'Pinned' },
    { id: 'code', label: 'Code' },
    { id: 'url', label: 'Links' },
    { id: 'color', label: 'Colors' },
  ];

  return (
    <div className="flex items-center justify-around px-8 pt-2 border-b border-white/10">
      {tabs.map((tab) => {
        const isSelected = selectedCategory === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectCategory(tab.id)}
            className={`relative pb-2.5 text-sm font-normal transition-colors cursor-pointer ${
              isSelected ? 'text-white font-medium' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <span>{tab.label}</span>
            {/* Active underline indicator */}
            {isSelected && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
