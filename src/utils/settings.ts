import { AiPreset, AppSettings, PromptTemplate } from '../types/memo';

const SETTINGS_KEY = 'luma_memo_settings_v1';

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
  fontSize: 18,
  lineHeight: 1.68,
  fontFamily: 'sans',
  theme: 'system',
  activePresetId: 'deepseek',
  aiPresets: DEFAULT_AI_PRESETS,
  activeTemplateId: 'deep-answer',
  promptTemplates: DEFAULT_PROMPT_TEMPLATES,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      aiPresets:
        Array.isArray(parsed.aiPresets) && parsed.aiPresets.length > 0
          ? parsed.aiPresets
          : DEFAULT_AI_PRESETS,
      promptTemplates:
        Array.isArray(parsed.promptTemplates) && parsed.promptTemplates.length > 0
          ? parsed.promptTemplates
          : DEFAULT_PROMPT_TEMPLATES,
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
