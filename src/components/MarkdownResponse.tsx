import ReactMarkdown from "react-markdown";

export function MarkdownResponse({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-[#000741] dark:prose-headings:text-white prose-h1:text-xl prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-strong:text-[#000741] dark:prose-strong:text-white prose-li:my-0.5">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
