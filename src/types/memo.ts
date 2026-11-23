export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  model?: string;
  error?: string;
}

export interface Memo {
  id: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  aiThread: AiMessage[];
  aiCollapsed?: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
}

export interface AiPreset {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export type FontSizeOption = 17 | 18 | 20 | 22 | 24;
export type FontFamilyOption = 'sans' | 'serif';
export type ThemeOption = 'system' | 'light' | 'dark';

export interface AppSettings {
  fontSize: FontSizeOption;
  lineHeight: number;
  fontFamily: FontFamilyOption;
  theme: ThemeOption;
  activePresetId: string;
  aiPresets: AiPreset[];
  activeTemplateId: string;
  promptTemplates: PromptTemplate[];
}

export interface BackupPayload {
  version: number;
  exportedAt: number;
  memos: Memo[];
  settings?: Partial<AppSettings>;
}
