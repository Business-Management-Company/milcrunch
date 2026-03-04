/**
 * Admin AI chat: tool definitions for Anthropic API and Supabase executors.
 * Each executor returns { result: string } for the model and optional { confirmation: string } for the UI.
 */
import { supabase } from "@/integrations/supabase/client";

const STATUSES = ["backlog", "in_progress", "testing", "done", "bugs"] as const;
const PRIORITIES = ["critical", "high", "medium", "low"] as const;
const CATEGORIES = ["feature", "bug", "fix", "ui", "api", "integration"] as const;
const DEPLOY_STATUSES = ["success", "failed", "building"] as const;
const PROMPT_STATUSES = ["not_sent", "sent", "completed", "failed"] as const;

export type ToolResult = { result: string; confirmation?: string };

async function getTaskTitle(taskId: string): Promise<string> {
  const { data } = await supabase.from("admin_tasks").select("title").eq("id", taskId).single();
  return (data as { title?: string } | null)?.title ?? "Task";
}

async function getChecklistItemLabel(id: string): Promise<string> {
  const { data } = await supabase.from("admin_task_checklist").select("label").eq("id", id).single();
  return (data as { label?: string } | null)?.label ?? "Item";
}

export const ADMIN_CHAT_TOOLS: { name: string; description: string; input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] } }[] = [
  {
    name: "createTask",
    description: "Create a new task on the board. Use status: backlog, in_progress, testing, done, bugs. Priority: critical, high, medium, low. Category: feature, bug, fix, ui, api, integration.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Optional description" },
        status: { type: "string", enum: STATUSES, description: "Column to put the task in" },
        priority: { type: "string", enum: PRIORITIES },
        category: { type: "string", enum: CATEGORIES },
        checklist: { type: "array", items: { type: "string" }, description: "Optional list of checklist item labels" },
      },
      required: ["title"],
    },
  },
  {
    name: "updateTask",
    description: "Update an existing task. Provide taskId and only the fields to change (status, priority, title, description).",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "UUID of the task" },
        fields: {
          type: "object",
          properties: {
            status: { type: "string", enum: STATUSES },
            priority: { type: "string", enum: PRIORITIES },
            title: { type: "string" },
            description: { type: "string" },
          },
        },
      },
      required: ["taskId", "fields"],
    },
  },
  {
    name: "deleteTask",
    description: "Delete a task and its checklist/notes.",
    input_schema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
  {
    name: "addChecklistItem",
    description: "Add a checklist item to a task.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        label: { type: "string", description: "Checklist item text" },
      },
      required: ["taskId", "label"],
    },
  },
  {
    name: "toggleChecklistItem",
    description: "Check or uncheck a checklist item. Use checklistItemId (UUID of the checklist row) and isChecked (true/false).",
    input_schema: {
      type: "object",
      properties: {
        checklistItemId: { type: "string", description: "UUID of admin_task_checklist row" },
        isChecked: { type: "boolean" },
      },
      required: ["checklistItemId", "isChecked"],
    },
  },
  {
    name: "removeChecklistItem",
    description: "Remove a checklist item.",
    input_schema: {
      type: "object",
      properties: { checklistItemId: { type: "string" } },
      required: ["checklistItemId"],
    },
  },
  {
    name: "addTaskNote",
    description: "Add a timestamped note to a task.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        content: { type: "string" },
      },
      required: ["taskId", "content"],
    },
  },
  {
    name: "logDeployment",
    description: "Log a deployment. Status: success, failed, building.",
    input_schema: {
      type: "object",
      properties: {
        commitMessage: { type: "string" },
        status: { type: "string", enum: DEPLOY_STATUSES },
        vercelUrl: { type: "string" },
        notes: { type: "string" },
      },
      required: ["status"],
    },
  },
  {
    name: "savePrompt",
    description: "Save a Cursor prompt to the prompt library. Status: not_sent, sent, completed, failed.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        promptText: { type: "string" },
        taskId: { type: "string" },
        status: { type: "string", enum: PROMPT_STATUSES },
      },
      required: ["title", "promptText"],
    },
  },
  {
    name: "updatePromptStatus",
    description: "Update a prompt's status.",
    input_schema: {
      type: "object",
      properties: {
        promptId: { type: "string" },
        status: { type: "string", enum: PROMPT_STATUSES },
      },
      required: ["promptId", "status"],
    },
  },
  {
    name: "getTaskBoard",
    description: "Get all tasks grouped by status (backlog, in_progress, testing, done, bugs). Includes checklist progress per task.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "getTask",
    description: "Get a single task with full checklist and notes.",
    input_schema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
  {
    name: "getTasksByPriority",
    description: "Get tasks filtered by priority (critical, high, medium, low).",
    input_schema: {
      type: "object",
      properties: { priority: { type: "string", enum: PRIORITIES } },
      required: ["priority"],
    },
  },
  {
    name: "searchTasks",
    description: "Search tasks by title or description.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "getDeployments",
    description: "Get recent deployments.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "Max number to return (default 10)" } },
    },
  },
  {
    name: "getPrompts",
    description: "Get prompts, optionally filtered by status.",
    input_schema: {
      type: "object",
      properties: { status: { type: "string", enum: PROMPT_STATUSES } },
    },
  },
  // ─── Event Management Tools ──────────────────────────────────
  {
    name: "getEvents",
    description: "Get all events. Optionally filter by is_published status. Returns title, dates, venue, city, registration counts.",
    input_schema: {
      type: "object",
      properties: {
        published_only: { type: "boolean", description: "If true, only return published events" },
        limit: { type: "number", description: "Max events to return (default 20)" },
      },
    },
  },
  {
    name: "getEventDetail",
    description: "Get full details of a single event including ticket types, registrations count, and sponsors.",
    input_schema: {
      type: "object",
      properties: { eventId: { type: "string", description: "UUID of the event" } },
      required: ["eventId"],
    },
  },
  {
    name: "updateEvent",
    description: "Update event details. Provide eventId and only the fields to change: title, description, venue, city, state, address, start_date, end_date, capacity, is_published.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "UUID of the event" },
        fields: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            venue: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            address: { type: "string" },
            start_date: { type: "string", description: "ISO date string" },
            end_date: { type: "string", description: "ISO date string" },
            capacity: { type: "number" },
            is_published: { type: "boolean" },
          },
        },
      },
      required: ["eventId", "fields"],
    },
  },
  {
    name: "getEventRegistrations",
    description: "Get registration/order data for an event. Returns count and recent registrations.",
    input_schema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "UUID of the event" },
        limit: { type: "number", description: "Max registrations to return (default 20)" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "getSponsors",
    description: "Get all sponsors. Optionally filter by organization.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max sponsors to return (default 20)" },
      },
    },
  },
  {
    name: "searchCreatorsForEvent",
    description: "Search the verified creator directory for creators matching an event or campaign. Returns profiles with name, handle, branch, followers, avg likes, bio, tags, and profile URL. Use this when a user asks for creator/influencer recommendations, speaker suggestions, or partner ideas for an event. After receiving results, format them as a strategy brief with a Recommended Creators section and a Quick GTM Strategy section.",
    input_schema: {
      type: "object",
      properties: {
        event_description: { type: "string", description: "Description of the event or campaign" },
        branch: { type: "string", description: "Military branch filter (Army, Navy, Air Force, Marines, Coast Guard, Space Force)" },
        status: { type: "string", description: "Military status filter (Active Duty, Veteran, Spouse, Guard/Reserve)" },
        min_followers: { type: "number", description: "Minimum follower count" },
        keywords: { type: "array", items: { type: "string" }, description: "Keywords to match against bio, tags, and category" },
        limit: { type: "number", description: "Max creators to return (default 10, max 25)" },
      },
      required: ["event_description"],
    },
  },
  {
    name: "saveStrategyBrief",
    description: "Save a strategy brief (creator recommendations + GTM plan) and generate a shareable public URL. Call this when the user wants to share or save a strategy brief.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Brief title (event or campaign name)" },
        event_description: { type: "string", description: "The event or campaign description" },
        content: { type: "string", description: "The full markdown content of the strategy brief including recommended creators and GTM strategy" },
        creator_handles: { type: "array", items: { type: "string" }, description: "Handles of recommended creators" },
      },
      required: ["title", "content"],
    },
  },
];

export async function executeAdminTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "createTask": {
      const title = args.title as string;
      const status = (args.status as string) ?? "backlog";
      const priority = (args.priority as string) ?? "medium";
      const category = (args.category as string) ?? "feature";
      const description = (args.description as string) ?? null;
      const checklist = (args.checklist as string[]) ?? [];
      const { data: task, error } = await supabase
        .from("admin_tasks")
        .insert({
          title,
          description,
          status,
          priority,
          category,
          assignee: "Andrew",
        })
        .select("id")
        .single();
      if (error) return { result: `Error: ${error.message}` };
      let ord = 0;
      for (const label of checklist) {
        await supabase.from("admin_task_checklist").insert({
          task_id: (task as { id: string }).id,
          label,
          sort_order: ord++,
        });
      }
      const confirmation = checklist.length
        ? `Created new task: "${title}" in ${status} with ${checklist.length} checklist items`
        : `Created new task: "${title}" in ${status}`;
      return { result: `Created task "${title}" (${(task as { id: string }).id}) in ${status}.`, confirmation };
    }

    case "updateTask": {
      const taskId = args.taskId as string;
      const fields = args.fields as Record<string, unknown>;
      const { data: before } = await supabase.from("admin_tasks").select("title, status").eq("id", taskId).single();
      const title = (before as { title?: string } | null)?.title ?? "Task";
      const { error } = await supabase.from("admin_tasks").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", taskId);
      if (error) return { result: `Error: ${error.message}` };
      const parts: string[] = [];
      if (fields.status) parts.push(`Moved '${title}' to ${fields.status}`);
      if (fields.priority) parts.push(`Set priority to ${fields.priority}`);
      if (fields.title) parts.push(`Renamed to "${fields.title}"`);
      return { result: `Updated task. ${parts.join(". ")}`, confirmation: parts.length ? `✅ ${parts.join("; ")}` : `✅ Updated '${title}'` };
    }

    case "deleteTask": {
      const taskId = args.taskId as string;
      const title = await getTaskTitle(taskId);
      const { error } = await supabase.from("admin_tasks").delete().eq("id", taskId);
      if (error) return { result: `Error: ${error.message}` };
      return { result: `Deleted task "${title}".`, confirmation: `✅ Deleted task '${title}'` };
    }

    case "addChecklistItem": {
      const taskId = args.taskId as string;
      const label = args.label as string;
      const title = await getTaskTitle(taskId);
      const { data: max } = await supabase.from("admin_task_checklist").select("sort_order").eq("task_id", taskId).order("sort_order", { ascending: false }).limit(1).single();
      const sortOrder = ((max as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
      const { error } = await supabase.from("admin_task_checklist").insert({ task_id: taskId, label, sort_order: sortOrder });
      if (error) return { result: `Error: ${error.message}` };
      return { result: `Added checklist item "${label}" to ${title}.`, confirmation: `✅ Added "${label}" to ${title}` };
    }

    case "toggleChecklistItem": {
      const checklistItemId = args.checklistItemId as string;
      const isChecked = args.isChecked as boolean;
      const label = await getChecklistItemLabel(checklistItemId);
      const { data: row } = await supabase.from("admin_task_checklist").select("task_id").eq("id", checklistItemId).single();
      const taskTitle = row ? await getTaskTitle((row as { task_id: string }).task_id) : "Task";
      const { error } = await supabase.from("admin_task_checklist").update({ is_checked: isChecked }).eq("id", checklistItemId);
      if (error) return { result: `Error: ${error.message}` };
      const verb = isChecked ? "Checked off" : "Unchecked";
      return { result: `${verb} "${label}".`, confirmation: `✅ ${verb} '${label}' on ${taskTitle}` };
    }

    case "removeChecklistItem": {
      const checklistItemId = args.checklistItemId as string;
      const label = await getChecklistItemLabel(checklistItemId);
      const { error } = await supabase.from("admin_task_checklist").delete().eq("id", checklistItemId);
      if (error) return { result: `Error: ${error.message}` };
      return { result: `Removed checklist item "${label}".`, confirmation: `✅ Removed '${label}'` };
    }

    case "addTaskNote": {
      const taskId = args.taskId as string;
      const content = args.content as string;
      const title = await getTaskTitle(taskId);
      const { error } = await supabase.from("admin_task_notes").insert({ task_id: taskId, content });
      if (error) return { result: `Error: ${error.message}` };
      return { result: `Added note to ${title}.`, confirmation: `✅ Added note to ${title}` };
    }

    case "logDeployment": {
      const commitMessage = (args.commitMessage as string) ?? null;
      const status = (args.status as string) ?? "success";
      const vercelUrl = (args.vercelUrl as string) ?? null;
      const notes = (args.notes as string) ?? null;
      const { error } = await supabase.from("admin_deployments").insert({ commit_message: commitMessage, status, vercel_url: vercelUrl, notes });
      if (error) return { result: `Error: ${error.message}` };
      const confirmation = `✅ Logged deployment: ${status}${commitMessage ? ` — ${commitMessage}` : ""}`;
      return { result: `Logged deployment (${status}).`, confirmation };
    }

    case "savePrompt": {
      const title = args.title as string;
      const promptText = args.promptText as string;
      const taskId = (args.taskId as string) || null;
      const status = (args.status as string) ?? "not_sent";
      const { error } = await supabase.from("admin_prompts").insert({ title, prompt_text: promptText, task_id: taskId, status });
      if (error) return { result: `Error: ${error.message}` };
      return { result: `Saved prompt "${title}" to library.`, confirmation: `✅ Saved prompt: ${title}` };
    }

    case "updatePromptStatus": {
      const promptId = args.promptId as string;
      const status = args.status as string;
      const { error } = await supabase.from("admin_prompts").update({ status }).eq("id", promptId);
      if (error) return { result: `Error: ${error.message}` };
      return { result: `Updated prompt status to ${status}.`, confirmation: `✅ Prompt status set to ${status}` };
    }

    case "getTaskBoard": {
      const { data: tasks } = await supabase.from("admin_tasks").select("id, title, status, priority, category, created_at").order("sort_order").order("created_at");
      const { data: allItems } = await supabase.from("admin_task_checklist").select("task_id, is_checked");
      const byTask = (allItems ?? []).reduce((acc: Record<string, { done: number; total: number }>, i: { task_id: string; is_checked: boolean }) => {
        const id = i.task_id;
        if (!acc[id]) acc[id] = { done: 0, total: 0 };
        acc[id].total++;
        if (i.is_checked) acc[id].done++;
        return acc;
      }, {});
      const grouped = (tasks ?? []).reduce((acc: Record<string, unknown[]>, t: { status: string; [k: string]: unknown }) => {
        const status = t.status;
        if (!acc[status]) acc[status] = [];
        const progress = byTask[(t as { id: string }).id];
        acc[status].push({ ...t, checklist: progress ? `${progress.done}/${progress.total}` : "0/0" });
        return acc;
      }, {});
      return { result: JSON.stringify(grouped, null, 2) };
    }

    case "getTask": {
      const taskId = args.taskId as string;
      const { data: task } = await supabase.from("admin_tasks").select("*").eq("id", taskId).single();
      if (!task) return { result: "Task not found." };
      const { data: items } = await supabase.from("admin_task_checklist").select("id, label, is_checked, sort_order").eq("task_id", taskId).order("sort_order");
      const { data: notes } = await supabase.from("admin_task_notes").select("content, created_at").eq("task_id", taskId).order("created_at", { ascending: false });
      return { result: JSON.stringify({ task, checklist: items ?? [], notes: notes ?? [] }, null, 2) };
    }

    case "getTasksByPriority": {
      const priority = args.priority as string;
      const { data } = await supabase.from("admin_tasks").select("id, title, status, priority, category").eq("priority", priority).order("created_at");
      return { result: JSON.stringify(data ?? [], null, 2) };
    }

    case "searchTasks": {
      const query = (args.query as string) ?? "";
      const { data } = await supabase.from("admin_tasks").select("id, title, status, priority, description").or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      return { result: JSON.stringify(data ?? [], null, 2) };
    }

    case "getDeployments": {
      const limit = Math.min(Number(args.limit) || 10, 50);
      const { data } = await supabase.from("admin_deployments").select("*").order("deployed_at", { ascending: false }).limit(limit);
      return { result: JSON.stringify(data ?? [], null, 2) };
    }

    case "getPrompts": {
      const status = args.status as string | undefined;
      let q = supabase.from("admin_prompts").select("id, title, status, task_id, created_at").order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data } = await q.limit(20);
      return { result: JSON.stringify(data ?? [], null, 2) };
    }

    // ─── Event Management Tool Executors ──────────────────────
    case "getEvents": {
      const publishedOnly = args.published_only as boolean | undefined;
      const limit = Math.min(Number(args.limit) || 20, 50);
      let q = supabase.from("events").select("id, title, venue, city, state, start_date, end_date, is_published, capacity, slug, created_at").order("start_date", { ascending: true }).limit(limit);
      if (publishedOnly) q = q.eq("is_published", true);
      const { data: events } = await q;
      if (!events || events.length === 0) return { result: "No events found." };
      // Get registration counts per event
      const eventIds = (events as { id: string }[]).map((e) => e.id);
      const { data: orders } = await supabase.from("orders").select("event_id, id").in("event_id", eventIds);
      const regCounts: Record<string, number> = {};
      for (const o of (orders ?? []) as { event_id: string }[]) {
        regCounts[o.event_id] = (regCounts[o.event_id] || 0) + 1;
      }
      const enriched = (events as Record<string, unknown>[]).map((e) => ({
        ...e,
        registrations: regCounts[(e as { id: string }).id] || 0,
        engagement_365: "Active community — metrics building",
      }));
      return { result: JSON.stringify(enriched, null, 2) };
    }

    case "getEventDetail": {
      const eventId = args.eventId as string;
      const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (!event) return { result: "Event not found." };
      const { data: tickets } = await supabase.from("ticket_types").select("id, name, price, quantity, quantity_sold, is_active").eq("event_id", eventId);
      const { data: orders } = await supabase.from("orders").select("id, status, total, created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(10);
      const { data: deals } = await supabase.from("sponsorship_deals").select("id, sponsor_id, amount, status").eq("event_id", eventId);
      const sponsorIds = (deals ?? []).map((d: { sponsor_id: string }) => d.sponsor_id);
      let sponsors: unknown[] = [];
      if (sponsorIds.length > 0) {
        const { data: s } = await supabase.from("sponsors").select("id, name, logo_url").in("id", sponsorIds);
        sponsors = s ?? [];
      }
      return {
        result: JSON.stringify({
          event,
          ticket_types: tickets ?? [],
          recent_orders: orders ?? [],
          sponsorship_deals: deals ?? [],
          sponsors,
          engagement_365: "Year-round community active — ongoing engagement metrics building",
        }, null, 2),
      };
    }

    case "updateEvent": {
      const eventId = args.eventId as string;
      const fields = args.fields as Record<string, unknown>;
      const { data: before } = await supabase.from("events").select("title").eq("id", eventId).single();
      const title = (before as { title?: string } | null)?.title ?? "Event";
      const { error } = await supabase.from("events").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", eventId);
      if (error) return { result: `Error: ${error.message}` };
      const changes = Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
      return { result: `Updated event "${title}". Changes: ${changes}`, confirmation: `Updated '${title}': ${changes}` };
    }

    case "getEventRegistrations": {
      const eventId = args.eventId as string;
      const limit = Math.min(Number(args.limit) || 20, 50);
      const { data: orders, count } = await supabase.from("orders").select("id, status, total, quantity, created_at, attendee_info", { count: "exact" }).eq("event_id", eventId).order("created_at", { ascending: false }).limit(limit);
      return { result: JSON.stringify({ total_registrations: count ?? 0, recent: orders ?? [] }, null, 2) };
    }

    case "getSponsors": {
      const limit = Math.min(Number(args.limit) || 20, 50);
      const { data } = await supabase.from("sponsors").select("id, name, contact_name, contact_email, website, industries, logo_url, created_at").order("created_at", { ascending: false }).limit(limit);
      return { result: JSON.stringify(data ?? [], null, 2) };
    }

    case "searchCreatorsForEvent": {
      const eventDescription = args.event_description as string;
      const branch = args.branch as string | undefined;
      const status = args.status as string | undefined;
      const minFollowers = (args.min_followers as number) ?? 0;
      const keywords = (args.keywords as string[]) ?? [];
      const limit = Math.min(Number(args.limit) || 10, 25);

      let q = (supabase as any)
        .from("directory_members")
        .select("id, creator_name, creator_handle, avatar_url, ic_avatar_url, follower_count, avg_likes, engagement_rate, branch, status, bio, category, tags, platforms, platform_urls, profile_slug")
        .eq("approved", true)
        .order("follower_count", { ascending: false })
        .limit(limit * 3); // over-fetch for client-side filtering

      if (minFollowers > 0) q = q.gte("follower_count", minFollowers);
      if (branch) q = q.ilike("branch", `%${branch}%`);
      if (status) q = q.ilike("status", `%${status}%`);

      const { data: creators, error } = await q;
      if (error) return { result: `Error searching creators: ${error.message}` };
      if (!creators || creators.length === 0) return { result: "No creators found matching those criteria. Try broadening your filters." };

      let filtered = creators as Record<string, any>[];
      if (keywords.length > 0) {
        const kwFiltered = filtered.filter((c) => {
          const searchText = [
            (c.bio as string) ?? "",
            (c.category as string) ?? "",
            ...(Array.isArray(c.tags) ? (c.tags as string[]) : []),
          ].join(" ").toLowerCase();
          return keywords.some((kw) => searchText.includes(kw.toLowerCase()));
        });
        if (kwFiltered.length > 0) filtered = kwFiltered;
      }

      const result = {
        event_description: eventDescription,
        total_found: filtered.length,
        creators: filtered.slice(0, limit).map((c) => ({
          name: c.creator_name ?? c.creator_handle,
          handle: c.creator_handle,
          branch: c.branch ?? "Unknown",
          status: c.status ?? "Unknown",
          followers: c.follower_count ?? 0,
          avg_likes: c.avg_likes ?? null,
          engagement_rate: c.engagement_rate ?? null,
          bio: c.bio ? (c.bio as string).slice(0, 200) : null,
          category: c.category,
          tags: c.tags,
          platforms: c.platforms,
          profile_url: c.profile_slug ? `/creators/${c.profile_slug}` : `/creators/${c.creator_handle}`,
        })),
      };

      return { result: JSON.stringify(result, null, 2) };
    }

    case "saveStrategyBrief": {
      const title = args.title as string;
      const eventDescription = (args.event_description as string) ?? "";
      const content = args.content as string;
      const creatorHandles = (args.creator_handles as string[]) ?? [];

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("ai_strategy_briefs")
        .insert({
          title,
          event_description: eventDescription,
          content,
          creator_handles: creatorHandles,
          created_by: userData?.user?.id ?? null,
        })
        .select("id")
        .single();

      if (error) return { result: `Error saving brief: ${error.message}` };

      const briefId = (data as { id: string }).id;
      const shareUrl = `${window.location.origin}/strategy/${briefId}`;

      return {
        result: `Strategy brief saved successfully. Shareable URL: ${shareUrl}`,
        confirmation: `Strategy brief "${title}" saved — ${shareUrl}`,
      };
    }

    default:
      return { result: `Unknown tool: ${name}` };
  }
}

/** Build context string from current board and deployments for system prompt. */
export async function getAdminChatContext(): Promise<string> {
  const [tasksRes, deployRes] = await Promise.all([
    supabase.from("admin_tasks").select("id, title, status, priority, category, created_at").order("sort_order").order("created_at"),
    supabase.from("admin_deployments").select("deployed_at, status, commit_message").order("deployed_at", { ascending: false }).limit(5),
  ]);
  const tasks = (tasksRes.data ?? []) as { id: string; title: string; status: string; priority: string; category: string }[];
  const { data: items } = await supabase.from("admin_task_checklist").select("task_id, is_checked");
  const byTask = (items ?? []).reduce((acc: Record<string, { done: number; total: number }>, i: { task_id: string; is_checked: boolean }) => {
    const id = i.task_id;
    if (!acc[id]) acc[id] = { done: 0, total: 0 };
    acc[id].total++;
    if (i.is_checked) acc[id].done++;
    return acc;
  }, {});
  const byStatus = tasks.reduce((acc: Record<string, string[]>, t) => {
    if (!acc[t.status]) acc[t.status] = [];
    const p = byTask[t.id];
    acc[t.status].push(`${t.title} (${t.priority})${p ? ` [${p.done}/${p.total}]` : ""}`);
    return acc;
  }, {});
  const deployments = (deployRes.data ?? []) as { deployed_at: string; status: string; commit_message: string | null }[];
  const deployLines = deployments.map((d) => `- ${d.deployed_at}: ${d.status} ${d.commit_message ?? ""}`).join("\n");
  return `
CURRENT TASK BOARD (as of now):
${Object.entries(byStatus)
  .map(([status, list]) => `${status}:\n${list.map((l) => `  - ${l}`).join("\n")}`)
  .join("\n\n")}

RECENT DEPLOYMENTS:
${deployLines || "(none)"}
`;
}
