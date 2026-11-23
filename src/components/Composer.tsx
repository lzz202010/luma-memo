import { ArrowUp, Copy, Sparkles, Wand2, X } from 'lucide-react';
import { KeyboardEvent, useEffect, useRef } from 'react';

const DRAFT_KEY = 'luma_memo_draft_v1';
const QUICK_TAGS = ['#问题', '#灵感', '#待问AI', '#想法'];

interface ComposerProps {
  draft: string;
  onDraftChange: (val: string) => void;
  onSubmit: (text: string) => void;
  keyboardOpen: boolean;
  shouldFocus?: boolean;
  multiSelectMode: boolean;
  selectedCount: number;
  activeTemplateName: string;
  onMultiCopyRaw: () => void;
  onMultiCopyTemplate: () => void;
  onMultiAskAi: () => void;
  onCancelMultiSelect: () => void;
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
  onDraftChange,
  onSubmit,
  keyboardOpen,
  shouldFocus,
  multiSelectMode,
  selectedCount,
  activeTemplateName,
  onMultiCopyRaw,
  onMultiCopyTemplate,
  onMultiAskAi,
  onCancelMultiSelect,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  useEffect(() => {
    if (shouldFocus && !multiSelectMode) {
      textareaRef.current?.focus();
    }
  }, [shouldFocus, multiSelectMode]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onDraftChange('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const appendQuickTag = (tag: string) => {
    const prefix = draft && !draft.endsWith(' ') && !draft.endsWith('\n') ? ' ' : '';
    const next = `${draft}${prefix}${tag} `;
    onDraftChange(next);
    textareaRef.current?.focus();
  };

  if (multiSelectMode) {
    return (
      <div className="composer-dock">
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
    );
  }

  return (
    <div className={`composer-dock ${keyboardOpen ? 'keyboard-open' : ''}`}>
      <div className="composer-input-row">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          rows={1}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="写下此刻的问题或灵感..."
        />
        <button
          type="button"
          className="send-btn"
          disabled={!draft.trim()}
          onClick={handleSend}
          aria-label="保存灵感"
        >
          <ArrowUp size={20} strokeWidth={2.4} />
        </button>
      </div>

      <div className="quick-tags-row">
        <div className="quick-tags-scroll">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="quick-tag-chip"
              onClick={() => appendQuickTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        <span className="composer-hint">⌘/Ctrl+Enter 存入</span>
      </div>
    </div>
  );
}
