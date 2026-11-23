import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Composer, loadDraft, saveDraft } from './components/Composer';
import { Header } from './components/Header';
import { MemoCard } from './components/MemoCard';
import { SettingsSheet } from './components/SettingsSheet';
import { TagFilterBar } from './components/TagFilterBar';
import { Toast } from './components/Toast';
import { bulkPutMemos, deleteMemoById, getAllMemos, putMemo, sortMemos } from './db/memoDb';
import { useVisualViewport } from './hooks/useVisualViewport';
import { ChatTurn, streamChatCompletion } from './services/aiClient';
import { AiMessage, AppSettings, Memo } from './types/memo';
import { applyPromptTemplate, copyText, formatMultiMemoCopy } from './utils/clipboard';
import { loadSettings, saveSettings } from './utils/settings';
import { createId, extractTags } from './utils/tags';

export function App() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [draft, setDraft] = useState<string>(() => loadDraft());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('__all__');
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [streamingIds, setStreamingIds] = useState<Record<string, boolean>>({});
  const [shouldFocusComposer, setShouldFocusComposer] = useState(false);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const toastTimerRef = useRef<number | null>(null);
  const memosRef = useRef<Memo[]>([]);
  memosRef.current = memos;

  const { keyboardOpen } = useVisualViewport();

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2000);
  }, []);

  // Apply theme, typography tokens, and iOS theme-color meta
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--memo-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--memo-line-height', String(settings.lineHeight));
    root.style.setProperty(
      '--memo-font-family',
      settings.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)'
    );

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolved =
        settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme;
      root.setAttribute('data-theme', resolved);
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [settings.fontSize, settings.lineHeight, settings.fontFamily, settings.theme]);

  const handleUpdateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const handleDraftChange = useCallback((val: string) => {
    setDraft(val);
    saveDraft(val);
  }, []);

  // Load memos + handle URL Shortcuts ?q=... or ?focus=1
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = await getAllMemos();
      if (cancelled) return;

      const params = new URLSearchParams(window.location.search);
      const qParam = params.get('q')?.trim();
      const focusParam = params.get('focus');

      if (qParam) {
        const now = Date.now();
        const newMemo: Memo = {
          id: createId('m'),
          content: qParam,
          tags: extractTags(qParam),
          pinned: false,
          createdAt: now,
          updatedAt: now,
          aiThread: [],
          aiCollapsed: false,
        };
        await putMemo(newMemo);
        const updated = sortMemos([newMemo, ...initial]);
        setMemos(updated);
        setLoaded(true);
        showToast('已通过快捷指令存入灵感');
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setMemos(initial);
        setLoaded(true);
        if (focusParam === '1') {
          setShouldFocusComposer(true);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const activeTemplate = useMemo(
    () =>
      settings.promptTemplates.find((t) => t.id === settings.activeTemplateId) ||
      settings.promptTemplates[0],
    [settings.promptTemplates, settings.activeTemplateId]
  );

  const activePreset = useMemo(
    () =>
      settings.aiPresets.find((p) => p.id === settings.activePresetId) || settings.aiPresets[0],
    [settings.aiPresets, settings.activePresetId]
  );

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const memo of memos) {
      for (const tag of memo.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [memos]);

  const pinnedCount = useMemo(() => memos.filter((m) => m.pinned).length, [memos]);
  const aiCount = useMemo(() => memos.filter((m) => m.aiThread.length > 0).length, [memos]);

  const filteredMemos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return memos.filter((m) => {
      if (activeFilter === '__pinned__' && !m.pinned) return false;
      if (activeFilter === '__has_ai__' && m.aiThread.length === 0) return false;
      if (
        activeFilter !== '__all__' &&
        activeFilter !== '__pinned__' &&
        activeFilter !== '__has_ai__' &&
        !m.tags.includes(activeFilter)
      ) {
        return false;
      }
      if (q) {
        const inContent = m.content.toLowerCase().includes(q);
        const inAi = m.aiThread.some((msg) => msg.content.toLowerCase().includes(q));
        return inContent || inAi;
      }
      return true;
    });
  }, [memos, activeFilter, searchQuery]);

  const handleCreateMemo = useCallback(
    async (text: string) => {
      const now = Date.now();
      const newMemo: Memo = {
        id: createId('m'),
        content: text,
        tags: extractTags(text),
        pinned: false,
        createdAt: now,
        updatedAt: now,
        aiThread: [],
        aiCollapsed: false,
      };
      setMemos((prev) => sortMemos([newMemo, ...prev]));
      await putMemo(newMemo);
      return newMemo;
    },
    []
  );

  const handleUpdateMemo = useCallback(async (id: string, newContent: string) => {
    let updatedTarget: Memo | null = null;
    setMemos((prev) =>
      sortMemos(
        prev.map((m) => {
          if (m.id !== id) return m;
          updatedTarget = {
            ...m,
            content: newContent,
            tags: extractTags(newContent),
            updatedAt: Date.now(),
          };
          return updatedTarget;
        })
      )
    );
    if (updatedTarget) {
      await putMemo(updatedTarget);
    }
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
    let updatedTarget: Memo | null = null;
    setMemos((prev) =>
      sortMemos(
        prev.map((m) => {
          if (m.id !== id) return m;
          updatedTarget = { ...m, pinned: !m.pinned, updatedAt: Date.now() };
          return updatedTarget;
        })
      )
    );
    if (updatedTarget) {
      await putMemo(updatedTarget);
    }
  }, []);

  const handleDeleteMemo = useCallback(
    async (id: string) => {
      abortControllersRef.current.get(id)?.abort();
      abortControllersRef.current.delete(id);
      setMemos((prev) => prev.filter((m) => m.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      await deleteMemoById(id);
      showToast('已删除');
    },
    [showToast]
  );

  const handleCopyText = useCallback(
    async (text: string, label?: string) => {
      const ok = await copyText(text);
      showToast(ok ? label || '已复制到剪贴板' : '复制失败，请手动长按选择');
      return ok;
    },
    [showToast]
  );

  const handleCopyRaw = useCallback(
    (memo: Memo) => handleCopyText(memo.content, '已复制原文'),
    [handleCopyText]
  );

  const handleCopyTemplate = useCallback(
    (memo: Memo) => {
      const formatted = applyPromptTemplate(activeTemplate.template, memo.content);
      return handleCopyText(formatted, `已按「${activeTemplate.name}」模板复制`);
    },
    [activeTemplate, handleCopyText]
  );

  const runAiStream = useCallback(
    async (memoId: string, baseThread: AiMessage[], assistantMsgId: string) => {
      abortControllersRef.current.get(memoId)?.abort();
      const controller = new AbortController();
      abortControllersRef.current.set(memoId, controller);

      setStreamingIds((prev) => ({ ...prev, [memoId]: true }));

      const turns: ChatTurn[] = baseThread
        .filter((m) => !m.error && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const finalText = await streamChatCompletion({
          preset: activePreset,
          messages: turns,
          signal: controller.signal,
          onChunk: (partial) => {
            setMemos((prev) =>
              prev.map((m) =>
                m.id === memoId
                  ? {
                      ...m,
                      aiThread: m.aiThread.map((msg) =>
                        msg.id === assistantMsgId ? { ...msg, content: partial } : msg
                      ),
                    }
                  : m
              )
            );
          },
        });

        let savedMemo: Memo | null = null;
        setMemos((prev) =>
          prev.map((m) => {
            if (m.id !== memoId) return m;
            savedMemo = {
              ...m,
              aiThread: m.aiThread.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, content: finalText } : msg
              ),
            };
            return savedMemo;
          })
        );
        if (savedMemo) {
          await putMemo(savedMemo);
        }
      } catch (err) {
        const isAborted = err instanceof DOMException && err.name === 'AbortError';
        const errorMsg = err instanceof Error ? err.message : '请求失败';

        let savedMemo: Memo | null = null;
        setMemos((prev) =>
          prev.map((m) => {
            if (m.id !== memoId) return m;
            savedMemo = {
              ...m,
              aiThread: m.aiThread.map((msg) => {
                if (msg.id !== assistantMsgId) return msg;
                if (isAborted && msg.content.trim()) return msg;
                return { ...msg, error: errorMsg };
              }),
            };
            return savedMemo;
          })
        );
        if (savedMemo) {
          await putMemo(savedMemo);
        }
      } finally {
        abortControllersRef.current.delete(memoId);
        setStreamingIds((prev) => {
          const next = { ...prev };
          delete next[memoId];
          return next;
        });
      }
    },
    [activePreset]
  );

  const handleAskAi = useCallback(
    async (memo: Memo, followUpText?: string) => {
      if (streamingIds[memo.id]) return;

      const userTurnContent = followUpText ? followUpText : memo.content;
      const userMsg: AiMessage = {
        id: createId('u'),
        role: 'user',
        content: userTurnContent,
        createdAt: Date.now(),
      };
      const assistantMsg: AiMessage = {
        id: createId('a'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        model: activePreset.model,
      };

      const nextBaseThread = [...memo.aiThread, userMsg];
      const nextThreadWithPlaceholder = [...nextBaseThread, assistantMsg];

      let updatedMemo: Memo = {
        ...memo,
        aiCollapsed: false,
        aiThread: nextThreadWithPlaceholder,
      };

      setMemos((prev) => prev.map((m) => (m.id === memo.id ? updatedMemo : m)));
      await putMemo(updatedMemo);
      await runAiStream(memo.id, nextBaseThread, assistantMsg.id);
    },
    [activePreset.model, runAiStream, streamingIds]
  );

  const handleRegenerateAi = useCallback(
    async (memo: Memo) => {
      if (streamingIds[memo.id]) return;

      // Drop trailing assistant message if present, keep user prompts
      let trimmed = [...memo.aiThread];
      if (trimmed.length > 0 && trimmed[trimmed.length - 1].role === 'assistant') {
        trimmed = trimmed.slice(0, -1);
      }
      if (trimmed.length === 0) {
        trimmed = [
          {
            id: createId('u'),
            role: 'user',
            content: memo.content,
            createdAt: Date.now(),
          },
        ];
      }

      const assistantMsg: AiMessage = {
        id: createId('a'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        model: activePreset.model,
      };

      const updatedMemo: Memo = {
        ...memo,
        aiCollapsed: false,
        aiThread: [...trimmed, assistantMsg],
      };

      setMemos((prev) => prev.map((m) => (m.id === memo.id ? updatedMemo : m)));
      await putMemo(updatedMemo);
      await runAiStream(memo.id, trimmed, assistantMsg.id);
    },
    [activePreset.model, runAiStream, streamingIds]
  );

  const handleStopAi = useCallback((memoId: string) => {
    abortControllersRef.current.get(memoId)?.abort();
  }, []);

  const handleToggleAiCollapse = useCallback(async (memoId: string) => {
    let target: Memo | null = null;
    setMemos((prev) =>
      prev.map((m) => {
        if (m.id !== memoId) return m;
        target = { ...m, aiCollapsed: !m.aiCollapsed };
        return target;
      })
    );
    if (target) {
      await putMemo(target);
    }
  }, []);

  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectedMemos = useMemo(
    () => memos.filter((m) => selectedIds.includes(m.id)),
    [memos, selectedIds]
  );

  const handleMultiCopyRaw = useCallback(async () => {
    if (selectedMemos.length === 0) return;
    const text = formatMultiMemoCopy(selectedMemos);
    const ok = await handleCopyText(text, `已合并复制 ${selectedMemos.length} 条`);
    if (ok) {
      setMultiSelectMode(false);
      setSelectedIds([]);
    }
  }, [handleCopyText, selectedMemos]);

  const handleMultiCopyTemplate = useCallback(async () => {
    if (selectedMemos.length === 0) return;
    const text = formatMultiMemoCopy(selectedMemos, activeTemplate.template);
    const ok = await handleCopyText(
      text,
      `已按「${activeTemplate.name}」合并复制 ${selectedMemos.length} 条`
    );
    if (ok) {
      setMultiSelectMode(false);
      setSelectedIds([]);
    }
  }, [activeTemplate, handleCopyText, selectedMemos]);

  const handleMultiAskAi = useCallback(async () => {
    if (selectedMemos.length === 0) return;
    const combinedContent = `${formatMultiMemoCopy(selectedMemos)}\n\n#合并分析`;
    const created = await handleCreateMemo(combinedContent);
    setMultiSelectMode(false);
    setSelectedIds([]);
    await handleAskAi(created);
  }, [handleAskAi, handleCreateMemo, selectedMemos]);

  const handleImportMemos = useCallback(
    async (imported: Memo[], importedSettings?: Partial<AppSettings>) => {
      await bulkPutMemos(imported);
      const merged = await getAllMemos();
      setMemos(merged);
      if (importedSettings) {
        const nextSettings = { ...settings, ...importedSettings };
        handleUpdateSettings(nextSettings);
      }
      showToast(`已成功导入 ${imported.length} 条记录`);
    },
    [handleUpdateSettings, settings, showToast]
  );

  return (
    <div className="app-shell">
      <Header
        totalCount={memos.length}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        multiSelectMode={multiSelectMode}
        onToggleSearch={() => {
          setSearchOpen((v) => {
            if (v) setSearchQuery('');
            return !v;
          });
        }}
        onSearchChange={setSearchQuery}
        onToggleMultiSelect={() => {
          setMultiSelectMode((v) => !v);
          setSelectedIds([]);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <TagFilterBar
        activeFilter={activeFilter}
        tags={allTags}
        pinnedCount={pinnedCount}
        aiCount={aiCount}
        onSelectFilter={setActiveFilter}
      />

      <main className="memo-feed">
        {!loaded ? null : filteredMemos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Sparkles size={24} />
            </div>
            <h3>{searchQuery || activeFilter !== '__all__' ? '没有匹配的灵感' : '灵感画布还空着'}</h3>
            <p>
              {searchQuery || activeFilter !== '__all__'
                ? '试试切换标签或清空搜索关键词'
                : '直接在下方输入你的问题或灵感，支持一键复制给 AI 或卡片内直接提问。'}
            </p>
          </div>
        ) : (
          filteredMemos.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              activeTemplateName={activeTemplate.name}
              multiSelectMode={multiSelectMode}
              selected={selectedIds.includes(memo.id)}
              isStreaming={Boolean(streamingIds[memo.id])}
              onToggleSelect={toggleSelectId}
              onCopyRaw={handleCopyRaw}
              onCopyTemplate={handleCopyTemplate}
              onCopyText={handleCopyText}
              onAskAi={handleAskAi}
              onRegenerateAi={handleRegenerateAi}
              onStopAi={handleStopAi}
              onToggleAiCollapse={handleToggleAiCollapse}
              onUpdateMemo={handleUpdateMemo}
              onTogglePin={handleTogglePin}
              onDeleteMemo={handleDeleteMemo}
              onTagClick={(tag) => setActiveFilter((prev) => (prev === tag ? '__all__' : tag))}
            />
          ))
        )}
      </main>

      <Composer
        draft={draft}
        onDraftChange={handleDraftChange}
        onSubmit={handleCreateMemo}
        keyboardOpen={keyboardOpen}
        shouldFocus={shouldFocusComposer}
        multiSelectMode={multiSelectMode}
        selectedCount={selectedIds.length}
        activeTemplateName={activeTemplate.name}
        onMultiCopyRaw={handleMultiCopyRaw}
        onMultiCopyTemplate={handleMultiCopyTemplate}
        onMultiAskAi={handleMultiAskAi}
        onCancelMultiSelect={() => {
          setMultiSelectMode(false);
          setSelectedIds([]);
        }}
      />

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        memos={memos}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onImportMemos={handleImportMemos}
        onShowToast={showToast}
      />

      <Toast message={toastMsg} />
    </div>
  );
}

export default App;
