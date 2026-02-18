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

365-DAY ENGAGEMENT: MilCrunch is a year-round community platform. Events are not one-offs — each event has an ongoing community with registered attendees, active creator directories, and continuous engagement metrics. When discussing events, reference this year-round engagement model:
- "MIC 2026 has X speakers confirmed and a community of X registered attendees."
- "The 365-day engagement for this event shows X total impressions across the creator directory."
- These metrics are being built out — use placeholder language like "growing community" when exact numbers aren't available yet.
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
];

const EVENT_PLANNER_TOOLS = [
  "getTaskBoard", "getTask", "searchTasks",
  "getEvents", "getEventDetail", "updateEvent",
  "getEventRegistrations", "getSponsors",
];

const BRAND_ADMIN_TOOLS = [
  "createTask", "updateTask",
  "addChecklistItem", "toggleChecklistItem",
  "addTaskNote",
  "getTaskBoard", "getTask", "getTasksByPriority", "searchTasks",
  "getEvents", "getEventDetail", "updateEvent",
  "getEventRegistrations", "getSponsors",
];

const READ_ONLY_TOOLS = [
  "getTaskBoard", "getTask", "searchTasks",
  "getEvents", "getEventDetail",
  "getEventRegistrations",
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
