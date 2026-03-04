importScripts("lib/supabase.min.js");

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://zribaooztsaatufbulku.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE"; // Replace with NEXT_PUBLIC_SUPABASE_ANON_KEY

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let channel = null;

// ── Notification helper ─────────────────────────────────────────────────────
async function notify(title, message, tag) {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  if (!enabled) return;

  chrome.notifications.create(tag + "_" + Date.now(), {
    type: "basic",
    iconUrl: "icon128.png",
    title,
    message,
    priority: 2,
  });

  // Store in history for popup
  const { history = [] } = await chrome.storage.local.get("history");
  history.unshift({ title, message, time: new Date().toISOString() });
  if (history.length > 100) history.length = 100;
  await chrome.storage.local.set({ history });
}

// ── Subscribe to Supabase Realtime ──────────────────────────────────────────
function subscribe() {
  if (channel) {
    sb.removeChannel(channel);
  }

  channel = sb
    .channel("prospectus-activity")

    // 1) New visitor accesses the prospectus
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "prospectus_access_log" },
      (payload) => {
        const { email } = payload.new;
        notify(
          "\ud83d\udd11 New Visitor",
          `${email || "Someone"} just opened the prospectus`,
          "access"
        );
      }
    )

    // 2) Tab viewed
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "prospectus_tab_views" },
      (payload) => {
        const { email, tab_name } = payload.new;
        notify(
          "\ud83d\udc41\ufe0f Prospectus Viewed",
          `${email || "Someone"} just opened the ${tab_name || "a"} tab`,
          "tab"
        );
      }
    )

    // 3) Video started
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "prospectus_video_views" },
      (payload) => {
        if (!payload.new.video_started) return;
        const { email, tab_name } = payload.new;
        notify(
          "\u25b6\ufe0f Video Playing",
          `${email || "Someone"} started watching the ${tab_name || ""} video`,
          "video"
        );
      }
    )

    .subscribe((status) => {
      chrome.storage.local.set({ connectionStatus: status });
      console.log("[MilCrunch] Realtime status:", status);
    });
}

// ── Keep service worker alive with alarms ───────────────────────────────────
chrome.alarms.create("keepalive", { periodInMinutes: 0.4 }); // ~24 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepalive") {
    // Reconnect if channel dropped
    if (!channel || channel.state !== "joined") {
      console.log("[MilCrunch] Reconnecting realtime...");
      subscribe();
    }
  }
});

// ── Startup ─────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true, history: [], connectionStatus: "disconnected" });
  subscribe();
});

// Also subscribe when service worker wakes up
subscribe();
