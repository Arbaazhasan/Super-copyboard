import { ContentType, ClipboardItemMetadata } from './types';

export function parseContent(text: string): {
  type: ContentType;
  category: string;
  metadata?: ClipboardItemMetadata;
} {
  const trimmed = text.trim();

  // 1. Color check (#fff, #ffffff, rgb(...))
  const hexRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
  const rgbRegex = /^(?:rgb|hsl)a?\([\d\s,%.]+\)$/;

  if (hexRegex.test(trimmed)) {
    return {
      type: 'color',
      category: 'color',
      metadata: { colorHex: trimmed },
    };
  }

  if (rgbRegex.test(trimmed)) {
    return {
      type: 'color',
      category: 'color',
      metadata: { rgb: trimmed },
    };
  }

  // 2. URL check
  const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
  if (urlRegex.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return {
        type: 'url',
        category: 'url',
        metadata: { domain: parsed.hostname.replace(/^www\./, '') },
      };
    } catch {
      return { type: 'url', category: 'url' };
    }
  }

  // 3. Email check
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (emailRegex.test(trimmed)) {
    return { type: 'email', category: 'email' };
  }

  // 4. Code snippet heuristics
  const codeIndicators = [
    /^(const|let|var|function|import|export|class|def|async|await)\s/,
    /(=>|\(\)\s*=>|\bconsole\.log\b|\bprint\(|\bdef\s+\w+\()/,
    /(\bSELECT\b|\bFROM\b|\bWHERE\b|\bINSERT\b|\bUPDATE\b)/i,
    /^(sudo\s|git\s|docker\s|npm\s|cargo\s|systemctl\s)/,
    /[{};]\s*$/,
  ];

  if (codeIndicators.some((regex) => regex.test(trimmed)) || (trimmed.includes('{') && trimmed.includes('}'))) {
    let lang = 'code';
    if (/^(sudo\s|git\s|docker\s|npm\s|cargo\s)/.test(trimmed)) lang = 'bash';
    else if (/\bdef\b|\bimport\s+\w+\b|:\n/.test(trimmed)) lang = 'python';
    else if (/\bconst\b|\blet\b|\bfunction\b|=>/.test(trimmed)) lang = 'javascript';
    else if (/\bSELECT\b.*\bFROM\b/i.test(trimmed)) lang = 'sql';
    else if (/\bfn\s+main\b|\blet mut\b/.test(trimmed)) lang = 'rust';

    return {
      type: 'code',
      category: 'code',
      metadata: { language: lang },
    };
  }

  return { type: 'text', category: 'text' };
}

export function formatRelativeTime(timestampMs: number): string {
  const diff = Date.now() - timestampMs;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;

  return new Date(timestampMs).toLocaleDateString();
}

export function truncateText(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
