import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { ClipboardItem, CategoryFilter } from '../lib/types';

export function useFuzzySearch(
  items: ClipboardItem[],
  query: string,
  category: CategoryFilter
) {
  // 1. Filter by category
  const categoryFiltered = useMemo(() => {
    if (category === 'all') return items;
    if (category === 'pinned') return items.filter((i) => i.is_pinned);
    if (category === 'favorites') return items.filter((i) => i.is_favorite);
    return items.filter((i) => i.category === category);
  }, [items, category]);

  // 2. Setup Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(categoryFiltered, {
      keys: [
        { name: 'content', weight: 0.7 },
        { name: 'category', weight: 0.15 },
        { name: 'metadata.language', weight: 0.1 },
        { name: 'metadata.domain', weight: 0.1 },
        { name: 'metadata.colorHex', weight: 0.1 },
      ],
      threshold: 0.4,
      distance: 100,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, [categoryFiltered]);

  // 3. Perform search
  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return categoryFiltered;
    }
    return fuse.search(trimmed).map((res) => res.item);
  }, [categoryFiltered, fuse, query]);

  return results;
}
