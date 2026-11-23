/**
 * Extract unique #tag tokens from memo content.
 * Supports Chinese/CJK characters, letters, digits, underscores, and hyphens.
 */
export function extractTags(content: string): string[] {
  const regex = /(?:^|[\s\u3000])#([\p{L}\p{N}_-]{1,32})/gu;
  const seen = new Set<string>();
  const result: string[] = [];

  for (const match of content.matchAll(regex)) {
    const tag = match[1];
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

/**
 * Generate a compact unique ID without external libraries.
 */
export function createId(prefix = 'm'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Format timestamp into friendly Chinese relative time.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 45) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 6) return `${diffHour} 小时前`;

  const date = new Date(timestamp);
  const today = new Date(now);
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return `今天 ${hh}:${mm}`;
  }

  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return `昨天 ${hh}:${mm}`;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (date.getFullYear() === today.getFullYear()) {
    return `${month}月${day}日 ${hh}:${mm}`;
  }

  return `${date.getFullYear()}年${month}月${day}日`;
}
