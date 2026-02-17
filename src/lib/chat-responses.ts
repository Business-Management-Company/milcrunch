/**
 * Shared AI chat response logic for both the slide-out panel and dashboard chat.
 * Keyword-matching with short, punchy responses — max 2 sentences + CTA.
 */

export interface ChatResponse {
  text: string;
  cta?: { label: string; link: string };
  followUp?: string;
}

export function getChatResponse(input: string): ChatResponse {
  const lower = input.toLowerCase();

  // Sponsor/sponsorship — check before analytics (which also matches "sponsor")
  if (lower.match(/sponsorship|sponsor\s*(dash|form|deck|page|pipe)/))
    return {
      text: "Manage sponsor intake forms, landing pages, decks, and ROI tracking all in one place.",
      cta: { label: "Sponsor Dashboard →", link: "/brand/sponsors" },
    };

  if (lower.match(/creator|influencer|find|discover/))
    return {
      text: "Search tens of millions of creators across TikTok, YouTube, Instagram, Twitter, Twitch, and more — plus 2,400+ verified military influencers.",
      cta: { label: "Open Creator Discovery →", link: "/brand/discover" },
      followUp: "What niche or platform are you targeting?",
    };

  if (lower.match(/list|directory|build/))
    return {
      text: "Build targeted creator lists filtered by branch, platform, engagement, and niche.",
      cta: { label: "Build a List →", link: "/brand/directories" },
    };

  if (lower.match(/podcast|audio|listen/))
    return {
      text: "Browse 825+ military and veteran podcasts. Connect with hosts for sponsorships or guest spots.",
      cta: { label: "Browse Podcasts →", link: "/brand/podcasts" },
    };

  if (lower.match(/speaker|keynote/))
    return {
      text: "Find military keynote speakers filtered by branch, audience size, and topic.",
      cta: { label: "Find Speakers →", link: "/brand/discover" },
    };

  if (lower.match(/event|conference|mic/))
    return {
      text: "Manage 10+ events with speakers, sponsors, and 365-day engagement tracking.",
      cta: { label: "View Events →", link: "/brand/events" },
    };

  if (lower.match(/analytics|report|sponsor|insight|365|roi/))
    return {
      text: "Track sponsor ROI, creator engagement, and community growth year-round.",
      cta: { label: "Open 365 Insights →", link: "/brand/events" },
    };

  if (lower.match(/verify|verification/))
    return {
      text: "Verify military service with our 4-phase pipeline — People Data Labs, Web Search, Deep Extraction, and AI Analysis.",
      cta: { label: "Verify a Creator →", link: "/brand/discover" },
    };

  if (lower.match(/swag|merch|store|shop/))
    return {
      text: "Manage your merch store and build SWAG packages for event attendees.",
      cta: { label: "Open Shop →", link: "/brand/shop" },
    };

  return {
    text: "I help with creators, podcasts, events, sponsors, analytics, and more. What do you need?",
  };
}
