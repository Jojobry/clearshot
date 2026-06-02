// ClearShot — capture content script (injected on demand).
// Measures the page, scrolls it one viewport at a time, asks the background
// worker to snapshot each viewport, then ships the segments to the editor.

(async function () {
  const MAX_PAGE_HEIGHT = 30000; // CSS px safety cap (keeps the stitched canvas sane)

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function loadStickies() {
    try {
      return Array.prototype.slice
        .call(document.querySelectorAll("*"))
        .filter((el) => {
          const p = getComputedStyle(el).position;
          return p === "fixed" || p === "sticky";
        })
        .map((el) => ({ el, vis: el.style.visibility }));
    } catch (e) {
      return [];
    }
  }

  const dpr = window.devicePixelRatio || 1;
  const docEl = document.documentElement;
  const body = document.body;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  let totalHeight = Math.max(
    docEl.scrollHeight,
    body ? body.scrollHeight : 0,
    docEl.offsetHeight,
    body ? body.offsetHeight : 0,
    docEl.clientHeight
  );
  totalHeight = Math.min(totalHeight, MAX_PAGE_HEIGHT);

  const orig = {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    scrollBehavior: docEl.style.scrollBehavior,
  };
  docEl.style.scrollBehavior = "auto";

  // Fixed/sticky headers would otherwise repeat on every segment — hide them
  // after the first frame so the first capture keeps them and the rest don't.
  const stickies = loadStickies();
  const hideStickies = () =>
    stickies.forEach((s) => (s.el.style.visibility = "hidden"));
  const restoreStickies = () =>
    stickies.forEach((s) => (s.el.style.visibility = s.vis));

  const segments = [];
  const yOffsets = [];
  const steps = Math.max(1, Math.ceil(totalHeight / viewportHeight));

  function cleanup() {
    restoreStickies();
    window.scrollTo(orig.scrollX, orig.scrollY);
    docEl.style.scrollBehavior = orig.scrollBehavior;
  }

  try {
    for (let i = 0; i < steps; i++) {
      if (i === 1) hideStickies();
      window.scrollTo(0, i * viewportHeight);
      // First frame waits a touch longer to let lazy content settle.
      await delay(i === 0 ? 320 : 200);
      const resp = await chrome.runtime.sendMessage({ type: "CAPTURE_SEGMENT" });
      if (!resp || !resp.ok) {
        throw new Error(resp ? resp.error : "no response from background");
      }
      segments.push(resp.dataUrl);
      yOffsets.push(window.scrollY);
    }

    cleanup();

    await chrome.runtime.sendMessage({
      type: "DONE",
      payload: { segments, yOffsets, dpr, viewportWidth, viewportHeight, totalHeight },
    });
  } catch (e) {
    cleanup();
    chrome.runtime.sendMessage({ type: "FAILED", error: String(e) });
  }
})();
