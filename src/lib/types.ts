export type ContentType = 'text' | 'code' | 'url' | 'email' | 'color';

export type CategoryFilter = 'all' | 'pinned' | 'code' | 'url' | 'color' | 'text' | 'favorites';

export interface ClipboardItemMetadata {
  language?: string;
  domain?: string;
  colorHex?: string;
  rgb?: string;
  [key: string]: unknown;
}

export interface ClipboardItem {
  id: string;
  content: string;
  content_type: ContentType;
  category: string;
  char_count: number;
  word_count: number;
  is_pinned: boolean;
  is_favorite: boolean;
  is_sensitive: boolean;
  copy_count: number;
  metadata?: string | ClipboardItemMetadata;
  created_at: number;
  last_used_at: number;
}

export interface AppSettings {
  historyLimit: number;
  autoDeleteDuration: 'never' | '1h' | '24h' | '7d' | '30d';
  ignorePasswords: boolean;
  theme: 'dark' | 'light' | 'system';
  shortcut: string;
  soundEnabled: boolean;
  pasteMethod: 'auto' | 'wtype' | 'xdotool' | 'manual';
}

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'info' | 'warning';
}
