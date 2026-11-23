import { AiPreset, AppSettings, FontSizeOption, PromptTemplate } from '../types/memo';

const SETTINGS_KEY = 'luma_memo_settings_v1';

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [18, 20, 22, 24, 26];

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'deep-answer',
    name: '深度解答',
    template: '请帮我清晰、结构化地解答以下问题，并给出可落地的建议：\n\n{{content}}',
  },
  {
    id: 'spark-expand',
    name: '灵感扩写',
    template: '请基于下面这个碎片灵感，帮我发散 3 个可行的方向与下一步行动：\n\n{{content}}',
  },
  {
    id: 'polish',
    name: '润色提炼',
    template: '请帮我把下面这段随手记的内容提炼为核心要点，并润色得更清晰专业：\n\n{{content}}',
  },
  {
    id: 'first-principles',
    name: '第一性原理拆解',
    template: '请从第一性原理出发，帮我拆解以下问题的本质、核心假设与最优解：\n\n{{content}}',
  },
];

export const DEFAULT_AI_PRESETS: AiPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    systemPrompt:
      '你是一个简洁、敏锐的个人灵感助手。回答请直击重点，条理清晰，使用自然的中文排版。',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    systemPrompt:
      '你是一个简洁、敏锐的个人灵感助手。回答请直击重点，条理清晰，使用自然的中文排版。',
  },
  {
    id: 'ollama',
    name: '本地 Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
    model: 'qwen2.5:7b',
    systemPrompt:
      '你是一个简洁、敏锐的个人灵感助手。回答请直击重点，条理清晰，使用自然的中文排版。',
  },
  {
    id: 'custom',
    name: '自定义接口',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    model: 'google/gemini-2.5-flash',
    systemPrompt:
      '你是一个简洁、敏锐的个人灵感助手。回答请直击重点，条理清晰，使用自然的中文排版。',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 20,
  lineHeight: 1.72,
  fontFamily: 'sans',
  theme: 'system',
  activePresetId: 'deepseek',
  aiPresets: DEFAULT_AI_PRESETS,
  activeTemplateId: 'deep-answer',
  promptTemplates: DEFAULT_PROMPT_TEMPLATES,
};

function normalizeFontSize(value: unknown): FontSizeOption {
  if (typeof value === 'number') {
    if (value <= 18) return 18;
    if (FONT_SIZE_OPTIONS.includes(value as FontSizeOption)) {
      return value as FontSizeOption;
    }
  }
  return 20;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    let promptTemplates = DEFAULT_PROMPT_TEMPLATES;
    if (Array.isArray(parsed.promptTemplates) && parsed.promptTemplates.length > 0) {
      promptTemplates = parsed.promptTemplates;
      // Ensure new built-in first-principles template is available if user hasn't explicitly deleted it from v2
      const hasFirstPrinciples = promptTemplates.some((t) => t.id === 'first-principles');
      if (!hasFirstPrinciples && promptTemplates.length === 3) {
        promptTemplates = [...promptTemplates, DEFAULT_PROMPT_TEMPLATES[3]];
      }
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      fontSize: normalizeFontSize(parsed.fontSize),
      lineHeight:
        typeof parsed.lineHeight === 'number' && parsed.lineHeight >= 1.4
          ? parsed.lineHeight
          : 1.72,
      aiPresets:
        Array.isArray(parsed.aiPresets) && parsed.aiPresets.length > 0
          ? parsed.aiPresets
          : DEFAULT_AI_PRESETS,
      promptTemplates,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}
