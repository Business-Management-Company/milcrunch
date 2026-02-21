import React from "react";

interface Block {
  type: "h1" | "subtitle" | "h2" | "key-facts" | "bullets" | "blockquote" | "note" | "paragraph";
  text?: string;
  items?: string[];
  facts?: { label: string; value: string }[];
}

function parse(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  let inKeyFacts = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty → skip
    if (!trimmed) { i++; continue; }

    // H1
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      inKeyFacts = false;
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      i++;
      // Next non-empty line that isn't a heading, bullet, or blockquote → subtitle
      while (i < lines.length && !lines[i].trim()) i++;
      if (i < lines.length) {
        const next = lines[i].trim();
        if (next && !next.startsWith("#") && !next.startsWith("- ") && !next.startsWith("> ")) {
          blocks.push({ type: "subtitle", text: next });
          i++;
        }
      }
      continue;
    }

    // H2
    if (trimmed.startsWith("## ")) {
      const header = trimmed.slice(3);
      inKeyFacts = header.toLowerCase() === "key facts";
      blocks.push({ type: "h2", text: header });
      i++;
      continue;
    }

    // Key Facts table rows: - **Label:** Value
    if (inKeyFacts && trimmed.startsWith("- **")) {
      const facts: { label: string; value: string }[] = [];
      while (i < lines.length) {
        const fl = lines[i].trim();
        if (!fl) { i++; continue; }
        if (!fl.startsWith("- **")) break;
        const m = fl.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/);
        if (m) facts.push({ label: m[1].replace(/:$/, ""), value: m[2] });
        i++;
      }
      if (facts.length > 0) blocks.push({ type: "key-facts", facts });
      inKeyFacts = false;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      inKeyFacts = false;
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const ql = lines[i].trim();
        if (!ql && quoteLines.length > 0) break;
        if (!ql) { i++; continue; }
        if (!ql.startsWith("> ") && !ql.startsWith(">")) break;
        quoteLines.push(ql.replace(/^>\s*/, ""));
        i++;
      }
      if (quoteLines.length > 0) blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    // Bullet list (regular, not key-facts)
    if (trimmed.startsWith("- ")) {
      inKeyFacts = false;
      const items: string[] = [];
      while (i < lines.length) {
        const bl = lines[i].trim();
        if (!bl) { i++; continue; }
        if (!bl.startsWith("- ")) break;
        items.push(bl.slice(2));
        i++;
      }
      if (items.length > 0) blocks.push({ type: "bullets", items });
      continue;
    }

    // Note / disclaimer: starts and ends with *
    if (/^\*[^*]/.test(trimmed) && trimmed.endsWith("*")) {
      inKeyFacts = false;
      blocks.push({ type: "note", text: trimmed.slice(1, -1) });
      i++;
      continue;
    }

    // Regular paragraph
    inKeyFacts = false;
    blocks.push({ type: "paragraph", text: trimmed });
    i++;
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
    else if (match[2]) parts.push(<em key={key++}>{match[2]}</em>);
    else if (match[3] && match[4]) parts.push(<a key={key++} href={match[4]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">{match[3]}</a>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownResponse({ content }: { content: string }) {
  const blocks = parse(content);

  return (
    <div>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h1":
            return <h1 key={idx} className="text-xl font-bold text-gray-900 mb-1">{block.text}</h1>;
          case "subtitle":
            return <p key={idx} className="text-gray-500 italic text-sm mb-4">{block.text}</p>;
          case "h2":
            return <h2 key={idx} className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mt-6 mb-2 pb-1 border-b border-indigo-100">{block.text}</h2>;
          case "key-facts":
            return (
              <table key={idx} className="w-full text-sm mb-4 rounded border border-gray-200 overflow-hidden">
                <tbody>
                  {block.facts!.map((fact, fi) => (
                    <tr key={fi} className={fi % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="font-semibold text-gray-700 w-36 px-3 py-2">{fact.label}</td>
                      <td className="text-gray-800 px-3 py-2">{renderInline(fact.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case "bullets":
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1 text-sm text-gray-700 mb-4">
                {block.items!.map((item, li) => <li key={li}>{renderInline(item)}</li>)}
              </ul>
            );
          case "blockquote":
            return <blockquote key={idx} className="border-l-4 border-indigo-300 pl-4 italic text-gray-600 text-sm my-3">{renderInline(block.text!)}</blockquote>;
          case "note":
            return <p key={idx} className="text-xs text-gray-400 italic mt-4">{renderInline(block.text!)}</p>;
          case "paragraph":
            return <p key={idx} className="text-sm text-gray-700 my-2">{renderInline(block.text!)}</p>;
          default:
            return null;
        }
      })}
    </div>
  );
}

export default MarkdownResponse;
