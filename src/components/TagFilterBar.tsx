import { CheckCircle2, CircleHelp, Pin } from 'lucide-react';

export interface TagCount {
  tag: string;
  count: number;
}

interface TagFilterBarProps {
  activeFilter: string;
  totalCount: number;
  unansweredCount: number;
  answeredCount: number;
  pinnedCount: number;
  tags: TagCount[];
  onSelectFilter: (filter: string) => void;
}

export function TagFilterBar({
  activeFilter,
  totalCount,
  unansweredCount,
  answeredCount,
  pinnedCount,
  tags,
  onSelectFilter,
}: TagFilterBarProps) {
  return (
    <nav className="tag-bar" aria-label="状态与标签筛选">
      <button
        type="button"
        className={`tag-pill ${activeFilter === '__all__' ? 'active' : ''}`}
        onClick={() => onSelectFilter('__all__')}
      >
        <span>全部</span>
        <span className="tag-pill-count">{totalCount}</span>
      </button>

      {unansweredCount > 0 && (
        <button
          type="button"
          className={`tag-pill ${activeFilter === '__unanswered__' ? 'active' : ''}`}
          onClick={() => onSelectFilter('__unanswered__')}
        >
          <CircleHelp size={13} />
          <span>待解答</span>
          <span className="tag-pill-count">{unansweredCount}</span>
        </button>
      )}

      {answeredCount > 0 && (
        <button
          type="button"
          className={`tag-pill ${activeFilter === '__has_ai__' ? 'active' : ''}`}
          onClick={() => onSelectFilter('__has_ai__')}
        >
          <CheckCircle2 size={13} />
          <span>已解答</span>
          <span className="tag-pill-count">{answeredCount}</span>
        </button>
      )}

      {pinnedCount > 0 && (
        <button
          type="button"
          className={`tag-pill ${activeFilter === '__pinned__' ? 'active' : ''}`}
          onClick={() => onSelectFilter('__pinned__')}
        >
          <Pin size={13} />
          <span>已置顶</span>
          <span className="tag-pill-count">{pinnedCount}</span>
        </button>
      )}

      {tags.map(({ tag, count }) => (
        <button
          key={tag}
          type="button"
          className={`tag-pill ${activeFilter === tag ? 'active' : ''}`}
          onClick={() => onSelectFilter(activeFilter === tag ? '__all__' : tag)}
        >
          <span>#{tag}</span>
          <span className="tag-pill-count">{count}</span>
        </button>
      ))}
    </nav>
  );
}
