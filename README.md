# ClearShot — Full Page Screenshot & Markup

One click captures the **entire scrolling page**, then you annotate it (arrow,
box, blur, text) and copy or download. Free, private, no account, runs 100% in
your browser.

This is the "GoFullPage simplicity + Awesome Screenshot annotation − the bloat,
the account, and the tracking" play.

## How it works

1. Click the toolbar icon (or press **Alt+Shift+P**) on any page.
2. ClearShot scrolls the page, snapshots each viewport, and stitches them into
   one tall image.
3. An editor tab opens. Mark it up, then **Copy** or **Download PNG**.

No data ever leaves your machine — there is no server, no login, no analytics.

## Install for local testing (unpacked)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this `clearshot` folder.
4. Pin the icon, open any long page, and click it.

Works in Chrome, Edge, Brave, and other Chromium browsers.

## Files

| File                 | Role                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `manifest.json`      | MV3 manifest, permissions, keyboard command                       |
| `background.js`      | Service worker — takes each viewport snapshot, opens the editor   |
| `capture-content.js` | Injected on click — measures + scrolls the page, hides sticky bars|
| `editor.html/.css/.js` | Stitches segments, annotation tools, copy/download              |
| `icons/`             | Generated PNG icons (swap with your own designed set anytime)      |

## Permissions (and why each is here)

- **activeTab** — capture only the tab you clicked on, only when you click. No
  standing access to your browsing.
- **scripting** — inject the measure/scroll script into that tab on demand.
- **storage** + **unlimitedStorage** — hand the stitched image to the editor
  tab (cleared right after it loads).
- **clipboardWrite** — the "Copy" button.

No host permissions, no `tabs`, no network access. That minimal set is the
privacy pitch — say it loudly in the store listing.

## Known limits (v1) / next ideas

- Very long pages are capped at 30,000px tall for stability.
- Lazy-loaded images need a moment to appear; the per-segment wait handles most
  but very slow pages may need a longer delay.
- Future: crop tool, numbered-step badges, highlighter, save-to-clipboard of a
  selected region, "capture visible area only" mode.
