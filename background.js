// ClearShot — background service worker
// Orchestrates the capture: the content script handles scrolling/measuring,
// this worker takes each viewport snapshot (the only place captureVisibleTab
// is allowed to run) and hands the result off to the editor tab.

const CAPTURE_INTERVAL_MS = 550; // stay under Chrome's captureVisibleTab rate limit
let lastCaptureAt = 0;
let capturing = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttledCapture(windowId) {
  const now = Date.now();
  const wait = Math.max(0, CAPTURE_INTERVAL_MS - (now - lastCaptureAt));
  if (wait > 0) await delay(wait);
  lastCaptureAt = Date.now();
  return chrome.tabs.captureVisibleTab(windowId, { format: "png" });
}

async function flashBadge(tabId, text, color) {
  try {
    await chrome.action.setBadgeText({ tabId, text });
    if (color) await chrome.action.setBadgeBackgroundColor({ tabId, color });
  } catch (e) {
    /* tab may be gone */
  }
}

function clearBadgeSoon(tabId, ms) {
  setTimeout(() => flashBadge(tabId, ""), ms);
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  const url = tab.url || "";
  // Can't inject into chrome://, the Web Store, or other privileged pages.
  if (!/^https?:|^file:/.test(url)) {
    await flashBadge(tab.id, "✕", "#dc2626");
    clearBadgeSoon(tab.id, 2500);
    return;
  }
  if (capturing) return;
  capturing = true;
  await flashBadge(tab.id, "•••", "#4f46e5");
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["capture-content.js"],
    });
  } catch (e) {
    capturing = false;
    await flashBadge(tab.id, "✕", "#dc2626");
    clearBadgeSoon(tab.id, 2500);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender.tab) return;

  if (msg.type === "CAPTURE_SEGMENT") {
    throttledCapture(sender.tab.windowId)
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the channel open for the async response
  }

  if (msg.type === "DONE") {
    finishCapture(sender.tab.id, msg.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === "FAILED") {
    capturing = false;
    flashBadge(sender.tab.id, "✕", "#dc2626");
    clearBadgeSoon(sender.tab.id, 2500);
    sendResponse({ ok: true });
    return true;
  }
});

async function finishCapture(tabId, payload) {
  const key = "shot_" + Date.now();
  await chrome.storage.local.set({ [key]: payload });

  // Only keep the latest capture so we never bloat local storage.
  const all = await chrome.storage.local.get(null);
  for (const k of Object.keys(all)) {
    if (k.startsWith("shot_") && k !== key) {
      await chrome.storage.local.remove(k);
    }
  }

  await chrome.tabs.create({
    url: chrome.runtime.getURL("editor.html") + "?k=" + encodeURIComponent(key),
  });

  await flashBadge(tabId, "");
  capturing = false;
}
