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
  isPublished: boolean;
}

// Alias for alternate casing used in some imports
export type KBArticle = KbArticle;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const KB_CATEGORIES: KbCategory[] = [
  { slug: "events-pdx", label: "Events & PDX", emoji: "\uD83C\uDFAA", description: "Event setup, PDX wizard, attendee app" },
  { slug: "creator-network", label: "Creator Network", emoji: "\uD83C\uDFA4", description: "Discovery, verification, onboarding" },
  { slug: "365-insights", label: "365 Insights & Analytics", emoji: "\uD83D\uDCCA", description: "Sponsor dashboards, ROI reports" },
  { slug: "streaming-media", label: "Streaming & Media", emoji: "\uD83D\uDCE1", description: "Live streaming, clips, distribution" },
  { slug: "email-marketing", label: "Email Marketing", emoji: "\uD83D\uDCE7", description: "Campaigns, lists, templates" },
  { slug: "sponsor", label: "Sponsorship & Revenue", emoji: "\uD83D\uDCB0", description: "Packages, proposals, rate desk" },
];

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const KB_ARTICLES: KbArticle[] = [
  {
    slug: "what-is-pdx",
    title: "What is the Parade Deck Experience (PDX)?",
    category: "events-pdx",
    summary: "A full overview of the PDX model, 7 phases, and what is included.",
    content: `# What is the Parade Deck Experience (PDX)?\n\nThe Parade Deck Experience (PDX) is a full-service live streaming stage and creator activation built specifically for military events...\n\n## The 7 Phases\n\n1. Conference Partnership\n2. Agenda & ROS Creation\n3. Budget & Sponsor Activation\n4. Creator Roster & Content Planning\n5. Day-Of Production\n6. Live Streaming & Social Amplification\n7. AAR & ROI Report\n\n> **Key Tip:** The PDX stage has generated over $150,000\u2013$250,000 in sponsor revenue at a single event.`,
    readTime: 5,
    date: "2026-02-18",
    related: ["create-run-of-show", "attendee-app-setup"],
    isPublished: true,
  },
  {
    slug: "create-run-of-show",
    title: "How to Create a Run of Show (ROS)",
    category: "events-pdx",
    summary: "Guide to building conflict-free event schedules.",
    content: `# How to Create a Run of Show (ROS)\n\nA Run of Show is the backbone of any successful PDX event...\n\n## Getting Started\n\nNavigate to PDX Stage \u2192 Create PDX \u2192 Phase 2: Agenda & ROS.\n\n## Building Time Blocks\n\nAdd segments by selecting the date tab and clicking Add Block. Each block includes start time, end time, segment type, and speaker name.\n\n> **Key Tip:** Use the conflict detector to avoid overlapping with the organization\u2019s main stage sessions.`,
    readTime: 4,
    date: "2026-02-18",
    related: ["what-is-pdx", "attendee-app-setup"],
    isPublished: true,
  },
  {
    slug: "attendee-app-setup",
    title: "Setting Up Your Attendee App",
    category: "events-pdx",
    summary: "PWA setup, QR codes, community feed, and more.",
    content: `# Setting Up Your Attendee App\n\nRecurrentX includes a mobile-first Progressive Web App for every event...\n\n## Installation\n\nAttendees visit your event URL and tap Add to Home Screen. No App Store required.\n\n## Features\n\n- Live schedule with day-by-day agenda\n- Speaker profiles and bios\n- Community feed with real-time posts\n- QR networking and lead retrieval\n- Push notifications\n\n> **Key Tip:** Share the app URL on all event signage and in your confirmation emails.`,
    readTime: 4,
    date: "2026-02-18",
    related: ["what-is-pdx", "create-run-of-show"],
    isPublished: true,
  },
  {
    slug: "creator-verification",
    title: "How Military Creator Verification Works",
    category: "creator-network",
    summary: "The 4-phase AI verification pipeline explained.",
    content: `# How Military Creator Verification Works\n\nEvery creator on RecurrentX goes through a 4-phase verification pipeline...\n\n## Phase 1: Identity Verification\nBasic identity confirmation using submitted information.\n\n## Phase 2: Service Record Check\nMilitary service verification using available records and documentation.\n\n## Phase 3: Content Review\nAI-powered review of creator content for brand safety and authenticity.\n\n## Phase 4: Confidence Score\nA final score from 0-100 indicating verification confidence.\n\n> **Key Tip:** Creators with scores above 80 are considered fully verified and display a verification badge.`,
    readTime: 5,
    date: "2026-02-18",
    related: [],
    isPublished: true,
  },
  {
    slug: "email-getting-started",
    title: "Getting Started with RecurrentX Mail",
    category: "email-marketing",
    summary: "Setup guide for the email marketing module.",
    content: `# Getting Started with RecurrentX Mail\n\nRecurrentX Mail is a full email marketing platform built into the platform...\n\n## Setup Steps\n\n1. Go to Email \u2192 Settings\n2. Set your From Name and From Email\n3. Verify your sending domain\n4. Import your first contacts\n5. Create your first campaign\n\n## Sending Domain\n\nVerify your domain to send from your own email address instead of a generic one.\n\n> **Key Tip:** Verified domains have significantly higher deliverability rates.`,
    readTime: 3,
    date: "2026-02-18",
    related: [],
    isPublished: true,
  },
  {
    slug: "sponsor-dashboard",
    title: "Understanding Your Sponsor Dashboard",
    category: "365-insights",
    summary: "Reading the 12-month sponsor analytics charts.",
    content: `# Understanding Your Sponsor Dashboard\n\nThe 365 Insights sponsor dashboard tracks sponsor ROI year-round...\n\n## Key Metrics\n\n- **Impressions**: Total views of sponsored content\n- **Engagement**: Likes, comments, shares on sponsored posts\n- **Reach**: Unique accounts reached\n- **Est. Value**: Estimated media value of exposure\n\n## 12-Month Timeline\n\nThe timeline chart shows how sponsor performance trends across the full year, with event spikes clearly visible.\n\n> **Key Tip:** Use the YoY comparison to show sponsors their growth from year to year \u2014 this is your best renewal tool.`,
    readTime: 5,
    date: "2026-02-18",
    related: ["sponsor-packages"],
    isPublished: true,
  },
  {
    slug: "multi-destination-streaming",
    title: "Setting Up Multi-Destination Streaming",
    category: "streaming-media",
    summary: "Stream to YouTube, Facebook, and Twitch simultaneously.",
    content: `# Setting Up Multi-Destination Streaming\n\nRecurrentX supports simultaneous streaming to multiple platforms...\n\n## Supported Platforms\n\n- YouTube Live\n- Facebook Live\n- Twitch\n- Custom RTMP endpoints\n\n## Setup\n\n1. Go to Streaming in the sidebar\n2. Connect your platform accounts in Integrations\n3. Select destinations for your stream\n4. Start broadcasting\n\n> **Key Tip:** Test your stream 30 minutes before going live to check audio levels and video quality.`,
    readTime: 4,
    date: "2026-02-18",
    related: [],
    isPublished: true,
  },
  {
    slug: "sponsor-packages",
    title: "Sponsor Package Tiers Explained",
    category: "sponsor",
    summary: "Presenting, Gold, Silver, and Bronze packages.",
    content: `# Sponsor Package Tiers Explained\n\nRecurrentX supports four standard sponsor tiers...\n\n## Presenting Sponsor\nTop-tier exclusivity. Logo on all materials, named stage rights, premium streaming overlays.\n\n## Gold Sponsor\nProminent placement, social mentions, booth presence, post-event report.\n\n## Silver Sponsor\nStandard placement, social mention, post-event report.\n\n## Bronze Sponsor\nLogo placement, post-event acknowledgment.\n\n> **Key Tip:** Use the Rate Desk to set CPM-based pricing for each tier based on expected impressions.`,
    readTime: 4,
    date: "2026-02-18",
    related: ["sponsor-dashboard"],
    isPublished: true,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function searchArticles(query: string): KbArticle[] {
  const lower = query.toLowerCase();
  return KB_ARTICLES.filter(
    (a) =>
      a.isPublished &&
      (a.title.toLowerCase().includes(lower) ||
        a.summary.toLowerCase().includes(lower) ||
        a.content.toLowerCase().includes(lower)),
  );
}

export function getArticlesByCategory(categorySlug: string): KbArticle[] {
  return KB_ARTICLES.filter((a) => a.category === categorySlug && a.isPublished);
}

export function getArticleBySlug(slug: string): KbArticle | undefined {
  return KB_ARTICLES.find((a) => a.slug === slug);
}

export function getCategoryBySlug(slug: string): KbCategory | undefined {
  return KB_CATEGORIES.find((c) => c.slug === slug);
}
