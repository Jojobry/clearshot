// ClearShot — editor. Stitches the captured segments into one image, then
// lets the user mark it up (arrow / box / blur / text) and copy or download.

const params = new URLSearchParams(location.search);
const key = params.get("k");

const cv = document.getElementById("canvas");
const ctx = cv.getContext("2d");
const stage = document.getElementById("stage");
const statusEl = document.getElementById("status");
const toastEl = document.getElementById("toast");

let baseCanvas = null; // full-res stitched screenshot
let blurCanvas = null; // pre-blurred copy, sampled by the blur tool
let annotations = [];
let current = null; // shape being drawn right now
let tool = "arrow";
let color = "#ef4444";
let size = 6;
let dpr = 1;

init();

async function init() {
  if (!key) return showError("No capture found. Try capturing again.");
  const data = await chrome.storage.local.get(key);
  const payload = data[key];
  if (!payload) return showError("Capture expired. Please capture again.");

  await buildImage(payload);
  chrome.storage.local.remove(key); // free storage immediately
  statusEl.textContent = "";
  setupToolbar();
  setupCanvasEvents();
  setupKeyboard();
  render();
}

function showError(msg) {
  statusEl.textContent = msg;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function buildImage(p) {
  dpr = p.dpr || 1;
  const w = Math.round(p.viewportWidth * dpr);
  const h = Math.round(p.totalHeight * dpr);

  baseCanvas = document.createElement("canvas");
  baseCanvas.width = w;
  baseCanvas.height = h;
  const bctx = baseCanvas.getContext("2d");
  bctx.fillStyle = "#ffffff";
  bctx.fillRect(0, 0, w, h);

  for (let i = 0; i < p.segments.length; i++) {
    const img = await loadImage(p.segments[i]);
    bctx.drawImage(img, 0, Math.round(p.yOffsets[i] * dpr));
  }

  blurCanvas = document.createElement("canvas");
  blurCanvas.width = w;
  blurCanvas.height = h;
  const blctx = blurCanvas.getContext("2d");
  blctx.filter = "blur(" + Math.max(4, Math.round(8 * dpr)) + "px)";
  blctx.drawImage(baseCanvas, 0, 0);
  blctx.filter = "none";

  cv.width = w;
  cv.height = h;
}

/* ---------- toolbar ---------- */

function setupToolbar() {
  document.querySelectorAll("#tools .tbtn").forEach((btn) => {
    btn.addEventListener("click", () => setTool(btn.dataset.tool));
  });
  document.querySelectorAll("#colors .swatch").forEach((btn) => {
    btn.addEventListener("click", () => setColor(btn.dataset.color));
  });
  document.getElementById("size").addEventListener("input", (e) => {
    size = parseInt(e.target.value, 10);
  });
  document.getElementById("undo").addEventListener("click", undo);
  document.getElementById("clear").addEventListener("click", () => {
    annotations = [];
    render();
  });
  document.getElementById("copy").addEventListener("click", copyToClipboard);
  document.getElementById("download").addEventListener("click", downloadPng);

  setTool("arrow");
  setColor("#ef4444");
}

function setTool(t) {
  tool = t;
  document.querySelectorAll("#tools .tbtn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === t);
  });
}

function setColor(c) {
  color = c;
  document.querySelectorAll("#colors .swatch").forEach((b) => {
    b.classList.toggle("active", b.dataset.color === c);
  });
}

/* ---------- coordinate mapping ---------- */

function toCanvasCoords(e) {
  const rect = cv.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * cv.width) / rect.width,
    y: ((e.clientY - rect.top) * cv.height) / rect.height,
  };
}

/* ---------- drawing interaction ---------- */

function setupCanvasEvents() {
  cv.addEventListener("pointerdown", (e) => {
    if (tool === "text") return placeText(e);
    cv.setPointerCapture(e.pointerId);
    const { x, y } = toCanvasCoords(e);
    current = { type: tool, x, y, x2: x, y2: y, color, size };
    render();
  });

  cv.addEventListener("pointermove", (e) => {
    if (!current) return;
    const { x, y } = toCanvasCoords(e);
    current.x2 = x;
    current.y2 = y;
    render();
  });

  function commit() {
    if (!current) return;
    const big =
      Math.abs(current.x2 - current.x) > 3 ||
      Math.abs(current.y2 - current.y) > 3;
    if (big) annotations.push(current);
    current = null;
    render();
  }

  cv.addEventListener("pointerup", commit);
  cv.addEventListener("pointercancel", commit);
}

function placeText(e) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "text-input";
  input.placeholder = "Type, then Enter";
  input.style.left = e.clientX + "px";
  input.style.top = e.clientY + "px";
  input.style.color = color;
  const fontPx = Math.max(14, size * 2.6);
  input.style.fontSize = fontPx + "px";
  document.body.appendChild(input);
  // focus on the next frame so the placing click can't steal it back
  requestAnimationFrame(() => input.focus());

  const anchor = toCanvasCoords(e);

  function done() {
    const text = input.value.trim();
    if (text) {
      annotations.push({
        type: "text",
        x: anchor.x,
        y: anchor.y,
        text,
        color,
        size,
      });
    }
    if (input.parentNode) input.parentNode.removeChild(input);
    render();
  }

  input.addEventListener("blur", done);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      input.blur();
    } else if (ev.key === "Escape") {
      input.value = "";
      input.blur();
    }
  });
}

/* ---------- render ---------- */

function render() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(baseCanvas, 0, 0);
  annotations.forEach(drawShape);
  if (current) drawShape(current);
}

function drawShape(a) {
  const lw = a.size * dpr;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (a.type === "rect") {
    ctx.strokeStyle = a.color;
    ctx.lineWidth = lw;
    const x = Math.min(a.x, a.x2);
    const y = Math.min(a.y, a.y2);
    ctx.strokeRect(x, y, Math.abs(a.x2 - a.x), Math.abs(a.y2 - a.y));
    return;
  }

  if (a.type === "arrow") {
    drawArrow(a.x, a.y, a.x2, a.y2, a.color, lw);
    return;
  }

  if (a.type === "blur") {
    const x = Math.min(a.x, a.x2);
    const y = Math.min(a.y, a.y2);
    const w = Math.abs(a.x2 - a.x);
    const h = Math.abs(a.y2 - a.y);
    if (w > 0 && h > 0) ctx.drawImage(blurCanvas, x, y, w, h, x, y, w, h);
    return;
  }

  if (a.type === "text") {
    const fontPx = Math.max(14, a.size * 2.6) * dpr;
    ctx.font = fontPx + "px sans-serif";
    ctx.textBaseline = "top";
    // subtle outline for legibility on any background
    ctx.lineWidth = Math.max(2, fontPx * 0.12);
    ctx.strokeStyle = a.color === "#ffffff" ? "#111827" : "#ffffff";
    ctx.strokeText(a.text, a.x, a.y);
    ctx.fillStyle = a.color;
    ctx.fillText(a.text, a.x, a.y);
  }
}

function drawArrow(x1, y1, x2, y2, col, lw) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 8 + lw * 2.2;
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = lw;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - head * Math.cos(angle - Math.PI / 6),
    y2 - head * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - head * Math.cos(angle + Math.PI / 6),
    y2 - head * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

/* ---------- actions ---------- */

function undo() {
  annotations.pop();
  render();
}

function downloadPng() {
  cv.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "clearshot-" + stamp() + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast("Saved PNG");
  }, "image/png");
}

function copyToClipboard() {
  cv.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast("Copied to clipboard");
    } catch (e) {
      toast("Copy failed — try Download instead");
    }
  }, "image/png");
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

/* ---------- keyboard ---------- */

function setupKeyboard() {
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      return undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      return copyToClipboard();
    }
    const map = { a: "arrow", r: "rect", b: "blur", t: "text" };
    if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
  });
}
