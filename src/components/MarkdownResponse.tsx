import ReactMarkdown from "react-markdown";

export function MarkdownResponse({ content }: { content: string }) {
  const processed = content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("#")) {
        const headers = [
          "Executive Summary",
          "Key Facts",
          "Career Highlights",
          "Organizations & Affiliations",
          "Organizations and Affiliations",
          "Quotes",
          "Military Service Background",
          "Notable Achievements",
          "Current Role",
          "Background",
          "Post-Service Career",
          "Key Career Highlights",
          "Notable Achievements and Community Involvement",
        ];
        if (headers.some((h) => trimmed === h)) {
          return `\n## ${trimmed}\n`;
        }
      }
      return line;
    })
    .join("\n");

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-[#000741] dark:prose-headings:text-white prose-h1:text-xl prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-strong:text-[#000741] dark:prose-strong:text-white prose-li:my-0.5">
      <ReactMarkdown>{processed}</ReactMarkdown>
    </div>
  );
}
