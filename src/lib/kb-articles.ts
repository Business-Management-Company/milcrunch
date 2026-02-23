// ---------------------------------------------------------------------------
// Knowledge Base — static article & category data
// ---------------------------------------------------------------------------

export interface KbArticle {
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  readTime: number;
  date: string;
  related: string[];
  isPublished: boolean;
}

export interface KbCategory {
  slug: string;
  label: string;
  emoji: string;
  description: string;
}

// Alias for alternate casing used in some imports
export type KBArticle = KbArticle;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const KB_CATEGORIES: KbCategory[] = [
  {
    slug: "events-pdx",
    label: "Events & Experience",
    emoji: "\uD83C\uDFAA",
    description:
      "Create and manage events, set up the MilCrunch Experience stage, and build mobile attendee apps.",
  },
  {
    slug: "creator-network",
    label: "Creator Network",
    emoji: "\uD83C\uDFA4",
    description:
      "Discover, verify, and manage military and veteran creators for campaigns and events.",
  },
  {
    slug: "365-insights",
    label: "365 Insights & Analytics",
    emoji: "\uD83D\uDCCA",
    description:
      "Year-round sponsor dashboards, impression tracking, and renewal tools.",
  },
  {
    slug: "streaming-media",
    label: "Streaming & Media",
    emoji: "\uD83D\uDCE1",
    description:
      "Multi-platform streaming, AI clip generation, and content repurposing.",
  },
  {
    slug: "email-marketing",
    label: "Email Marketing",
    emoji: "\uD83D\uDCE7",
    description:
      "Build lists, design campaigns, manage contacts, and track deliverability.",
  },
  {
    slug: "sponsorship-revenue",
    label: "Sponsorship & Revenue",
    emoji: "\uD83D\uDCB0",
    description:
      "Sponsor packages, rate desk pricing, proposal building, and ROI reporting.",
  },
];

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const KB_ARTICLES: KbArticle[] = [
  // ─── EVENTS & PDX ───────────────────────────────────────────────────
  {
    title: "What is the MilCrunch Experience?",
    slug: "what-is-pdx",
    category: "events-pdx",
    summary:
      "A complete overview of the Experience live-stage production model and its 7-phase pipeline.",
    readTime: 6,
    date: "2026-02-10",
    related: ["creating-run-of-show", "inviting-creators-pdx-stage"],
    isPublished: true,
    content: `## What is the Experience?

The MilCrunch Experience is MilCrunch's turnkey live-stage production model designed specifically for military and veteran events. Rather than leaving a conference stage empty between keynotes, the Experience transforms that downtime into an engaging, revenue-generating content hub featuring military creators, panel discussions, live interviews, and sponsor activations.

The Experience has been battle-tested at events like the Military Influencer Conference (MIC), where it turned hours of otherwise dead stage time into some of the highest-engagement segments of the entire event.

## The 7-Phase Pipeline

Every Experience production follows a structured pipeline that keeps your team organized from initial planning through post-event analysis.

### Phase 1 — Partnership

Establish the relationship with the event organizer. Define scope, stage access windows, technical requirements, and revenue-sharing terms. This is where you align on goals and set expectations for what the Experience will deliver.

### Phase 2 — Agenda & Run of Show

Build a detailed Run of Show (ROS) that maps every minute of stage time. The ROS includes segment types, creator assignments, sponsor integrations, and transition notes. MilCrunch's ROS builder handles conflict detection automatically.

### Phase 3 — Budget

Set your production budget covering equipment, travel, talent fees, and crew. The budget module tracks planned versus actual spend so you can stay on target and report accurate costs to stakeholders.

### Phase 4 — Sponsors

Attach sponsors to specific segments, overlays, and activations. Each sponsor gets defined deliverables — logo placements, shout-outs, dedicated segments, and lead-retrieval access. This is where the Experience generates direct revenue.

### Phase 5 — Creators

Source and schedule military creators from your MilCrunch network. Creators are matched to segments based on their audience, content style, and topic expertise. Invitations, confirmations, and day-of logistics are managed inside the platform.

### Phase 6 — Production

Execute the live show. This includes multi-destination streaming, on-site camera management, lower-third graphics, sponsor overlays, and real-time schedule adjustments. The production dashboard gives your crew a single pane of glass for everything happening on stage.

### Phase 7 — After Action Review (AAR)

Once the event wraps, generate post-event reports covering impressions, engagement, sponsor ROI, and creator performance. The AAR feeds directly into your 365 Insights dashboard so sponsors see value year-round, not just event week.

## Why the Experience Works

- Revenue from dead time — Stages sitting idle between keynotes are wasted money. The Experience fills those gaps with sponsor-backed content.
- Creator-driven engagement — Military audiences connect with creators they already follow. The Experience puts those creators on stage.
- Turnkey production — The 7-phase pipeline means nothing falls through the cracks, even for teams running their first live stage.
- 365 content engine — Every Experience segment is recorded, clipped, and redistributed as social content for months after the event.

> The Experience is not just a stage show — it is a full content and sponsorship engine that extends the value of every event far beyond the venue walls.`,
  },
  {
    title: "How to Create a Run of Show (ROS)",
    slug: "creating-run-of-show",
    category: "events-pdx",
    summary:
      "Step-by-step guide to building a conflict-free event schedule in the Experience wizard.",
    readTime: 5,
    date: "2026-02-10",
    related: ["what-is-pdx", "setting-up-attendee-app"],
    isPublished: true,
    content: `## What is a Run of Show?

A Run of Show (ROS) is the minute-by-minute schedule that drives your entire Experience stage production. It defines who is on stage, what is happening, which sponsors are featured, and how transitions flow between segments. In MilCrunch, the ROS builder is a visual, drag-and-drop tool that makes it easy to plan even the most complex multi-day events.

## Accessing the ROS Builder

Navigate to your event in the MilCrunch dashboard and select the "Run of Show" tab. If this is a new event, you will be prompted to set your stage windows — the blocks of time you have access to the stage each day. Stage windows define the outer boundaries of your schedule.

## Adding Time Blocks

Click "Add Block" to create a new segment. Each block requires the following fields:

- Title — A short name for the segment (e.g., "Veteran Entrepreneur Panel")
- Start Time / End Time — When the segment begins and ends
- Type — Choose from Interview, Panel, Performance, Sponsor Spot, Transition, or Custom
- Assigned Creators — Select creators from your network who will appear in this segment
- Sponsor — Optionally attach a sponsor whose branding will be featured
- Notes — Internal production notes visible to your crew

### Color-Coded Segment Types

Each segment type is color-coded on the timeline for quick visual scanning:

- Interviews appear in blue
- Panels appear in navy blue
- Performances appear in green
- Sponsor spots appear in gold
- Transitions appear in gray

This makes it easy to spot at a glance whether your schedule has a healthy mix of content types or is too heavily weighted toward one format.

## Conflict Detection

The ROS builder automatically checks for scheduling conflicts as you add and move blocks. If two segments overlap, a red warning appears on both blocks with a message explaining the conflict. You cannot finalize a ROS that contains unresolved conflicts.

> Conflict detection also checks creator availability. If a creator is assigned to two overlapping segments, the system flags it immediately so you can reassign before it becomes a day-of problem.

## Reordering and Adjusting

Drag any block to move it to a new time slot. The builder snaps blocks to five-minute increments by default, but you can switch to one-minute precision in the settings gear icon. If you shorten or lengthen a block, downstream blocks can optionally auto-shift to fill the gap.

## Exporting Your ROS

Once your schedule is finalized, you have several export options:

- PDF — A formatted document suitable for printing and distributing to crew and talent
- CSV — A spreadsheet-friendly format for further editing or integration with other tools
- Share Link — A read-only link you can send to creators and sponsors so they know exactly when they are on stage

## Best Practices

- Build your ROS at least two weeks before the event to give creators time to prepare
- Include five-minute transition blocks between segments for mic changes and stage resets
- Add a buffer block at the start and end of each day for sound checks
- Use the notes field liberally — your production crew will thank you on event day`,
  },
  {
    title: "Setting Up Your Attendee App",
    slug: "setting-up-attendee-app",
    category: "events-pdx",
    summary:
      "Configure the mobile-first PWA for your event with schedule, speakers, and community feed.",
    readTime: 5,
    date: "2026-02-08",
    related: ["creating-run-of-show", "push-notifications-attendees"],
    isPublished: true,
    content: `## What is the Attendee App?

The MilCrunch Attendee App is a mobile-first Progressive Web App (PWA) that gives event attendees instant access to schedules, speakers, sponsors, and a live community feed — all without downloading anything from the App Store or Google Play. Attendees simply scan a QR code or tap a link, and the app loads in their browser.

## Why a PWA?

Traditional native apps require attendees to search, download, and install before they can use them. By the time they go through that process, many have already lost interest. A PWA eliminates that friction entirely. It works on any modern smartphone, loads in seconds, and can even be added to the home screen for a native-like experience.

## Configuring Your Event App

From your event dashboard, navigate to the "Attendee App" tab. Here you will configure the following sections:

### Branding

- Event Logo — Upload your event's logo (recommended 512x512 PNG)
- Color Theme — Set primary and accent colors to match your event branding
- Hero Image — A banner image that appears at the top of the app home screen
- Welcome Message — A short greeting that attendees see when they first open the app

### Schedule

The schedule is automatically populated from your Run of Show. Attendees can browse by day, filter by segment type, and tap any session to see details including speaker bios and sponsor information. If you update the ROS, the attendee app reflects changes in real time.

### Speakers & Creators

Each creator or speaker assigned to a ROS segment gets a profile card in the app. You can enrich these cards with:

- Bio and headshot
- Social media links
- Session assignments
- A "Follow" button that lets attendees save their favorite speakers

### Sponsors

Sponsors appear in a dedicated section with their logo, description, and booth location. Tiered sponsors are displayed proportionally — Presenting sponsors get the largest placement, while Bronze sponsors appear in a grid.

### Community Feed

The community feed is a live, moderated social wall where attendees can post updates, photos, and reactions during the event. You can set moderation rules to auto-approve posts or require manual review before they appear.

### QR Networking

Each attendee gets a unique QR code in the app. When two attendees scan each other's codes, their contact information is exchanged automatically. This replaces business cards and ensures connections are captured digitally.

> The QR networking feature is one of the highest-rated features among attendees. It turns a casual conversation into a lasting professional connection without the awkwardness of exchanging phone numbers.

## Sharing the App

Once configured, MilCrunch generates a unique URL and QR code for your event app. Place the QR code on signage, lanyards, table tents, and slide decks so attendees can access the app from anywhere at the venue.

## Post-Event Access

The attendee app remains live after the event ends. Attendees can revisit session recordings, speaker profiles, and their networking connections. This extended access keeps your event top-of-mind and provides additional sponsor impressions long after the venue closes.`,
  },
  {
    title: "Lead Retrieval for Sponsors",
    slug: "lead-retrieval-sponsors",
    category: "events-pdx",
    summary:
      "How sponsor representatives capture and export leads at events using QR scanning.",
    readTime: 4,
    date: "2026-02-05",
    related: ["setting-up-attendee-app", "sponsor-package-tiers"],
    isPublished: true,
    content: `## What is Lead Retrieval?

Lead retrieval is the process of capturing attendee contact information at events so sponsors can follow up after the show. MilCrunch's lead retrieval system uses the same QR codes built into the attendee app, giving sponsors a frictionless way to scan and collect leads without any extra hardware.

## How It Works

Every attendee who opens the event app has a unique QR code associated with their profile. When a sponsor representative scans that QR code using the MilCrunch sponsor portal, the attendee's information — name, email, company, title, and any custom registration fields — is instantly captured and added to the sponsor's lead list.

### Setting Up Lead Retrieval for Sponsors

As an event organizer, you control which sponsors have access to lead retrieval. From the event dashboard:

- Navigate to "Sponsors" and select the sponsor
- Toggle "Lead Retrieval Access" to enabled
- Assign the number of scanning licenses (one per sponsor representative)
- Each representative receives a unique login link for the scanning interface

### The Scanning Experience

Sponsor representatives open their scanning link on any smartphone. The interface is simple — point the camera at an attendee's QR code, and the lead is captured with a confirmation animation. Representatives can also:

- Add notes — Jot down conversation context while it is fresh
- Rate the lead — Hot, warm, or cold classification for prioritized follow-up
- Tag the lead — Apply custom tags like "decision maker" or "interested in product X"

> Encourage sponsor reps to add notes immediately after each scan. A name and email alone is far less valuable than a name, email, and "interested in Q3 campaign partnership" note.

## Viewing and Exporting Leads

Sponsors can view their captured leads in real time from the sponsor portal. The lead list shows:

- Attendee name and contact details
- Scan timestamp
- Notes and ratings added by the representative
- Any custom registration data the attendee provided

### Export Options

- CSV Export — Download the full lead list as a spreadsheet for import into any CRM
- Direct CRM Integration — If configured, leads can be pushed automatically to Salesforce, HubSpot, or other supported CRMs
- PDF Summary — A formatted report showing lead volume, rating breakdown, and scan timeline

## Best Practices

- Brief sponsor reps before the event on how the scanning interface works
- Set up a test QR code so reps can practice scanning before doors open
- Remind reps that lead quality matters more than quantity — notes and ratings make follow-up far more effective
- Share final lead counts with sponsors within 24 hours of event close as part of your post-event reporting

## Privacy and Compliance

Attendees are informed during registration that their information may be shared with sponsors through lead retrieval. MilCrunch includes opt-out options for attendees who prefer not to participate. All lead data is encrypted in transit and at rest.`,
  },
  {
    title: "Sending Push Notifications to Attendees",
    slug: "push-notifications-attendees",
    category: "events-pdx",
    summary:
      "Guide to sending real-time notifications through the attendee app during events.",
    readTime: 4,
    date: "2026-02-03",
    related: ["setting-up-attendee-app", "lead-retrieval-sponsors"],
    isPublished: true,
    content: `## Why Push Notifications Matter

During a live event, plans change. Sessions run long, rooms get swapped, surprise guests show up, and sponsors want to drive traffic to their booths. Push notifications let you communicate instantly with every attendee who has the event app open, keeping everyone informed and engaged without relying on overhead announcements that half the room misses.

## Enabling Notifications

Push notifications are enabled by default for all MilCrunch attendee apps. When an attendee first opens the PWA, they are prompted to allow notifications. Attendees who accept will receive notifications even when the app is not actively open on their screen, as long as their browser supports PWA push.

> Approximately 60-70% of attendees opt in to notifications when prompted at first open. To maximize opt-in rates, include a note on event signage encouraging attendees to enable notifications for schedule updates.

## Sending a Notification

From the event dashboard, navigate to "Notifications" and click "New Notification." You will fill in:

- Title — A short, attention-grabbing headline (max 65 characters)
- Body — The message content (max 240 characters)
- Type — Select from Schedule Change, Announcement, Sponsor Promotion, or Emergency
- Link — Optionally deep-link to a specific session, sponsor page, or community feed post
- Send Time — Send immediately or schedule for a specific time

### Notification Types

Each type is styled differently in the attendee app to help recipients quickly understand the nature of the message:

- Schedule Change — Yellow banner indicating a time, room, or speaker change
- Announcement — Blue banner for general event updates and reminders
- Sponsor Promotion — Gold banner used for sponsor-driven messages like booth giveaways or session invitations
- Emergency — Red banner reserved for safety or critical operational messages

## Audience Targeting

You can send notifications to all attendees or target specific segments:

- By registration type — VIP, general admission, exhibitor, speaker
- By engagement — Attendees who favorited a specific session or speaker
- By location check-in — Attendees who checked into a specific area (if location features are enabled)

## Best Practices

- Limit notifications to 4-6 per day to avoid fatigue. More than that and attendees start ignoring or disabling them.
- Send schedule change notifications at least 15 minutes before the affected session.
- Use sponsor promotions sparingly and make them genuinely valuable — "Free coffee at the XYZ booth" works better than "Visit Booth 42."
- Always test a notification to your own device before sending to the full audience.
- Reserve the Emergency type strictly for genuine safety or critical issues. Overusing it erodes trust.

## Tracking Performance

After sending, the notification dashboard shows delivery rate, open rate, and tap-through rate. Use these metrics to refine your messaging strategy throughout the event. If open rates drop below 30%, you may be sending too frequently or the content may not feel relevant to attendees.`,
  },

  // ─── CREATOR NETWORK ────────────────────────────────────────────────
  {
    title: "How Military Creator Verification Works",
    slug: "military-creator-verification",
    category: "creator-network",
    summary:
      "Understanding the 4-phase verification pipeline for authenticating military service.",
    readTime: 6,
    date: "2026-02-12",
    related: ["building-creator-list", "creator-analytics"],
    isPublished: true,
    content: `## Why Verification Matters

The military influencer space has a trust problem. Stolen valor, exaggerated service records, and fake military personas undermine the credibility of genuine veteran creators and put brands at risk. MilCrunch built its verification pipeline specifically to solve this — giving brands confidence that the creators they work with are who they say they are.

When a creator is verified through MilCrunch, brands can partner with them knowing their military background has been authenticated through a rigorous, multi-phase process.

## The 4-Phase Verification Pipeline

### Phase 1 — AI Screening

The first phase is automated. When a creator joins the MilCrunch network or is discovered through the search tool, our AI screening system analyzes their public profiles for military service indicators:

- Bio keywords and hashtags related to military service
- Content themes and topics consistent with military experience
- Audience demographics and engagement patterns
- Cross-platform consistency of claimed service details
- Known military organization affiliations and hashtags

The AI assigns an initial confidence score based on how strongly the signals align. Creators scoring above the threshold move automatically to Phase 2. Those below the threshold are flagged for manual review.

### Phase 2 — Document Review

Creators who pass AI screening are invited to submit documentation supporting their service claims. Accepted documents include:

- DD-214 (Certificate of Release or Discharge)
- Military ID (active duty, reserve, or retired)
- VA benefit letter or health card
- Official military orders or service records

Documents are reviewed by trained staff. Sensitive information like Social Security numbers is redacted before storage. MilCrunch never shares original documents with brands — only the verified/not-verified status.

### Phase 3 — Community Validation

In this phase, the creator's profile is cross-referenced against the MilCrunch community network. The system checks:

- Whether other verified creators vouch for or have collaborated with this creator
- Participation in known military organizations, nonprofits, or veteran groups
- Attendance at verified military events
- Endorsements from military community leaders already in the network

Community validation adds a layer of social proof that documents alone cannot provide. A creator who is known and respected within the veteran community carries additional credibility.

### Phase 4 — Manual Review

A MilCrunch team member conducts a final review of all collected evidence — AI signals, documents, and community validation. This human-in-the-loop step catches edge cases that automated systems might miss and ensures no one is unfairly rejected or approved.

> The manual review step is intentionally human-driven. Military service comes in many forms, and a human reviewer can apply judgment that algorithms cannot.

## Confidence Scores

After verification, each creator receives a confidence score displayed on their profile:

- High Match (green) — Strong evidence across multiple phases. Brands can partner with high confidence.
- Mid Match (yellow) — Some evidence verified, but gaps remain. Additional documentation may strengthen the score.
- Low Match (red) — Limited evidence found. The creator may still be legitimate but has not yet provided sufficient proof.

## What Brands See

Brands viewing a creator's profile in the discovery tool or a saved list see the verification badge and confidence level. They can click into the verification summary to see which phases the creator has completed without accessing the underlying documents.

## Ongoing Monitoring

Verification is not a one-time event. MilCrunch periodically re-scans verified creators to ensure their public profiles remain consistent with their verified status. If significant discrepancies are detected, the creator is flagged for re-review.`,
  },
  {
    title: "Building a Creator List for Your Campaign",
    slug: "building-creator-list",
    category: "creator-network",
    summary:
      "How to search, filter, and save curated creator lists for campaigns and outreach.",
    readTime: 5,
    date: "2026-02-10",
    related: ["military-creator-verification", "creator-analytics"],
    isPublished: true,
    content: `## Overview

Creator lists are the backbone of any campaign in MilCrunch. A list is a curated group of military and veteran creators that you have hand-picked for a specific campaign, event, or ongoing partnership. Lists make it easy to organize outreach, track responses, and ensure you are working with the right creators for each opportunity.

## Using the Discovery Tool

The discovery tool is where you find creators to add to your lists. Navigate to Brand > Discover to access the search interface. From here you can search by keyword or use the AI search to describe the type of creator you are looking for in plain language.

### Available Filters

The discovery tool offers a robust set of filters to narrow your results:

- Platform — Filter by Instagram, TikTok, YouTube, Twitter/X, Facebook, or LinkedIn
- Follower Range — Set minimum and maximum follower counts
- Engagement Rate — Filter by minimum engagement percentage
- Location — Country, state, or city
- Niche — Content categories like fitness, lifestyle, comedy, education, or advocacy
- Gender — Filter by creator gender
- Language — Primary content language
- Keywords in Bio — Search for specific terms in creator bios
- Military Branch — Toggle filters for Army, Navy, Air Force, Marines, and Coast Guard

> Use the military branch toggles in combination with niche filters for the most targeted results. For example, "Marine Corps" + "Fitness" surfaces creators who are Marines and primarily post fitness content.

### Reading Creator Cards

Each search result is displayed as a creator card showing:

- Avatar, display name, and username
- Verification badge and confidence score
- Platform icons with linked profiles
- Follower count, engagement rate, and external link count
- A two-line bio preview and up to three niche tags

Click any card to open the full enrichment profile with detailed analytics, audience demographics, and content samples.

## Saving Creators to a List

When you find a creator you want to work with, click the "Add to List" button on their card. You can either add them to an existing list or create a new one on the spot. Lists can be named anything — "MIC 2026 Stage Talent," "Q2 Fitness Campaign," or "Sponsor Activation Candidates."

### Managing Your Lists

Navigate to Brand > Lists to see all your saved lists. Each list shows:

- List name and description
- Number of creators
- Date created and last updated
- Quick actions to view, edit, or export

Inside a list, you can reorder creators, add notes to individual entries, remove creators who are no longer a fit, and bulk-export the list as a CSV for sharing with your team.

## List Strategies

- One list per campaign — Keep campaigns organized by creating a dedicated list for each initiative
- Tiered lists — Create "first choice" and "backup" lists so you have alternatives ready if a creator declines
- Event-specific lists — For Experience productions, build a list per event and map creators to ROS segments directly from the list
- Evergreen lists — Maintain a running list of top-performing creators you want to work with repeatedly

## Collaboration

Lists can be shared with team members who have brand-level access. Shared lists show who added each creator and when, making it easy for distributed teams to collaborate on creator selection without duplicating effort.`,
  },
  {
    title: "Understanding Creator Analytics",
    slug: "creator-analytics",
    category: "creator-network",
    summary:
      "How to read engagement rates, reach metrics, and authenticity scores for creators.",
    readTime: 5,
    date: "2026-02-08",
    related: ["building-creator-list", "inviting-creators-pdx-stage"],
    isPublished: true,
    content: `## Why Analytics Matter

Follower counts tell part of the story, but they do not tell you whether a creator's audience actually pays attention. MilCrunch provides deep analytics on every creator in the network so you can make decisions based on real performance data rather than vanity metrics.

## Key Metrics Explained

### Engagement Rate

Engagement rate measures how actively a creator's audience interacts with their content. It is calculated as total engagements (likes, comments, shares, saves) divided by total followers, expressed as a percentage.

- Above 5% — Exceptional engagement, typically seen with smaller or highly niche audiences
- 2% to 5% — Strong engagement, well above average
- 1% to 2% — Average engagement for most platforms
- Below 1% — Low engagement, may indicate inactive followers or purchased audience

> Engagement rate is often more valuable than follower count. A creator with 20,000 engaged followers will typically outperform one with 200,000 disengaged followers for campaign purposes.

### Reach and Impressions

Reach is the number of unique accounts that see a creator's content. Impressions are the total number of times content is displayed, including repeat views. MilCrunch estimates these metrics based on platform-reported data and historical performance patterns.

### Audience Authenticity Score

The authenticity score evaluates what percentage of a creator's followers are real, active accounts versus bots, inactive accounts, or purchased followers. A score of 80% or higher indicates a healthy, genuine audience. Scores below 60% are a red flag and suggest the creator may have inflated their numbers artificially.

### Growth Rate

Growth rate shows how quickly a creator's audience is expanding or contracting over time. A steady, organic growth pattern is a positive signal. Sudden spikes followed by drops may indicate purchased followers or viral moments that did not retain.

## Platform Breakdown

MilCrunch tracks metrics across all connected platforms. The analytics panel shows a per-platform breakdown so you can see where a creator performs best:

- Instagram — Engagement rate, story views, reel plays, follower growth
- TikTok — Average views per video, engagement rate, follower growth
- YouTube — Average views, subscriber growth, watch time, click-through rate
- Twitter/X — Impressions, engagement rate, retweet ratio
- Facebook — Page reach, post engagement, video views
- LinkedIn — Post impressions, engagement rate, follower growth

### Cross-Platform Summary

The summary view aggregates metrics across all platforms into a single composite score, making it easy to compare creators who are active on different platforms. The composite considers engagement rate, audience size, authenticity, and growth, weighted by platform relevance.

## Comparing Creators

When building a campaign list, use the comparison tool to place two or more creators side by side. The comparison view highlights differences in engagement, audience demographics, content frequency, and estimated reach. This is especially useful when deciding between creators who look similar on the surface but differ in performance.

## Using Analytics in Decisions

- Campaign selection — Prioritize creators with high engagement and strong authenticity scores
- Budget allocation — Creators with larger reach but lower engagement may suit awareness campaigns, while high-engagement creators are better for conversion-focused campaigns
- Long-term partnerships — Look for consistent growth and stable engagement over time rather than one-time viral spikes
- Event talent — For Experience stage appearances, prioritize creators whose audience demographics align with your event attendees`,
  },
  {
    title: "Inviting Creators to Your Experience Stage",
    slug: "inviting-creators-pdx-stage",
    category: "creator-network",
    summary:
      "How to source, coordinate, and manage talent for your Experience live-stage sessions.",
    readTime: 5,
    date: "2026-02-06",
    related: ["what-is-pdx", "creator-analytics"],
    isPublished: true,
    content: `## Overview

An Experience stage is only as good as the talent on it. The creator invitation workflow in MilCrunch connects your saved creator lists directly to your event's Run of Show, making it straightforward to source, invite, and coordinate talent for every stage segment.

## Sourcing Creators from Your Lists

Start by navigating to your event and opening the "Creators" tab. Here you will see a panel to browse your saved creator lists. Each creator card shows their verification status, audience metrics, and a quick preview of their content style.

Select creators that match the segment topics on your Run of Show. For example, if you have a panel on "Transitioning from Military to Entrepreneurship," look for creators who produce content in that space and have proven speaking or interview experience.

> Review each creator's analytics before inviting them. A creator who performs well on social media may not be a natural stage presence. Look for creators who have done live events, podcasts, or video interviews.

## Sending Invitations

Once you have identified your talent, select the creators and click "Send Invitations." The invitation includes:

- Event name, dates, and location
- Segment details — Title, time slot, format (interview, panel, solo session), and topic
- What is expected — Duration, preparation needed, any technical requirements
- Compensation details — Whether the appearance is paid, includes travel/lodging, or is a promotional opportunity
- Accept/Decline buttons — Creators respond directly through the platform

Invitations are tracked in the Creators tab with statuses: Pending, Accepted, Declined, and Waitlisted.

## Scheduling and Coordination

As creators accept, they appear on your Run of Show timeline. The system automatically checks for conflicts — if a creator is assigned to overlapping segments, you will be alerted to reassign.

For each confirmed creator, you can manage:

- Travel logistics — Arrival date, hotel information, ground transportation
- Pre-event coordination — Talking points, content guidelines, dress code
- Technical needs — Presentation slides, video clips, special equipment
- Contact information — Direct messaging through the platform for quick coordination

### Pre-Event Briefing

One week before the event, MilCrunch sends an automated briefing to all confirmed creators with their schedule, venue map, check-in instructions, and production team contact details. You can customize this briefing from the event settings.

## Day-of Logistics

On event day, the production dashboard shows a real-time view of which creators are checked in, which are on deck, and which are currently on stage. Creators receive a notification 15 minutes before their segment with a reminder of their time slot and stage location.

### Handling No-Shows

If a creator does not check in within 30 minutes of their scheduled segment, the system triggers an alert to the production team. Having a waitlisted backup creator for key segments ensures you can fill gaps without dead air.

## Post-Event Follow-Up

After the event, each creator receives a summary of their segment performance — clip views, social engagement, and audience feedback. This data helps you identify top performers for future events and builds a stronger relationship with creators who see the value of participating.`,
  },
  {
    title: "Creator Onboarding Guide",
    slug: "creator-onboarding-guide",
    category: "creator-network",
    summary:
      "For creators joining the MilCrunch network — how to set up your profile and connect socials.",
    readTime: 5,
    date: "2026-02-04",
    related: ["military-creator-verification", "creator-analytics"],
    isPublished: true,
    content: `## Welcome to MilCrunch

If you are a military or veteran content creator, MilCrunch is where brands and event organizers discover you for campaigns, partnerships, and live-stage appearances. This guide walks you through setting up your profile so you can start getting discovered.

## Creating Your Account

Visit milcrunch.com and click "Join as Creator." You will be asked for:

- Name — Your real name (this is what brands see)
- Email — Used for login and communications
- Password — Minimum 8 characters

After creating your account, you will land on the creator dashboard where you can start building your profile.

## Building Your Profile

A complete profile significantly increases your visibility to brands. Here is what to fill out:

### Basic Information

- Display Name — Your creator name or brand name
- Bio — A short description of who you are and what content you create (150-300 characters recommended)
- Profile Photo — A clear, professional headshot or your creator logo
- Location — City and state help brands find creators in specific regions
- Military Branch — Select your branch of service (Army, Navy, Air Force, Marines, Coast Guard)
- Service Status — Active duty, veteran, reserve, National Guard, or military spouse

### Content Categories

Select the niches that best describe your content. You can choose multiple categories:

- Fitness and Health
- Lifestyle
- Comedy and Entertainment
- Education and Training
- Advocacy and Policy
- Travel and Adventure
- Technology
- Business and Entrepreneurship
- Family and Parenting

> Choose categories that genuinely reflect your content. Brands filter by niche, so accurate categories mean you get discovered for opportunities that are a real fit.

## Connecting Social Accounts

Navigate to the "Social Accounts" section of your profile. MilCrunch supports connecting:

- Instagram
- TikTok
- YouTube
- Twitter/X
- Facebook
- LinkedIn

For each platform, you will authenticate through the platform's official OAuth flow. This allows MilCrunch to pull your public metrics — follower count, engagement rate, recent content — which brands use to evaluate fit. MilCrunch never posts on your behalf or accesses private messages.

### Why Connect Socials?

Connecting your accounts means brands can see your real, verified metrics directly on your MilCrunch profile. Creators with connected accounts get significantly more views from brands than those with manual-entry-only profiles.

## Getting Verified

Military verification is what sets MilCrunch apart. After completing your profile, navigate to the "Verification" tab to begin the process. You will be guided through:

- AI Screening — Automatic analysis of your public profiles for military service indicators
- Document Upload — Submit your DD-214, military ID, or other service documentation
- Community Validation — Cross-referencing with other verified creators and military organizations

A verified badge on your profile tells brands that your military service has been authenticated. This significantly increases your chances of being selected for campaigns and stage appearances.

## Getting Discovered

Once your profile is live and verified, brands can find you through the MilCrunch discovery tool. To maximize your visibility:

- Keep your social accounts connected and active
- Update your bio and categories as your content evolves
- Respond promptly to brand inquiries and event invitations
- Participate in the MilCrunch community to build your network

## What to Expect

Brands may reach out for various opportunities — sponsored posts, event appearances, product reviews, Experience stage sessions, and long-term ambassador roles. You will receive notifications through the platform and via email when a brand expresses interest.`,
  },

  // ─── 365 INSIGHTS ───────────────────────────────────────────────────
  {
    title: "Understanding Your Sponsor Dashboard",
    slug: "sponsor-dashboard-guide",
    category: "365-insights",
    summary:
      "How to read and use the 12-month sponsor analytics dashboards.",
    readTime: 5,
    date: "2026-02-11",
    related: ["impression-tracking", "sponsor-renewal-proposal"],
    isPublished: true,
    content: `## What is the Sponsor Dashboard?

The sponsor dashboard is the centerpiece of MilCrunch's 365 Insights module. It provides a rolling 12-month view of every sponsor's performance across events, streams, social content, and email campaigns. Instead of waiting until an event ends to show sponsors their results, the dashboard delivers real-time data that keeps sponsors engaged and invested year-round.

## Dashboard Layout

When you open the sponsor dashboard, you will see three main sections:

### Summary Bar

At the top, a summary bar shows aggregate metrics across all sponsors:

- Total Impressions — Combined impressions across all channels
- Total Sponsors — Number of active sponsors in the current period
- Revenue — Total sponsorship revenue collected
- Average ROI — Mean return on investment across all sponsor packages

### Sponsor List

Below the summary, each sponsor is listed with a quick-glance row showing their tier, total impressions, engagement rate, and contract status. Click any sponsor to open their individual dashboard.

### Individual Sponsor View

The individual view is where the real depth lives. It includes:

- Impression timeline — A 12-month line chart showing impressions by month
- Channel breakdown — Pie chart splitting impressions across events, streams, social, and email
- Engagement metrics — Click-through rates, video views, lead captures, and social mentions
- Obligation tracker — Checklist of promised deliverables and their completion status
- Content gallery — Screenshots and links to sponsor placements across all channels

## Key Metrics Explained

### Impressions

An impression is counted each time a sponsor's branding is displayed to a unique viewer. This includes logo appearances on stream overlays, event signage (estimated from attendance), social media posts featuring the sponsor, and email sends.

### Engagement Rate

Engagement rate for sponsors measures how often viewers interact with sponsor content — clicking links, visiting booths, scanning QR codes, or engaging with social posts.

### Attribution

MilCrunch tracks which channel drove each impression and engagement, so you can show sponsors exactly where their value is coming from. If 60% of a sponsor's impressions come from streaming and 25% from social clips, that informs future package design.

> The 365 dashboard is your most powerful tool for sponsor retention. Sponsors who see real-time data throughout the year are far more likely to renew than those who only get a single post-event report.

## Filtering and Date Ranges

Use the date picker to adjust the time window. Common views include:

- Last 30 days — Recent activity snapshot
- Quarter to date — For quarterly business reviews
- Year to date — Annual performance overview
- Custom range — Align with a specific event or campaign period

You can also filter by sponsor tier (Presenting, Gold, Silver, Bronze) to compare performance across tiers.

## Sharing with Sponsors

Each sponsor dashboard has a "Share" button that generates a read-only link. Share this link directly with your sponsor contacts so they can check their own data anytime. Shared dashboards update in real time, so sponsors always see the latest numbers without you having to manually send reports.

## Best Practices

- Review the dashboard weekly to catch any tracking issues early
- Share the dashboard link with sponsors within the first week of their contract
- Use the obligation tracker to ensure every promised deliverable is fulfilled
- Reference dashboard data in every sponsor communication to reinforce value`,
  },
  {
    title: "How Impression Tracking Works",
    slug: "impression-tracking",
    category: "365-insights",
    summary:
      "The methodology behind MilCrunch's multi-channel impression tracking system.",
    readTime: 5,
    date: "2026-02-09",
    related: ["sponsor-dashboard-guide", "yoy-comparison-reports"],
    isPublished: true,
    content: `## What Counts as an Impression?

An impression in MilCrunch is defined as one instance of a sponsor's branding being displayed to one viewer. The system tracks impressions across multiple channels, each with its own measurement methodology. Understanding how impressions are counted helps you set accurate expectations with sponsors and present data confidently.

## Tracking by Channel

### Event Impressions

Event impressions are estimated based on verified attendance data and sponsor placement visibility. For each event:

- Stage signage — Estimated impressions based on audience count during sponsored segments
- Booth traffic — Counted via lead retrieval scans and foot traffic estimates
- Printed materials — Estimated based on distribution counts (programs, lanyards, table tents)
- Attendee app — Exact count of sponsor page views and logo impressions within the app

> Event impressions use a conservative estimation model. MilCrunch intentionally underestimates rather than overestimates to maintain credibility with sponsors.

### Streaming Impressions

Streaming impressions are the most precisely tracked channel. When a sponsor's overlay, lower-third, or dedicated segment appears during a live stream, MilCrunch counts:

- Concurrent viewers — The number of viewers watching at the moment the sponsor branding is displayed
- VOD views — Additional impressions from the video-on-demand replay, tracked over 90 days post-stream
- Multi-destination totals — Impressions are aggregated across all stream destinations (YouTube, Facebook, Twitch, custom RTMP)

Each platform's analytics API provides viewer counts that MilCrunch pulls automatically.

### Social Media Impressions

When content featuring sponsor branding is posted to connected social accounts, MilCrunch tracks:

- Post impressions — The number of times the post is displayed in feeds
- Video views — View counts for video content featuring sponsor branding
- Story views — For Instagram and Facebook stories
- Share amplification — Estimated additional reach when content is reshared

Social impressions are pulled from each platform's API and updated daily.

### Email Impressions

For email campaigns that include sponsor branding:

- Delivered count — Number of emails successfully delivered
- Open count — Number of unique opens (sponsor branding is visible when the email is opened)
- Click count — Clicks on sponsor-specific links or CTAs within the email

## Attribution Methodology

Every impression is tagged with its source channel, date, and the specific placement or content piece that generated it. This attribution chain allows you to:

- Show sponsors exactly which channels drive the most visibility
- Identify underperforming placements that need adjustment
- Justify package pricing based on actual delivered impressions

## Data Freshness

Impression data updates on different cadences depending on the channel:

- Streaming — Real-time during live events, hourly for VOD
- Social media — Updated daily
- Email — Updated within 4 hours of campaign send
- Events — Updated within 24 hours of event close, with manual verification

## Deduplication

MilCrunch applies deduplication logic to avoid double-counting impressions. If a viewer sees a sponsor's logo on a live stream and then again on a social clip of that same segment, those are counted as two separate impressions (different channels), but a single viewer watching the same VOD twice counts as one impression.

## Reporting Confidence

Each impression total in the dashboard includes a confidence indicator — High, Medium, or Low — based on the reliability of the underlying data source. Streaming and email impressions are typically High confidence, while event signage estimates are Medium. This transparency builds trust with sponsors who appreciate honest reporting.`,
  },
  {
    title: "Building a Sponsor Renewal Proposal",
    slug: "sponsor-renewal-proposal",
    category: "365-insights",
    summary:
      "How to use 365 Insights data to create compelling sponsor renewal presentations.",
    readTime: 5,
    date: "2026-02-07",
    related: ["sponsor-dashboard-guide", "post-event-sponsor-reporting"],
    isPublished: true,
    content: `## When to Start the Renewal Conversation

The best time to begin a renewal conversation is not when the current contract is about to expire — it is when performance data is at its peak. If a sponsor just had a successful event activation or their dashboard shows a strong impression milestone, that is the moment to reach out. MilCrunch's 365 Insights gives you a continuous stream of data points to anchor these conversations.

As a general rule, start the formal renewal process 60-90 days before contract expiration. But informal touchpoints — sharing dashboard highlights, sending quick updates — should happen throughout the year.

## What Data to Include

A compelling renewal proposal tells a clear story: here is what we promised, here is what we delivered, and here is why continuing the partnership makes sense. Pull the following from 365 Insights:

### Delivered Value Summary

- Total impressions across all channels
- Engagement rate and click-through data
- Lead retrieval numbers (if applicable)
- Content pieces produced featuring the sponsor
- Audience demographics reached

### Obligation Fulfillment

- Checklist of every deliverable in the original package
- Status of each item (completed, in progress, or exceeded)
- Specific examples and screenshots of placements

### ROI Calculation

- Total investment by the sponsor
- Estimated media value of delivered impressions
- Cost per impression and cost per engagement
- Comparison to industry benchmarks

> Always include industry benchmark comparisons. Sponsors want to know not just how they performed with you, but how that performance stacks up against alternatives.

## Using the Proposal Builder

Navigate to 365 Insights > Proposals and click "New Proposal." The builder walks you through:

### Step 1 — Select Sponsor

Choose the sponsor from your active roster. Their dashboard data is automatically pulled in.

### Step 2 — Choose Data Points

Select which metrics and charts to include. The builder recommends a default set, but you can add or remove sections. Common inclusions:

- Impression timeline chart
- Channel breakdown pie chart
- Top-performing content pieces
- Lead retrieval summary
- Obligation completion checklist

### Step 3 — Add Narrative

Write a brief narrative that contextualizes the data. This is where you tell the story — what went well, what exceeded expectations, and what opportunities exist for the next term.

### Step 4 — Upsell Recommendations

Based on the sponsor's current tier and performance data, the proposal builder suggests upsell opportunities. For example, if a Gold sponsor's streaming impressions significantly outperformed their event impressions, you might recommend adding a streaming-focused package.

### Step 5 — Customize Branding

Upload the sponsor's logo, choose a color theme, and add your organization's branding. The final proposal should feel polished and professional.

## Exporting and Presenting

Export the proposal as a branded PDF or share it as a live link that the sponsor can explore interactively. The live link version allows sponsors to click into charts, view individual content pieces, and explore data at their own pace.

## Presentation Tips

- Lead with results, not pricing. Show the value before discussing cost.
- Use specific numbers rather than general statements. "412,000 impressions across 8 events" is more compelling than "strong visibility."
- Bring up the renewal package only after the sponsor has absorbed the performance data.
- Offer tiered renewal options — same level, upgrade, and premium — to give sponsors a sense of choice.
- Follow up within 48 hours of the presentation with the PDF and a clear next step.`,
  },
  {
    title: "Year-over-Year Comparison Reports",
    slug: "yoy-comparison-reports",
    category: "365-insights",
    summary:
      "How to generate and interpret YoY performance data for sponsors.",
    readTime: 4,
    date: "2026-02-05",
    related: ["impression-tracking", "sponsor-renewal-proposal"],
    isPublished: true,
    content: `## Why YoY Comparisons Matter

Sponsors want to see growth. A single event report shows a snapshot, but a year-over-year comparison shows trajectory. Are impressions increasing? Is engagement improving? Is the partnership delivering more value over time? YoY reports answer these questions with hard data and are one of the most effective tools for securing renewals and justifying rate increases.

## Accessing YoY Reports

Navigate to 365 Insights and select "YoY Reports" from the navigation menu. You will see a list of sponsors with at least two years of data. Select a sponsor to generate their comparison report.

### Minimum Data Requirements

YoY reports require at least two comparable periods. The system works best when comparing:

- Same event across consecutive years (e.g., MIC 2025 vs. MIC 2026)
- Full calendar years (2025 vs. 2026)
- Same quarter across years (Q1 2025 vs. Q1 2026)

## Report Contents

### Impression Comparison

A side-by-side bar chart showing total impressions for each period, broken down by channel. The report automatically calculates the percentage change and highlights growth in green or decline in red.

### Engagement Trends

Line chart overlaying engagement rates from both periods. This shows whether the audience is becoming more or less responsive to the sponsor's presence over time.

### Audience Growth

If the events or channels grew in reach, this section shows how the sponsor benefited from that growth. A sponsor might see their impressions increase simply because the event attracted more attendees or the streams reached a larger audience.

### Content Volume

Comparison of how many content pieces featured the sponsor in each period — social posts, stream segments, email campaigns, and on-site placements.

> When impressions grow but engagement stays flat, it usually means the audience expanded but the creative needs refreshing. Use this insight to recommend new activation formats for the next period.

## Identifying Growth Trends

Look for patterns that tell a compelling story:

- Consistent growth — Impressions and engagement both increasing year over year. This is the ideal scenario for renewal conversations.
- Impression growth, engagement flat — Reach is expanding but the creative may need a refresh. Recommend new activation types.
- Engagement growth, impressions flat — The audience is more responsive even without growth. This indicates strong content-market fit.
- Decline in both — Requires honest assessment. Was there a specific cause (fewer events, platform algorithm changes, reduced sponsor investment)?

## Sharing with Sponsors

YoY reports can be exported as PDF or shared as a live link. The live version allows sponsors to toggle between metrics and drill into specific events or time periods. Include YoY data in every renewal proposal to demonstrate the partnership's growth trajectory.

## Best Practices

- Generate YoY reports quarterly, even outside of renewal season, to keep sponsors engaged
- Always provide context for anomalies — if a metric dipped, explain why before the sponsor asks
- Use YoY data to justify rate increases when growth is strong
- Compare sponsor performance against aggregate benchmarks to show how they stack up`,
  },
  {
    title: "Exporting Data & CSV Reports",
    slug: "csv-export-guide",
    category: "365-insights",
    summary:
      "How to export analytics data, contact lists, and reports as CSV files.",
    readTime: 3,
    date: "2026-02-03",
    related: ["sponsor-dashboard-guide", "yoy-comparison-reports"],
    isPublished: true,
    content: `## What Can Be Exported?

MilCrunch allows you to export data from nearly every section of the platform as CSV files. This makes it easy to work with your data in Excel, Google Sheets, or any other tool your team uses. Exportable data includes:

- Sponsor analytics — Impressions, engagement, and attribution data
- Creator lists — Contact details, metrics, and verification status for saved creators
- Event attendees — Registration data, check-in status, and engagement metrics
- Lead retrieval data — Leads captured by sponsors at events
- Email campaign metrics — Delivery, open, click, and bounce data
- Task board items — For teams using the admin task management features

## How to Export

Every section with exportable data includes an "Export" button, typically located in the top-right corner of the data table or dashboard. Click it and you will see the following options:

### Configure Your Export

- Date range — Filter the export to a specific time period
- Columns — Select which data fields to include (all fields are selected by default)
- Format — CSV is the default, but some sections also support Excel (.xlsx) format
- Filters — If you have active filters applied to the data view, the export respects those filters

Click "Download" and the file is generated and saved to your browser's default download location.

> Before sharing exported data externally, review the columns to ensure you are not including sensitive information like email addresses or phone numbers unless the recipient needs them.

## Common Use Cases

### Sharing with Stakeholders

Export sponsor dashboards as CSV and paste the data into your own branded reports or slide decks. This is useful when sponsors require data in their own internal format.

### Importing into Other Tools

Export contact lists or lead data for import into CRMs like Salesforce or HubSpot. MilCrunch CSVs use standard column headers that map cleanly to most CRM import tools.

### Offline Analysis

Download raw impression or engagement data for deeper analysis in Excel or Google Sheets. Pivot tables, custom charts, and formula-based calculations give you flexibility beyond what the dashboard offers.

### Record Keeping

Export event attendee data and lead retrieval results for archival purposes. Many organizations need to retain event data for compliance or reporting requirements.

## Formatting Notes

- CSV files use UTF-8 encoding
- Date fields are formatted as YYYY-MM-DD
- Numeric fields use no thousands separator (e.g., 150000 not 150,000)
- Text fields containing commas are properly quoted
- Headers use human-readable labels (e.g., "Engagement Rate" not "eng_rate")

## Scheduled Exports

For data you export regularly, you can set up scheduled exports that automatically generate and email a CSV to specified recipients on a weekly or monthly cadence. Configure this from Settings > Scheduled Exports.`,
  },

  // ─── STREAMING & MEDIA ──────────────────────────────────────────────
  {
    title: "Setting Up Multi-Destination Streaming",
    slug: "multi-destination-streaming",
    category: "streaming-media",
    summary:
      "Stream to YouTube, Facebook, Twitch, and custom RTMP destinations simultaneously.",
    readTime: 5,
    date: "2026-02-10",
    related: ["browser-based-streaming", "ai-clip-generator"],
    isPublished: true,
    content: `## What is Multi-Destination Streaming?

Multi-destination streaming allows you to broadcast a single live stream to multiple platforms at the same time. Instead of choosing between YouTube or Facebook, you send your stream to both — plus Twitch, LinkedIn Live, and any custom RTMP destination you configure. MilCrunch handles the replication so you get maximum reach without managing multiple encoders.

## Adding Stream Destinations

Navigate to your event and open the "Streaming" tab. Click "Add Destination" to configure a new output. MilCrunch supports the following destination types:

### Pre-Configured Platforms

- YouTube Live — Authenticate with your YouTube account and select the channel
- Facebook Live — Connect to a Page, Group, or personal profile
- Twitch — Enter your Twitch stream key
- LinkedIn Live — Authenticate with your LinkedIn account (requires LinkedIn Live access)

### Custom RTMP

For any platform not listed above, use the Custom RTMP option. You will need:

- RTMP URL — The ingest server URL provided by the platform
- Stream Key — The unique key that identifies your stream

> Keep your stream keys secure. Anyone with your stream key can broadcast to your channel. Store them in MilCrunch and avoid sharing them over email or chat.

## Configuring Stream Settings

Before going live, configure your stream settings:

- Resolution — 1080p (recommended for most events) or 720p (for bandwidth-constrained venues)
- Bitrate — 4500-6000 kbps for 1080p, 2500-4000 kbps for 720p
- Framerate — 30fps for standard content, 60fps for fast-moving productions
- Audio Bitrate — 128 kbps stereo (default)

These settings apply to all destinations. Some platforms may re-encode the stream on their end, but sending a high-quality source ensures the best possible output everywhere.

## Testing Before Going Live

Always run a test stream before the actual event. MilCrunch includes a "Test Mode" that sends a 60-second stream to all configured destinations without making them publicly visible (platforms must support unlisted or private streams for this to work).

During the test, check:

- Stream is appearing on all destinations
- Audio and video are in sync
- Overlays and lower-thirds display correctly
- Stream quality meets expectations on each platform

## Monitoring Stream Health

Once live, the streaming dashboard shows real-time health metrics for each destination:

- Connection status — Green (connected), yellow (unstable), red (disconnected)
- Bitrate — Current upload bitrate versus target
- Dropped frames — Percentage of frames lost in transit
- Viewer count — Live viewer count pulled from each platform's API

### Handling Issues

If a destination shows yellow or red status:

- Check your internet upload speed — you need at least 1.5x your total bitrate across all destinations
- Reduce resolution or bitrate if bandwidth is constrained
- Disconnect low-priority destinations to free up bandwidth for primary platforms
- MilCrunch automatically attempts to reconnect dropped destinations every 30 seconds

## Overlays and Branding

MilCrunch's overlay system lets you add sponsor logos, lower-third graphics, countdown timers, and social media tickers to your stream. These overlays are rendered server-side, meaning they appear identically on every destination platform. Manage overlays from the "Graphics" sub-tab under Streaming.

## Post-Stream

After ending the stream, recordings are automatically saved in MilCrunch. VOD links from each platform are collected and displayed in the streaming dashboard for easy access. These recordings feed into the AI Clip Generator for post-event content creation.`,
  },
  {
    title: "Using the AI Clip Generator",
    slug: "ai-clip-generator",
    category: "streaming-media",
    summary:
      "How to automatically generate highlight reels and social clips from recordings.",
    readTime: 5,
    date: "2026-02-08",
    related: ["multi-destination-streaming", "distributing-content-post-event"],
    isPublished: true,
    content: `## What is the AI Clip Generator?

The AI Clip Generator is a MilCrunch tool that analyzes your event recordings and automatically identifies the most engaging moments to create short-form social clips. Instead of manually scrubbing through hours of footage, the AI does the heavy lifting — finding highlights, trimming clips, and formatting them for different platforms.

## How the AI Identifies Highlights

The clip generator uses multiple signals to determine which moments in a recording are worth clipping:

- Audio energy — Spikes in applause, laughter, or enthusiastic speech
- Chat activity — If the stream had live chat, moments with high chat volume often indicate compelling content
- Visual changes — Transitions, new speakers appearing, or on-screen graphics
- Keyword detection — The AI transcribes the audio and flags moments where key topics, names, or phrases are mentioned
- Engagement markers — Time-stamped reactions from the live audience if captured through the attendee app

The AI ranks potential clips by a composite "highlight score" and presents them in order of predicted engagement.

## Generating Clips

Navigate to your event recordings and click "Generate Clips" on any recording. The AI processes the video and returns a list of suggested clips within minutes, depending on the recording length. Each suggestion includes:

- Preview thumbnail — A still frame from the clip
- Timestamp — Start and end time in the original recording
- Duration — Length of the suggested clip
- Highlight score — AI confidence that this clip will perform well
- Transcript snippet — What is being said in the clip

### Customizing Clips

For each suggested clip, you can:

- Adjust timing — Extend or trim the start and end points
- Set aspect ratio — 16:9 for YouTube, 9:16 for TikTok/Reels/Shorts, 1:1 for LinkedIn
- Add captions — Auto-generated captions from the transcript, styled with your brand fonts and colors
- Add lower thirds — Overlay speaker names, titles, and topic labels
- Include intro/outro — Attach branded bumpers to the beginning and end
- Attach sponsor branding — Add sponsor logos or overlays as required by your packages

> Always enable captions. The majority of social media video is watched with sound off. Captions dramatically increase watch time and engagement across every platform.

## Batch Processing

For events with multiple recordings or multi-day schedules, use the batch processing feature to generate clips from all recordings at once. The AI processes them in parallel and presents a unified list of suggested clips sorted by highlight score.

## Exporting for Social Platforms

Once you have finalized your clips, export them in platform-optimized formats:

- YouTube Shorts — 9:16, up to 60 seconds, optimized thumbnail
- Instagram Reels — 9:16, up to 90 seconds, caption-ready
- TikTok — 9:16, up to 3 minutes, trending-format options
- LinkedIn — 1:1 or 16:9, up to 10 minutes, professional captioning
- Twitter/X — 16:9, up to 2 minutes 20 seconds

Each export includes platform-specific metadata fields like title, description, hashtags, and thumbnail selection.

## Measuring Clip Performance

After clips are published, MilCrunch tracks their performance through connected social accounts. The clip dashboard shows views, engagement rate, shares, and comments for each clip, allowing you to identify which moments resonate most with your audience and refine your clipping strategy over time.`,
  },
  {
    title: "Browser-Based Streaming Guide",
    slug: "browser-based-streaming",
    category: "streaming-media",
    summary:
      "How to stream live events directly from your browser without installing software.",
    readTime: 4,
    date: "2026-02-06",
    related: ["multi-destination-streaming", "ai-clip-generator"],
    isPublished: true,
    content: `## Why Browser-Based Streaming?

Traditional live streaming requires dedicated software like OBS Studio, specialized hardware, and a production crew to manage it all. MilCrunch's browser-based streaming eliminates the software requirement entirely. You can go live from any modern web browser with just a camera and microphone — making it ideal for smaller activations, remote interviews, and situations where a full production setup is not feasible.

## Browser Requirements

Browser-based streaming works on:

- Google Chrome (version 90+) — Recommended for best performance
- Microsoft Edge (version 90+) — Chromium-based, works equivalently
- Firefox (version 95+) — Supported with minor limitations on some overlay features
- Safari (version 16+) — Supported on macOS, not recommended for extended streams

For the best experience, use Chrome or Edge on a computer with at least 8GB of RAM and a stable internet connection with 10+ Mbps upload speed.

## Camera and Microphone Setup

When you open the streaming interface, your browser will ask permission to access your camera and microphone. Make sure to allow both.

### Selecting Devices

If you have multiple cameras or microphones connected, use the device selector in the streaming controls to choose the correct ones. Common setups include:

- Built-in webcam + laptop mic — Works for casual streams but audio quality is often poor
- External webcam + USB microphone — Recommended for a professional look and clear audio
- HDMI capture card + professional camera — The browser sees the capture card as a webcam, giving you broadcast-quality video from a DSLR or camcorder

> Invest in a good microphone before investing in a better camera. Viewers will tolerate mediocre video, but poor audio drives them away immediately.

## Overlay Management

The browser streaming interface includes a built-in overlay editor. You can add:

- Lower thirds — Speaker name and title graphics
- Sponsor logos — Static or rotating sponsor branding
- Countdown timers — For pre-show or segment transitions
- Tickers — Scrolling text for announcements or social media feeds
- Screen share — Share a browser tab, application window, or entire screen

Overlays are rendered directly in the browser and sent as part of the video stream, so they appear on every destination platform.

## Going Live

Once your camera, microphone, and overlays are configured:

- Verify your stream destinations are set up in the Streaming tab
- Click "Preview" to see exactly what viewers will see
- Check audio levels in the meter — green is good, yellow is acceptable, red means the audio is too hot
- Click "Go Live" to start broadcasting to all configured destinations
- The interface shows a live timer and real-time viewer count

## During the Stream

The browser interface provides:

- Real-time chat — See chat from all connected platforms in a unified panel
- Stream health monitor — Bitrate, dropped frames, and connection status
- Overlay controls — Toggle overlays on and off without interrupting the stream
- Scene switching — Switch between camera views, screen shares, or pre-built scenes

## Troubleshooting Common Issues

- Camera not detected — Check browser permissions in Settings > Privacy > Camera
- Audio echo — Wear headphones to prevent your microphone from picking up the stream audio
- Choppy video — Close unnecessary browser tabs and applications to free up CPU
- Stream dropping — Reduce resolution from 1080p to 720p or lower the bitrate
- High latency — Browser streaming typically has 5-15 seconds of latency; this is normal`,
  },
  {
    title: "Distributing Content After the Event",
    slug: "distributing-content-post-event",
    category: "streaming-media",
    summary:
      "How to repurpose event recordings into months of social content.",
    readTime: 5,
    date: "2026-02-04",
    related: ["ai-clip-generator", "multi-destination-streaming"],
    isPublished: true,
    content: `## The Content Repurposing Mindset

A single event can generate months of social content if you approach it strategically. Every panel discussion, interview, performance, and sponsor activation is raw material that can be sliced, reformatted, and redistributed across platforms long after the venue lights go off. MilCrunch's content pipeline is designed to maximize the long-tail value of every minute of footage.

## The Repurposing Pipeline

### Step 1 — Capture Everything

During the event, ensure every Experience stage segment is recorded. MilCrunch automatically saves recordings from all stream destinations. For on-site-only moments (networking areas, behind-the-scenes), assign a crew member to capture mobile video that can be uploaded to the platform later.

### Step 2 — Generate AI Clips

Within 24-48 hours of the event, run the AI Clip Generator on all recordings. The AI will surface the top moments from each session. Review the suggestions, customize as needed, and export clips in platform-specific formats.

### Step 3 — Build a Content Calendar

Do not publish all your clips at once. Map them out over a 60-90 day content calendar. A well-paced distribution schedule keeps your audience engaged and extends sponsor visibility far beyond event week.

A suggested cadence:

- Week 1 — Event recap highlight reel, 2-3 high-energy clips
- Weeks 2-4 — Individual session clips, speaker spotlights, sponsor thank-you posts
- Weeks 5-8 — Deep-dive clips on specific topics, audience Q&A moments, behind-the-scenes footage
- Weeks 9-12 — Throwback posts, "In case you missed it" repackaging, teaser content for the next event

### Step 4 — Format for Each Platform

Each platform has different optimal formats. MilCrunch's export tools handle this, but the strategic considerations matter too:

- YouTube — Longer clips (3-10 minutes) perform well. Upload full sessions as standalone videos.
- Instagram Reels — 30-60 second high-energy moments with captions and trending audio
- TikTok — Raw, authentic clips tend to outperform polished productions. Keep it under 90 seconds.
- LinkedIn — Professional insights, takeaways, and thought leadership moments. 1-3 minutes.
- Twitter/X — Quick, punchy clips under 60 seconds. Hot takes and memorable quotes work best.
- Facebook — Longer-form video (2-5 minutes) targeted at community groups and pages

> The same 30-second moment can be posted to five platforms with different framing, captions, and hashtags — and feel native to each one. Repurposing is not about copying and pasting; it is about adapting.

### Step 5 — Schedule and Publish

Use MilCrunch's content scheduler or connect your preferred social media management tool. Schedule posts at optimal times for each platform and include relevant hashtags, mentions, and sponsor tags.

## Maximizing Sponsor Value

Content repurposing is where the "365" in 365 Insights becomes real for sponsors. Instead of a few days of event visibility, sponsors get three months of social impressions. Track every clip that features sponsor branding and add those impressions to the sponsor dashboard.

## Measuring Long-Tail Impact

The content analytics panel in MilCrunch shows cumulative performance of all published clips over time. Watch for:

- Which clips continue to gain views weeks after publishing (evergreen content)
- Which platforms deliver the most consistent engagement
- Which topics or creators generate the most interest

Use these insights to inform content strategy for your next event. The clips that perform best post-event tell you exactly what your audience wants to see more of on stage.`,
  },

  // ─── EMAIL MARKETING ────────────────────────────────────────────────
  {
    title: "Getting Started with MilCrunch Mail",
    slug: "getting-started-email",
    category: "email-marketing",
    summary:
      "Initial setup guide for the MilCrunch email marketing system.",
    readTime: 4,
    date: "2026-02-12",
    related: ["creating-first-campaign", "building-contact-lists"],
    isPublished: true,
    content: `## Overview

MilCrunch Mail is the built-in email marketing system that lets you send campaigns, manage contact lists, and track deliverability — all without leaving the MilCrunch platform. Whether you are promoting an upcoming event, sharing content with creators, or sending sponsor updates, MilCrunch Mail handles it from composition to delivery.

## Navigating the Email Section

From the main sidebar, click "Email" to access the email marketing hub. You will see four main areas:

- Campaigns — Create, schedule, and monitor email campaigns
- Contacts — Manage your contact lists and segments
- Templates — Pre-built and custom email templates
- Analytics — Delivery, open, click, and bounce metrics

## Initial Configuration

Before sending your first email, complete the following setup steps:

### Verify Your Sender Identity

MilCrunch requires a verified sender identity to protect deliverability. Navigate to Email > Settings > Sender Identity and add:

- Sender Name — The "from" name recipients see (e.g., "MilCrunch Events Team")
- Sender Email — The "from" email address (must be a domain you control)

A verification email is sent to the address you enter. Click the link to confirm ownership.

### Connect Your Domain

For the best deliverability rates, configure a custom sending domain rather than using the default MilCrunch domain. This involves adding DNS records (SPF, DKIM, and DMARC) to your domain's DNS settings. See the Custom Sending Domain article for a detailed walkthrough.

> Sending from a custom domain significantly improves inbox placement rates. Emails from generic or shared domains are more likely to land in spam folders.

### Set Your Default Footer

Every email must include a physical mailing address and unsubscribe link for CAN-SPAM compliance. Configure your default footer in Email > Settings > Footer. MilCrunch automatically appends the unsubscribe link, but you need to add your organization's mailing address.

## Understanding Credits

MilCrunch Mail operates on a credit system. Each email sent consumes one credit. Your credit balance is displayed in the email dashboard header. Credits can be purchased in bulk through your account settings, and unused credits roll over month to month.

### Credit Usage Tips

- Test emails to yourself do not consume credits
- Bounced emails still consume one credit (the send was attempted)
- Duplicate sends to the same address on the same campaign are automatically blocked

## Your First Steps

Once configuration is complete, here is the recommended path:

- Import your contacts — Upload a CSV of your existing contacts or sync from event registrations
- Choose or customize a template — Browse the template gallery or build your own
- Send a test campaign — Create a small test campaign to yourself and a few team members to verify everything looks correct
- Launch your first real campaign — Send to a contact list with confidence

## Getting Help

If you run into issues during setup, check the other articles in the Email Marketing category for detailed guidance on specific topics. Common questions about domain verification, list importing, and compliance are covered in dedicated articles.`,
  },
  {
    title: "Creating Your First Email Campaign",
    slug: "creating-first-campaign",
    category: "email-marketing",
    summary:
      "Step-by-step walkthrough for building and sending your first email campaign.",
    readTime: 5,
    date: "2026-02-10",
    related: ["getting-started-email", "email-analytics"],
    isPublished: true,
    content: `## Creating a New Campaign

Navigate to Email > Campaigns and click "New Campaign." You will be walked through a multi-step process that covers everything from content creation to delivery.

### Step 1 — Campaign Details

Start by providing the basics:

- Campaign Name — An internal name for your reference (recipients do not see this)
- Subject Line — The subject line recipients see in their inbox. Keep it under 50 characters for best results on mobile devices.
- Preview Text — The snippet that appears after the subject line in most email clients. Use this to reinforce or expand on the subject.
- Sender — Select from your verified sender identities

> Spend time on your subject line. It is the single biggest factor in whether someone opens your email. Be specific, create urgency, or ask a question — but avoid clickbait that damages trust.

### Step 2 — Choose a Template

Browse the template gallery or start from scratch. MilCrunch includes templates designed for common use cases:

- Event Invitation — Formatted for date, location, RSVP button, and agenda highlights
- Newsletter — Multi-section layout with articles, links, and featured content
- Sponsor Update — Performance data summary with charts and metrics
- Creator Outreach — Clean, personal-feeling template for one-to-one-style outreach
- Announcement — Bold header with a single call-to-action

You can also duplicate and modify any previous campaign as a starting point.

### Step 3 — Edit Content

The email editor is a drag-and-drop builder. Core content blocks include:

- Text — Rich text with formatting, links, and inline images
- Image — Upload or drag images with alt text and optional linking
- Button — Call-to-action buttons with customizable text, color, and link
- Divider — Visual separator between sections
- Social Icons — Linked icons for your social media profiles
- Columns — Two or three column layouts for side-by-side content

Each block can be styled with custom colors, fonts, padding, and alignment. The editor shows a real-time preview of how the email will render.

### Step 4 — Select Recipients

Choose one or more contact lists to send to. You can also apply segment filters:

- By tag — Send only to contacts with specific tags
- By engagement — Target contacts who opened or clicked recent campaigns
- By event — Send to contacts who registered for a specific event
- Exclude list — Exclude contacts on a specific list to avoid overlap

The recipient count updates in real time as you adjust your selections.

### Step 5 — Preview and Test

Before sending to your full audience, preview the email in both desktop and mobile views. The preview tool shows how the email renders in common email clients including Gmail, Outlook, and Apple Mail.

Send a test email to yourself and at least one team member. Check:

- Subject line and preview text render correctly
- All images load properly
- Links point to the correct destinations
- The email looks good on both desktop and mobile
- The unsubscribe link and footer are present

### Step 6 — Schedule or Send

Choose to send the campaign immediately or schedule it for a specific date and time. If scheduling, MilCrunch displays the send time in your local timezone and the estimated delivery window.

Click "Send" or "Schedule" to finalize. Once sent, the campaign moves to the Sent tab where you can monitor delivery and engagement in real time.

## After Sending

Monitor your campaign performance in Email > Analytics. Key metrics are available within minutes of sending and continue to update over the following 48 hours. See the Email Analytics article for guidance on interpreting your results.`,
  },
  {
    title: "Building and Importing Contact Lists",
    slug: "building-contact-lists",
    category: "email-marketing",
    summary:
      "How to create contact lists, import from CSV, and sync contacts from events.",
    readTime: 5,
    date: "2026-02-08",
    related: ["getting-started-email", "creating-first-campaign"],
    isPublished: true,
    content: `## Why Lists Matter

Contact lists are the foundation of effective email marketing. Well-organized lists let you send targeted, relevant emails to the right people — which translates to higher open rates, better engagement, and fewer unsubscribes. MilCrunch makes it easy to create, import, and manage lists from multiple sources.

## Creating a New List

Navigate to Email > Contacts and click "New List." Provide:

- List Name — A descriptive name (e.g., "MIC 2026 Registrants" or "Gold Sponsors")
- Description — Optional notes about the list's purpose
- Type — Choose between Static (manually managed) or Dynamic (auto-updating based on rules)

### Static vs. Dynamic Lists

- Static lists contain a fixed set of contacts. You add and remove contacts manually or through imports. Use static lists for one-time campaigns or curated groups.
- Dynamic lists automatically include contacts that match specified criteria. For example, a dynamic list set to "all contacts tagged VIP" will automatically include new contacts as they are tagged. Use dynamic lists for ongoing segments.

## Importing from CSV

The most common way to populate a list is importing from a CSV file. Click "Import" on any list and follow the process:

### Preparing Your CSV

- Include a header row with column names
- Required column: Email (every row must have a valid email address)
- Recommended columns: First Name, Last Name, Company, Title, Phone
- Optional: Any custom fields your organization uses (e.g., "Branch", "Event Name", "Sponsor Tier")

### Field Mapping

After uploading your CSV, MilCrunch shows a mapping screen where you match your CSV columns to contact fields. The system auto-detects common column names, but you can manually adjust any mappings.

### Import Options

- Update existing contacts — If a contact with the same email already exists, update their information with the new data
- Skip existing contacts — Only add new contacts, leave existing ones unchanged
- Tag imported contacts — Apply a tag to all contacts in this import batch for easy identification later

> Always clean your CSV before importing. Remove duplicates, fix obvious typos in email addresses, and ensure every row has a valid email. Importing bad data hurts deliverability.

## Syncing from Event Registrations

If you manage events in MilCrunch, contact data from event registrations can be synced directly into an email list. Navigate to your event, open the "Registrants" tab, and click "Sync to Email List." You can create a new list or add registrants to an existing one.

Event syncing is particularly powerful for:

- Pre-event communications (logistics, agendas, reminders)
- Post-event follow-ups (thank you emails, session recordings, sponsor offers)
- Building year-round contact databases from multiple events

## Managing Duplicates

MilCrunch uses email address as the unique identifier for contacts. When importing or syncing:

- If a contact with the same email exists on the same list, the duplicate is skipped
- If a contact exists on a different list, they remain on both lists (contacts can belong to multiple lists)
- The global contact record is updated with the most recent data

## Segmentation

Beyond lists, you can segment contacts using tags and engagement data:

- Tags — Apply labels like "VIP," "Speaker," "Sponsor Contact," or custom tags
- Engagement segments — Target contacts who opened, clicked, or did not engage with specific campaigns
- Event segments — Filter by event attendance or registration status

Segments can be used as targeting criteria when selecting recipients for a campaign, giving you precise control over who receives each message.

## List Hygiene

Maintain healthy lists by:

- Removing bounced addresses promptly (MilCrunch auto-suppresses hard bounces)
- Honoring unsubscribe requests (handled automatically)
- Periodically re-engaging inactive contacts or removing them
- Never purchasing email lists — imported contacts should always be people who have opted in`,
  },
  {
    title: "Setting Up a Custom Sending Domain",
    slug: "custom-sending-domain",
    category: "email-marketing",
    summary:
      "How to configure DNS records for authenticated email delivery from your domain.",
    readTime: 5,
    date: "2026-02-06",
    related: ["getting-started-email", "can-spam-compliance"],
    isPublished: true,
    content: `## Why a Custom Sending Domain Matters

When you send emails through MilCrunch without a custom domain, they are sent from a shared sending infrastructure. While this works, emails from shared domains are more likely to be filtered by spam algorithms because the sender reputation is shared across multiple organizations. A custom sending domain ties your email reputation directly to your own domain, resulting in significantly better inbox placement.

## What You Need

Before starting, ensure you have:

- A domain you own and control (e.g., yourbrand.com)
- Access to your domain's DNS management panel (GoDaddy, Cloudflare, Route 53, etc.)
- An email address at that domain for verification

## Step-by-Step Setup

### Step 1 — Add Your Domain

Navigate to Email > Settings > Sending Domain and click "Add Domain." Enter your domain name (e.g., yourbrand.com). MilCrunch generates the DNS records you need to add.

### Step 2 — Add SPF Record

SPF (Sender Policy Framework) tells receiving mail servers which servers are authorized to send email on behalf of your domain.

- Record Type: TXT
- Host: @ (or your domain root)
- Value: The SPF string provided by MilCrunch (includes MilCrunch's sending IPs)

If you already have an SPF record, do not create a second one. Instead, add the MilCrunch include statement to your existing record.

> Having multiple SPF records for the same domain will cause validation failures. Always merge into a single SPF record.

### Step 3 — Add DKIM Records

DKIM (DomainKeys Identified Mail) adds a cryptographic signature to your emails that proves they have not been tampered with in transit.

MilCrunch generates two CNAME records for DKIM:

- Record 1: Host = provided selector, Value = provided CNAME target
- Record 2: Host = provided selector, Value = provided CNAME target

Add both CNAME records to your DNS.

### Step 4 — Add DMARC Record

DMARC (Domain-based Message Authentication, Reporting, and Conformance) tells receiving servers what to do with emails that fail SPF or DKIM checks.

- Record Type: TXT
- Host: _dmarc
- Value: A DMARC policy string (MilCrunch recommends starting with a "none" policy for monitoring, then tightening to "quarantine" or "reject" once you confirm everything works)

### Step 5 — Verify

After adding all DNS records, return to MilCrunch and click "Verify Domain." DNS propagation can take anywhere from a few minutes to 48 hours, though most changes take effect within 1-2 hours. MilCrunch checks each record and shows green checkmarks as they are detected.

## Troubleshooting Verification

If verification fails after 48 hours:

- SPF not found — Double-check the TXT record host. Some DNS providers require the full domain (yourbrand.com) while others want just @.
- DKIM not found — Ensure you created CNAME records, not TXT records. The host must include the selector prefix exactly as shown.
- DMARC not found — Confirm the host is _dmarc (with underscore) and the record type is TXT.
- Conflicting records — Some DNS providers have existing records that conflict. Check for duplicate TXT records or pre-existing DKIM records from other services.

## After Verification

Once verified, MilCrunch automatically routes all emails through your custom domain. Update your sender identity to use an email address at the verified domain. Deliverability improvements are typically visible within 1-2 weeks as your domain builds sending reputation.

## Maintaining Domain Health

- Monitor your domain's sender reputation through tools like Google Postmaster Tools
- Keep your email lists clean to minimize bounces and spam complaints
- Gradually increase sending volume rather than sending large campaigns immediately after setup
- Review DMARC reports to catch any unauthorized sending from your domain`,
  },
  {
    title: "Understanding Email Analytics",
    slug: "email-analytics",
    category: "email-marketing",
    summary:
      "How to interpret open rates, click rates, and deliverability metrics.",
    readTime: 4,
    date: "2026-02-04",
    related: ["creating-first-campaign", "can-spam-compliance"],
    isPublished: true,
    content: `## Accessing Email Analytics

Navigate to Email > Analytics to see performance data across all your campaigns. You can view aggregate metrics or drill into individual campaigns for detailed breakdowns. Data starts flowing within minutes of a campaign send and continues to update over the following 48-72 hours.

## Key Metrics Explained

### Delivery Rate

The percentage of emails that were successfully delivered to recipients' mail servers. A healthy delivery rate is 95% or higher.

- Delivered — The email reached the recipient's mail server
- Bounced — The email was rejected. Hard bounces (invalid address) are permanently suppressed. Soft bounces (full inbox, temporary issue) are retried automatically.

### Open Rate

The percentage of delivered emails that were opened by recipients. MilCrunch tracks opens using a tiny tracking pixel embedded in the email.

- Industry average: 20-25% for most sectors
- Good performance: 30%+ indicates strong subject lines and engaged audience
- Below 15%: May indicate deliverability issues, unengaged audience, or weak subject lines

> Apple Mail Privacy Protection pre-loads tracking pixels for some users, which can inflate open rates. Consider open rates as directional indicators rather than exact measurements.

### Click Rate

The percentage of delivered emails where a recipient clicked at least one link. This is one of the most reliable engagement metrics.

- Click-through rate (CTR) — Clicks divided by delivered emails
- Click-to-open rate (CTOR) — Clicks divided by opened emails. This measures how compelling your email content is once someone opens it.

### Unsubscribe Rate

The percentage of recipients who clicked the unsubscribe link. A healthy unsubscribe rate is below 0.5% per campaign. Rates above 1% suggest your content is not meeting recipient expectations or you are sending too frequently.

### Spam Complaint Rate

The percentage of recipients who marked your email as spam. This is the most critical metric for deliverability. Keep it below 0.1%. Rates above 0.3% can trigger spam filtering by major email providers.

## Campaign-Level Analytics

Click into any sent campaign to see:

- Timeline graph — Opens and clicks over time, showing when recipients are most engaged
- Link performance — Click counts for every link in the email, helping you understand what content drives the most interest
- Device breakdown — Desktop vs. mobile vs. tablet opens
- Email client breakdown — Gmail, Outlook, Apple Mail, Yahoo, etc.
- Geographic data — Where recipients are opening from

## What Good Rates Look Like

Benchmarks vary by industry and audience, but for military and event-focused email:

- Open rate: 25-35% is strong
- Click rate: 3-5% is solid
- Unsubscribe rate: Below 0.3% is healthy
- Bounce rate: Below 3% for clean lists

## A/B Testing Basics

MilCrunch supports A/B testing for subject lines and send times. Create two variants of your campaign and send each to a small percentage of your list. After a set period (usually 2-4 hours), the winning variant is automatically sent to the remainder.

Test one variable at a time:

- Subject line A vs. B — Which subject gets more opens?
- Morning send vs. afternoon send — When does your audience engage most?
- Button text A vs. B — Which call-to-action drives more clicks?

## Acting on Your Data

- If open rates are low, focus on improving subject lines and sender reputation
- If open rates are good but clicks are low, improve your email content and calls-to-action
- If unsubscribe rates spike, review your sending frequency and content relevance
- If bounce rates are high, clean your lists and verify your import sources`,
  },
  {
    title: "CAN-SPAM Compliance Guide",
    slug: "can-spam-compliance",
    category: "email-marketing",
    summary:
      "What you need to know about email compliance and MilCrunch's built-in safeguards.",
    readTime: 5,
    date: "2026-02-02",
    related: ["custom-sending-domain", "email-analytics"],
    isPublished: true,
    content: `## What is CAN-SPAM?

The CAN-SPAM Act is a United States federal law that sets rules for commercial email. It gives recipients the right to stop receiving emails and establishes penalties for violations — up to $46,517 per non-compliant email. If you are sending marketing emails to people in the United States, CAN-SPAM applies to you regardless of where your organization is based.

## Core CAN-SPAM Requirements

### Accurate Header Information

Your "From," "To," and "Reply-To" fields must accurately identify the person or organization sending the email. Misleading header information is a violation.

### No Deceptive Subject Lines

Subject lines must reflect the actual content of the email. Bait-and-switch subject lines that trick recipients into opening are prohibited.

### Identification as an Advertisement

If your email is promotional, it must be clearly identifiable as an advertisement. There is no specific wording required, but the overall impression should not mislead the recipient about the commercial nature of the message.

### Physical Mailing Address

Every commercial email must include a valid physical postal address for your organization. This can be a street address, a registered PO Box, or a private mailbox registered with a commercial mail receiving agency.

### Clear Unsubscribe Mechanism

You must provide a clear, conspicuous way for recipients to opt out of future emails. The opt-out mechanism must:

- Be easy to find (not buried in tiny print)
- Work for at least 30 days after the email is sent
- Not require the recipient to do anything beyond sending a reply or visiting a single web page

### Honor Opt-Out Requests Promptly

When someone unsubscribes, you must stop sending them email within 10 business days. You cannot charge a fee, require additional information beyond an email address, or make the recipient jump through hoops to unsubscribe.

## How MilCrunch Handles Compliance

MilCrunch has built-in safeguards that handle the most common compliance requirements automatically:

### Automatic Unsubscribe Links

Every email sent through MilCrunch includes a one-click unsubscribe link in the footer. This link is always present and cannot be removed from the template. When a recipient clicks it, they are immediately removed from the sending list and added to a global suppression list.

### Suppression List Management

MilCrunch maintains a global suppression list of contacts who have unsubscribed. These contacts are automatically excluded from all future campaigns, regardless of which list they are on. You cannot override suppression — this is by design.

### Physical Address Requirement

The email editor requires a physical mailing address in the footer before a campaign can be sent. If you have not configured a default address, you will be prompted to add one.

### Bounce Management

Hard bounces (invalid email addresses) are automatically suppressed after the first bounce. This protects your sender reputation and prevents repeated sends to non-existent addresses.

> MilCrunch handles the technical compliance requirements, but you are still responsible for the content of your emails. Do not use deceptive subject lines, do not send to purchased lists, and always make sure your content is genuinely relevant to your recipients.

## Best Practices Beyond Compliance

Meeting the minimum legal requirements is not enough for good email marketing. These best practices help you stay well above the compliance floor:

- Get explicit consent — Only email people who have actively opted in to receive your messages
- Set expectations — Tell people what kind of emails they will receive and how often when they sign up
- Make unsubscribing easy — A prominent unsubscribe link actually reduces spam complaints because it gives unhappy recipients a clean exit
- Segment your audience — Sending relevant content to targeted segments reduces unsubscribes and complaints
- Monitor your metrics — High complaint rates and low engagement are warning signs that something needs to change
- Keep records — Document how and when each contact opted in, in case you need to demonstrate consent

## International Considerations

If you email recipients outside the United States, additional regulations may apply:

- GDPR (European Union) — Requires explicit consent and stronger data protection
- CASL (Canada) — Requires express or implied consent with stricter rules than CAN-SPAM
- PECR (United Kingdom) — Similar to GDPR with UK-specific requirements

MilCrunch's compliance tools cover CAN-SPAM requirements. For international email, consult with a legal professional to ensure compliance with applicable local laws.`,
  },

  // ─── SPONSORSHIP & REVENUE ──────────────────────────────────────────
  {
    title: "Sponsor Package Tiers Explained",
    slug: "sponsor-package-tiers",
    category: "sponsorship-revenue",
    summary:
      "Understanding the Presenting, Gold, Silver, and Bronze sponsorship levels.",
    readTime: 5,
    date: "2026-02-11",
    related: ["using-rate-desk", "building-sponsor-proposal"],
    isPublished: true,
    content: `## Why Tiered Packages?

Tiered sponsorship packages give prospects clear options at different investment levels. Instead of negotiating every deal from scratch, tiers provide a starting framework that speeds up the sales process while still allowing customization. MilCrunch's package system supports four standard tiers — Presenting, Gold, Silver, and Bronze — plus the ability to create custom tiers for unique partnerships.

## The Four Standard Tiers

### Presenting Sponsor

The highest tier, reserved for one or two sponsors per event or program. Presenting sponsors receive maximum visibility and exclusivity.

Typical inclusions:

- Exclusive naming rights (e.g., "Presented by [Sponsor Name]")
- Logo on all event marketing materials, streams, and communications
- Dedicated stage segment (5-10 minutes) during Experience production
- Premium booth placement
- Full-access lead retrieval
- Social media feature posts (minimum 3-5)
- Inclusion in all email campaigns
- Custom content pieces (sponsor spotlight article or video)
- VIP event access for sponsor executives
- First right of refusal for next year

### Gold Sponsor

Strong visibility with prominent but non-exclusive placement.

Typical inclusions:

- Logo on event marketing materials and stream overlays
- Shared stage mention during Experience production
- Priority booth placement
- Lead retrieval access
- Social media mentions (minimum 2-3 posts)
- Inclusion in event email campaigns
- Attendee app sponsor page with featured placement

### Silver Sponsor

Solid presence with standard deliverables.

Typical inclusions:

- Logo on event signage and printed materials
- Stream overlay logo rotation
- Standard booth placement
- Lead retrieval access (limited licenses)
- Social media mention (1-2 posts)
- Listing in event emails
- Attendee app sponsor page

### Bronze Sponsor

Entry-level tier for sponsors testing the waters or with smaller budgets.

Typical inclusions:

- Logo on event signage
- Listing on event website and attendee app
- Standard booth placement
- Community feed mention

> Price each tier based on the estimated impression value you can deliver, not just the cost of fulfilling the package. Use the Rate Desk to calculate appropriate pricing.

## Customizing Packages

The standard tiers are starting points. MilCrunch lets you customize any package by adding or removing individual line items. Common customizations include:

- Adding a dedicated email campaign for a Gold sponsor who wants more digital visibility
- Including a creator partnership component for a sponsor interested in influencer marketing
- Creating a "Digital Only" variant for sponsors who cannot attend in person
- Bundling multi-event packages for sponsors who want year-round presence

## Obligation Tracking

Every deliverable in a sponsor package is tracked as an obligation in MilCrunch. When you create or modify a package, each line item becomes a checklist entry on the sponsor's dashboard. As deliverables are fulfilled (logo placed, social post published, stage segment completed), mark them complete to maintain an accurate fulfillment record.

This tracking serves two purposes:

- Internal accountability — Your team always knows what has been delivered and what is outstanding
- Sponsor transparency — Sponsors can see their obligation status in real time through the shared dashboard

## Setting Up Packages in MilCrunch

Navigate to Sponsorship > Packages to create or edit your tiers. For each tier, define:

- Tier name and color — The label and visual identifier
- Price — Base price (can be adjusted per deal)
- Deliverables — Line items that make up the package
- Limits — Maximum number of sponsors at this tier (optional)
- Description — A brief summary for proposals and prospecting

Once packages are configured, they can be attached to events, applied to sponsor records, and included in proposals with a few clicks.`,
  },
  {
    title: "Using the Rate Desk",
    slug: "using-rate-desk",
    category: "sponsorship-revenue",
    summary:
      "How to set CPM pricing with floor and ceiling rates for advertising inventory.",
    readTime: 5,
    date: "2026-02-09",
    related: ["sponsor-package-tiers", "sponsor-lead-management"],
    isPublished: true,
    content: `## What is the Rate Desk?

The Rate Desk is MilCrunch's pricing tool for sponsor inventory. It helps you set data-driven rates for every type of sponsor placement — stream overlays, social posts, email inclusions, stage segments, and event signage. Instead of guessing what to charge, the Rate Desk uses impression estimates and CPM (cost per thousand impressions) calculations to set floor and ceiling prices for each placement.

## Understanding CPM

CPM stands for Cost Per Mille (cost per thousand impressions). It is the standard pricing unit in advertising. If a placement generates 50,000 impressions and your CPM rate is $15, the value of that placement is $750.

The formula: (Impressions / 1,000) x CPM Rate = Placement Value

Different placement types command different CPM rates based on their quality, engagement level, and audience targeting.

## Setting Up the Rate Desk

Navigate to Sponsorship > Rate Desk. You will see a table of placement types with columns for estimated impressions, floor CPM, ceiling CPM, and calculated value range.

### Placement Types

MilCrunch includes the following default placement types:

- Stream Overlay — Logo displayed during live stream segments
- Stream Dedicated Segment — Sponsor-specific segment during a stream
- Social Media Post — Sponsored post on connected social accounts
- Social Media Story — Sponsored story on Instagram or Facebook
- Email Banner — Logo or banner in an email campaign
- Email Dedicated Send — Full email sent on behalf of the sponsor
- Stage Signage — Physical branding at the event venue
- Stage Mention — Verbal sponsor mention during Experience segments
- Attendee App Feature — Prominent placement in the event app
- Lead Retrieval Access — Access to the lead capture system

You can add custom placement types for unique inventory items specific to your events.

### Floor and Ceiling Rates

For each placement type, set two CPM rates:

- Floor rate — The minimum CPM you will accept. This ensures you never undersell your inventory.
- Ceiling rate — The aspirational CPM for premium or high-demand placements.

> Set your floor rates based on actual costs (production, labor, platform fees) plus a minimum margin. Set ceiling rates based on comparable market rates for similar audience demographics.

### Impression Estimates

Enter the estimated number of impressions each placement type generates per event or per campaign. MilCrunch uses historical data from your 365 Insights dashboard to suggest estimates, but you can override them manually.

## Calculating Package Prices

Once your rate desk is configured, MilCrunch automatically calculates the total value of any sponsor package by summing the individual placement values. This makes it easy to:

- Price new packages — Add up the placements included in each tier to determine the appropriate price point
- Justify pricing to sponsors — Show exactly how the package price maps to expected impressions and CPM rates
- Evaluate custom requests — When a sponsor asks for a custom package, quickly calculate the fair value of their specific placement mix

## Inventory Management

The Rate Desk also tracks available inventory. For each placement type, set the total available quantity per event. As sponsors are attached to placements, the available count decreases. This prevents overselling — you will see a warning if you try to assign more placements than are available.

### Sold vs. Available

The inventory dashboard shows:

- Total placements available
- Placements sold (assigned to sponsors)
- Remaining inventory
- Revenue captured vs. potential revenue

## Pricing Strategies

### Premium Pricing

For high-demand placements (presenting-level stage segments, email dedicated sends), set CPM rates at the ceiling. These placements offer exclusivity and high engagement that justify premium pricing.

### Volume Discounts

Offer reduced CPM rates when sponsors commit to multiple placements or multi-event packages. Use the floor rate as your discounted CPM.

### Early-Bird Rates

Set a deadline for early-bird pricing that uses floor CPM rates. After the deadline, standard (mid-range) pricing applies. This creates urgency in the sales cycle.

## Reviewing and Adjusting Rates

Review your rate desk quarterly. Use actual impression data from 365 Insights to validate or adjust your estimates. If placements consistently overdeliver on impressions, raise your CPM rates. If they underdeliver, adjust estimates to maintain credibility with sponsors.`,
  },
  {
    title: "Building a Sponsor Proposal",
    slug: "building-sponsor-proposal",
    category: "sponsorship-revenue",
    summary:
      "Use the built-in proposal builder to create branded sponsor pitch decks.",
    readTime: 5,
    date: "2026-02-07",
    related: ["sponsor-package-tiers", "post-event-sponsor-reporting"],
    isPublished: true,
    content: `## What is the Proposal Builder?

The Proposal Builder is MilCrunch's tool for creating professional, branded sponsorship pitch decks. It combines your event data, audience demographics, package details, and historical performance into a polished document that you can send to prospective sponsors. No more cobbling together slides in PowerPoint — the Proposal Builder pulls live data directly from your MilCrunch dashboard.

## Accessing the Proposal Builder

Navigate to Sponsorship > Proposals and click "New Proposal." You will be guided through a step-by-step process.

### Step 1 — Select the Prospect

Choose an existing sponsor contact from your pipeline or create a new prospect entry. The system will pull any existing data — previous interactions, past sponsorship history, notes — to inform the proposal.

### Step 2 — Choose the Event or Program

Select the event or year-round program you are pitching sponsorship for. This determines which data, audience estimates, and inventory details are included.

### Step 3 — Select Package Tier

Choose the sponsorship tier you are proposing. The builder automatically populates the deliverables, estimated impressions, and pricing from your configured packages. You can customize individual line items for this specific proposal.

### Step 4 — Add Supporting Data

This is where the proposal becomes compelling. Include any of the following sections:

- Audience Overview — Demographics, geographic distribution, and psychographic profile of your event attendees and media audience
- Historical Performance — If you have hosted previous events, include impression data, engagement metrics, and sponsor testimonials
- Creator Network — Highlight the military creators in your network and the audience reach they bring
- Case Studies — Reference specific past sponsor activations with results
- Comparable Sponsorships — Industry benchmarks that validate your pricing

> Include audience data that matters to the prospect's industry. A defense contractor cares about different demographics than a consumer fitness brand. Tailor the data you highlight to each prospect.

### Step 5 — Add a Cover Letter

Write a brief cover letter that introduces the opportunity and connects it to the prospect's business goals. The builder provides a template, but personalization is key. Reference the prospect's brand, recent campaigns, or stated priorities to show you have done your homework.

### Step 6 — Customize Branding

- Your logo — Your organization's logo appears in the header
- Prospect's logo — Adding the prospect's logo makes the proposal feel personalized
- Color scheme — Match the proposal to your or the prospect's brand colors
- Cover image — A hero image that sets the tone (event photos work well)

## Exporting the Proposal

Once your proposal is complete, you have several output options:

- PDF — A formatted, print-ready document perfect for email attachments or in-person presentations
- Interactive Link — A web-based version the prospect can explore, with clickable charts and expandable sections
- Slide Deck — A presentation-format export optimized for screen sharing during video calls

## Tracking Proposal Engagement

When you send an interactive link, MilCrunch tracks when the prospect opens the proposal, which sections they spend the most time on, and whether they download the PDF. This engagement data appears in your sponsor pipeline and helps you time your follow-up.

## Proposal Best Practices

- Keep the total length to 8-12 pages for PDF proposals. Longer decks lose attention.
- Lead with the opportunity and audience, not with pricing. Make the prospect excited before they see the cost.
- Include one clear call-to-action — a next step like "Schedule a call to discuss" or "Reserve your tier by [date]."
- Follow up within 3-5 business days if you have not heard back. Use the engagement tracking data to reference what they looked at.
- Prepare two or three tier options so the prospect has a choice rather than a yes/no decision.
- Update proposals regularly with fresh data. Sending a proposal with last year's numbers undermines credibility.`,
  },
  {
    title: "Sponsor Lead Management",
    slug: "sponsor-lead-management",
    category: "sponsorship-revenue",
    summary:
      "Managing the sponsor sales pipeline from prospect to signed contract.",
    readTime: 5,
    date: "2026-02-05",
    related: ["building-sponsor-proposal", "using-rate-desk"],
    isPublished: true,
    content: `## What is the Sponsor Pipeline?

The sponsor pipeline in MilCrunch is a CRM-style tool built specifically for managing sponsorship sales. It tracks every prospective sponsor from initial identification through proposal, negotiation, and signed contract. The pipeline gives you visibility into where every deal stands and ensures no prospect falls through the cracks.

## Pipeline Stages

MilCrunch uses a standard pipeline with customizable stages. The default stages are:

### Identified

Prospects you have identified as potential sponsors but have not yet contacted. These might come from industry research, referrals, attendee lists, or inbound inquiries.

### Contacted

Prospects you have reached out to with an initial introduction. Track the date and method of first contact (email, phone, event meeting) and any initial response.

### Proposal Sent

Prospects who have received a formal sponsorship proposal. Link the proposal directly from the Proposal Builder so you can track engagement and follow up with context.

### In Negotiation

Prospects who are actively discussing terms. They may have requested a different tier, custom deliverables, or adjusted pricing. Track the specifics of what is being negotiated.

### Verbal Commitment

Prospects who have verbally agreed to sponsor but have not yet signed a contract. This is a common stage in event sponsorship where deals are agreed in principle before paperwork is finalized.

### Signed

Deals with a signed contract. At this stage, the prospect becomes an active sponsor and their obligations begin tracking automatically.

### Lost

Prospects who declined or went silent. Track the reason for the loss to identify patterns and improve future outreach.

## Adding and Managing Leads

### Adding a New Lead

Click "Add Lead" in the pipeline view. Enter:

- Company name — The prospective sponsor's organization
- Contact name — Your primary point of contact
- Contact email and phone — Direct contact details
- Estimated deal value — The expected sponsorship amount
- Source — How you found this prospect (referral, inbound, research, event meeting)
- Notes — Any context about the prospect's interest or fit

### Moving Leads Through Stages

Drag leads between stages in the Kanban view or update the stage from the lead detail page. Each stage transition is logged with a timestamp so you have a complete history of the deal's progression.

> Update your pipeline at least weekly. Stale data makes the pipeline unreliable and leads to missed follow-ups. A well-maintained pipeline is your most valuable sales tool.

## Tracking Outreach

Every interaction with a prospect should be logged. MilCrunch tracks:

- Emails sent — Log outreach emails with subject and date
- Calls made — Record call outcomes and key takeaways
- Meetings — Track meeting dates, attendees, and outcomes
- Proposals — Link sent proposals with engagement tracking data
- Notes — Free-form notes for any context that does not fit other fields

## Setting Follow-Up Reminders

For each lead, set follow-up reminders so you never lose momentum. Reminders appear in your MilCrunch dashboard and can also be sent to your email. Common reminder cadences:

- After initial outreach: Follow up in 3-5 business days
- After sending a proposal: Follow up in 5-7 business days
- After a meeting: Send a recap within 24 hours, follow up in one week
- During negotiation: Check in weekly until terms are finalized

## Pipeline Analytics

The pipeline analytics view shows:

- Total pipeline value — Sum of estimated deal values across all active stages
- Conversion rates — Percentage of leads moving from each stage to the next
- Average deal cycle — How long deals typically take from Identified to Signed
- Win/loss ratio — Percentage of leads that result in signed contracts
- Revenue forecast — Projected revenue based on pipeline value and historical conversion rates

## Best Practices

- Qualify leads before adding them to the pipeline. Not every company that could sponsor should be in your pipeline.
- Focus on leads in the Proposal Sent and In Negotiation stages — these are closest to revenue.
- Review lost deals quarterly to identify common objections and address them in your pitch.
- Keep your pipeline clean by archiving leads that have been inactive for more than 90 days.
- Use deal value estimates honestly. An inflated pipeline gives a false sense of progress.`,
  },
  {
    title: "Post-Event Sponsor Reporting",
    slug: "post-event-sponsor-reporting",
    category: "sponsorship-revenue",
    summary:
      "How to generate and deliver ROI reports to sponsors after an event.",
    readTime: 5,
    date: "2026-02-03",
    related: ["sponsor-dashboard-guide", "sponsor-renewal-proposal"],
    isPublished: true,
    content: `## Why Post-Event Reports Matter

A post-event sponsor report is your proof of value. It shows sponsors exactly what they received for their investment — impressions, engagement, leads, and content. A great report does more than satisfy a contractual obligation; it builds the foundation for renewal and sets up the next conversation about expanding the partnership.

Sponsors who receive detailed, transparent reports within two weeks of an event are significantly more likely to renew than those who receive vague summaries months later.

## What to Include

### Executive Summary

Start with a one-page summary that hits the highlights:

- Total impressions delivered across all channels
- Engagement rate and key interaction metrics
- Number of leads captured (if applicable)
- Content pieces produced featuring the sponsor
- Overall event attendance and audience demographics

### Obligation Fulfillment

List every deliverable from the sponsor's package with its completion status. Include evidence for each:

- Logo placement — Screenshots from stream overlays, signage, printed materials, and the attendee app
- Stage segments — Recording links or timestamps of sponsor mentions and dedicated segments
- Social media — Links to published posts with impression and engagement data
- Email — Campaign metrics showing delivery, opens, and clicks for emails featuring the sponsor
- Lead retrieval — Total leads captured, rating breakdown, and export confirmation

### Impression Breakdown

Provide a detailed channel-by-channel impression breakdown:

- Event/On-Site — Estimated impressions from signage, booth traffic, and stage audience
- Streaming — Live viewer counts and VOD replay views
- Social Media — Post impressions, video views, and story views
- Email — Delivered and opened counts for campaigns featuring the sponsor
- Attendee App — Sponsor page views and interactions

Include a visualization (pie chart or bar chart) showing the channel mix. This helps sponsors understand where their visibility came from.

### ROI Calculation

Calculate and present the sponsor's return on investment:

- Total investment — What the sponsor paid
- Total impressions — Aggregate across all channels
- Effective CPM — Investment divided by (impressions / 1,000). Compare this to industry benchmarks to demonstrate value.
- Cost per lead — If lead retrieval was included, divide investment by leads captured
- Estimated media value — What it would cost to purchase equivalent impressions through paid advertising

> When the effective CPM is lower than industry benchmarks, highlight this prominently. It is one of the strongest arguments for renewal.

### Content Gallery

Include a gallery of all content featuring the sponsor — social media posts, stream screenshots, event photos, and email templates. Visual evidence is far more compelling than numbers alone.

## Generating Reports in MilCrunch

Navigate to 365 Insights and select the sponsor. Click "Generate Post-Event Report" and choose the event. MilCrunch auto-populates the report with:

- Impression data from all tracked channels
- Obligation status from the package tracker
- Content links and screenshots from connected platforms
- ROI calculations based on the sponsor's investment and delivered impressions

### Customizing Per Sponsor

Each sponsor report can be customized:

- Add or remove sections based on what is relevant to the sponsor
- Adjust the narrative to address the sponsor's specific goals
- Include personalized recommendations for future partnerships
- Add a custom cover page with the sponsor's branding

## Delivery Best Practices

- Deliver within 14 days of event close. Speed signals professionalism and keeps the event fresh in the sponsor's mind.
- Send a branded PDF along with a live dashboard link so the sponsor can explore data at their own pace.
- Schedule a call to walk through the report. A 30-minute debrief is far more impactful than an email attachment alone.
- Include a forward look — End the report with a teaser of upcoming opportunities and an invitation to discuss renewal.
- Ask for feedback — What did the sponsor value most? What could be improved? Their input makes your next proposal stronger.`,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getArticlesByCategory(categorySlug: string): KbArticle[] {
  return KB_ARTICLES.filter(
    (a) => a.category === categorySlug && a.isPublished,
  );
}

export function getArticleBySlug(slug: string): KbArticle | undefined {
  return KB_ARTICLES.find((a) => a.slug === slug);
}

export function getCategoryBySlug(slug: string): KbCategory | undefined {
  return KB_CATEGORIES.find((c) => c.slug === slug);
}

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
