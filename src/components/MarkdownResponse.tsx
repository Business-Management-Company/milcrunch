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

/** Parse "- **Label:** Value" or "**Label:** Value" lines into [label, value] pairs */
function parseKeyFacts(lines: string[]): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim().replace(/^-\s*/, "");
    const match = trimmed.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
    if (match) {
      facts.push({ label: match[1].replace(/:$/, ""), value: match[2] });
    }
  }
  return facts;
}

function KeyFactsTable({ facts }: { facts: { label: string; value: string }[] }) {
  if (facts.length === 0) return null;
  return (
    <div className="not-prose my-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#6C5CE7] mb-2">
        Key Facts
      </h2>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {facts.map((fact, i) => (
          <div
            key={i}
            className={`grid grid-cols-[140px_1fr] text-sm ${
              i % 2 === 0 ? "bg-gray-50" : "bg-white"
            }`}
          >
            <div className="px-3 py-2 font-semibold text-[#000741]">
              {fact.label}
            </div>
            <div className="px-3 py-2 text-gray-700">{fact.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarkdownResponse({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let inBulletSection = false;
  let inKeyFacts = false;

  const processed = lines
    .map((line) => {
      const trimmed = line.trim();

      // Lines already starting with # — reset bullet mode
      if (trimmed.startsWith("#")) {
        const headerText = trimmed.replace(/^#+\s*/, "").toLowerCase();
        inKeyFacts = headerText === "key facts";
        inBulletSection =
          !inKeyFacts &&
          (headerText.includes("career highlight") ||
            headerText.includes("achievement") ||
            headerText.includes("org"));
        return line;
      }

      if (trimmed.length === 0) return line;

      const lower = trimmed.toLowerCase();

      // Detect plain-text section headers (no ## prefix) and promote them
      if (SECTION_HEADERS.includes(lower)) {
        inKeyFacts = lower === "key facts";
        inBulletSection =
          !inKeyFacts &&
          (lower.includes("career highlight") ||
            lower.includes("achievement") ||
            lower.includes("org"));
        return `\n## ${trimmed}\n`;
      }

      // Inside Key Facts — leave as-is (will be extracted later)
      if (inKeyFacts) return line;

      // Auto-bullet for career highlights / achievements / organizations
      if (
        inBulletSection &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("*") &&
        !trimmed.startsWith("**Note") &&
        !trimmed.startsWith("Note:")
      ) {
        return `- ${trimmed}`;
      }

      return line;
    })
    .join("\n");

  // Split at ## Key Facts and render that section as a table
  const keyFactsRegex = /^## Key Facts\s*$/im;
  const keyFactsMatch = processed.match(keyFactsRegex);

  if (keyFactsMatch && keyFactsMatch.index !== undefined) {
    const beforeKeyFacts = processed.slice(0, keyFactsMatch.index);
    const afterHeader = processed.slice(
      keyFactsMatch.index + keyFactsMatch[0].length
    );

    // Key facts section ends at the next ## heading or end of string
    const nextHeading = afterHeader.search(/^## /m);
    const keyFactsBlock =
      nextHeading >= 0 ? afterHeader.slice(0, nextHeading) : afterHeader;
    const afterKeyFacts =
      nextHeading >= 0 ? afterHeader.slice(nextHeading) : "";

    const facts = parseKeyFacts(keyFactsBlock.split("\n"));

    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert
        prose-h1:text-base prose-h1:font-semibold prose-h1:text-foreground prose-h1:mt-0 prose-h1:mb-3
        prose-h2:text-xs prose-h2:font-bold prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-[#6C5CE7] prose-h2:mt-6 prose-h2:mb-2
        prose-h3:text-sm prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-5 prose-h3:mb-1.5
        prose-strong:text-[#000741] dark:prose-strong:text-white
        prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-table:text-sm
        first:prose-p:mt-0 first:prose-h1:mt-0 first:prose-h2:mt-0"
      >
        {beforeKeyFacts.trim() && (
          <ReactMarkdown>{beforeKeyFacts.trim()}</ReactMarkdown>
        )}
        <KeyFactsTable facts={facts} />
        {afterKeyFacts.trim() && (
          <ReactMarkdown>{afterKeyFacts.trim()}</ReactMarkdown>
        )}
      </div>
    );
  }

  // No Key Facts section found — render normally
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert
      prose-h1:text-base prose-h1:font-semibold prose-h1:text-foreground prose-h1:mt-0 prose-h1:mb-3
      prose-h2:text-xs prose-h2:font-bold prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-[#6C5CE7] prose-h2:mt-6 prose-h2:mb-2
      prose-h3:text-sm prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-5 prose-h3:mb-1.5
      prose-strong:text-[#000741] dark:prose-strong:text-white
      prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-table:text-sm
      first:prose-p:mt-0 first:prose-h1:mt-0 first:prose-h2:mt-0"
    >
      <ReactMarkdown>{processed}</ReactMarkdown>
    </div>
  );
}
