import { searchCreators, type CreatorCard } from "@/lib/influencers-club";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function getApiKey(): string {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  return typeof key === "string" ? key.trim() : "";
}

export type AIMessageRole = "user" | "assistant";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  /** Creator cards to show inline (from search_creators tool) */
  creators?: CreatorCard[];
}

/** Claude API content block */
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

/** API request message shape */
interface ApiMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

const SYSTEM_PROMPT = `You are ParadeDeck AI, an intelligent assistant for the ParadeDeck military creator platform. You help brands discover and manage military and veteran content creators.

You have access to the following tools:
1. search_creators - Search the Influencers.club database for creators
2. add_to_list - Add creators to campaign lists

When a user asks to find creators, extract their intent and call search_creators with appropriate filters. Always be helpful, concise, and action-oriented. Format creator results as structured data the UI can render as cards.

When returning search results, keep your text response very brief - just 1-2 sentences like "Found 12 military fitness creators with 50K+ followers. Here are the top results:" and then let the creator cards display the details. Do NOT list out every creator's name, followers, and engagement in the text - the UI cards already show that information. Be concise and conversational, not verbose.`;

const TOOLS = [
  {
    name: "search_creators",
    description:
      "Search for military and veteran creators on social media. Use this when the user wants to find, discover, or search for creators.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "AI search query like 'military fitness' or 'veteran podcast'",
        },
        platform: {
          type: "string" as const,
          enum: ["instagram", "tiktok", "youtube", "twitter"],
          description: "Social platform to search",
        },
        min_followers: { type: "number" as const, description: "Minimum follower count" },
        max_followers: { type: "number" as const, description: "Maximum follower count" },
        min_engagement: { type: "number" as const, description: "Minimum engagement rate percentage" },
      },
      required: ["query"],
    },
  },
  {
    name: "add_to_list",
    description: "Add one or more creators to a campaign list",
    input_schema: {
      type: "object" as const,
      properties: {
        creator_names: {
          type: "array" as const,
          items: { type: "string" as const },
          description: "Names of creators to add",
        },
        list_name: { type: "string" as const, description: "Name of the list to add to" },
      },
      required: ["creator_names", "list_name"],
    },
  },
];

/** Execute search_creators tool and return creators + summary for Claude */
export async function executeSearchCreators(input: Record<string, unknown>): Promise<{ summary: string; creators: CreatorCard[] }> {
  const query = String(input.query ?? "").trim();
  if (!query) {
    return { summary: "Error: query is required.", creators: [] };
  }
  const platform = (input.platform as string) ?? "instagram";
  const minFollowers = typeof input.min_followers === "number" ? input.min_followers : null;
  const maxFollowers = typeof input.max_followers === "number" ? input.max_followers : null;
  const minEngagement = typeof input.min_engagement === "number" ? input.min_engagement : null;

  const options: Parameters<typeof searchCreators>[1] = {
    platform,
    number_of_followers: { min: minFollowers, max: maxFollowers },
    engagement_percent: minEngagement != null ? { min: minEngagement, max: null } : undefined,
  };

  const result = await searchCreators(query, options);
  const count = result.creators.length;
  const summary = `Found ${count} creator(s). Total matching: ${result.total}. Creators: ${result.creators.slice(0, 10).map((c) => `${c.name} (@${c.username ?? "n/a"}) - ${c.followers} followers, ${c.engagementRate}% engagement`).join("; ")}${count > 10 ? "..." : ""}`;
  return { summary, creators: result.creators };
}

/** Build API messages from our chat history (user + assistant text only; we inject tool_use/tool_result during the loop) */
function buildApiMessages(history: { role: AIMessageRole; content: string }[]): ApiMessage[] {
  return history.map((m) => ({ role: m.role, content: m.content }));
}

/** Single round-trip: POST to Anthropic and return response content + tool_uses if any */
async function callClaude(
  apiKey: string,
  messages: ApiMessage[]
): Promise<{ text: string; toolUses: { id: string; name: string; input: Record<string, unknown> }[] }> {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[];
    stop_reason?: string;
  };

  const content = data.content ?? [];
  let text = "";
  const toolUses: { id: string; name: string; input: Record<string, unknown> }[] = [];

  for (const block of content) {
    if (block.type === "text" && block.text) text += block.text;
    if (block.type === "tool_use" && block.id && block.name) {
      toolUses.push({
        id: block.id,
        name: block.name,
        input: (block.input as Record<string, unknown>) ?? {},
      });
    }
  }

  return { text, toolUses };
}

export type ToolExecutor = {
  searchCreators: (input: Record<string, unknown>) => Promise<{ summary: string; creators: CreatorCard[] }>;
  addToList: (input: Record<string, unknown>) => Promise<{ summary: string }>;
};

/**
 * Send a user message, run the tool loop, and return the final assistant message(s) + any creators to show.
 * executor.addToList receives (creator_names, list_name) and uses ListContext - pass it from the component.
 */
export async function sendMessageWithTools(
  apiKey: string,
  conversationHistory: { role: AIMessageRole; content: string }[],
  executor: ToolExecutor
): Promise<{ messages: AIMessage[]; creators?: CreatorCard[] }> {
  const newMessages: AIMessage[] = [];
  let apiMessages = buildApiMessages(conversationHistory);
  let lastCreators: CreatorCard[] | undefined;
  let combinedText = "";

  for (let iter = 0; iter < 10; iter++) {
    const { text, toolUses } = await callClaude(apiKey, apiMessages);

    if (text) combinedText += (combinedText ? "\n\n" : "") + text;

    if (toolUses.length === 0) {
      break;
    }

    const toolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];

    for (const tool of toolUses) {
      if (tool.name === "search_creators") {
        const { summary, creators } = await executor.searchCreators(tool.input);
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: summary });
        lastCreators = creators;
      } else if (tool.name === "add_to_list") {
        const { summary } = await executor.addToList(tool.input);
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: summary });
      } else {
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: "Unknown tool." });
      }
    }

    apiMessages = [
      ...apiMessages,
      {
        role: "assistant" as const,
        content: toolUses.map((t) => ({
          type: "tool_use" as const,
          id: t.id,
          name: t.name,
          input: t.input,
        })),
      },
      {
        role: "user" as const,
        content: toolResults,
      },
    ];
  }

  if (combinedText) {
    newMessages.push({
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: combinedText,
      creators: lastCreators,
    });
  }

  return {
    messages: newMessages,
    creators: lastCreators,
  };
}

export function getAnthropicApiKey(): string {
  return getApiKey();
}
