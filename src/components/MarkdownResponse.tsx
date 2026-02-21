import ReactMarkdown from "react-markdown";

const SECTION_HEADERS = [
  "executive summary",
  "key facts",
  "career highlights",
  "organizations & affiliations",
  "organizations and affiliations",
  "quotes",
  "military service background",
  "notable achievements",
  "key career highlights",
  "notable achievements and community involvement",
  "post-service career",
];

export function MarkdownResponse({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let inBulletSection = false;

  const processed = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) { inBulletSection = false; return line; }
    if (trimmed.length === 0) return line;

    const lower = trimmed.toLowerCase();

    if (SECTION_HEADERS.includes(lower)) {
      inBulletSection = lower.includes("career highlight") || lower.includes("achievement") || lower.includes("org");
      return `\n## ${trimmed}\n`;
    }

    if (inBulletSection && !trimmed.startsWith("-") && !trimmed.startsWith("*") && !trimmed.startsWith("**Note") && !trimmed.startsWith("Note:")) {
      return `- ${trimmed}`;
    }

    return line;
  }).join("\n");

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert
      prose-h1:text-base prose-h1:font-semibold prose-h1:text-foreground prose-h1:mt-0 prose-h1:mb-3
      prose-h2:text-xs prose-h2:font-bold prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-[#6C5CE7] prose-h2:mt-6 prose-h2:mb-2
      prose-h3:text-sm prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-5 prose-h3:mb-1.5
      prose-strong:text-[#000741] dark:prose-strong:text-white
      prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-table:text-sm
      first:prose-p:mt-0 first:prose-h1:mt-0 first:prose-h2:mt-0">
      <ReactMarkdown>{processed}</ReactMarkdown>
    </div>
  );
}
