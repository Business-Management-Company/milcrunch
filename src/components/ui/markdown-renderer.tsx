import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

/** Configure marked for clean output */
marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Tailwind prose-like classes applied via a wrapper */
const WRAPPER_CLASS =
  "markdown-rendered text-sm text-gray-700 dark:text-gray-300 leading-relaxed";

/** Sanitise + render markdown string to HTML. Memoised per input. */
function renderToHtml(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}

/**
 * Renders a markdown string as styled HTML.
 * Uses `marked` for parsing and `DOMPurify` for XSS protection.
 *
 * Styled via the global `.markdown-rendered` class (see index.css).
 */
export default function MarkdownRenderer({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const html = useMemo(() => renderToHtml(content), [content]);

  return (
    <div
      className={`${WRAPPER_CLASS} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
