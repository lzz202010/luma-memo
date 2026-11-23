import {
  ArrowUp,
  Check,
  ChevronDown,
  ClipboardPaste,
  Copy,
  Eraser,
  Maximize2,
  Minimize2,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { PromptTemplate } from '../types/memo';

const DRAFT_KEY = 'luma_memo_draft_v1';
const QUICK_TAGS = ['#问题', '#灵感', '#待问AI', '#深度思考', '#方法论'];

interface ComposerProps {
  draft: string;
  promptTemplates: PromptTemplate[];
  activeTemplateId: string;
  shouldFocus?: boolean;
  multiSelectMode: boolean;
  selectedCount: number;
  activeTemplateName: string;
  onDraftChange: (val: string) => void;
  onSubmit: (text: string) => Promise<void> | void;
  onSubmitAndCopy: (text: string, templateId: string | null) => Promise<void> | void;
  onMultiCopyRaw: () => void;
  onMultiCopyTemplate: () => void;
  onMultiAskAi: () => void;
  onCancelMultiSelect: () => void;
  onShowToast: (msg: string) => void;
}

export function loadDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) || '';
  } catch {
    return '';
  }
}

export function saveDraft(val: string): void {
  try {
    if (val) {
      localStorage.setItem(DRAFT_KEY, val);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function Composer({
  draft,
  promptTemplates,
  activeTemplateId,
  shouldFocus,
  multiSelectMode,
  selectedCount,
  activeTemplateName,
  onDraftChange,
  onSubmit,
  onSubmitAndCopy,
  onMultiCopyRaw,
  onMultiCopyTemplate,
  onMultiAskAi,
  onCancelMultiSelect,
  onShowToast,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // null means copy raw text; string means template id
  const [copyModeId, setCopyModeId] = useState<string | null>(activeTemplateId);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  useEffect(() => {
    setCopyModeId((prev) => {
      if (prev === null) return null;
      return promptTemplates.some((t) => t.id === prev) ? prev : activeTemplateId;
    });
  }, [activeTemplateId, promptTemplates]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (fullscreen) {
      el.style.height = 'auto';
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.max(116, Math.min(el.scrollHeight, 340))}px`;
  }, [draft, fullscreen]);

  useEffect(() => {
    if (shouldFocus && !multiSelectMode) {
      textareaRef.current?.focus();
    }
  }, [shouldFocus, multiSelectMode]);

  useEffect(() => {
    if (!modeMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [modeMenuOpen]);

  const resetAfterSubmit = () => {
    onDraftChange('');
    setFullscreen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = '116px';
    }
  };

  const handleSaveOnly = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    resetAfterSubmit();
  };

  const handleSaveAndCopy = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onSubmitAndCopy(trimmed, copyModeId);
    resetAfterSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      handleSaveAndCopy();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveOnly();
      return;
    }
    if (e.key === 'Escape' && fullscreen) {
      setFullscreen(false);
    }
  };

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      const prefix = draft && !draft.endsWith(' ') && !draft.endsWith('\n') ? ' ' : '';
      onDraftChange(`${draft}${prefix}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const before = draft.slice(0, start);
    const after = draft.slice(end);
    const needsSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const inserted = `${needsSpace ? ' ' : ''}${snippet}`;
    const next = `${before}${inserted}${after}`;
    onDraftChange(next);

    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handlePasteFromClipboard = async () => {
    if (!navigator.clipboard?.readText) {
      textareaRef.current?.focus();
      onShowToast('请直接在输入框长按粘贴');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        onShowToast('剪贴板里暂无文本');
        return;
      }
      insertAtCursor(text.trim());
    } catch {
      textareaRef.current?.focus();
      onShowToast('Safari 限制静默读取，请在输入框轻点粘贴');
    }
  };

  const selectedModeLabel =
    copyModeId === null
      ? '仅复制原文'
      : promptTemplates.find((t) => t.id === copyModeId)?.name || activeTemplateName;

  return (
    <>
      <section
        className={`hero-composer ${fullscreen ? 'fullscreen' : ''}`}
        aria-label="灵感书写画布"
      >
        <div className="hero-composer-top">
          <div className="hero-status">
            <span className="status-dot" />
            <span>灵感手札 · 自动保存草稿</span>
          </div>

          <div className="hero-tools">
            {draft.length > 0 && (
              <span className="hero-char-count">{draft.trim().length} 字</span>
            )}

            <button
              type="button"
              className="hero-tool-btn"
              onClick={handlePasteFromClipboard}
              title="从剪贴板粘贴内容"
            >
              <ClipboardPaste size={13} />
              <span>粘贴</span>
            </button>

            {draft.length > 0 && (
              <button
                type="button"
                className="hero-tool-btn"
                onClick={() => onDraftChange('')}
                title="清空草稿"
              >
                <Eraser size={13} />
                <span>清空</span>
              </button>
            )}

            <button
              type="button"
              className="hero-tool-btn"
              onClick={() => setFullscreen((v) => !v)}
              title={fullscreen ? '收起画布' : '沉浸展开'}
            >
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{fullscreen ? '收起' : '沉浸展开'}</span>
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="hero-textarea"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="写下此刻的问题、灵感或想问 AI 的念头…&#10;加 #标签 可自动归类，写完可「存入并复制」一键去问 AI"
        />

        <div className="hero-tags-ribbon">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="quick-tag-chip"
              onClick={() => insertAtCursor(`${tag} `)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="hero-footer">
          <div className="copy-mode-wrap" ref={modeMenuRef}>
            <button
              type="button"
              className="copy-mode-pill"
              onClick={() => setModeMenuOpen((v) => !v)}
              title="选择「存入并复制」使用的提示词模板"
            >
              <Wand2 size={13} />
              <span>{selectedModeLabel}</span>
              <ChevronDown size={14} />
            </button>

            {modeMenuOpen && (
              <div className="popover-menu left-aligned" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setCopyModeId(null);
                    setModeMenuOpen(false);
                  }}
                >
                  <span className="dropdown-item-main">仅复制原文</span>
                  {copyModeId === null && <Check size={15} color="var(--accent)" />}
                </button>
                {promptTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setCopyModeId(tpl.id);
                      setModeMenuOpen(false);
                    }}
                  >
                    <span className="dropdown-item-main">{tpl.name}</span>
                    {copyModeId === tpl.id && <Check size={15} color="var(--accent)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hero-submit-group">
            <button
              type="button"
              className="btn-save-copy"
              disabled={!draft.trim()}
              onClick={handleSaveAndCopy}
              title="保存卡片并立即复制给外部 AI（⌘+Shift+Enter）"
            >
              <Copy size={15} />
              <span>存入并复制</span>
            </button>

            <button
              type="button"
              className="btn-save-primary"
              disabled={!draft.trim()}
              onClick={handleSaveOnly}
              title="存入卡片（⌘+Enter）"
            >
              <ArrowUp size={16} strokeWidth={2.5} />
              <span>存入灵感</span>
            </button>
          </div>
        </div>
      </section>

      {multiSelectMode && (
        <div className="floating-multiselect-dock" role="region" aria-label="多选批量操作">
          <div className="multiselect-bar">
            <span className="multiselect-count">已选 {selectedCount} 条</span>
            <div className="multiselect-actions">
              <button
                type="button"
                className="card-action-btn"
                disabled={selectedCount === 0}
                onClick={onMultiCopyRaw}
              >
                <Copy size={15} />
                <span>合并复制</span>
              </button>
              <button
                type="button"
                className="card-action-btn"
                disabled={selectedCount === 0}
                onClick={onMultiCopyTemplate}
              >
                <Wand2 size={15} />
                <span>{activeTemplateName}</span>
              </button>
              <button
                type="button"
                className="card-action-btn ai-trigger"
                disabled={selectedCount === 0}
                onClick={onMultiAskAi}
              >
                <Sparkles size={15} />
                <span>合并问 AI</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={onCancelMultiSelect}
                aria-label="退出多选"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
