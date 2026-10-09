// src/meta.ts
var META = { "border-beam": { "name": "border-beam", "kind": "css", "loop": true, "options": { "duration": { "type": "time", "css": true, "default": "6s" }, "delay": { "type": "time", "css": true, "default": "0s" }, "color": { "type": "color", "css": true, "default": "#a78bfa" }, "color-2": { "type": "color", "css": true, "default": "#22d3ee" }, "length": { "type": "percent", "css": true, "default": "22%" }, "width": { "type": "length", "css": true, "default": "1.5px" }, "count": { "type": "number", "css": true, "default": 1 }, "mode": { "type": "enum", "default": "beam", "values": ["beam", "full"] }, "glow": { "type": "boolean", "default": false } } }, "shimmer": { "name": "shimmer", "kind": "css", "loop": true, "options": { "duration": { "type": "time", "css": true, "default": "2.8s" }, "color": { "type": "color", "css": true, "default": "currentColor" }, "color-2": { "type": "color", "css": true, "default": "#ffffff" } } }, "shine": { "name": "shine", "kind": "css", "loop": true, "options": { "duration": { "type": "time", "css": true, "default": "3.2s" }, "intensity": { "type": "number", "css": true, "default": 0.35 }, "trigger": { "type": "enum", "default": "loop", "values": ["loop", "hover"] } } }, "aurora": { "name": "aurora", "kind": "css", "loop": true, "options": { "duration": { "type": "time", "css": true, "default": "18s" }, "color": { "type": "color", "css": true, "default": "#7c3aed" }, "color-2": { "type": "color", "css": true, "default": "#06b6d4" }, "color-3": { "type": "color", "css": true, "default": "#ec4899" }, "opacity": { "type": "number", "css": true, "default": 0.55 } } }, "squircle": { "name": "squircle", "kind": "hybrid", "options": { "radius": { "type": "length", "css": true, "default": "28px" }, "smoothing": { "type": "number", "css": false, "default": 0.6 }, "fallback": { "type": "enum", "default": "auto", "values": ["auto", "clip", "radius"] } } }, "glass": { "name": "glass", "kind": "hybrid", "options": { "blur": { "type": "length", "css": true, "default": "14px" }, "saturate": { "type": "number", "css": true, "default": 1.6 }, "tint": { "type": "color", "css": true, "default": "rgb(255 255 255 / 0.08)" }, "refraction": { "type": "number", "css": false, "default": 1 }, "aberration": { "type": "number", "css": false, "default": 1 }, "mode": { "type": "enum", "default": "liquid", "values": ["liquid", "frost"] } } }, "shadow": { "name": "shadow", "kind": "hybrid", "options": { "elevation": { "type": "number", "css": true, "default": 1 }, "color": { "type": "color", "css": true, "default": "rgb(15 17 35)" }, "lift": { "type": "boolean", "default": false }, "light": { "type": "enum", "default": "top", "values": ["top", "cursor"] } } }, "reveal": { "name": "reveal", "kind": "js", "options": { "from": { "type": "enum", "default": "up", "values": ["up", "down", "left", "right", "zoom", "blur", "book", "clip"] }, "duration": { "type": "time", "css": true, "default": "900ms" }, "delay": { "type": "time", "css": true, "default": "0ms" }, "distance": { "type": "length", "css": true, "default": "28px" }, "ease": { "type": "string", "css": true, "default": "cubic-bezier(.16,1,.3,1)" }, "once": { "type": "boolean", "default": true } } }, "stagger": { "name": "stagger", "kind": "js", "options": { "from": { "type": "enum", "default": "up", "values": ["up", "down", "left", "right", "zoom", "blur", "book", "clip"] }, "stagger": { "type": "time", "css": true, "default": "70ms" }, "duration": { "type": "time", "css": true, "default": "800ms" }, "delay": { "type": "time", "css": true, "default": "0ms" }, "distance": { "type": "length", "css": true, "default": "24px" }, "ease": { "type": "string", "css": true, "default": "cubic-bezier(.16,1,.3,1)" }, "once": { "type": "boolean", "default": true } } }, "text-reveal": { "name": "text-reveal", "kind": "js", "options": { "split": { "type": "enum", "default": "words", "values": ["words", "chars", "lines"] }, "style": { "type": "enum", "default": "blur", "values": ["blur", "rise", "flip", "fade"] }, "stagger": { "type": "time", "css": true, "default": "" }, "duration": { "type": "time", "css": true, "default": "800ms" }, "delay": { "type": "time", "css": true, "default": "0ms" }, "trigger": { "type": "enum", "default": "view", "values": ["view", "load"] }, "once": { "type": "boolean", "default": true } } }, "scramble": { "name": "scramble", "kind": "js", "options": { "trigger": { "type": "enum", "default": "view", "values": ["view", "hover", "load"] }, "speed": { "type": "time", "css": false, "default": "28ms" }, "chars": { "type": "string", "default": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?/<>" } } }, "counter": { "name": "counter", "kind": "js", "options": { "from": { "type": "number", "css": false, "default": 0 }, "duration": { "type": "time", "css": false, "default": "1800ms" } } }, "marquee": { "name": "marquee", "kind": "hybrid", "loop": true, "options": { "speed": { "type": "number", "css": false, "default": 60 }, "gap": { "type": "length", "css": true, "default": "2rem" }, "fade": { "type": "percent", "css": true, "default": "8%" }, "reverse": { "type": "boolean", "default": false }, "vertical": { "type": "boolean", "default": false }, "pause": { "type": "boolean", "default": true } } }, "spotlight": { "name": "spotlight", "kind": "js", "options": { "color": { "type": "color", "css": true, "default": "#a78bfa" }, "size": { "type": "length", "css": true, "default": "360px" }, "border": { "type": "boolean", "default": true } } }, "magnetic": { "name": "magnetic", "kind": "js", "options": { "strength": { "type": "number", "css": false, "default": 0.35 }, "area": { "type": "length", "css": false, "default": "40px" } } }, "tilt": { "name": "tilt", "kind": "js", "options": { "max": { "type": "number", "css": false, "default": 10 }, "scale": { "type": "number", "css": false, "default": 1.03 }, "perspective": { "type": "length", "css": false, "default": "900px" }, "glare": { "type": "boolean", "default": true } } }, "cursor-image": { "name": "cursor-image", "kind": "js", "options": { "src": { "type": "string" }, "label": { "type": "string" }, "size": { "type": "length", "css": false, "default": "280px" }, "cursor": { "type": "enum", "default": "auto", "values": ["auto", "none"] } } }, "parallax": { "name": "parallax", "kind": "hybrid", "options": { "speed": { "type": "number", "css": true, "default": 0.25 } } }, "stack": { "name": "stack", "kind": "hybrid", "options": { "top": { "type": "length", "css": true, "default": "12vh" }, "offset": { "type": "length", "css": true, "default": "16px" }, "shrink": { "type": "number", "css": false, "default": 0.05 } } }, "hscroll": { "name": "hscroll", "kind": "hybrid", "options": { "gap": { "type": "length", "css": true, "default": "2rem" } } }, "carousel": { "name": "carousel", "kind": "hybrid", "options": { "slide": { "type": "length", "css": true, "default": "80%" }, "gap": { "type": "length", "css": true, "default": "16px" }, "style": { "type": "enum", "default": "default", "values": ["default", "scale"] }, "controls": { "type": "boolean", "default": false }, "autoplay": { "type": "time", "css": false, "default": "0" } } }, "stories": { "name": "stories", "kind": "js", "options": { "duration": { "type": "time", "css": true, "default": "5000ms" }, "loop": { "type": "boolean", "default": true } } }, "ripple": { "name": "ripple", "kind": "webgl", "options": { "strength": { "type": "number", "css": false, "default": 1 }, "src": { "type": "string" } } }, "morph": { "name": "morph", "kind": "js", "options": { "name": { "type": "string" } } }, "page-transition": { "name": "page-transition", "kind": "js", "options": { "style": { "type": "enum", "default": "wave", "values": ["wave", "curtain", "circle", "slide"] }, "color": { "type": "color", "css": true, "default": "#0b0c12" }, "color-2": { "type": "color", "css": true, "default": "#ffb547" }, "duration": { "type": "time", "css": false, "default": "750ms" }, "label": { "type": "string" }, "links": { "type": "string", "default": "a[href]" } } }, "preloader": { "name": "preloader", "kind": "js", "options": { "style": { "type": "enum", "default": "slide", "values": ["slide", "wave", "fade"] }, "color": { "type": "color", "css": true, "default": "#0b0c12" }, "min": { "type": "time", "css": false, "default": "900ms" } } }, "modal": { "name": "modal", "kind": "js", "options": { "style": { "type": "enum", "default": "liquid", "values": ["liquid", "glass", "scale", "slide"] }, "from": { "type": "enum", "default": "auto", "values": ["auto", "trigger", "bottom"] }, "side": { "type": "enum", "default": "center", "values": ["center", "right", "left", "bottom", "top"] }, "size": { "type": "length", "css": true, "default": "560px" }, "root": { "type": "string" }, "color": { "type": "color", "css": true, "default": "#20232e" } } }, "drawer": { "name": "drawer", "kind": "js", "options": { "side": { "type": "enum", "default": "right", "values": ["right", "left", "bottom", "top"] }, "style": { "type": "enum", "default": "slide", "values": ["slide", "glass", "scale", "push", "dock", "liquid"] }, "size": { "type": "length", "css": true, "default": "560px" }, "color": { "type": "color", "css": true, "default": "#20232e" }, "from": { "type": "enum", "default": "auto", "values": ["auto", "trigger", "bottom"] }, "root": { "type": "string" } } }, "hovercard": { "name": "hovercard", "kind": "js", "options": { "for": { "type": "string" }, "text": { "type": "string" }, "placement": { "type": "enum", "default": "auto", "values": ["auto", "top", "bottom", "left", "right"] }, "delay": { "type": "time", "css": false, "default": "90ms" } } }, "chat": { "name": "chat", "kind": "js", "options": { "title": { "type": "string", "default": "Chat" }, "subtitle": { "type": "string" }, "greeting": { "type": "string" }, "placeholder": { "type": "string", "default": "Write a message\u2026" }, "quick": { "type": "string" }, "color": { "type": "color", "css": true, "default": "#ffb547" }, "position": { "type": "enum", "default": "right", "values": ["right", "left"] } } }, "smart-header": { "name": "smart-header", "kind": "hybrid", "options": { "threshold": { "type": "length", "css": false, "default": "80px" }, "hide": { "type": "boolean", "default": true } } }, "scrollbar": { "name": "scrollbar", "kind": "js", "options": { "sections": { "type": "string", "default": "h2, [data-fx-section]" }, "color": { "type": "color", "css": true, "default": "#ffb547" } } }, "scroll-progress": { "name": "scroll-progress", "kind": "hybrid", "options": { "color": { "type": "color", "css": true, "default": "#ffb547" }, "height": { "type": "length", "css": true, "default": "3px" } } }, "dock": { "name": "dock", "kind": "js", "options": { "magnify": { "type": "number", "css": false, "default": 1.8 }, "range": { "type": "length", "css": false, "default": "150px" } } }, "hover-icon": { "name": "hover-icon", "kind": "css", "options": { "icon": { "type": "string", "default": "\u2192" }, "side": { "type": "enum", "default": "left", "values": ["left", "right"] } } }, "lightbox": { "name": "lightbox", "kind": "js", "options": { "group": { "type": "string" } } }, "image-reveal": { "name": "image-reveal", "kind": "js", "options": { "from": { "type": "enum", "default": "up", "values": ["up", "down", "left", "right", "center", "circle", "diagonal"] }, "duration": { "type": "time", "css": true, "default": "1200ms" }, "delay": { "type": "time", "css": true, "default": "0ms" }, "scale": { "type": "number", "css": true, "default": 1.25 } } }, "expand": { "name": "expand", "kind": "hybrid", "options": { "inset": { "type": "length", "css": true, "default": "8vw" }, "radius": { "type": "length", "css": true, "default": "32px" } } }, "image-trail": { "name": "image-trail", "kind": "js", "options": { "images": { "type": "string" }, "size": { "type": "length", "css": false, "default": "190px" }, "spacing": { "type": "length", "css": false, "default": "90px" } } }, "video-scrub": { "name": "video-scrub", "kind": "js", "options": { "length": { "type": "length", "css": true, "default": "300vh" }, "smooth": { "type": "number", "css": false, "default": 8 } } }, "frames": { "name": "frames", "kind": "js", "options": { "src": { "type": "string" }, "count": { "type": "number", "css": false, "default": 60 }, "start": { "type": "number", "css": false, "default": 1 }, "length": { "type": "length", "css": true, "default": "300vh" } } }, "svg-draw": { "name": "svg-draw", "kind": "js", "options": { "mode": { "type": "enum", "default": "view", "values": ["view", "scroll"] }, "duration": { "type": "time", "css": true, "default": "1800ms" }, "stagger": { "type": "time", "css": true, "default": "140ms" }, "pulse": { "type": "number", "css": false, "default": 0 }, "color": { "type": "color", "css": true, "default": "#ffb547" } } }, "dot-field": { "name": "dot-field", "kind": "js", "options": { "color": { "type": "color", "css": true, "default": "#ffb547" }, "gap": { "type": "length", "css": false, "default": "22px" }, "force": { "type": "number", "css": false, "default": 1 } } }, "typewriter": { "name": "typewriter", "kind": "js", "options": { "speed": { "type": "time", "css": false, "default": "34ms" }, "delay": { "type": "time", "css": false, "default": "0ms" }, "loop": { "type": "boolean", "default": false } } }, "rotate-words": { "name": "rotate-words", "kind": "js", "options": { "words": { "type": "string" }, "interval": { "type": "time", "css": false, "default": "2200ms" }, "style": { "type": "enum", "default": "flip", "values": ["flip", "slide", "blur"] } } }, "clock": { "name": "clock", "kind": "js", "options": { "tz": { "type": "string" }, "seconds": { "type": "boolean", "default": true }, "hour12": { "type": "boolean", "default": false } } }, "dapple": { "name": "dapple", "kind": "css", "loop": true, "options": { "opacity": { "type": "number", "css": true, "default": 0.4 }, "duration": { "type": "time", "css": true, "default": "16s" } } }, "ring": { "name": "ring", "kind": "js", "options": { "speed": { "type": "number", "css": false, "default": 6 }, "tilt": { "type": "number", "css": false, "default": 8 } } }, "card": { "name": "card", "kind": "hybrid", "options": { "style": { "type": "enum", "default": "glow", "values": ["glow", "product", "flip", "cover", "ticket"] }, "color": { "type": "color", "css": true, "default": "#ffb547" }, "radius": { "type": "length", "css": true, "default": "22px" } } }, "press": { "name": "press", "kind": "js", "options": { "style": { "type": "enum", "default": "ripple", "values": ["ripple", "burst", "fill", "squish"] }, "color": { "type": "color", "css": true, "default": "" }, "done": { "type": "string" } } }, "form": { "name": "form", "kind": "js", "options": { "locale": { "type": "string" }, "country": { "type": "string", "default": "AL" }, "ajax": { "type": "boolean", "default": false }, "spam": { "type": "boolean", "default": true }, "reset": { "type": "boolean", "default": false }, "success": { "type": "string" }, "color": { "type": "color", "css": true, "default": "#ffb547" } } }, "loader-3d": { "name": "loader-3d", "kind": "webgl", "options": { "style": { "type": "enum", "default": "pages", "values": ["pages", "stack"] }, "colors": { "type": "string" }, "count": { "type": "number", "css": false, "default": 5 }, "base": { "type": "color", "css": true, "default": "#a6d8ea" }, "duration": { "type": "time", "css": true, "default": "3.6s" }, "size": { "type": "length", "css": true, "default": "160px" } } } };
var EFFECT_NAMES = ["border-beam", "shimmer", "shine", "aurora", "squircle", "glass", "shadow", "reveal", "stagger", "text-reveal", "scramble", "counter", "marquee", "spotlight", "magnetic", "tilt", "cursor-image", "parallax", "stack", "hscroll", "carousel", "stories", "ripple", "morph", "page-transition", "preloader", "modal", "drawer", "hovercard", "chat", "smart-header", "scrollbar", "scroll-progress", "dock", "hover-icon", "lightbox", "image-reveal", "expand", "image-trail", "video-scrub", "frames", "svg-draw", "dot-field", "typewriter", "rotate-words", "clock", "dapple", "ring", "card", "press", "form", "loader-3d"];
function optionAttributes() {
  const s = /* @__PURE__ */ new Set();
  for (const m of Object.values(META)) for (const k of Object.keys(m.options)) s.add("data-fx-" + k);
  return [...s];
}

// src/core/env.ts
var isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
var env = {
  reduced: false,
  finePointer: false,
  lite: false,
  chromium: false,
  sda: false,
  cornerShape: false,
  vt: false
};
var mq = (q) => isBrowser && typeof window.matchMedia === "function" ? window.matchMedia(q) : null;
var supports = (s) => {
  try {
    return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports(s);
  } catch {
    return false;
  }
};
function detect(overrides = {}) {
  if (!isBrowser) return env;
  const nav = navigator;
  env.reduced = !!mq("(prefers-reduced-motion: reduce)")?.matches;
  env.finePointer = !!mq("(hover: hover) and (pointer: fine)")?.matches;
  env.sda = supports("animation-timeline: view()");
  env.cornerShape = supports("corner-shape: squircle");
  env.vt = typeof document.startViewTransition === "function";
  env.chromium = !!nav.userAgentData?.brands?.some((b) => /Chromium/i.test(b.brand));
  env.lite = !!nav.connection?.saveData || typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
  Object.assign(env, overrides);
  return env;
}
function watchReducedMotion(cb) {
  const m = mq("(prefers-reduced-motion: reduce)");
  if (!m) return () => {
  };
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

// src/core/options.ts
var BARE = /^-?\d*\.?\d+$/;
function cssValue(type, raw) {
  const v = raw.trim();
  if (BARE.test(v)) {
    if (type === "time") return v + "ms";
    if (type === "length") return v + "px";
    if (type === "percent") return v + "%";
  }
  return v;
}
function parseTime(v, def) {
  if (v == null || v.trim() === "") return def;
  const s = v.trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return def;
  if (/ms$/i.test(s)) return n;
  if (/s$/i.test(s)) return n * 1e3;
  return n;
}
function parsePx(v, def, el) {
  if (v == null || v.trim() === "") return def;
  const s = v.trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return def;
  if (/rem$/.test(s)) return n * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  if (/em$/.test(s)) return n * (el ? parseFloat(getComputedStyle(el).fontSize) || 16 : 16);
  if (/vh$/.test(s)) return n * window.innerHeight / 100;
  if (/vw$/.test(s)) return n * window.innerWidth / 100;
  return n;
}
function makeCtx(el, env2) {
  let cs = null;
  const raw = (key) => {
    const a = el.getAttribute("data-fx-" + key);
    if (a !== null) return a;
    cs ?? (cs = getComputedStyle(el));
    const v = cs.getPropertyValue("--fx-" + key).trim();
    return v === "" ? void 0 : v;
  };
  return {
    el,
    env: env2,
    str: (key, def) => raw(key) ?? def,
    num: (key, def) => {
      const v = parseFloat(raw(key) ?? "");
      return Number.isNaN(v) ? def : v;
    },
    time: (key, def) => parseTime(raw(key), def),
    px: (key, def) => parsePx(raw(key), def, el),
    bool: (key, def) => {
      if (el.classList.contains("fx-no-" + key)) return false;
      if (el.classList.contains("fx-" + key)) return true;
      const a = el.getAttribute("data-fx-" + key);
      if (a === null) return def;
      return !/^(false|0|no|off)$/i.test(a.trim());
    }
  };
}

// src/core/view.ts
var pools = /* @__PURE__ */ new Map();
function onView(el, cb, opts = {}) {
  if (typeof IntersectionObserver === "undefined") {
    const id = setTimeout(() => cb(true, { isIntersecting: true, target: el }), 0);
    return () => clearTimeout(id);
  }
  const margin = opts.margin ?? "0px";
  const threshold = opts.threshold ?? 0;
  const key = `${margin}|${threshold}`;
  let pool = pools.get(key);
  if (!pool) {
    const cbs = /* @__PURE__ */ new Map();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) cbs.get(e.target)?.forEach((fn) => fn(e.isIntersecting, e));
      },
      { rootMargin: margin, threshold }
    );
    pool = { io, cbs };
    pools.set(key, pool);
  }
  let set = pool.cbs.get(el);
  if (!set) {
    set = /* @__PURE__ */ new Set();
    pool.cbs.set(el, set);
    pool.io.observe(el);
  }
  set.add(cb);
  const p = pool;
  return () => {
    const s = p.cbs.get(el);
    if (!s) return;
    s.delete(cb);
    if (!s.size) {
      p.cbs.delete(el);
      p.io.unobserve(el);
    }
  };
}

// src/core/arrival.ts
var ARRIVAL_KEY = "fx-pt";
function earlyCover() {
  try {
    const raw = sessionStorage.getItem(ARRIVAL_KEY);
    if (!raw) return;
    const a = JSON.parse(raw);
    if (Date.now() - a.t > 6e3) return sessionStorage.removeItem(ARRIVAL_KEY);
    document.documentElement.classList.add("fx-pt-arriving");
    document.documentElement.style.setProperty("--fx-pt-early", a.color);
  } catch {
  }
}

// src/core/runtime.ts
var registry = /* @__PURE__ */ new Map();
var mounted = /* @__PURE__ */ new Map();
var writtenVars = /* @__PURE__ */ new WeakMap();
var pauseWatch = /* @__PURE__ */ new WeakMap();
var started = false;
var observer = null;
var rootEl = null;
var stopReduced = null;
var startOpts = {};
var queued = false;
var pendingRecords = [];
var warned = /* @__PURE__ */ new Set();
var warn = (msg, err) => {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn("[lumafx] " + msg, err ?? "");
};
var SELECTOR = '[data-fx],[class*="fx-"]';
function register(...effects) {
  for (const e of effects) registry.set(e.name, e);
  if (started && rootEl) scan(rootEl);
}
function registered() {
  return [...registry.keys()];
}
function namesFor(el) {
  const out = [];
  const attr = el.getAttribute("data-fx");
  if (attr) {
    for (const n of attr.split(/\s+/)) {
      if (!n) continue;
      if (registry.has(n)) out.push(n);
      else warn(`Unknown effect "${n}". Available: ${[...registry.keys()].join(", ")}`);
    }
  }
  if (el.classList.length) {
    for (const c of el.classList) {
      if (c.startsWith("fx-")) {
        const n = c.slice(3);
        if (registry.has(n) && !out.includes(n)) out.push(n);
      }
    }
  }
  return out;
}
function mapVars(el, names) {
  const prev = writtenVars.get(el);
  if (prev) for (const v of prev) el.style.removeProperty(v);
  const written = [];
  for (const n of names) {
    const meta = META[n];
    if (!meta) continue;
    for (const [key, opt] of Object.entries(meta.options)) {
      if (!opt.css) continue;
      const raw = el.getAttribute("data-fx-" + key);
      if (raw === null || raw.trim() === "") continue;
      const prop = "--fx-" + key;
      el.style.setProperty(prop, cssValue(opt.type, raw));
      written.push(prop);
    }
  }
  if (written.length) writtenVars.set(el, written);
  else writtenVars.delete(el);
}
function runCleanup(fn, name) {
  if (!fn) return;
  try {
    fn();
  } catch (err) {
    warn(`Cleanup of "${name}" failed`, err);
  }
}
function unmount(el) {
  const m = mounted.get(el);
  if (m) for (const [n, c] of m) runCleanup(c, n);
  mounted.delete(el);
  pauseWatch.get(el)?.();
  pauseWatch.delete(el);
  el.removeAttribute("data-fx-paused");
  const vars = writtenVars.get(el);
  if (vars) for (const v of vars) el.style.removeProperty(v);
  writtenVars.delete(el);
}
function sync(el) {
  if (!el.isConnected || el.closest("[data-fx-off]")) {
    if (mounted.has(el)) unmount(el);
    return;
  }
  const want = namesFor(el);
  if (!want.length) {
    if (mounted.has(el)) unmount(el);
    return;
  }
  const have = mounted.get(el) ?? /* @__PURE__ */ new Map();
  for (const [n, c] of have) {
    if (!want.includes(n)) {
      runCleanup(c, n);
      have.delete(n);
    }
  }
  mapVars(el, want);
  for (const n of want) {
    if (have.has(n)) continue;
    const effect = registry.get(n);
    let cleanup = void 0;
    if (effect.mount) {
      try {
        cleanup = effect.mount(el, makeCtx(el, env));
      } catch (err) {
        warn(`Effect "${n}" failed to start`, err);
      }
    }
    have.set(n, cleanup);
  }
  mounted.set(el, have);
  const loops = want.some((n) => META[n]?.loop);
  if (loops && !pauseWatch.has(el)) {
    pauseWatch.set(
      el,
      onView(el, (visible) => visible ? el.removeAttribute("data-fx-paused") : el.setAttribute("data-fx-paused", ""), {
        margin: "120px"
      })
    );
  } else if (!loops && pauseWatch.has(el)) {
    pauseWatch.get(el)();
    pauseWatch.delete(el);
    el.removeAttribute("data-fx-paused");
  }
}
function remount(el) {
  unmount(el);
  sync(el);
}
function scan(root) {
  if (root instanceof HTMLElement && root.matches(SELECTOR)) sync(root);
  root.querySelectorAll(SELECTOR).forEach(sync);
}
function sweep() {
  for (const el of [...mounted.keys()]) if (!el.isConnected) unmount(el);
}
function flush() {
  queued = false;
  const records = pendingRecords;
  pendingRecords = [];
  let removed = false;
  const toSync = /* @__PURE__ */ new Set();
  const toRemount = /* @__PURE__ */ new Set();
  const toScan = /* @__PURE__ */ new Set();
  for (const r of records) {
    if (r.type === "attributes") {
      const t = r.target;
      if (r.attributeName === "data-fx" || r.attributeName === "class") toSync.add(t);
      else if (mounted.has(t)) toRemount.add(t);
    } else {
      r.addedNodes.forEach((n) => n.nodeType === 1 && toScan.add(n));
      if (r.removedNodes.length) removed = true;
    }
  }
  if (removed) sweep();
  toScan.forEach((n) => n.isConnected && scan(n));
  toSync.forEach((el) => !toRemount.has(el) && sync(el));
  toRemount.forEach(remount);
}
function observe(root) {
  observer = new MutationObserver((records) => {
    pendingRecords.push(...records);
    if (!queued) {
      queued = true;
      queueMicrotask(flush);
    }
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-fx", "class", ...optionAttributes()]
  });
}
function applyEnvToDocument() {
  const html = document.documentElement;
  html.toggleAttribute("data-fx-reduced", startOpts.motion === "reduce");
  html.toggleAttribute("data-fx-lite", env.lite);
  html.toggleAttribute("data-fx-nosda", startOpts.features?.sda === false);
  html.toggleAttribute("data-fx-nocs", startOpts.features?.cornerShape === false);
}
function detectAll() {
  detect(startOpts.features);
  if (startOpts.motion === "reduce") env.reduced = true;
  if (typeof startOpts.lite === "boolean") env.lite = startOpts.lite;
  applyEnvToDocument();
}
function start(opts = {}) {
  if (!isBrowser || started) return;
  started = true;
  startOpts = opts;
  detectAll();
  const html = document.documentElement;
  html.classList.add("fx-ready", "fx-booted");
  earlyCover();
  const run = () => {
    rootEl = opts.root ?? document.body ?? html;
    scan(rootEl);
    observe(rootEl);
    html.classList.remove("fx-pt-arriving");
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
  stopReduced = watchReducedMotion(() => refresh());
}
function stop() {
  if (!started) return;
  started = false;
  observer?.disconnect();
  observer = null;
  stopReduced?.();
  stopReduced = null;
  for (const el of [...mounted.keys()]) unmount(el);
  document.documentElement.classList.remove("fx-ready", "fx-booted");
}
function refresh() {
  if (!started || !rootEl) return;
  detectAll();
  for (const el of [...mounted.keys()]) unmount(el);
  scan(rootEl);
}
function mount(root) {
  if (started) scan(root);
}
function stats() {
  const out = {};
  for (const m of mounted.values()) for (const n of m.keys()) out[n] = (out[n] || 0) + 1;
  return out;
}
function isStarted() {
  return started;
}

// src/effects/morph.ts
var morph = {
  name: "morph",
  meta: META.morph,
  mount(el, ctx) {
    const name = ctx.str("name");
    if (!name) return;
    el.style.setProperty("view-transition-name", name);
    return () => el.style.removeProperty("view-transition-name");
  }
};
async function transition(update, opts = {}) {
  const doc = document;
  if (!doc.startViewTransition || env.reduced) {
    await update();
    return;
  }
  const html = document.documentElement;
  const prev = html.getAttribute("data-fx-transition");
  if (opts.preset) html.setAttribute("data-fx-transition", opts.preset);
  try {
    await doc.startViewTransition(update).finished;
  } finally {
    if (opts.preset) {
      if (prev === null) html.removeAttribute("data-fx-transition");
      else html.setAttribute("data-fx-transition", prev);
    }
  }
}

export {
  META,
  EFFECT_NAMES,
  env,
  onView,
  ARRIVAL_KEY,
  register,
  registered,
  start,
  stop,
  refresh,
  mount,
  stats,
  isStarted,
  morph,
  transition
};
