// extension/background.js
// Tracks active tab time per-domain, open tab counts, and optionally uploads daily summaries if user opts in.
// Designed for Manifest V3 service worker environment.

const STORAGE_KEY = "chromore_stats_v1";
const UPLOAD_URL = "http://localhost:3000/api/collect"; // change for deployed dashboard

// in-memory current active context
let lastState = {
  tabId: null,
  windowId: null,
  url: null,
  domain: null,
  ts: Date.now(),
  windowFocused: true
};

// util: extract domain from url
function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch (e) {
    return null;
  }
}

async function getStats() {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  return r[STORAGE_KEY] || {
    perDomain: {},     // domain -> {timeMs, visits, opens}
    totals: { timeMs: 0, snapshots: 0 },
    tabCounts: { last: 0 },
    lastUpdated: Date.now()
  };
}

async function saveStats(stats) {
  const payload = {};
  payload[STORAGE_KEY] = stats;
  await chrome.storage.local.set(payload);
}

// Attribute elapsed ms to a domain
async function addTimeToDomain(domain, elapsedMs) {
  if (!domain || elapsedMs <= 0) return;
  const stats = await getStats();
  stats.perDomain[domain] = stats.perDomain[domain] || { timeMs: 0, visits: 0, opens: 0 };
  stats.perDomain[domain].timeMs += elapsedMs;
  stats.totals.timeMs += elapsedMs;
  stats.lastUpdated = Date.now();
  await saveStats(stats);
}

// Called when we switch active tab/window or window focus changes
async function handleActiveChange(newTabId, newWindowId, newUrl, windowFocused = true) {
  const now = Date.now();

  // compute elapsed since last active timestamp
  const elapsed = now - (lastState.ts || now);

  // if there was a previously tracked domain and the window was focused, add time
  if (lastState.domain && lastState.windowFocused) {
    await addTimeToDomain(lastState.domain, elapsed);
  }

  // update lastState
  lastState = {
    tabId: newTabId,
    windowId: newWindowId,
    url: newUrl,
    domain: newUrl ? extractDomain(newUrl) : null,
    ts: now,
    windowFocused: windowFocused
  };

  // increment visits count for domain on a focus/tab-activate
  if (lastState.domain) {
    const stats = await getStats();
    stats.perDomain[lastState.domain] = stats.perDomain[lastState.domain] || { timeMs: 0, visits: 0, opens: 0 };
    stats.perDomain[lastState.domain].visits += 1;
    await saveStats(stats);
  }
}

// respond to active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handleActiveChange(tab.id, tab.windowId, tab.url, true);
  } catch (e) {
    handleActiveChange(null, activeInfo.windowId, null, true);
  }
});

// window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // no focused window - pause time attribution
    handleActiveChange(null, null, null, false);
    return;
  }
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    const tab = tabs && tabs[0];
    if (tab) {
      handleActiveChange(tab.id, windowId, tab.url, true);
    } else {
      handleActiveChange(null, windowId, null, true);
    }
  } catch (e) {
    handleActiveChange(null, windowId, null, true);
  }
});

// detect tab updates (e.g., navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.active) {
    handleActiveChange(tab.id, tab.windowId, tab.url, true);
  }
  // update opens count when a tab's URL is loaded (not necessarily active)
  if (changeInfo.status === "complete" && tab.url) {
    const domain = extractDomain(tab.url);
    if (!domain) return;
    const stats = await getStats();
    stats.perDomain[domain] = stats.perDomain[domain] || { timeMs: 0, visits: 0, opens: 0 };
    stats.perDomain[domain].opens += 1;
    await saveStats(stats);
  }
});

// track tab created/removed to keep tab count
async function updateTabCount() {
  const tabs = await chrome.tabs.query({});
  const stats = await getStats();
  stats.tabCounts = { last: tabs.length, snapshotTs: Date.now() };
  await saveStats(stats);
}
chrome.tabs.onCreated.addListener(updateTabCount);
chrome.tabs.onRemoved.addListener(updateTabCount);
chrome.tabs.onAttached.addListener(updateTabCount);
chrome.tabs.onDetached.addListener(updateTabCount);

// idle state (user away)
chrome.idle.onStateChanged.addListener((state) => {
  if (state === "idle" || state === "locked") {
    // attribute time up to now, then mark windowFocused false
    handleActiveChange(null, null, null, false);
  } else {
    // active again, refresh active tab
    chrome.windows.getLastFocused({ populate: true }, (win) => {
      if (!win) return;
      const tab = win.tabs && win.tabs.find(t => t.active);
      if (tab) handleActiveChange(tab.id, win.id, tab.url, true);
    });
  }
});

// periodic alarm to flush timestamp attribution in case worker is suspended
chrome.alarms.create("heartbeat", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "heartbeat") {
    const now = Date.now();
    const elapsed = now - (lastState.ts || now);
    if (lastState.domain && lastState.windowFocused && elapsed > 0) {
      addTimeToDomain(lastState.domain, Math.min(elapsed, 60_000));
      lastState.ts = now;
    }
    updateTabCount();
  }
});

// ---- Upload helpers ----
async function postSummaryIfOpted(stats) {
  try {
    const s = await chrome.storage.local.get(["chromore_opt_in", "chromore_client_id"]);
    if (!s.chromore_opt_in) {
      return false;
    }
    const perDomain = stats.perDomain || {};
    const arr = Object.entries(perDomain).map(([domain, d]) => ({ domain, timeMs: d.timeMs || 0, visits: d.visits||0, opens: d.opens||0 }));
    arr.sort((a,b) => b.timeMs - a.timeMs);
    const summary = {
      clientId: s.chromore_client_id || chrome.runtime.id,
      ts: Date.now(),
      totals: stats.totals || {},
      top: arr.slice(0, 50),
      rawMeta: { tabCounts: stats.tabCounts || {}, note: "domain-aggregates-only" }
    };

    await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats: summary })
    });
    console.log("Chromore: uploaded summary", summary.top?.length ?? 0);
    return true;
  } catch (err) {
    console.warn("Chromore: upload failed", err);
    return false;
  }
}

// trigger an upload now (used by popup button)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== "upload-now") return;
  (async () => {
    try {
      const statsObj = await getStats();
      const ok = await postSummaryIfOpted(statsObj);
      sendResponse({ ok });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  // return true to indicate we'll call sendResponse asynchronously
  return true;
});

// periodic upload: check once per hour; upload if local date rolled over since lastUploadDate
chrome.alarms.create("dailyUpload", { periodInMinutes: 60 });
let lastUploadDate = null;
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "dailyUpload") {
    const today = new Date().toISOString().slice(0,10);
    if (today !== lastUploadDate) {
      lastUploadDate = today;
      const statsObj = await getStats();
      postSummaryIfOpted(statsObj);
    }
  }
});

// initialization
chrome.runtime.onInstalled.addListener(async () => {
  await updateTabCount();
  // set initial active tab
  chrome.windows.getLastFocused({ populate: true }, (w) => {
    if (w) {
      const tab = w.tabs && w.tabs.find(t => t.active);
      if (tab) handleActiveChange(tab.id, w.id, tab.url, true);
    }
  });
});

// also attempt init when service worker starts
(async function initNow() {
  await updateTabCount();
  chrome.windows.getLastFocused({ populate: true }, (w) => {
    if (w) {
      const tab = w.tabs && w.tabs.find(t => t.active);
      if (tab) handleActiveChange(tab.id, w.id, tab.url, true);
    }
  });
})();
