import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface FaqPair {
  q: string;
  a: string;
}

interface ContentBlock {
  id: string;
  type: "hero" | "text" | "image" | "cta" | "two_column" | "video" | "faq";
  data: Record<string, string>;
}

interface PageRow {
  id: string;
  slug: string;
  page_name: string;
  status: string;
  content: ContentBlock[];
  meta_title: string | null;
  meta_description: string | null;
  h1_override: string | null;
  canonical_url: string | null;
  robots: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  og_image_alt: string | null;
  twitter_card_type: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image_url: string | null;
  structured_data: Record<string, unknown> | null;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function parseFaqPairs(data: Record<string, string>): FaqPair[] {
  if (data.faq_pairs) {
    try {
      return JSON.parse(data.faq_pairs) as FaqPair[];
    } catch { /* fallback */ }
  }
  if (data.question || data.answer) {
    return [{ q: data.question || "", a: data.answer || "" }];
  }
  return [];
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  const d = block.data;

  switch (block.type) {
    case "hero":
      return (
        <section
          className="relative min-h-[50vh] flex items-center justify-center px-4 md:px-8 py-20 overflow-hidden"
          style={d.bg_image ? { backgroundImage: `url("${d.bg_image}")`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        >
          {d.bg_image && <div className="absolute inset-0 bg-black/50" />}
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            {d.title && (
              <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${d.bg_image ? "text-white" : "text-[#000741]"}`}>
                {d.title}
              </h1>
            )}
            {d.subtitle && (
              <p className={`text-lg md:text-xl mb-8 ${d.bg_image ? "text-white/90" : "text-gray-600"}`}>
                {d.subtitle}
              </p>
            )}
            {d.cta_text && (
              <Link to={d.cta_link || "/"}>
                <Button size="lg" className="rounded-lg bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white px-8">
                  {d.cta_text}
                </Button>
              </Link>
            )}
          </div>
        </section>
      );

    case "text":
      return (
        <section className="px-4 md:px-8 py-12 md:py-16">
          <div className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
            {(d.body || "").split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </section>
      );

    case "image":
      return (
        <section className="px-4 md:px-8 py-8 md:py-12">
          <figure className="max-w-4xl mx-auto">
            <img
              src={d.url}
              alt={d.alt || ""}
              className="w-full rounded-xl shadow-md"
              loading="lazy"
            />
            {d.caption && (
              <figcaption className="text-center text-sm text-gray-500 mt-3">
                {d.caption}
              </figcaption>
            )}
          </figure>
        </section>
      );

    case "cta":
      return (
        <section
          className="px-4 md:px-8 py-12 md:py-16"
          style={d.bg_color ? { backgroundColor: d.bg_color } : {}}
        >
          <div className="max-w-3xl mx-auto text-center">
            {d.heading && (
              <h2 className="text-2xl md:text-3xl font-bold text-[#000741] mb-3">{d.heading}</h2>
            )}
            {d.description && (
              <p className="text-gray-600 mb-6 max-w-xl mx-auto">{d.description}</p>
            )}
            <Link to={d.url || "/"}>
              <Button
                size="lg"
                className={`rounded-lg px-8 ${
                  d.style === "secondary"
                    ? "bg-white border border-gray-300 text-[#000741] hover:bg-gray-50"
                    : "bg-[#6C5CE7] hover:bg-[#5B4BD1] text-white"
                }`}
              >
                {d.text || "Click Here"}
              </Button>
            </Link>
          </div>
        </section>
      );

    case "two_column":
      return (
        <section className="px-4 md:px-8 py-12 md:py-16">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="prose prose-gray dark:prose-invert">
              {(d.left || "").split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <div className="prose prose-gray dark:prose-invert">
              {(d.right || "").split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </section>
      );

    case "video":
      return (
        <section className="px-4 md:px-8 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            {d.title && <h3 className="text-xl font-semibold text-[#000741] mb-4 text-center">{d.title}</h3>}
            <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
              <iframe
                src={d.url}
                title={d.title || "Video"}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      );

    case "faq": {
      const pairs = parseFaqPairs(d);
      if (pairs.length === 0) return null;
      return (
        <section className="px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-3">
            {pairs.map((pair, idx) => (
              <div
                key={idx}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/30"
              >
                <h3 className="font-semibold text-[#000741] dark:text-white mb-2">{pair.q}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{pair.a}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    (async () => {
      const lookupSlug = slug.startsWith("/") ? slug : `/${slug}`;
      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .eq("slug", lookupSlug)
        .eq("status", "published")
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const row: PageRow = {
        ...data,
        content: (Array.isArray(data.content) ? data.content : []) as ContentBlock[],
        structured_data: data.structured_data as Record<string, unknown> | null,
      };

      setPage(row);

      // Set document meta tags
      if (row.meta_title) document.title = row.meta_title;
      if (row.meta_description) setMeta("description", row.meta_description);
      if (row.robots) setMeta("robots", row.robots);
      if (row.og_title) setMeta("og:title", row.og_title, "property");
      if (row.og_description) setMeta("og:description", row.og_description, "property");
      if (row.og_image_url) setMeta("og:image", row.og_image_url, "property");
      if (row.og_image_alt) setMeta("og:image:alt", row.og_image_alt, "property");
      if (row.twitter_card_type) setMeta("twitter:card", row.twitter_card_type);
      if (row.twitter_title) setMeta("twitter:title", row.twitter_title);
      if (row.twitter_description) setMeta("twitter:description", row.twitter_description);
      if (row.twitter_image_url) setMeta("twitter:image", row.twitter_image_url);
      if (row.canonical_url) {
        let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
        link.href = row.canonical_url;
      }
      if (row.structured_data) {
        let script = document.querySelector('script[data-cms-jsonld]') as HTMLScriptElement | null;
        if (!script) { script = document.createElement("script"); script.type = "application/ld+json"; script.setAttribute("data-cms-jsonld", "true"); document.head.appendChild(script); }
        script.textContent = JSON.stringify(row.structured_data);
      }

      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Page not found</p>
          <a href="/" className="text-primary underline hover:text-primary/90">Return to Home</a>
        </div>
      </div>
    );
  }

  const h1 = page.h1_override || page.page_name;
  const blocks = page.content || [];
  const hasHeroBlock = blocks.some((b) => b.type === "hero");

  return (
    <div className="min-h-screen bg-white text-[#000741]">
      {/* Simple nav */}
      <header className="h-14 flex items-center justify-between px-4 md:px-8 border-b border-gray-200 bg-white">
        <Link to="/" className="shrink-0">
          <span className="font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="text-[#000741]">MilCrunch</span>
            <span className="text-[#6C5CE7] font-extrabold">X</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/events" className="text-sm font-medium text-gray-600 hover:text-[#6C5CE7]">Events</Link>
          <Link to="/creators" className="text-sm font-medium text-gray-600 hover:text-[#6C5CE7]">Creators</Link>
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-[#6C5CE7]">Sign In</Link>
        </nav>
      </header>

      <main>
        {!hasHeroBlock && h1 && (
          <section className="px-4 md:px-8 py-12 md:py-16 text-center bg-gray-50 border-b border-gray-200">
            <h1 className="text-3xl md:text-4xl font-bold text-[#000741]">{h1}</h1>
          </section>
        )}
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </main>

      <footer className="px-4 md:px-8 py-8 border-t border-gray-200 bg-white text-center">
        <Link to="/" className="inline-block mb-2">
          <span className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="text-[#000741]">MilCrunch</span>
            <span className="text-[#6C5CE7] font-extrabold">X</span>
          </span>
        </Link>
        <p className="text-xs text-gray-500">&copy; 2026 MilCrunch. All rights reserved.</p>
      </footer>
    </div>
  );
}
