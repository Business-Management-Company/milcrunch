import ReactMarkdown from "react-markdown";

export function MarkdownResponse({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-inherit dark:prose-invert">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
