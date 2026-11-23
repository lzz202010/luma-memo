import { AiPreset } from '../types/memo';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  preset: AiPreset;
  messages: ChatTurn[];
  onChunk: (partialContent: string) => void;
  signal?: AbortSignal;
}

function normalizeEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

function diagnoseNetworkError(err: unknown, endpoint: string): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return '已停止生成';
  }

  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpEndpoint = endpoint.startsWith('http://');

  if (isHttpsPage && isHttpEndpoint) {
    return '混合内容被拦截：当前页面为 HTTPS，iOS Safari 不允许直接请求 HTTP 本地地址。请使用局域网 HTTP 访问或为本地服务配置 HTTPS 隧道（如 Tailscale/Cloudflare Tunnel）。';
  }

  return '网络或跨域（CORS）请求失败：请检查 Base URL 是否正确、网络是否连通；若连接本地 Ollama，需设置环境变量 OLLAMA_ORIGINS="*" 后重启服务。';
}

function mapHttpError(status: number, bodyText: string): string {
  let detail = '';
  try {
    const parsed = JSON.parse(bodyText);
    detail = parsed?.error?.message || parsed?.message || '';
  } catch {
    detail = bodyText.slice(0, 140);
  }

  if (status === 401 || status === 403) {
    return `鉴权失败 (${status})：API Key 无效或权限不足。${detail ? `详情：${detail}` : ''}`;
  }
  if (status === 404) {
    return `接口或模型未找到 (404)：请检查 Base URL（通常以 /v1 结尾）和模型名称。${detail ? `详情：${detail}` : ''}`;
  }
  if (status === 429) {
    return `请求过于频繁或额度已用尽 (429)。${detail ? `详情：${detail}` : ''}`;
  }
  return `请求失败 (${status})：${detail || '服务端返回异常'}`;
}

export async function streamChatCompletion({
  preset,
  messages,
  onChunk,
  signal,
}: StreamOptions): Promise<string> {
  const endpoint = normalizeEndpoint(preset.baseUrl);
  if (!endpoint) {
    throw new Error('请先在设置中填写有效的 Base URL');
  }
  if (!preset.model.trim()) {
    throw new Error('请先在设置中填写模型名称（Model）');
  }

  const fullMessages: ChatTurn[] = preset.systemPrompt.trim()
    ? [{ role: 'system', content: preset.systemPrompt.trim() }, ...messages]
    : messages;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (preset.apiKey.trim()) {
    headers.Authorization = `Bearer ${preset.apiKey.trim()}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: preset.model.trim(),
        messages: fullMessages,
        stream: true,
      }),
      signal,
    });
  } catch (err) {
    throw new Error(diagnoseNetworkError(err, endpoint));
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(mapHttpError(response.status, errText));
  }

  const contentType = response.headers.get('content-type') || '';
  // Graceful fallback if the server ignores stream: true and returns plain JSON
  if (contentType.includes('application/json') || !response.body) {
    const json = await response.json();
    const full =
      json?.choices?.[0]?.message?.content ??
      json?.message?.content ??
      '';
    if (!full) {
      throw new Error('接口返回格式异常，未解析到回答内容');
    }
    onChunk(full);
    return full;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(':')) continue;

      if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        if (dataStr === '[DONE]') {
          return accumulated;
        }
        try {
          const parsed = JSON.parse(dataStr);
          const delta =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.choices?.[0]?.message?.content ??
            parsed?.message?.content ??
            '';
          if (delta) {
            accumulated += delta;
            onChunk(accumulated);
          }
        } catch {
          // Ignore incomplete JSON line chunks
        }
      }
    }
  }

  return accumulated;
}

export async function testAiConnection(
  preset: AiPreset
): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);

  try {
    const reply = await streamChatCompletion({
      preset: { ...preset, systemPrompt: '' },
      messages: [{ role: 'user', content: '请只回复 OK' }],
      onChunk: () => {},
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: true,
      latencyMs,
      message: `连接成功（${latencyMs}ms）· 模型响应：${reply.slice(0, 30) || 'OK'}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '连接失败';
    return { ok: false, message: msg };
  } finally {
    window.clearTimeout(timer);
  }
}
