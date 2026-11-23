import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
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
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Memo } from '../types/memo';
import { renderMarkdown } from '../utils/markdown';
import { formatRelativeTime } from '../utils/tags';

interface MemoCardProps {
  memo: Memo;
  activeTemplateName: string;
  multiSelectMode: boolean;
  selected: boolean;
  isStreaming: boolean;
  onToggleSelect: (id: string) => void;
  onCopyRaw: (memo: Memo) => Promise<boolean>;
  onCopyTemplate: (memo: Memo) => Promise<boolean>;
  onCopyText: (text: string, label?: string) => Promise<boolean>;
  onAskAi: (memo: Memo, followUpText?: string) => void;
  onRegenerateAi: (memo: Memo) => void;
  onStopAi: (memoId: string) => void;
  onToggleAiCollapse: (memoId: string) => void;
  onUpdateMemo: (id: string, newContent: string) => void;
  onTogglePin: (id: string) => void;
  onDeleteMemo: (id: string) => void;
  onTagClick: (tag: string) => void;
}

export function MemoCard({
  memo,
  activeTemplateName,
  multiSelectMode,
  selected,
  isStreaming,
  onToggleSelect,
  onCopyRaw,
  onCopyTemplate,
  onCopyText,
  onAskAi,
  onRegenerateAi,
  onStopAi,
  onToggleAiCollapse,
  onUpdateMemo,
  onTogglePin,
  onDeleteMemo,
  onTagClick,
}: MemoCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(memo.content);
  const [copiedMode, setCopiedMode] = useState<'raw' | 'tpl' | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftContent(memo.content);
  }, [memo.content]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);

  const handleCopyRawClick = async () => {
    const ok = await onCopyRaw(memo);
    if (ok) {
      setCopiedMode('raw');
      setTimeout(() => setCopiedMode((prev) => (prev === 'raw' ? null : prev)), 1500);
    }
  };

  const handleCopyTplClick = async () => {
    const ok = await onCopyTemplate(memo);
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

  const handleFollowUpSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = followUp.trim();
    if (!q || isStreaming) return;
    setFollowUp('');
    onAskAi(memo, q);
  };

  const hasAiThread = memo.aiThread.length > 0;
  const aiExpanded = hasAiThread && !memo.aiCollapsed;

  return (
    <article
      className={`memo-card ${memo.pinned ? 'pinned' : ''} ${selected ? 'selected' : ''}`}
      onClick={multiSelectMode ? () => onToggleSelect(memo.id) : undefined}
    >
      <div className="memo-meta">
        <div className="memo-meta-left">
          <span className="memo-time">{formatRelativeTime(memo.createdAt)}</span>
          {memo.pinned && (
            <span className="pin-badge">
              <Pin size={11} />
              置顶
            </span>
          )}
          {memo.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="inline-tag"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
            >
              #{tag}
            </button>
          ))}
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
              <div className="dropdown-menu" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                >
                  <Edit3 size={15} />
                  <span>编辑内容</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onTogglePin(memo.id);
                  }}
                >
                  <Pin size={15} />
                  <span>{memo.pinned ? '取消置顶' : '置顶卡片'}</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteMemo(memo.id);
                  }}
                >
                  <Trash2 size={15} />
                  <span>删除</span>
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
            autoFocus
          />
          <div className="memo-edit-actions">
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
      ) : (
        <div className="memo-body">{memo.content}</div>
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

          <button
            type="button"
            className={`card-action-btn ${copiedMode === 'tpl' ? 'copied' : ''}`}
            onClick={handleCopyTplClick}
            title={`使用「${activeTemplateName}」模板复制`}
          >
            {copiedMode === 'tpl' ? <Check size={15} /> : <Wand2 size={15} />}
            <span>{copiedMode === 'tpl' ? '已复制模板' : activeTemplateName}</span>
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
                ? 'AI 生成中...'
                : hasAiThread
                  ? aiExpanded
                    ? '收起解答'
                    : `查看解答 (${memo.aiThread.filter((m) => m.role === 'assistant').length})`
                  : '问 AI'}
            </span>
          </button>
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
                  // Hide the very first auto-generated user turn since it mirrors the memo body
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
  );
}
