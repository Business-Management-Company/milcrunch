import ReactMarkdown from "react-markdown";

/**
 * Renders a markdown string as styled HTML using react-markdown.
 * Styled via the global `.markdown-rendered` class (see index.css).
 */
export default function MarkdownRenderer({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={`markdown-rendered text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${className}`.trim()}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
