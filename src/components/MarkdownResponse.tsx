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

function fixHeadings(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) return line;
      if (HEADERS.some((h) => trimmed.toLowerCase() === h.toLowerCase())) {
        return `\n## ${trimmed}\n`;
      }
      return line;
    })
    .join("\n");
}

function KeyFactsTable({ body }: { body: string }) {
  const rows = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- **"))
    .map((l) => {
      const m = l.match(/^-\s*\*\*(.+?):\*\*\s*(.*)$/);
      return m ? { label: m[1], value: m[2] } : null;
    })
    .filter((r): r is { label: string; value: string } => !!r);

  if (rows.length === 0) return null;

  return (
    <div className="not-prose my-4">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-800 ${
            i % 2 === 1 ? "bg-gray-50 dark:bg-gray-800/50" : ""
          }`}
        >
          <span className="font-bold text-[#000741] dark:text-white">
            {row.label}:
          </span>
          <span className="text-gray-700 dark:text-gray-300">
            {row.value || "Not publicly available"}
          </span>
        </div>
      ))}
    </div>
  );
}

const PROSE =
  "prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-[#000741] dark:prose-headings:text-white prose-h1:text-xl prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-strong:text-[#000741] dark:prose-strong:text-white prose-li:my-0.5";

export function MarkdownResponse({ content }: { content: string }) {
  const processed = fixHeadings(content);

  // Split at "## Key Facts" to render it as a styled table
  const keyFactsRegex = /(## Key Facts\n)([\s\S]*?)(?=\n## |\n---|\n\*Note|$)/;
  const match = processed.match(keyFactsRegex);

  if (!match) {
    return (
      <div className={PROSE}>
        <ReactMarkdown>{processed}</ReactMarkdown>
      </div>
    );
  }

  const idx = match.index!;
  const before = processed.slice(0, idx);
  const keyFactsBody = match[2];
  const after = processed.slice(idx + match[0].length);

  return (
    <div className={PROSE}>
      {before.trim() && <ReactMarkdown>{before}</ReactMarkdown>}
      <h2 className="text-base font-bold text-[#000741] dark:text-white mt-4 mb-2">
        Key Facts
      </h2>
      <KeyFactsTable body={keyFactsBody} />
      {after.trim() && <ReactMarkdown>{after}</ReactMarkdown>}
    </div>
  );
}
