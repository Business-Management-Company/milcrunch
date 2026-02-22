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
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target={href?.startsWith("/") ? undefined : "_blank"}
              rel={href?.startsWith("/") ? undefined : "noopener noreferrer"}
              className="text-[#6C5CE7] hover:text-[#5A4BD5] underline underline-offset-2 font-medium"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
