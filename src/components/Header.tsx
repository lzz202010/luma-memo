import { CheckSquare, Monitor, Moon, Search, Settings, Sun, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { FontSizeOption, ThemeOption } from '../types/memo';
import { FONT_SIZE_OPTIONS } from '../utils/settings';

interface HeaderProps {
  totalCount: number;
  fontSize: FontSizeOption;
  theme: ThemeOption;
  searchOpen: boolean;
  searchQuery: string;
  multiSelectMode: boolean;
  onStepFontSize: (delta: -1 | 1) => void;
  onCycleTheme: () => void;
  onToggleSearch: () => void;
  onSearchChange: (q: string) => void;
  onToggleMultiSelect: () => void;
  onOpenSettings: () => void;
}

export function Header({
  totalCount,
  fontSize,
  theme,
  searchOpen,
  searchQuery,
  multiSelectMode,
  onStepFontSize,
  onCycleTheme,
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

  const minSize = FONT_SIZE_OPTIONS[0];
  const maxSize = FONT_SIZE_OPTIONS[FONT_SIZE_OPTIONS.length - 1];

  const themeLabel =
    theme === 'light' ? '暖纸浅色' : theme === 'dark' ? '夜读深色' : '跟随系统';

  return (
    <header className="top-header">
      <div className="header-inner">
        <div className="header-row">
          <div className="brand-wrap">
            <h1 className="brand-title">拾光</h1>
            <span className="brand-count">{totalCount} 条</span>
          </div>

          <div className="header-actions">
            <div className="font-stepper" aria-label="快速调节正文字号">
              <button
                type="button"
                className="font-step-btn"
                disabled={fontSize <= minSize}
                onClick={() => onStepFontSize(-1)}
                aria-label="减小字号"
                title="减小正文字号"
              >
                A-
              </button>
              <span className="font-step-value">{fontSize}</span>
              <button
                type="button"
                className="font-step-btn"
                disabled={fontSize >= maxSize}
                onClick={() => onStepFontSize(1)}
                aria-label="增大字号"
                title="增大正文字号"
              >
                A+
              </button>
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={onCycleTheme}
              aria-label={`切换主题：当前${themeLabel}`}
              title={`主题：${themeLabel}（点击切换）`}
            >
              {theme === 'light' ? (
                <Sun size={18} />
              ) : theme === 'dark' ? (
                <Moon size={18} />
              ) : (
                <Monitor size={18} />
              )}
            </button>

            <button
              type="button"
              className={`icon-btn ${searchOpen || searchQuery ? 'active' : ''}`}
              onClick={onToggleSearch}
              aria-label="搜索"
              title="搜索灵感"
            >
              <Search size={18} />
            </button>

            <button
              type="button"
              className={`icon-btn ${multiSelectMode ? 'active' : ''}`}
              onClick={onToggleMultiSelect}
              aria-label="多选"
            >
              <CheckSquare size={17} />
              <span>{multiSelectMode ? '完成' : '多选'}</span>
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={onOpenSettings}
              aria-label="设置"
              title="设置"
            >
              <Settings size={18} />
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
              placeholder="搜索问题、灵感、AI 解答或 #标签..."
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
      </div>
    </header>
  );
}
