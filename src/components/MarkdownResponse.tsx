import ReactMarkdown from "react-markdown";

const HEADERS = [
  "Executive Summary",
  "Key Facts",
  "Career Highlights",
  "Organizations & Affiliations",
  "Organizations and Affiliations",
  "Quotes",
  "Military Service Background",
  "Notable Achievements",
  "Current Role and Career Highlights",
  "Key Career Highlights",
  "Notable Achievements and Community Involvement",
  "Background",
  "Post-Service Career",
];

export function MarkdownResponse({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const processed = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return line;
    if (trimmed.startsWith("#")) return line;
    if (HEADERS.some((h) => trimmed.toLowerCase() === h.toLowerCase())) {
      return `\n## ${trimmed}\n`;
    }
    return line;
  }).join("\n");

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-[#000741] dark:prose-headings:text-white prose-h1:text-xl prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-strong:text-[#000741] dark:prose-strong:text-white prose-li:my-0.5">
      <ReactMarkdown>{processed}</ReactMarkdown>
    </div>
  );
}
