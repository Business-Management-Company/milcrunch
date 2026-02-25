/**
 * Shared AI agent context — queries Supabase for real-time platform data
 * and returns a formatted string for injection into any AI system prompt.
 *
 * Used by: FloatingAdminChat, EventAIAssistant, SummaryDashboard, AdminChat
 */
import { supabase } from "@/integrations/supabase/client";

export async function getAgentContext(): Promise<string> {
  const now = new Date().toISOString();

  // Run all queries in parallel
  const [
    eventsRes,
    creatorsRes,
    listsRes,
    listItemsRes,
    directoriesRes,
    dirMembersRes,
    campaignsRes,
    ordersRes,
    sponsorsRes,
  ] = await Promise.all([
    // Events
    supabase
      .from("events")
      .select("id, title, start_date, end_date, venue, city, state, capacity, is_published, slug")
      .order("start_date", { ascending: true })
      .limit(30),
    // Creators (from directory_members)
    supabase
      .from("directory_members")
      .select("id, creator_name, creator_handle, platform, branch, follower_count, engagement_rate, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    // Lists
    supabase
      .from("influencer_lists")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    // List items (count per list)
    supabase
      .from("influencer_list_items")
      .select("list_id"),
    // Directories
    supabase
      .from("directories")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(20),
    // Directory member counts
    supabase
      .from("directory_members")
      .select("directory_id"),
    // Email campaigns
    supabase
      .from("email_campaigns")
      .select("id, name, status, subject, send_count, open_count, click_count, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    // Orders/registrations
    supabase
      .from("orders")
      .select("id, event_id, status, total, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    // Sponsors
    supabase
      .from("sponsors")
      .select("id, name, contact_name, industries")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // --- Events ---
  const events = (eventsRes.data ?? []) as {
    id: string; title: string; start_date: string | null; end_date: string | null;
    venue: string | null; city: string | null; state: string | null;
    capacity: number | null; is_published: boolean; slug: string | null;
  }[];

  const orders = (ordersRes.data ?? []) as { id: string; event_id: string; status: string; total: number }[];
  const regByEvent: Record<string, number> = {};
  for (const o of orders) {
    regByEvent[o.event_id] = (regByEvent[o.event_id] || 0) + 1;
  }

  const upcomingEvents = events.filter(e => e.start_date && new Date(e.start_date) >= new Date());
  const pastEvents = events.filter(e => e.start_date && new Date(e.start_date) < new Date());

  const eventsBlock = upcomingEvents.length > 0
    ? upcomingEvents.map(e => {
        const date = e.start_date ? new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD";
        const loc = [e.venue, e.city, e.state].filter(Boolean).join(", ") || "TBD";
        const regs = regByEvent[e.id] || 0;
        const status = e.is_published ? "Published" : "Draft";
        return `  - ${e.title} | ${date} | ${loc} | ${regs} registrations | ${status} | Capacity: ${e.capacity ?? "TBD"}`;
      }).join("\n")
    : "  No upcoming events.";

  // --- Creators ---
  const creators = (creatorsRes.data ?? []) as {
    id: string; creator_name: string; creator_handle: string; platform: string;
    branch: string | null; follower_count: number | null; engagement_rate: number | null; created_at: string;
  }[];
  const totalCreators = creators.length;
  const recentCreators = creators.slice(0, 5);
  const topByFollowers = [...creators]
    .filter(c => c.follower_count && c.follower_count > 0)
    .sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
    .slice(0, 5);

  const creatorsBlock = totalCreators > 0
    ? [
        `  Total creators in directories: ${totalCreators}`,
        `  Recent additions: ${recentCreators.map(c => `${c.creator_name} (@${c.creator_handle}${c.branch ? `, ${c.branch}` : ""})`).join(", ")}`,
        topByFollowers.length > 0
          ? `  Top by followers: ${topByFollowers.map(c => `${c.creator_name} (${formatNum(c.follower_count!)} followers)`).join(", ")}`
          : "",
      ].filter(Boolean).join("\n")
    : "  No creators in directories yet.";

  // --- Lists ---
  const lists = (listsRes.data ?? []) as { id: string; name: string; created_at: string }[];
  const listItems = (listItemsRes.data ?? []) as { list_id: string }[];
  const listCounts: Record<string, number> = {};
  for (const item of listItems) {
    listCounts[item.list_id] = (listCounts[item.list_id] || 0) + 1;
  }
  const listsBlock = lists.length > 0
    ? lists.map(l => `  - ${l.name}: ${listCounts[l.id] || 0} creators`).join("\n")
    : "  No lists created yet.";

  // --- Directories ---
  const directories = (directoriesRes.data ?? []) as { id: string; name: string }[];
  const dirMembers = (dirMembersRes.data ?? []) as { directory_id: string }[];
  const dirCounts: Record<string, number> = {};
  for (const m of dirMembers) {
    dirCounts[m.directory_id] = (dirCounts[m.directory_id] || 0) + 1;
  }
  const dirBlock = directories.length > 0
    ? directories.map(d => `  - ${d.name}: ${dirCounts[d.id] || 0} members`).join("\n")
    : "  No directories created yet.";

  // --- Email campaigns ---
  const campaigns = (campaignsRes.data ?? []) as {
    id: string; name: string; status: string; subject: string;
    send_count: number | null; open_count: number | null; click_count: number | null;
  }[];
  const campaignsBlock = campaigns.length > 0
    ? campaigns.map(c => {
        const openRate = c.send_count && c.send_count > 0 && c.open_count != null ? `${Math.round((c.open_count / c.send_count) * 100)}% open` : "";
        const clickRate = c.send_count && c.send_count > 0 && c.click_count != null ? `${Math.round((c.click_count / c.send_count) * 100)}% click` : "";
        const stats = [c.send_count ? `${c.send_count} sent` : "", openRate, clickRate].filter(Boolean).join(", ");
        return `  - ${c.name || c.subject}: ${c.status}${stats ? ` | ${stats}` : ""}`;
      }).join("\n")
    : "  No email campaigns yet.";

  // --- Registrations summary ---
  const totalRegistrations = orders.length;
  const regSummary = upcomingEvents.length > 0
    ? upcomingEvents
        .filter(e => regByEvent[e.id])
        .map(e => `  - ${e.title}: ${regByEvent[e.id]} registrations`)
        .join("\n") || "  No registrations for upcoming events yet."
    : "  No upcoming events.";

  // --- Sponsors ---
  const sponsors = (sponsorsRes.data ?? []) as { id: string; name: string; contact_name: string | null; industries: string | null }[];
  const sponsorsBlock = sponsors.length > 0
    ? sponsors.map(s => `  - ${s.name}${s.contact_name ? ` (${s.contact_name})` : ""}${s.industries ? ` — ${s.industries}` : ""}`).join("\n")
    : "  No sponsors yet.";

  return `
=== MILCRUNCH PLATFORM DATA (real-time snapshot) ===

UPCOMING EVENTS (${upcomingEvents.length}):
${eventsBlock}

PAST EVENTS: ${pastEvents.length} total

CREATORS:
${creatorsBlock}

LISTS (${lists.length}):
${listsBlock}

DIRECTORIES (${directories.length}):
${dirBlock}

EMAIL CAMPAIGNS (${campaigns.length}):
${campaignsBlock}

REGISTRATIONS:
  Total: ${totalRegistrations}
${regSummary}

SPONSORS (${sponsors.length}):
${sponsorsBlock}

IMPORTANT: You have FULL access to all platform data above. NEVER say "I don't have access to real-time data" or "I can't check the database." Answer directly with specific numbers and names from this data. If something is empty, say so directly (e.g., "You have no upcoming events yet").
`.trim();
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
