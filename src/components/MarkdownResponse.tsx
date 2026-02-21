import ReactMarkdown from "react-markdown";

const SECTION_HEADERS = [
  "Executive Summary",
  "Key Facts",
  "Career Highlights",
  "Organizations & Affiliations",
  "Quotes",
  "Military Service Background",
  "Notable Achievements",
  "Current Role",
  "Background",
  "Post-Service Career",
];

function ensureMarkdownHeadings(content: string): string {
  let result = content;
  for (const header of SECTION_HEADERS) {
    // Match header as a standalone line without ## already
    const regex = new RegExp(`^(?!#)(${header})\\s*$`, "gm");
    result = result.replace(regex, `## ${header}`);
  }
  return result;
}

export function MarkdownResponse({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-[#000741] dark:prose-headings:text-white prose-h1:text-xl prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2 prose-strong:text-[#000741] dark:prose-strong:text-white prose-li:my-0.5">
      <ReactMarkdown>{ensureMarkdownHeadings(content)}</ReactMarkdown>
    </div>
  );
}
