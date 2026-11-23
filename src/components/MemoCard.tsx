import {
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Edit3,
  MoreHorizontal,
  Pin,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Wand2,
} from 'lucide-react';
import { FormEvent, KeyboardEvent, ReactNode, TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Memo, PromptTemplate } from '../types/memo';
import { renderMarkdown } from '../utils/markdown';
import { formatRelativeTime } from '../utils/tags';

interface MemoCardProps {
  memo: Memo;
  promptTemplates: PromptTemplate[];
  activeTemplate: PromptTemplate;
  multiSelectMode: boolean;
  selected: boolean;
  isStreaming: boolean;
  onToggleSelect: (id: string) => void;
  onCopyRaw: (memo: Memo) => Promise<boolean>;
  onCopyWithTemplate: (memo: Memo, template: PromptTemplate) => Promise<boolean>;
  onCopyText: (text: string, label?: string) => Promise<boolean>;
  onAskAi: (memo: Memo, followUpText?: string) => void;
  onAttachManualAnswer: (memoId: string, answerText: string) => Promise<void> | void;
  onRegenerateAi: (memo: Memo) => void;
  onStopAi: (memoId: string) => void;
  onToggleAiCollapse: (memoId: string) => void;
  onUpdateMemo: (id: string, newContent: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteMemo: (id: string) => void;
  onTagClick: (tag: string) => void;
}

const LONG_CHAR_THRESHOLD = 220;
const LONG_LINE_THRESHOLD = 6;

function renderFormattedBody(text: string, onTagClick: (tag: string) => void): ReactNode[] {
  const regex = /(^|[\s\u3000])(#([\p{L}\p{N}_-]{1,32}))/gu;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(regex)) {
    const fullIndex = match.index ?? 0;
    const prefixSpace = match[1] || '';
    const fullTag = match[2];
    const tagName = match[3];

    const tagStart = fullIndex + prefixSpace.length;
    if (tagStart > lastIndex) {
      nodes.push(text.slice(lastIndex, tagStart));
    }

    nodes.push(
      <button
        key={`tag_${matchIndex++}_${tagName}`}
        type="button"
        className="body-hashtag"
        onClick={(e) => {
          e.stopPropagation();
          onTagClick(tagName);
        }}
        title={`筛选 #${tagName}`}
      >
        {fullTag}
      </button>
    );

    lastIndex = tagStart + fullTag.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function MemoCard({
  memo,
  promptTemplates,
  activeTemplate,
  multiSelectMode,
  selected,
  isStreaming,
  onToggleSelect,
  onCopyRaw,
  onCopyWithTemplate,
  onCopyText,
  onAskAi,
  onAttachManualAnswer,
  onRegenerateAi,
  onStopAi,
  onToggleAiCollapse,
  onUpdateMemo,
  onTogglePin,
  onDeleteMemo,
  onTagClick,
}: MemoCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tplMenuOpen, setTplMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(memo.content);
  const [expanded, setExpanded] = useState(false);
  const [copiedMode, setCopiedMode] = useState<'raw' | 'tpl' | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [manualBoxOpen, setManualBoxOpen] = useState(false);
  const [manualAnswerDraft, setManualAnswerDraft] = useState('');

  // Horizontal touch swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const lastTapRef = useRef<number>(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const tplMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftContent(memo.content);
  }, [memo.content]);

  useEffect(() => {
    if (!menuOpen && !tplMenuOpen) return;
    const handleOutside = (e: Event) => {
      const target = e.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (tplMenuOpen && tplMenuRef.current && !tplMenuRef.current.contains(target)) {
        setTplMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen, tplMenuOpen]);

  const isLongMemo = useMemo(() => {
    const lineCount = memo.content.split('\n').length;
    return memo.content.length > LONG_CHAR_THRESHOLD || lineCount > LONG_LINE_THRESHOLD;
  }, [memo.content]);

  const displayedContent = useMemo(() => {
    if (!isLongMemo || expanded) return memo.content;
    const lines = memo.content.split('\n');
    if (lines.length > LONG_LINE_THRESHOLD) {
      return `${lines.slice(0, LONG_LINE_THRESHOLD).join('\n').slice(0, LONG_CHAR_THRESHOLD)}…`;
    }
    return `${memo.content.slice(0, LONG_CHAR_THRESHOLD)}…`;
  }, [expanded, isLongMemo, memo.content]);

  const handleCopyRawClick = async () => {
    const ok = await onCopyRaw(memo);
    if (ok) {
      setCopiedMode('raw');
      setTimeout(() => setCopiedMode((prev) => (prev === 'raw' ? null : prev)), 1500);
    }
  };

  const handleCopyTemplateClick = async (tpl: PromptTemplate) => {
    setTplMenuOpen(false);
    const ok = await onCopyWithTemplate(memo, tpl);
    if (ok) {
      setCopiedMode('tpl');
      setTimeout(() => setCopiedMode((prev) => (prev === 'tpl' ? null : prev)), 1500);
    }
  };

  const handleSaveEdit = () => {
    const trimmed = draftContent.trim();
    if (trimmed) {
      onUpdateMemo(memo.id, trimmed);
      setEditing(false);
    }
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setDraftContent(memo.content);
      setEditing(false);
    }
  };

  const handleOpenManualAnswer = async () => {
    setMenuOpen(false);
    setManualBoxOpen(true);
    if (!manualAnswerDraft && navigator.clipboard?.readText) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip.trim() && clip.trim() !== memo.content.trim()) {
          setManualAnswerDraft(clip.trim());
        }
      } catch {
        // User can paste manually in the textarea
      }
    }
  };

  const handleSaveManualAnswer = async () => {
    const trimmed = manualAnswerDraft.trim();
    if (!trimmed) return;
    await onAttachManualAnswer(memo.id, trimmed);
    setManualAnswerDraft('');
    setManualBoxOpen(false);
  };

  const handleFollowUpSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = followUp.trim();
    if (!q || isStreaming) return;
    setFollowUp('');
    onAskAi(memo, q);
  };

  const handleTouchStart = (e: TouchEvent<HTMLElement>) => {
    if (multiSelectMode || editing || manualBoxOpen) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, horizontal: null };
  };

  const handleTouchMove = (e: TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (start.horizontal === null) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      start.horizontal = Math.abs(dx) > Math.abs(dy) * 1.35;
      if (start.horizontal) {
        setIsSwiping(true);
      }
    }

    if (start.horizontal) {
      const clamped = Math.max(-96, Math.min(96, dx));
      setSwipeX(clamped);
    }
  };

  const handleTouchEnd = () => {
    const currentX = swipeX;
    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeX(0);

    if (currentX > 64) {
      handleCopyRawClick();
    } else if (currentX < -64) {
      onTogglePin(memo.id);
    }
  };

  const handleBodyDoubleTap = () => {
    if (multiSelectMode || editing) return;
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      setEditing(true);
    }
    lastTapRef.current = now;
  };

  const hasAiThread = memo.aiThread.length > 0;
  const hasAnswer = memo.aiThread.some((m) => m.role === 'assistant' && !m.error);
  const aiExpanded = hasAiThread && !memo.aiCollapsed;

  return (
    <div className="memo-swipe-outer">
      <div
        className={`swipe-hint-bg ${
          swipeX > 32 ? 'right-active' : swipeX < -32 ? 'left-active' : ''
        }`}
        aria-hidden="true"
      >
        <span className="swipe-hint-badge">
          <Copy size={16} />
          <span>{swipeX > 64 ? '松手复制' : '右滑复制'}</span>
        </span>
        <span className="swipe-hint-badge">
          <span>{swipeX < -64 ? (memo.pinned ? '松手取消置顶' : '松手置顶') : '左滑置顶'}</span>
          <Pin size={16} />
        </span>
      </div>

      <article
        className={`memo-card ${memo.pinned ? 'pinned' : ''} ${selected ? 'selected' : ''} ${
          isSwiping ? 'swiping' : ''
        }`}
        style={swipeX !== 0 ? { transform: `translateX(${swipeX}px)` } : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={multiSelectMode ? () => onToggleSelect(memo.id) : undefined}
      >
        <div className="memo-meta">
          <div className="memo-meta-left">
            <span className="memo-time">{formatRelativeTime(memo.createdAt)}</span>
            {memo.pinned && (
              <span className="status-badge pinned">
                <Pin size={11} />
                置顶
              </span>
            )}
            {hasAnswer && (
              <span className="status-badge answered">
                <CheckCircle2 size={11} />
                已解答
              </span>
            )}
          </div>

          {multiSelectMode ? (
            <div className={`select-check ${selected ? 'checked' : ''}`}>
              {selected && <Check size={14} strokeWidth={3} />}
            </div>
          ) : (
            <div className="memo-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="more-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="更多操作"
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <div className="popover-menu" role="menu">
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                  >
                    <span className="dropdown-item-main">
                      <Edit3 size={15} />
                      <span>编辑内容</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onTogglePin(memo.id);
                    }}
                  >
                    <span className="dropdown-item-main">
                      <Pin size={15} />
                      <span>{memo.pinned ? '取消置顶' : '置顶卡片'}</span>
                    </span>
                  </button>
                  <button type="button" className="dropdown-item" onClick={handleOpenManualAnswer}>
                    <span className="dropdown-item-main">
                      <ClipboardPaste size={15} />
                      <span>贴入外部解答</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteMemo(memo.id);
                    }}
                  >
                    <span className="dropdown-item-main">
                      <Trash2 size={15} />
                      <span>删除</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="memo-edit-box" onClick={(e) => e.stopPropagation()}>
            <textarea
              className="memo-edit-textarea"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              autoFocus
            />
            <div className="memo-edit-actions">
              <span className="edit-shortcut-hint">⌘/Ctrl+Enter 保存 · Esc 取消</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setDraftContent(memo.content);
                    setEditing(false);
                  }}
                >
                  取消
                </button>
                <button type="button" className="btn-primary" onClick={handleSaveEdit}>
                  保存修改
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div
              className="memo-body"
              onDoubleClick={() => !multiSelectMode && setEditing(true)}
              onTouchEnd={handleBodyDoubleTap}
              title={multiSelectMode ? undefined : '双击正文可直接编辑'}
            >
              {renderFormattedBody(displayedContent, onTagClick)}
            </div>
            {isLongMemo && (
              <button
                type="button"
                className="expand-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
              >
                <span>{expanded ? '收起全文' : '展开全文'}</span>
                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            )}
          </div>
        )}

        {!multiSelectMode && !editing && (
          <div className="memo-actions">
            <button
              type="button"
              className={`card-action-btn ${copiedMode === 'raw' ? 'copied' : ''}`}
              onClick={handleCopyRawClick}
            >
              {copiedMode === 'raw' ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedMode === 'raw' ? '已复制' : '复制'}</span>
            </button>

            <div className="memo-menu-wrap" ref={tplMenuRef}>
              <div className={`split-pill ${copiedMode === 'tpl' ? 'copied' : ''}`}>
                <button
                  type="button"
                  className="split-pill-main"
                  onClick={() => handleCopyTemplateClick(activeTemplate)}
                  title={`按「${activeTemplate.name}」模板复制`}
                >
                  {copiedMode === 'tpl' ? <Check size={15} /> : <Wand2 size={14} />}
                  <span>{copiedMode === 'tpl' ? '已复制模板' : activeTemplate.name}</span>
                </button>
                <button
                  type="button"
                  className="split-pill-chevron"
                  onClick={() => setTplMenuOpen((v) => !v)}
                  aria-label="选择其他复制模板"
                  title="切换其他提示词模板复制"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {tplMenuOpen && (
                <div className="popover-menu left-aligned" role="menu">
                  {promptTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="dropdown-item"
                      onClick={() => handleCopyTemplateClick(tpl)}
                    >
                      <span className="dropdown-item-main">{tpl.name}</span>
                      {tpl.id === activeTemplate.id && <Check size={14} color="var(--accent)" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="card-action-btn"
              onClick={handleOpenManualAnswer}
              title="把外部 AI App 里的回答贴回来保存"
            >
              <ClipboardPaste size={14} />
              <span>贴入解答</span>
            </button>

            <button
              type="button"
              className="card-action-btn ai-trigger"
              onClick={() => {
                if (hasAiThread) {
                  onToggleAiCollapse(memo.id);
                } else {
                  onAskAi(memo);
                }
              }}
            >
              <Sparkles size={15} />
              <span>
                {isStreaming
                  ? '生成中...'
                  : hasAiThread
                    ? aiExpanded
                      ? '收起解答'
                      : `查看解答 (${memo.aiThread.filter((m) => m.role === 'assistant').length})`
                    : '问 AI'}
              </span>
            </button>
          </div>
        )}

        {manualBoxOpen && !multiSelectMode && (
          <div className="manual-answer-box">
            <div className="manual-answer-header">
              <span>贴入外部 AI 的解答（保存后自动归为「已解答」）</span>
              <button
                type="button"
                className="ai-mini-btn"
                onClick={() => setManualBoxOpen(false)}
              >
                收起
              </button>
            </div>
            <textarea
              className="manual-answer-textarea"
              value={manualAnswerDraft}
              onChange={(e) => setManualAnswerDraft(e.target.value)}
              placeholder="把从 ChatGPT / Claude / Gemini 复制回来的回答粘贴到这里（支持 Markdown）..."
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setManualAnswerDraft('');
                  setManualBoxOpen(false);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!manualAnswerDraft.trim()}
                onClick={handleSaveManualAnswer}
              >
                保存解答
              </button>
            </div>
          </div>
        )}

        {hasAiThread && !multiSelectMode && (
          <div className="ai-thread-box">
            <div className="ai-thread-header">
              <button
                type="button"
                className="ai-thread-title"
                onClick={() => onToggleAiCollapse(memo.id)}
              >
                <Sparkles size={14} />
                <span>AI 解答</span>
                {aiExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              <div className="ai-thread-controls">
                {isStreaming ? (
                  <button
                    type="button"
                    className="ai-mini-btn stop"
                    onClick={() => onStopAi(memo.id)}
                  >
                    <Square size={12} fill="currentColor" />
                    <span>停止</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ai-mini-btn"
                    onClick={() => onRegenerateAi(memo)}
                  >
                    <RotateCcw size={13} />
                    <span>重答</span>
                  </button>
                )}
              </div>
            </div>

            {aiExpanded && (
              <>
                <div className="ai-messages">
                  {memo.aiThread.map((msg, idx) => {
                    if (idx === 0 && msg.role === 'user') return null;

                    if (msg.role === 'user') {
                      return (
                        <div key={msg.id} className="ai-msg-user">
                          {msg.content}
                        </div>
                      );
                    }

                    const isWaitingFirstToken =
                      isStreaming && idx === memo.aiThread.length - 1 && !msg.content && !msg.error;

                    return (
                      <div
                        key={msg.id}
                        className={`ai-msg-assistant ${msg.error ? 'error' : ''}`}
                      >
                        {isWaitingFirstToken ? (
                          <div className="typing-dot" aria-label="AI 正在思考">
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : msg.error ? (
                          <div>{msg.error}</div>
                        ) : (
                          <div
                            className="ai-markdown"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                          />
                        )}

                        {!isWaitingFirstToken && msg.content && (
                          <div className="ai-msg-footer">
                            <span className="ai-model-label">{msg.model || 'AI'}</span>
                            <button
                              type="button"
                              className="ai-mini-btn"
                              onClick={async () => {
                                const ok = await onCopyText(msg.content, '已复制 AI 回答');
                                if (ok) {
                                  setCopiedMsgId(msg.id);
                                  setTimeout(
                                    () => setCopiedMsgId((p) => (p === msg.id ? null : p)),
                                    1500
                                  );
                                }
                              }}
                            >
                              {copiedMsgId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                              <span>{copiedMsgId === msg.id ? '已复制' : '复制回答'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <form className="ai-followup-form" onSubmit={handleFollowUpSubmit}>
                  <input
                    type="text"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    placeholder="继续追问..."
                    disabled={isStreaming}
                  />
                  <button
                    type="submit"
                    className="ai-followup-send"
                    disabled={!followUp.trim() || isStreaming}
                    aria-label="发送追问"
                  >
                    <ArrowUp size={18} />
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
