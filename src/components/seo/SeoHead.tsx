import { useEffect } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface SeoHeadProps {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  faqs?: FaqItem[];
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

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.href = url;
}

function setJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function SeoHead({ title, description, canonical, ogTitle, ogDescription, faqs }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", ogTitle || title, "property");
    setMeta("og:description", ogDescription || description, "property");
    setMeta("og:url", `https://milcrunch.com${canonical}`, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:title", ogTitle || title);
    setMeta("twitter:description", ogDescription || description);
    setCanonical(`https://milcrunch.com${canonical}`);

    if (faqs && faqs.length > 0) {
      setJsonLd("faq-schema", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      });
    }

    return () => {
      const faqEl = document.getElementById("faq-schema");
      if (faqEl) faqEl.remove();
    };
  }, [title, description, canonical, ogTitle, ogDescription, faqs]);

  return null;
}
