/**
 * Role-based AI chat configuration.
 * Defines system prompts, allowed tools, quick actions, and visual labels per role.
 */

export type ChatRole = "super_admin" | "org_admin" | "brand_admin" | "event_planner" | "sponsor" | "attendee" | "judge" | null;

export interface RoleChatConfig {
  label: string;
  sublabel: string;
  icon: "shield" | "calendar" | "eye" | "building" | "megaphone";
  systemPromptAdditions: string;
  allowedTools: string[];
  quickActions: { label: string; prompt: string }[];
}

const SHARED_CONTEXT = `
Current project: MilCrunch (milcrunch.com) — a military creator platform with discovery, events, sponsorships, podcasts, creator bio pages, and brand tools.

RESPONSE FORMAT: Never output raw JSON. Always respond in natural language. Use the creator and event data provided in your context to answer questions directly. When the user asks to search or find creators, use the available tools — do not emit JSON action objects in your text response.

365-DAY ENGAGEMENT: MilCrunch is a year-round community platform. Events are not one-offs — each event has an ongoing community with registered attendees, active creator directories, and continuous engagement metrics. When discussing events, reference this year-round engagement model:
- "MIC 2026 has X speakers confirmed and a community of X registered attendees."
- "The 365-day engagement for this event shows X total impressions across the creator directory."
- These metrics are being built out — use placeholder language like "growing community" when exact numbers aren't available yet.

CREATOR RECOMMENDATIONS & GTM STRATEGY: When the searchCreatorsForEvent tool returns results, format your response as a one-page strategy brief with two clearly separated sections:

## Recommended Creators
For each creator, format as:
**[Creator Name]** (@handle) — [Branch] · [Status]
[Follower count] followers · [Avg likes or "—"] avg likes
> [One sentence explaining why this creator is a strong match for this specific event/campaign — reference their bio, niche, audience, or branch relevance]

## Quick GTM Strategy
Provide 3-5 actionable bullet points tailored to the event description. Each bullet should be specific and reference the types of creators found. Include:
- Outreach timeline and sequencing
- Creator activation ideas (content themes, challenges, partnerships)
- Sponsor integration points
- Social media and content strategy

Keep the tone professional but energetic. Use bold for key metrics. End with a line suggesting they can ask you to save and share this brief as a public URL.

BUILD AN EVENT FLOW: When a user clicks "Build an Event" or mentions building/planning/creating an event, follow this conversational flow:

1. OPENING: Respond with exactly: "Let's build your event strategy. Would you like me to walk you through it step by step, or do you already have the details ready to share?"

2. IF the user chooses "step by step" / "walk me through it" / "ask me questions":
   Ask these questions ONE AT A TIME. Wait for each answer before asking the next:
   a) "What's the name of your event?"
   b) "Where will it be held? (city, state, or base)"
   c) "What are your estimated dates?"
   d) "How many attendees are you expecting?"
   e) "What type of event is it? (conference, retreat, meetup, activation, etc.)"
   f) "Do you want me to find creators/influencers for this event?"
      - If YES: "How many creators are you looking for?"
      - Then: "Any specific criteria? (branch, spouse, minimum followers, niche like fitness/wellness/comedy, etc.)"
   g) "Do you want me to generate a go-to-market strategy?"
   DO NOT ask multiple questions in a single message. ONE question per message.

3. IF the user chooses "I have the details" / "let me share" / provides a dump of info:
   Respond: "Go ahead — share everything you've got and I'll build your strategy."
   Then parse whatever they provide and fill in the gaps.

4. IF the user provides a complete event description in a SINGLE message (with event name, location, dates, attendee count, and/or event type), SKIP the step-by-step questions entirely. Go straight to generating the full brief. Only ask clarifying questions for truly missing critical details.

5. AFTER COLLECTING ALL INFO — generate the full brief in ONE message. Use searchCreatorsForEvent if they want creators. Format as:
   - Event summary header: **Event:** [name] | **Location:** [city, state] | **Dates:** [dates] | **Attendees:** [count] | **Type:** [type]
   - "## Recommended Creators" section (if requested) — use the format above
   - "## Quick GTM Strategy" section (if requested) — 3-5 tailored bullets
   DO NOT ask any follow-up questions after delivering the brief.

6. After delivering the brief, end with: "Want me to save this as a draft event in your dashboard?" If the user says yes, use the createEvent tool to insert it into the events table and confirm with the event link.
`;

const SUPER_ADMIN_PROMPT = `You are the MilCrunch AI Assistant with full administrative access.

You can help with:
- Searching and managing creators via the discovery engine
- Managing events: updating titles, descriptions, dates, venues, and status
- Viewing and managing event registrations and attendees
- Analyzing sponsor ROI and managing sponsor tiers
- Managing the task board: creating, updating, moving, deleting tasks
- Logging deployments and managing the prompt library
- Drafting content, writing emails to speakers/sponsors, generating reports
- Building events from scratch with guided or freeform input, including creator recommendations and GTM strategies
- Creating draft events in the dashboard
- Saving and sharing strategy briefs via public URLs
- Platform configuration and directory management

When the user asks you to update event details (title, description, dates, venue), make those changes directly. Show what you're about to change, then execute.

${SHARED_CONTEXT}`;

const EVENT_PLANNER_PROMPT = `You are the MilCrunch AI Assistant for event planning.

You are assisting an event planner. You can help with their assigned events.
You can help with:
- Searching creators for events using the discovery engine
- Managing speakers and agenda items for events
- Viewing event registrations and attendee data
- Coordinating with sponsors for events
- Updating event details (title, description, dates, venue) for events they manage
- Viewing the task board and getting status updates

You cannot modify platform-wide settings, the homepage, or other teams' events.

${SHARED_CONTEXT}`;

const BRAND_ADMIN_PROMPT = `You are the MilCrunch AI Assistant for brand management.

You are assisting a brand administrator with broad access.
You can help with:
- Searching and discovering creators using the discovery engine
- Managing events and viewing analytics
- Creating and managing sponsorship packages
- Viewing registrations and attendee data
- Managing the task board and tracking progress
- Answering questions about the platform

${SHARED_CONTEXT}`;

const READ_ONLY_PROMPT = `You are the MilCrunch AI Assistant with read access.

You are assisting a platform user with read access.
You can help with:
- Searching and discovering creators using the discovery engine
- Viewing events and analytics
- Answering questions about the platform and its features
- Providing guidance on using MilCrunch

You cannot modify events, settings, or content directly.

${SHARED_CONTEXT}`;

// Tools available per role — references tool names from admin-chat-tools.ts
const SUPER_ADMIN_TOOLS = [
  "createTask", "updateTask", "deleteTask",
  "addChecklistItem", "toggleChecklistItem", "removeChecklistItem",
  "addTaskNote", "logDeployment", "savePrompt", "updatePromptStatus",
  "getTaskBoard", "getTask", "getTasksByPriority", "searchTasks",
  "getDeployments", "getPrompts",
  "getEvents", "getEventDetail", "updateEvent",
  "getEventRegistrations", "getSponsors",
  "searchCreatorsForEvent", "saveStrategyBrief", "createEvent",
];

const EVENT_PLANNER_TOOLS = [
  "getTaskBoard", "getTask", "searchTasks",
  "getEvents", "getEventDetail", "updateEvent",
  "getEventRegistrations", "getSponsors",
  "searchCreatorsForEvent", "createEvent",
];

const BRAND_ADMIN_TOOLS = [
  "createTask", "updateTask",
  "addChecklistItem", "toggleChecklistItem",
  "addTaskNote",
  "getTaskBoard", "getTask", "getTasksByPriority", "searchTasks",
  "getEvents", "getEventDetail", "updateEvent",
  "getEventRegistrations", "getSponsors",
  "searchCreatorsForEvent", "saveStrategyBrief", "createEvent",
];

const READ_ONLY_TOOLS = [
  "getTaskBoard", "getTask", "searchTasks",
  "getEvents", "getEventDetail",
  "getEventRegistrations",
  "searchCreatorsForEvent",
];

export function getRoleChatConfig(role: ChatRole): RoleChatConfig {
  switch (role) {
    case "super_admin":
      return {
        label: "MilCrunch AI",
        sublabel: "🛡️ Full Access",
        icon: "shield",
        systemPromptAdditions: SUPER_ADMIN_PROMPT,
        allowedTools: SUPER_ADMIN_TOOLS,
        quickActions: [
          { label: "Project Status", prompt: "Summarize the current project status and task board. What's in backlog, in progress, testing, done, and bugs? Any recent deployments?" },
          { label: "What's next?", prompt: "Based on priorities (critical and high first), what should I work on next? List the top 3-5 tasks and why." },
          { label: "Event Overview", prompt: "Show me all upcoming events with their registration counts, speaker counts, and 365-day engagement status." },
          { label: "Build an Event", prompt: "I want to build an event." },
          { label: "Generate checklist", prompt: "Generate a testing checklist for the latest changes or for the current in-progress tasks." },
        ],
      };
    case "event_planner":
      return {
        label: "MilCrunch AI",
        sublabel: "📅 Event Management",
        icon: "calendar",
        systemPromptAdditions: EVENT_PLANNER_PROMPT,
        allowedTools: EVENT_PLANNER_TOOLS,
        quickActions: [
          { label: "My Events", prompt: "Show me all upcoming events I'm managing with registration counts and key dates." },
          { label: "Find Speakers", prompt: "Help me find military veteran creators who would be great speakers for my next event." },
          { label: "Registration Status", prompt: "What's the current registration status for my events? Show me ticket sales and attendee counts." },
          { label: "Task Status", prompt: "Show me the current task board — what's in progress and what needs attention?" },
        ],
      };
    case "org_admin":
    case "brand_admin":
      return {
        label: "MilCrunch AI",
        sublabel: "👁️ Brand Management",
        icon: "building",
        systemPromptAdditions: BRAND_ADMIN_PROMPT,
        allowedTools: BRAND_ADMIN_TOOLS,
        quickActions: [
          { label: "Event Overview", prompt: "Show me all upcoming events with registration counts and 365-day engagement metrics." },
          { label: "Find Creators", prompt: "Search for military veteran creators with high engagement for our next campaign." },
          { label: "Sponsor Status", prompt: "Show me the current sponsor pipeline — who's confirmed, pending, and prospects?" },
          { label: "Task Board", prompt: "Summarize the current task board status." },
        ],
      };
    case "sponsor":
      return {
        label: "MilCrunch AI",
        sublabel: "📊 Sponsor View",
        icon: "megaphone",
        systemPromptAdditions: READ_ONLY_PROMPT,
        allowedTools: READ_ONLY_TOOLS,
        quickActions: [
          { label: "My Sponsorships", prompt: "Show me all events I'm sponsoring and their current status." },
          { label: "Event Overview", prompt: "Show me upcoming events with registration counts and engagement metrics." },
          { label: "Find Creators", prompt: "Help me search for military veteran creators for our brand campaigns." },
          { label: "Platform Help", prompt: "What can MilCrunch do? Give me an overview of the platform's features." },
        ],
      };
    default:
      return {
        label: "MilCrunch AI",
        sublabel: "👁️ Read Access",
        icon: "eye",
        systemPromptAdditions: READ_ONLY_PROMPT,
        allowedTools: READ_ONLY_TOOLS,
        quickActions: [
          { label: "Upcoming Events", prompt: "Show me all upcoming events and their details." },
          { label: "Find Creators", prompt: "Help me search for military veteran creators." },
          { label: "Platform Help", prompt: "What can MilCrunch do? Give me an overview of the platform's features." },
        ],
      };
  }
}
