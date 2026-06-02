# Chrome Web Store listing — copy & checklist

## Name options (pick one before publishing)

- **ClearShot — Full Page Screenshot & Markup** (current working name)
- **Snapfull — Full Page Screenshot**
- **Pagewhole — Full Page Capture + Markup**
- **Quietshot — Private Full Page Screenshots**

> Check the Web Store for an exact name clash before committing. Lead the name
> with the function ("Full Page Screenshot") — that's what people search.

## Short description (132 char max)

> Capture the whole scrolling page in one click, then annotate and copy.
> Free, private, no account, no tracking.

## Detailed description

**ClearShot does one thing and does it cleanly: full-page screenshots you can mark up.**

Click once (or press Alt+Shift+P) and ClearShot captures the entire scrolling
page — not just the visible part. Then an editor opens so you can draw arrows,
boxes, blur out anything private, and add text, before you copy to clipboard or
download a PNG.

✅ **Full-page capture** — the whole page, stitched into one image
✅ **Built-in markup** — arrow, box, blur, text, color & thickness
✅ **One-tap copy or download**
✅ **Keyboard shortcut** — Alt+Shift+P
✅ **Truly private** — everything happens on your device. No account, no sign-up,
   no servers, no analytics, no tracking.

**Why ClearShot?** Most screenshot extensions either bury the simple feature
under a paywall and an account wall, or quietly send your data somewhere.
ClearShot has no login, no cloud, and asks for the minimum permissions possible
(it can only see a tab at the moment you click it).

Perfect for bug reports, design feedback, saving receipts and articles,
documentation, and sharing anything you see online.

## Privacy practices (Web Store form answers)

- Does your item collect user data? **No.**
- Permissions justification:
  - `activeTab` — capture the current tab only when the user clicks the icon.
  - `scripting` — inject the scroll/measure script into the clicked tab.
  - `storage` / `unlimitedStorage` — pass the captured image to the editor tab
    locally; removed immediately after.
  - `clipboardWrite` — the "Copy" button.
- Remote code: **No** — all code ships in the package.
- Data is **not** sold, transferred, or used for anything; it never leaves the
  device. (Link to PRIVACY.md hosted somewhere public, e.g. a GitHub repo.)

## Assets to prepare

- [ ] 128×128 store icon (use `icons/icon128.png` or a designed version)
- [ ] At least 1 screenshot, 1280×800 or 640×400 (show the editor with markup)
- [ ] Optional small promo tile 440×280
- [ ] Public privacy policy URL (host `PRIVACY.md`)
- [ ] One category: **Productivity** or **Tools**

## Pre-submit checklist

- [ ] Final name chosen and clash-checked
- [ ] Version bumped in `manifest.json`
- [ ] Tested on a short page, a very long page, and a page with a sticky header
- [ ] Tested Copy + Download both work
- [ ] Icons render crisply at all sizes
- [ ] Zip the **contents** of the `clearshot` folder (not the folder itself)
