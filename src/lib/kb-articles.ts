// ---------------------------------------------------------------------------
// Knowledge Base — static article & category data
// ---------------------------------------------------------------------------

export interface KbCategory {
  slug: string;
  label: string;
  emoji: string;
  description: string;
}

export interface KbArticle {
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  readTime: number;
  date: string;
  related: string[];
}

// ---------------------------------------------------------------------------
// Static data (placeholder — replace with real content)
// ---------------------------------------------------------------------------

export const KB_CATEGORIES: KbCategory[] = [
  {
    slug: "getting-started",
    label: "Getting Started",
    emoji: "\uD83D\uDE80",
    description: "Learn the basics of RecurrentX and get up and running quickly.",
  },
  {
    slug: "features",
    label: "Features",
    emoji: "\u2728",
    description: "Deep dives into RecurrentX features and how to use them.",
  },
  {
    slug: "creators",
    label: "Creators",
    emoji: "\uD83C\uDFA8",
    description: "Guides for creators on connecting socials, building your bio page, and more.",
  },
  {
    slug: "brands",
    label: "Brands",
    emoji: "\uD83C\uDFAF",
    description: "Everything brands need to discover, verify, and manage military creators.",
  },
  {
    slug: "billing",
    label: "Billing",
    emoji: "\uD83D\uDCB3",
    description: "Understand plans, credits, invoices, and payment settings.",
  },
  {
    slug: "integrations",
    label: "Integrations",
    emoji: "\uD83D\uDD17",
    description: "Connect RecurrentX with your favorite tools and platforms.",
  },
];

export const KB_ARTICLES: KbArticle[] = [];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function searchArticles(query: string): KbArticle[] {
  const lower = query.toLowerCase();
  return KB_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(lower) ||
      a.summary.toLowerCase().includes(lower) ||
      a.content.toLowerCase().includes(lower),
  );
}

export function getArticlesByCategory(categorySlug: string): KbArticle[] {
  return KB_ARTICLES.filter((a) => a.category === categorySlug);
}

export function getArticleBySlug(slug: string): KbArticle | undefined {
  return KB_ARTICLES.find((a) => a.slug === slug);
}

export function getCategoryBySlug(slug: string): KbCategory | undefined {
  return KB_CATEGORIES.find((c) => c.slug === slug);
}
