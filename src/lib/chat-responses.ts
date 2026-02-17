/**
 * Shared AI chat response logic for both the slide-out panel and dashboard chat.
 * Keyword-matching with detailed, platform-aware responses.
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
      text: "Manage your entire sponsor pipeline — create intake forms, build sponsor landing pages, upload decks, and track ROI with 365 Insights. Sponsors see exactly how their investment performs year-round.",
      cta: { label: "Sponsor Dashboard →", link: "/brand/sponsors" },
      followUp: "Want to create a sponsor form or view existing submissions?",
    };

  if (lower.match(/creator|influencer|find|discover/))
    return {
      text: "I can help you find the perfect creators! We have access to tens of millions of creators across TikTok, YouTube, Instagram, Twitter, Twitch, and more — plus 2,400+ verified military influencers in our directory. Search by name, niche, engagement rate, or find lookalikes of creators you already love. What type of creator are you looking for?",
      cta: { label: "Open Creator Discovery →", link: "/brand/discover" },
      followUp: "What specific niche or platform are you targeting?",
    };

  if (lower.match(/list|directory|build/))
    return {
      text: "Let's build a targeted creator list for your campaign. Filter by military branch, follower count, engagement rate, platform, and niche. We cover all major social platforms with detailed analytics for each creator.",
      cta: { label: "Build a Creator List →", link: "/brand/directories" },
      followUp: "What specific niche or platform are you targeting?",
    };

  if (lower.match(/podcast|audio|listen/))
    return {
      text: "Our Podcast Network has 825+ military and veteran podcasts indexed and growing. Browse by topic, listen to episodes, and connect directly with hosts for sponsorship or guest opportunities.",
      cta: { label: "Browse Podcast Network →", link: "/brand/podcasts" },
    };

  if (lower.match(/speaker|keynote/))
    return {
      text: "Find keynote speakers from the military community. We can search across millions of profiles to find creators who speak at events, conferences, and corporate engagements. Filter by branch, audience size, and topic.",
      cta: { label: "Find Keynote Speakers →", link: "/brand/discover" },
      followUp: "What specific niche or platform are you targeting?",
    };

  if (lower.match(/event|conference|mic/))
    return {
      text: "You have 10 events on the platform including MIC 2026 and MilSpouseFest. Manage speakers, track registrations, and measure sponsor engagement with our 365 Insights dashboard — because your event doesn't end when the lights go off.",
      cta: { label: "View Events →", link: "/brand/events" },
      followUp: "Which event would you like to manage?",
    };

  if (lower.match(/analytics|report|sponsor|insight|365|roi/))
    return {
      text: "Track sponsor ROI, creator engagement, and community growth year-round with 365 Insights. We monitor impressions across all platforms with comprehensive data points including engagement rates, follower growth, and content performance. Filter by sponsor, compare to past events, and export reports.",
      cta: { label: "Open 365 Insights →", link: "/brand/events" },
      followUp: "Would you like to see data for a specific sponsor or event?",
    };

  if (lower.match(/verify|verification/))
    return {
      text: "Run military service verification on any creator using our 4-phase pipeline: People Data Labs, Web Search, Deep Extraction, and AI Analysis. Get confidence scores backed by real evidence.",
      cta: { label: "Verify a Creator →", link: "/brand/discover" },
    };

  if (lower.match(/swag|store|merch/))
    return {
      text: "Manage your SWAG store and merchandise for events and campaigns.",
      cta: { label: "Open SWAG Store →", link: "/brand/swag-store" },
    };

  return {
    text: "I can help with finding creators across TikTok, YouTube, Instagram, Twitter, and more — plus browsing podcasts, managing events, tracking sponsor ROI, and building campaign lists. What would you like to do?",
  };
}
