import { CheckSquare, Search, Settings, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface HeaderProps {
  totalCount: number;
  searchOpen: boolean;
  searchQuery: string;
  multiSelectMode: boolean;
  onToggleSearch: () => void;
  onSearchChange: (q: string) => void;
  onToggleMultiSelect: () => void;
  onOpenSettings: () => void;
}

export function Header({
  totalCount,
  searchOpen,
  searchQuery,
  multiSelectMode,
  onToggleSearch,
  onSearchChange,
  onToggleMultiSelect,
  onOpenSettings,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  return (
    <header className="top-header">
      <div className="header-row">
        <div className="brand-wrap">
          <h1 className="brand-title">拾光</h1>
          <span className="brand-count">{totalCount} 条灵感</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`icon-btn ${searchOpen || searchQuery ? 'active' : ''}`}
            onClick={onToggleSearch}
            aria-label="搜索"
          >
            <Search size={19} />
          </button>

          <button
            type="button"
            className={`icon-btn ${multiSelectMode ? 'active' : ''}`}
            onClick={onToggleMultiSelect}
            aria-label="多选"
          >
            <CheckSquare size={18} />
            <span>{multiSelectMode ? '完成' : '多选'}</span>
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={onOpenSettings}
            aria-label="设置"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="search-bar">
          <Search size={17} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索灵感、问题或 #标签..."
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => onSearchChange('')}
              aria-label="清空搜索"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
