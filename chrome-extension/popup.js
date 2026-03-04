const feed = document.getElementById("feed");
const emptyState = document.getElementById("emptyState");
const statusBadge = document.getElementById("statusBadge");
const toggleEnabled = document.getElementById("toggleEnabled");
const clearBtn = document.getElementById("clearBtn");
const countLabel = document.getElementById("countLabel");

// ── Helpers ─────────────────────────────────────────────────────────────────
function iconForTitle(title) {
  if (title.includes("Video")) return "\u25b6\ufe0f";
  if (title.includes("Viewed")) return "\ud83d\udc41\ufe0f";
  if (title.includes("Visitor")) return "\ud83d\udd11";
  return "\ud83d\udd14";
}

function timeAgo(iso) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderEvent(item) {
  const div = document.createElement("div");
  div.className = "event";
  div.innerHTML = `
    <div class="event-icon">${iconForTitle(item.title)}</div>
    <div class="event-body">
      <div class="event-title">${item.title}</div>
      <div class="event-message" title="${item.message}">${item.message}</div>
    </div>
    <div class="event-time">${timeAgo(item.time)}</div>
  `;
  return div;
}

function renderFeed(history) {
  feed.innerHTML = "";
  if (!history || history.length === 0) {
    feed.appendChild(emptyState);
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    history.forEach((item) => feed.appendChild(renderEvent(item)));
  }
  countLabel.textContent = `${(history || []).length} event${(history || []).length !== 1 ? "s" : ""}`;
}

function updateStatus(status) {
  const label = status === "SUBSCRIBED" ? "connected" : status === "CLOSED" ? "disconnected" : "connecting";
  statusBadge.textContent = label;
  statusBadge.className = "badge " + label;
}

// ── Init ────────────────────────────────────────────────────────────────────
chrome.storage.local.get(["history", "enabled", "connectionStatus"], (data) => {
  renderFeed(data.history || []);
  toggleEnabled.checked = data.enabled !== false;
  updateStatus(data.connectionStatus || "connecting");
});

// Live updates while popup is open
chrome.storage.onChanged.addListener((changes) => {
  if (changes.history) renderFeed(changes.history.newValue || []);
  if (changes.connectionStatus) updateStatus(changes.connectionStatus.newValue);
});

// ── Controls ────────────────────────────────────────────────────────────────
toggleEnabled.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggleEnabled.checked });
});

clearBtn.addEventListener("click", () => {
  chrome.storage.local.set({ history: [] });
  renderFeed([]);
});
