import { Memo } from '../types/memo';

/**
 * Reliable copy helper tailored for iOS Safari (supports both HTTPS clipboard API
 * and LAN HTTP fallback via an offscreen textarea without triggering zoom).
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.fontSize = '16px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    return ok;
  } catch {
    return false;
  }
}

export function applyPromptTemplate(template: string, content: string): string {
  const clean = content.trim();
  if (template.includes('{{content}}')) {
    return template.replace(/\{\{content\}\}/g, clean);
  }
  return `${template.trim()}\n\n${clean}`;
}

export function formatMultiMemoCopy(memos: Memo[], template?: string): string {
  const combined = memos
    .map((m, idx) => `${idx + 1}. ${m.content.trim()}`)
    .join('\n\n');
  if (template) {
    return applyPromptTemplate(template, combined);
  }
  return combined;
}
