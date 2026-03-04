import { useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Clock,
  ChevronRight,
  Share2,
  ArrowLeft,
  Lightbulb,
  BookOpen,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import HexLogo from "@/components/brand/HexLogo";
import {
  getArticleBySlug,
  getCategoryBySlug,
  getArticleBySlug as getRelated,
} from "@/lib/kb-articles";
import type { KbArticle as KbArticleType } from "@/lib/kb-articles";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

interface ContentBlock {
  type: "h2" | "h3" | "p" | "ul" | "callout";
  id?: string; // only for h2
  text?: string; // h2, h3, p
  items?: string[]; // ul
  lines?: string[]; // callout
}

function parseContent(raw: string): ContentBlock[] {
  const lines = raw.split("\n");
  const blocks: ContentBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // h2
    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      blocks.push({ type: "h2", text, id: slugify(text) });
      i++;
      continue;
    }

    // h3
    if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      blocks.push({ type: "h3", text });
      i++;
      continue;
    }

    // Bullet list: collect consecutive `- ` lines
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Callout: collect consecutive `> ` lines
    if (line.startsWith("> ")) {
      const calloutLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        calloutLines.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ type: "callout", lines: calloutLines });
      continue;
    }

    // Paragraph (any other non-empty line)
    blocks.push({ type: "p", text: line });
    i++;
  }

  return blocks;
}

function extractHeadings(blocks: ContentBlock[]): { id: string; text: string }[] {
  return blocks
    .filter((b): b is ContentBlock & { type: "h2"; id: string; text: string } => b.type === "h2")
    .map((b) => ({ id: b.id!, text: b.text! }));
}

/** Render inline markdown: **bold** and *italic* */
function renderInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const KbArticle = () => {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const [copied, setCopied] = useState(false);

  const article = slug ? getArticleBySlug(slug) : undefined;
  const cat = category ? getCategoryBySlug(category) : undefined;

  const blocks = useMemo(
    () => (article ? parseContent(article.content) : []),
    [article]
  );
  const headings = useMemo(() => extractHeadings(blocks), [blocks]);

  const relatedArticles = useMemo(() => {
    if (!article) return [];
    return article.related
      .map((s) => getRelated(s))
      .filter((a): a is KbArticleType => !!a);
  }, [article]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleHeadingClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /* ---------- Not found ---------- */
  if (!article) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-100 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <HexLogo variant="light" iconSize={22} textClass="text-xl" />
            </Link>
            <Link
              to="/kb"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Knowledge Base
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Article not found
          </h1>
          <p className="text-gray-500 mb-6">
            The article you're looking for doesn't exist or may have been moved.
          </p>
          <Link
            to="/kb"
            className="inline-flex items-center gap-2 text-[#1e3a5f] hover:underline font-medium text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Link>
        </main>
      </div>
    );
  }

  /* ---------- Main render ---------- */
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <HexLogo variant="light" iconSize={22} textClass="text-xl" />
          </Link>
          <Link
            to="/kb"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Knowledge Base
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <Link to="/kb" className="hover:text-[#1e3a5f] transition-colors">
              Knowledge Base
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            {cat ? (
              <Link
                to={`/kb/${category}`}
                className="hover:text-[#1e3a5f] transition-colors"
              >
                {cat.label}
              </Link>
            ) : (
              <span>{category}</span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            <span className="text-gray-900 font-medium truncate max-w-[240px]">
              {article.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Two-column layout */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex gap-10">
          {/* Left: Article */}
          <article className="flex-1 min-w-0 max-w-[720px]">
            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              {article.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-3 mt-4 mb-8">
              {cat && (
                <Link
                  to={`/kb/${category}`}
                  className="inline-block text-xs font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] px-2.5 py-1 rounded-full hover:bg-[#1e3a5f]/20 transition-colors"
                >
                  {cat.label}
                </Link>
              )}
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                {article.readTime} min read
              </span>
              <span className="text-sm text-gray-400">{article.date}</span>
              <button
                onClick={handleShare}
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border transition-all ml-auto",
                  copied
                    ? "border-green-300 text-green-600 bg-green-50"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="space-y-5">
              {blocks.map((block, idx) => {
                switch (block.type) {
                  case "h2":
                    return (
                      <h2
                        key={idx}
                        id={block.id}
                        className="text-xl font-bold text-gray-900 mt-10 mb-2 scroll-mt-24"
                      >
                        {block.text}
                      </h2>
                    );
                  case "h3":
                    return (
                      <h3
                        key={idx}
                        className="text-lg font-semibold text-gray-800 mt-6 mb-1"
                      >
                        {block.text}
                      </h3>
                    );
                  case "p":
                    return (
                      <p
                        key={idx}
                        className="text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: renderInline(block.text ?? ""),
                        }}
                      />
                    );
                  case "ul":
                    return (
                      <ul
                        key={idx}
                        className="list-disc list-inside space-y-1.5 text-gray-700 leading-relaxed pl-1"
                      >
                        {block.items?.map((item, j) => (
                          <li
                            key={j}
                            dangerouslySetInnerHTML={{
                              __html: renderInline(item),
                            }}
                          />
                        ))}
                      </ul>
                    );
                  case "callout":
                    return (
                      <div
                        key={idx}
                        className="flex gap-3 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg px-4 py-4"
                      >
                        <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900 leading-relaxed space-y-1">
                          {block.lines?.map((line, j) => (
                            <p
                              key={j}
                              dangerouslySetInnerHTML={{
                                __html: renderInline(line),
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  default:
                    return null;
                }
              })}
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <section className="mt-14 pt-8 border-t border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#1e3a5f]" />
                  Related Articles
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedArticles.map((rel) => (
                    <Link
                      key={rel.slug}
                      to={`/kb/${rel.category}/${rel.slug}`}
                      className="block border border-gray-100 rounded-lg p-4 hover:shadow-md hover:border-gray-200 transition-all group"
                    >
                      <h4 className="font-semibold text-gray-900 group-hover:text-[#1e3a5f] transition-colors text-sm">
                        {rel.title}
                      </h4>
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                        {rel.summary}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Right: Table of Contents (desktop only) */}
          {headings.length > 0 && (
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-24">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  On This Page
                </h4>
                <nav className="space-y-2">
                  {headings.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => handleHeadingClick(h.id)}
                      className="block text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors text-left leading-snug"
                    >
                      {h.text}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <p className="text-gray-500 text-sm">
            Can't find what you need?{" "}
            <a
              href="mailto:support@recurrentx.com"
              className="text-[#1e3a5f] hover:underline font-medium"
            >
              Contact support
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default KbArticle;
