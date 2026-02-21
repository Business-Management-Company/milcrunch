import React from "react";

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

/** Apply inline formatting: **bold**, *italic*, [link](url) */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Combined regex: bold, italic, or links
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      parts.push(<strong key={key++} className="font-semibold text-gray-900 dark:text-white">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3] && match[4]) {
      parts.push(<a key={key++} href={match[4]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800">{match[3]}</a>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

interface Section {
  type: "h1" | "h1-subtitle" | "h2" | "key-facts" | "bullet-list" | "blockquote" | "note" | "paragraph" | "hr";
  text?: string;
  items?: string[];
  facts?: { label: string; value: string }[];
}

function parseMarkdown(content: string): Section[] {
  const raw = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n");
  const sections: Section[] = [];

  let i = 0;
  let currentH2 = "";

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) { i++; continue; }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      sections.push({ type: "hr" });
      i++;
      continue;
    }

    // H1
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      sections.push({ type: "h1", text: trimmed.replace(/^#\s+/, "") });
      i++;
      // Next non-empty line before any ## is the subtitle
      while (i < lines.length && !lines[i].trim()) i++;
      if (i < lines.length && !lines[i].trim().startsWith("#") && !SECTION_HEADERS.includes(lines[i].trim().toLowerCase())) {
        sections.push({ type: "h1-subtitle", text: lines[i].trim() });
        i++;
      }
      continue;
    }

    // H2 (with ## prefix)
    if (trimmed.startsWith("## ")) {
      currentH2 = trimmed.replace(/^##\s+/, "").toLowerCase();
      sections.push({ type: "h2", text: trimmed.replace(/^##\s+/, "") });
      i++;
      continue;
    }

    // Plain-text section header (no ## prefix)
    if (SECTION_HEADERS.includes(trimmed.toLowerCase())) {
      currentH2 = trimmed.toLowerCase();
      sections.push({ type: "h2", text: trimmed });
      i++;
      continue;
    }

    // Key Facts section: collect bullet lines as key-value pairs
    if (currentH2 === "key facts") {
      const facts: { label: string; value: string }[] = [];
      while (i < lines.length) {
        const fl = lines[i].trim();
        if (!fl) { i++; continue; }
        if (fl.startsWith("## ") || fl.startsWith("# ") || SECTION_HEADERS.includes(fl.toLowerCase())) break;
        const cleaned = fl.replace(/^-\s*/, "");
        const m = cleaned.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
        if (m) {
          facts.push({ label: m[1].replace(/:$/, ""), value: m[2] });
        }
        i++;
      }
      if (facts.length > 0) sections.push({ type: "key-facts", facts });
      currentH2 = "";
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">") || trimmed.startsWith('"') || trimmed.startsWith("\u201C")) {
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const ql = lines[i].trim();
        if (!ql && quoteLines.length > 0) break;
        if (ql.startsWith("## ") || ql.startsWith("# ") || SECTION_HEADERS.includes(ql.toLowerCase())) break;
        if (!ql) { i++; continue; }
        quoteLines.push(ql.replace(/^>\s*/, "").replace(/^[""\u201C\u201D]+|[""\u201C\u201D]+$/g, ""));
        i++;
      }
      if (quoteLines.length > 0) sections.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    // Bullet list
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const bl = lines[i].trim();
        if (!bl) { i++; continue; }
        if (bl.startsWith("## ") || bl.startsWith("# ") || SECTION_HEADERS.includes(bl.toLowerCase())) break;
        if (bl.startsWith("- ") || bl.startsWith("* ")) {
          items.push(bl.replace(/^[-*]\s+/, ""));
        } else if (!bl.startsWith("**Note") && !bl.startsWith("Note:") && !bl.startsWith("*Note")) {
          // Non-bullet line in a bullet section — auto-bullet it
          items.push(bl);
        } else {
          // Note line — break out
          break;
        }
        i++;
      }
      if (items.length > 0) sections.push({ type: "bullet-list", items });
      continue;
    }

    // Note / disclaimer (starts with *Note or Note:)
    if (trimmed.startsWith("*Note") || trimmed.startsWith("Note:") || trimmed.startsWith("**Note")) {
      const noteText = trimmed.replace(/^\*+/, "").replace(/\*+$/, "").replace(/^Note:\s*/, "Note: ");
      sections.push({ type: "note", text: noteText });
      i++;
      continue;
    }

    // Regular paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (i < lines.length) {
      const pl = lines[i].trim();
      if (!pl) break;
      if (pl.startsWith("# ") || pl.startsWith("## ") || pl.startsWith("- ") || pl.startsWith("* ") || pl.startsWith("> ")) break;
      if (SECTION_HEADERS.includes(pl.toLowerCase())) break;
      if (/^---+$/.test(pl)) break;
      paraLines.push(pl);
      i++;
    }
    if (paraLines.length > 0) {
      sections.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return sections;
}

export function MarkdownResponse({ content }: { content: string }) {
  const sections = parseMarkdown(content);

  return (
    <div className="text-sm leading-relaxed">
      {sections.map((section, idx) => {
        switch (section.type) {
          case "h1":
            return (
              <h1 key={idx} className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {section.text}
              </h1>
            );
          case "h1-subtitle":
            return (
              <p key={idx} className="text-gray-500 dark:text-gray-400 italic mb-4">
                {section.text}
              </p>
            );
          case "h2":
            return (
              <h2 key={idx} className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mt-6 mb-2 border-b border-indigo-100 dark:border-indigo-900 pb-1">
                {section.text}
              </h2>
            );
          case "key-facts":
            return (
              <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden my-3">
                {section.facts!.map((fact, fi) => (
                  <div
                    key={fi}
                    className={`grid grid-cols-[160px_1fr] text-sm ${
                      fi % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : "bg-white dark:bg-gray-900"
                    }`}
                  >
                    <div className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                      {fact.label}
                    </div>
                    <div className="px-3 py-2 text-gray-900 dark:text-gray-100">
                      {renderInline(fact.value)}
                    </div>
                  </div>
                ))}
              </div>
            );
          case "bullet-list":
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300 my-2">
                {section.items!.map((item, li) => (
                  <li key={li}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "blockquote":
            return (
              <blockquote key={idx} className="border-l-4 border-indigo-300 dark:border-indigo-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">
                {renderInline(section.text!)}
              </blockquote>
            );
          case "note":
            return (
              <p key={idx} className="italic text-gray-500 dark:text-gray-400 text-xs mt-4">
                {renderInline(section.text!)}
              </p>
            );
          case "hr":
            return <hr key={idx} className="my-4 border-gray-200 dark:border-gray-700" />;
          case "paragraph":
            return (
              <p key={idx} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed my-2">
                {renderInline(section.text!)}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export default MarkdownResponse;
