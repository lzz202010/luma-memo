import { AppSettings, BackupPayload, Memo } from '../types/memo';
import { createId, extractTags } from '../utils/tags';

const DB_NAME = 'luma-memo-db';
const DB_VERSION = 1;
const STORE_NAME = 'memos';
const FALLBACK_KEY = 'luma_memo_fallback_v1';
const INIT_FLAG_KEY = 'luma_initialized_v1';

function createStarterMemos(): Memo[] {
  const now = Date.now();
  return [
    {
      id: createId('welcome'),
      content:
        '为什么 iOS Safari 里的 100vh 经常被底部工具栏遮挡？如果要写一个全屏输入框，100dvh 和 visualViewport 应该怎么配合？ #问题 #待问AI',
      tags: ['问题', '待问AI'],
      pinned: true,
      createdAt: now - 1000 * 60 * 12,
      updatedAt: now - 1000 * 60 * 12,
      aiThread: [],
      aiCollapsed: false,
    },
    {
      id: createId('tip'),
      content:
        '在右上角「设置」里填入你的 API Key 或本地 Ollama 地址后，可以直接点每张卡片的「问 AI」流式解答；也可以点「模板复制」，一键带提示词粘贴给外部 AI App。在 Safari 分享菜单点「添加到主屏幕」，即可全屏秒开。 #灵感 #使用指南',
      tags: ['灵感', '使用指南'],
      pinned: false,
      createdAt: now - 1000 * 60 * 35,
      updatedAt: now - 1000 * 60 * 35,
      aiThread: [],
      aiCollapsed: false,
    },
  ];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function readFallbackMemos(): Memo[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackMemos(memos: Memo[]): void {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(memos));
  } catch {
    // Ignore storage errors
  }
}

function normalizeMemo(raw: Memo): Memo {
  return {
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : extractTags(raw.content || ''),
    pinned: Boolean(raw.pinned),
    aiThread: Array.isArray(raw.aiThread) ? raw.aiThread : [],
    aiCollapsed: Boolean(raw.aiCollapsed),
  };
}

export function sortMemos(memos: Memo[]): Memo[] {
  return [...memos].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
}

export async function getAllMemos(): Promise<Memo[]> {
  let memos: Memo[] = [];
  let dbWorked = false;

  try {
    const db = await openDb();
    memos = await new Promise<Memo[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Memo[]).map(normalizeMemo));
      req.onerror = () => reject(req.error);
    });
    dbWorked = true;
    db.close();
  } catch {
    memos = readFallbackMemos().map(normalizeMemo);
  }

  const alreadyInitialized = localStorage.getItem(INIT_FLAG_KEY) === '1';
  if (!alreadyInitialized && memos.length === 0) {
    const starters = createStarterMemos();
    localStorage.setItem(INIT_FLAG_KEY, '1');
    if (dbWorked) {
      await bulkPutMemos(starters);
    } else {
      writeFallbackMemos(starters);
    }
    return sortMemos(starters);
  }

  if (!alreadyInitialized && memos.length > 0) {
    localStorage.setItem(INIT_FLAG_KEY, '1');
  }

  return sortMemos(memos);
}

export async function putMemo(memo: Memo): Promise<void> {
  localStorage.setItem(INIT_FLAG_KEY, '1');
  const normalized = normalizeMemo(memo);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(normalized);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const existing = readFallbackMemos();
    const idx = existing.findIndex((item) => item.id === normalized.id);
    if (idx >= 0) {
      existing[idx] = normalized;
    } else {
      existing.unshift(normalized);
    }
    writeFallbackMemos(existing);
  }
}

export async function deleteMemoById(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const existing = readFallbackMemos().filter((item) => item.id !== id);
    writeFallbackMemos(existing);
  }
}

export async function bulkPutMemos(memos: Memo[]): Promise<void> {
  localStorage.setItem(INIT_FLAG_KEY, '1');
  const normalized = memos.map(normalizeMemo);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const memo of normalized) {
        store.put(memo);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const existingMap = new Map(readFallbackMemos().map((m) => [m.id, m]));
    for (const memo of normalized) {
      existingMap.set(memo.id, memo);
    }
    writeFallbackMemos(Array.from(existingMap.values()));
  }
}

export function buildJsonBackup(memos: Memo[], settings: AppSettings): string {
  // Strip API keys from exported settings if user wants safe sharing? Keep full backup for local restore,
  // or preserve as-is since it's a personal local backup file.
  const payload: BackupPayload = {
    version: 1,
    exportedAt: Date.now(),
    memos,
    settings,
  };
  return JSON.stringify(payload, null, 2);
}

export function buildMarkdownExport(memos: Memo[]): string {
  const sorted = sortMemos(memos);
  const lines: string[] = [
    '# 拾光 · 灵感备忘录导出',
    '',
    `> 导出时间：${new Date().toLocaleString('zh-CN')}`,
    '',
  ];

  for (const memo of sorted) {
    const dateStr = new Date(memo.createdAt).toLocaleString('zh-CN');
    lines.push(`## ${memo.pinned ? '📌 ' : ''}${dateStr}`);
    lines.push('');
    lines.push(memo.content);
    lines.push('');
    if (memo.aiThread.length > 0) {
      lines.push('### AI 对话记录');
      lines.push('');
      for (const msg of memo.aiThread) {
        const speaker = msg.role === 'user' ? '追问' : `AI (${msg.model || '助手'})`;
        lines.push(`**${speaker}：**`);
        lines.push('');
        lines.push(msg.content);
        lines.push('');
      }
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
