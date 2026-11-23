import { Pin, Sparkles } from 'lucide-react';

export type SpecialFilter = '__all__' | '__pinned__' | '__has_ai__';

interface TagFilterBarProps {
  activeFilter: string;
  tags: string[];
  pinnedCount: number;
  aiCount: number;
  onSelectFilter: (filter: string) => void;
}

export function TagFilterBar({
  activeFilter,
  tags,
  pinnedCount,
  aiCount,
  onSelectFilter,
}: TagFilterBarProps) {
  return (
    <nav className="tag-bar" aria-label="标签筛选">
      <button
        type="button"
        className={`tag-pill ${activeFilter === '__all__' ? 'active' : ''}`}
        onClick={() => onSelectFilter('__all__')}
      >
        全部
      </button>

      {pinnedCount > 0 && (
        <button
          type="button"
          className={`tag-pill ${activeFilter === '__pinned__' ? 'active' : ''}`}
          onClick={() => onSelectFilter('__pinned__')}
        >
          <Pin size={13} />
          <span>已置顶</span>
        </button>
      )}

      {aiCount > 0 && (
        <button
          type="button"
          className={`tag-pill ${activeFilter === '__has_ai__' ? 'active' : ''}`}
          onClick={() => onSelectFilter('__has_ai__')}
        >
          <Sparkles size={13} />
          <span>AI 解答</span>
        </button>
      )}

      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`tag-pill ${activeFilter === tag ? 'active' : ''}`}
          onClick={() => onSelectFilter(tag)}
        >
          #{tag}
        </button>
      ))}
    </nav>
  );
}
