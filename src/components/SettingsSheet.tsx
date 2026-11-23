import { Check, Copy, Download, Eye, EyeOff, Plus, Trash2, Upload, Wifi, X } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { buildJsonBackup, buildMarkdownExport, triggerFileDownload } from '../db/memoDb';
import { testAiConnection } from '../services/aiClient';
import {
  AiPreset,
  AppSettings,
  BackupPayload,
  FontFamilyOption,
  Memo,
  PromptTemplate,
  ThemeOption,
} from '../types/memo';
import { copyText } from '../utils/clipboard';
import { FONT_SIZE_OPTIONS } from '../utils/settings';
import { createId } from '../utils/tags';

interface SettingsSheetProps {
  open: boolean;
  settings: AppSettings;
  memos: Memo[];
  onClose: () => void;
  onUpdateSettings: (next: AppSettings) => void;
  onImportMemos: (imported: Memo[], importedSettings?: Partial<AppSettings>) => Promise<void>;
  onShowToast: (msg: string) => void;
}

type SettingsTab = 'appearance' | 'ai' | 'templates' | 'data';

export function SettingsSheet({
  open,
  settings,
  memos,
  onClose,
  onUpdateSettings,
  onImportMemos,
  onShowToast,
}: SettingsSheetProps) {
  const [tab, setTab] = useState<SettingsTab>('appearance');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [shortcutCopied, setShortcutCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const activePreset =
    settings.aiPresets.find((p) => p.id === settings.activePresetId) || settings.aiPresets[0];

  const updatePreset = (patch: Partial<AiPreset>) => {
    const nextPresets = settings.aiPresets.map((p) =>
      p.id === activePreset.id ? { ...p, ...patch } : p
    );
    onUpdateSettings({ ...settings, aiPresets: nextPresets });
    setTestResult(null);
  };

  const addCustomPreset = () => {
    const newPreset: AiPreset = {
      id: createId('ai'),
      name: `接口 ${settings.aiPresets.length + 1}`,
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      systemPrompt:
        '你是一个简洁、敏锐的个人灵感助手。回答请直击重点，条理清晰，使用自然的中文排版。',
    };
    onUpdateSettings({
      ...settings,
      aiPresets: [...settings.aiPresets, newPreset],
      activePresetId: newPreset.id,
    });
    setTestResult(null);
  };

  const deleteActivePreset = () => {
    if (settings.aiPresets.length <= 1) {
      onShowToast('至少保留一个 AI 接口配置');
      return;
    }
    const remaining = settings.aiPresets.filter((p) => p.id !== activePreset.id);
    onUpdateSettings({
      ...settings,
      aiPresets: remaining,
      activePresetId: remaining[0].id,
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testAiConnection(activePreset);
    setTesting(false);
    setTestResult(result);
  };

  const updateTemplate = (id: string, patch: Partial<PromptTemplate>) => {
    const nextTemplates = settings.promptTemplates.map((t) =>
      t.id === id ? { ...t, ...patch } : t
    );
    onUpdateSettings({ ...settings, promptTemplates: nextTemplates });
  };

  const addTemplate = () => {
    const newTpl: PromptTemplate = {
      id: createId('tpl'),
      name: '新模板',
      template: '请帮我分析以下内容：\n\n{{content}}',
    };
    onUpdateSettings({
      ...settings,
      promptTemplates: [...settings.promptTemplates, newTpl],
      activeTemplateId: newTpl.id,
    });
  };

  const deleteTemplate = (id: string) => {
    if (settings.promptTemplates.length <= 1) {
      onShowToast('至少保留一个复制模板');
      return;
    }
    const remaining = settings.promptTemplates.filter((t) => t.id !== id);
    onUpdateSettings({
      ...settings,
      promptTemplates: remaining,
      activeTemplateId:
        settings.activeTemplateId === id ? remaining[0].id : settings.activeTemplateId,
    });
  };

  const handleExportJson = () => {
    const json = buildJsonBackup(memos, settings);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(`luma-memo-backup-${stamp}.json`, json, 'application/json');
    onShowToast('已导出完整 JSON 备份');
  };

  const handleExportMarkdown = () => {
    const md = buildMarkdownExport(memos);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(`luma-memo-${stamp}.md`, md, 'text/markdown;charset=utf-8');
    onShowToast('已导出 Markdown 笔记');
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      if (!Array.isArray(parsed.memos)) {
        onShowToast('备份文件格式不正确');
        return;
      }
      await onImportMemos(parsed.memos, parsed.settings);
    } catch {
      onShowToast('读取备份文件失败，请确认是有效的 JSON 备份');
    } finally {
      e.target.value = '';
    }
  };

  const baseAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';
  const shortcutUrl = `${baseAppUrl}?q=`;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>设置</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭设置">
            <X size={20} />
          </button>
        </div>

        <div className="sheet-tabs">
          <button
            type="button"
            className={`sheet-tab ${tab === 'appearance' ? 'active' : ''}`}
            onClick={() => setTab('appearance')}
          >
            排版与外观
          </button>
          <button
            type="button"
            className={`sheet-tab ${tab === 'ai' ? 'active' : ''}`}
            onClick={() => setTab('ai')}
          >
            AI 接口
          </button>
          <button
            type="button"
            className={`sheet-tab ${tab === 'templates' ? 'active' : ''}`}
            onClick={() => setTab('templates')}
          >
            复制模板
          </button>
          <button
            type="button"
            className={`sheet-tab ${tab === 'data' ? 'active' : ''}`}
            onClick={() => setTab('data')}
          >
            备份与快捷指令
          </button>
        </div>

        <div className="sheet-body">
          {tab === 'appearance' && (
            <>
              <div className="setting-group">
                <span className="setting-label">正文字号（默认 20px，也可在顶栏随时点 A-/A+ 微调）</span>
                <div className="segmented-row">
                  {FONT_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`segment-btn ${settings.fontSize === size ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ ...settings, fontSize: size })}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <span className="setting-label">行高松紧</span>
                <div className="segmented-row">
                  {[
                    { label: '紧凑 1.58', value: 1.58 },
                    { label: '舒适 1.72', value: 1.72 },
                    { label: '宽松 1.88', value: 1.88 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`segment-btn ${settings.lineHeight === opt.value ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ ...settings, lineHeight: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <span className="setting-label">正文字体</span>
                <div className="segmented-row">
                  {(
                    [
                      { label: '现代无衬线（苹方）', value: 'sans' },
                      { label: '书卷衬线体（宋体）', value: 'serif' },
                    ] as { label: string; value: FontFamilyOption }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`segment-btn ${settings.fontFamily === opt.value ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ ...settings, fontFamily: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <span className="setting-label">主题色调</span>
                <div className="segmented-row">
                  {(
                    [
                      { label: '跟随系统', value: 'system' },
                      { label: '暖纸浅色', value: 'light' },
                      { label: '夜读深色', value: 'dark' },
                    ] as { label: string; value: ThemeOption }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`segment-btn ${settings.theme === opt.value ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ ...settings, theme: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <span className="setting-label">实时排版预览</span>
                <div className="preview-card">
                  好问题往往在散步或通勤时一闪而过。把问题先存下来，随时一键复制给 AI，或直接在这里展开流式解答。
                </div>
              </div>
            </>
          )}

          {tab === 'ai' && (
            <>
              <div className="setting-group">
                <div className="template-item-head">
                  <span className="setting-label">选择 AI 接口配置</span>
                  <button type="button" className="ai-mini-btn" onClick={addCustomPreset}>
                    <Plus size={14} />
                    <span>新增配置</span>
                  </button>
                </div>
                <div className="segmented-row">
                  {settings.aiPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`segment-btn ${preset.id === activePreset.id ? 'active' : ''}`}
                      onClick={() => {
                        onUpdateSettings({ ...settings, activePresetId: preset.id });
                        setTestResult(null);
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <span className="setting-label">配置名称</span>
                <input
                  className="field-input"
                  value={activePreset.name}
                  onChange={(e) => updatePreset({ name: e.target.value })}
                />
              </div>

              <div className="setting-group">
                <span className="setting-label">Base URL（OpenAI 兼容，通常以 /v1 结尾）</span>
                <input
                  className="field-input"
                  value={activePreset.baseUrl}
                  onChange={(e) => updatePreset({ baseUrl: e.target.value })}
                  placeholder="https://api.deepseek.com/v1"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <div className="setting-group">
                <span className="setting-label">API Key（仅保存在本机浏览器）</span>
                <div className="input-with-toggle">
                  <input
                    className="field-input"
                    type={showKey ? 'text' : 'password'}
                    value={activePreset.apiKey}
                    onChange={(e) => updatePreset({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <button
                    type="button"
                    className="input-eye-btn"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <span className="setting-label">模型名称（Model）</span>
                <input
                  className="field-input"
                  value={activePreset.model}
                  onChange={(e) => updatePreset({ model: e.target.value })}
                  placeholder="deepseek-chat / gpt-4o-mini / qwen2.5:7b"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <div className="setting-group">
                <span className="setting-label">系统提示词（System Prompt）</span>
                <textarea
                  className="field-textarea"
                  value={activePreset.systemPrompt}
                  onChange={(e) => updatePreset({ systemPrompt: e.target.value })}
                />
              </div>

              <div className="segmented-row">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={testing}
                  onClick={handleTestConnection}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Wifi size={15} />
                  <span>{testing ? '测试中...' : '测试连接'}</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={deleteActivePreset}
                  style={{ color: 'var(--danger)' }}
                >
                  删除此配置
                </button>
              </div>

              {testResult && (
                <div className={`test-result ${testResult.ok ? 'ok' : 'fail'}`}>
                  {testResult.message}
                </div>
              )}

              <div className="info-box">
                <strong>局域网连接本地 Ollama 提示：</strong>
                电脑端启动 Ollama 时需配置环境变量 <code>OLLAMA_ORIGINS=&quot;*&quot;</code> 并允许局域网监听（<code>OLLAMA_HOST=0.0.0.0</code>），Base URL 填写 <code>http://电脑局域网IP:11434/v1</code>。
              </div>
            </>
          )}

          {tab === 'templates' && (
            <>
              <div className="template-item-head">
                <span className="setting-label">
                  用 <code>{'{{content}}'}</code> 代表笔记正文，在卡片上可随时点小箭头切换任意模板
                </span>
                <button type="button" className="ai-mini-btn" onClick={addTemplate}>
                  <Plus size={14} />
                  <span>新增</span>
                </button>
              </div>

              {settings.promptTemplates.map((tpl) => {
                const isDefault = tpl.id === settings.activeTemplateId;
                return (
                  <div key={tpl.id} className="template-item">
                    <div className="template-item-head">
                      <input
                        className="field-input"
                        style={{ flex: 1 }}
                        value={tpl.name}
                        onChange={(e) => updateTemplate(tpl.id, { name: e.target.value })}
                      />
                      <button
                        type="button"
                        className={`segment-btn ${isDefault ? 'active' : ''}`}
                        onClick={() => onUpdateSettings({ ...settings, activeTemplateId: tpl.id })}
                      >
                        {isDefault ? '默认' : '设为默认'}
                      </button>
                      <button
                        type="button"
                        className="more-btn"
                        onClick={() => deleteTemplate(tpl.id)}
                        aria-label="删除模板"
                      >
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </div>
                    <textarea
                      className="field-textarea"
                      value={tpl.template}
                      onChange={(e) => updateTemplate(tpl.id, { template: e.target.value })}
                    />
                  </div>
                );
              })}
            </>
          )}

          {tab === 'data' && (
            <>
              <div className="setting-group">
                <span className="setting-label">本地数据备份与导出（共 {memos.length} 条）</span>
                <div className="segmented-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleExportJson}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={15} />
                    <span>导出 JSON 备份</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleExportMarkdown}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={15} />
                    <span>导出 Markdown</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Upload size={15} />
                    <span>导入恢复</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={handleImportFile}
                  />
                </div>
              </div>

              <div className="info-box">
                <strong>iPhone 1 秒极速启动技巧：</strong>
                <br />
                1. 在 iOS Safari 点底部分享按钮 → <strong>「添加到主屏幕」</strong>，即可独立全屏启动，离线也能写。
                <br />
                2. 用 iPhone「快捷指令」新建「打开 URL」，填入下方链接并拼接输入文本或剪贴板，绑定到锁屏/操作按钮即可瞬间录入：
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ flex: 1 }}>{shortcutUrl}你的灵感内容</code>
                  <button
                    type="button"
                    className="ai-mini-btn"
                    onClick={async () => {
                      const ok = await copyText(shortcutUrl);
                      if (ok) {
                        setShortcutCopied(true);
                        setTimeout(() => setShortcutCopied(false), 1500);
                      }
                    }}
                  >
                    {shortcutCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{shortcutCopied ? '已复制' : '复制前缀'}</span>
                  </button>
                </div>
                3. 也可使用 <code>{baseAppUrl}?focus=1</code> 打开直接唤醒输入。
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
