import ReactMarkdown from "react-markdown";

const SECTION_HEADERS = [
  "Executive Summary",
  "Key Facts",
  "Career Highlights",
  "Organizations & Affiliations",
  "Organizations and Affiliations",
  "Quotes",
  "Military Service Background",
  "Notable Achievements",
  "Key Career Highlights",
  "Notable Achievements and Community Involvement",
  "Post-Service Career",
];

export function MarkdownResponse({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let inCareerHighlights = false;
  let inOrgs = false;

  const processed = lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) { inCareerHighlights = false; inOrgs = false; return line; }
    if (trimmed.startsWith("#")) return line;

    // First non-empty line = headline → h1
    const firstContentLine = lines.findIndex(l => l.trim().length > 0);
    if (i === firstContentLine && !SECTION_HEADERS.some(h => trimmed.toLowerCase() === h.toLowerCase())) {
      return `# ${trimmed}`;
    }

    // Section headers → h2
    if (SECTION_HEADERS.some(h => trimmed.toLowerCase() === h.toLowerCase())) {
      inCareerHighlights = trimmed.toLowerCase().includes("career highlight") || trimmed.toLowerCase().includes("achievement");
      inOrgs = trimmed.toLowerCase().includes("org") || trimmed.toLowerCase().includes("affil");
      return `\n## ${trimmed}\n`;
    }

    // Career highlights and orgs lines → bullets if not already
    if ((inCareerHighlights || inOrgs) && !trimmed.startsWith("-") && !trimmed.startsWith("*") && !trimmed.startsWith("**Note")) {
      return `- ${trimmed}`;
    }

    return line;
  }).join("\n");

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert
      prose-h1:text-base prose-h1:font-semibold prose-h1:text-muted-foreground prose-h1:mt-0 prose-h1:mb-2
      prose-h2:text-xs prose-h2:font-bold prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-[#6C5CE7] prose-h2:mt-5 prose-h2:mb-2
      prose-strong:text-[#000741] dark:prose-strong:text-white
      prose-li:my-0.5 prose-p:my-1 prose-table:text-sm">
      <ReactMarkdown>{processed}</ReactMarkdown>
    </div>
  );
}
