import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(markdownText: string): string {
  if (!markdownText.trim()) return '';
  const rawHtml = marked.parse(markdownText, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
  });
}
