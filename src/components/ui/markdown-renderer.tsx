import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders a markdown string as styled HTML using react-markdown.
 * Supports GFM tables, bold, lists, and links.
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
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target={href?.startsWith("/") ? undefined : "_blank"}
              rel={href?.startsWith("/") ? undefined : "noopener noreferrer"}
              className="text-[#1e3a5f] hover:text-[#2d5282] underline underline-offset-2 font-medium"
              {...props}
            >
              {children}
            </a>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm" {...props}>{children}</table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700" {...props}>{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props}>{children}</th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-3 py-2 border-t border-gray-100 dark:border-gray-800" {...props}>{children}</td>
          ),
          tr: ({ children, ...props }) => (
            <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" {...props}>{children}</tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
