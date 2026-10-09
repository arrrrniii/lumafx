import {
  ARRIVAL_KEY,
  EFFECT_NAMES,
  META,
  env,
  isStarted,
  morph,
  mount,
  onView,
  refresh,
  register,
  registered,
  start,
  stats,
  stop,
  transition
} from "./chunk-RZYT6Y46.mjs";
import {
  checkValue,
  core_exports,
  message,
  parsePhone,
  parseRules,
  passwordScore
} from "./chunk-MI45PWVZ.mjs";

// src/core/util.ts
var clamp = (v, min, max) => Math.min(max, Math.max(min, v));
var lerp = (a, b, t) => a + (b - a) * t;
var damp = (current, target, lambda, dtMs) => lerp(current, target, 1 - Math.exp(-lambda * dtMs / 1e3));
function on(target, type, fn, opts) {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}
function rafThrottle(fn) {
  let id = 0;
  let last2;
  const run = (...args) => {
    last2 = args;
    if (!id) id = requestAnimationFrame(() => (id = 0, fn(...last2)));
  };
  run.cancel = () => id && cancelAnimationFrame(id);
  return run;
}
function setState(el, token, onOff = true) {
  const tokens = new Set((el.getAttribute("data-fx-state") || "").split(/\s+/).filter(Boolean));
  const had = tokens.has(token);
  if (onOff === had) return;
  onOff ? tokens.add(token) : tokens.delete(token);
  if (tokens.size) el.setAttribute("data-fx-state", [...tokens].join(" "));
  else el.removeAttribute("data-fx-state");
}
function setAttrs(el, attrs) {
  const prev = {};
  for (const [k, v] of Object.entries(attrs)) {
    prev[k] = el.getAttribute(k);
    if (prev[k] === null) el.setAttribute(k, v);
  }
  return () => {
    for (const [k, v] of Object.entries(prev)) if (v === null) el.removeAttribute(k);
  };
}
var isInteractive = (el) => !!el.querySelector("a,button,input,select,textarea,[tabindex]");
var px = (v) => v ? parseFloat(v) || 0 : 0;

// src/core/gate.ts
var holds = 0;
var waiting = [];
function hold() {
  holds++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--holds === 0) {
      const w = waiting;
      waiting = [];
      w.forEach((fn) => fn());
    }
  };
}
function whenLoaded(fn) {
  if (!holds) {
    fn();
    return () => {
    };
  }
  waiting.push(fn);
  return () => {
    waiting = waiting.filter((f2) => f2 !== fn);
  };
}

// src/effects/reveal.ts
var VIEW = { margin: "0px 0px -10% 0px", threshold: 0 };
function watchIn(el, once) {
  let off = null;
  off = onView(
    el,
    (visible) => {
      if (visible) {
        whenLoaded(() => setState(el, "in"));
        if (once && off) {
          off();
          off = null;
        }
      } else if (!once) setState(el, "in", false);
    },
    VIEW
  );
  return () => {
    off?.();
    setState(el, "in", false);
  };
}
var reveal = {
  name: "reveal",
  meta: META.reveal,
  mount(el, ctx) {
    if (ctx.env.reduced) {
      setState(el, "in");
      return () => setState(el, "in", false);
    }
    return watchIn(el, ctx.bool("once", true));
  }
};
var stagger = {
  name: "stagger",
  meta: META.stagger,
  mount(el, ctx) {
    const index = () => {
      let i = 0;
      for (const c of el.children) c.style.setProperty("--fx-i", String(i++));
    };
    index();
    const mo = new MutationObserver(index);
    mo.observe(el, { childList: true });
    const stop2 = ctx.env.reduced ? (setState(el, "in"), () => setState(el, "in", false)) : watchIn(el, ctx.bool("once", true));
    return () => {
      mo.disconnect();
      stop2();
      for (const c of el.children) c.style.removeProperty("--fx-i");
    };
  }
};

// src/effects/split.ts
var SKIP = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "SVG", "svg"]);
var segmenter;
function graphemes(s) {
  if (segmenter === void 0) {
    const Seg = Intl.Segmenter;
    segmenter = Seg ? new Seg(void 0, { granularity: "grapheme" }) : null;
  }
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s);
}
function unit(text) {
  const u = document.createElement("span");
  u.className = "fx-u";
  const inner = document.createElement("span");
  inner.className = "fx-ui";
  inner.textContent = text;
  u.append(inner);
  return u;
}
function splitText(root, mode) {
  const texts = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest(".fx-u")) return NodeFilter.FILTER_REJECT;
      return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);
  const units = [];
  const words = [];
  const swaps = [];
  for (const t of texts) {
    const parts = (t.nodeValue || "").split(/(\s+)/);
    const nodes = [];
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        nodes.push(document.createTextNode(part));
        continue;
      }
      if (mode === "chars") {
        const w = document.createElement("span");
        w.className = "fx-word";
        for (const g of graphemes(part)) {
          const u = unit(g);
          w.append(u);
          units.push(u);
        }
        words.push(w);
        nodes.push(w);
      } else {
        const u = unit(part);
        units.push(u);
        words.push(u);
        nodes.push(u);
      }
    }
    const frag = document.createDocumentFragment();
    frag.append(...nodes);
    t.parentNode.replaceChild(frag, t);
    swaps.push({ original: t, nodes });
  }
  units.forEach((u, i) => u.style.setProperty("--fx-i", String(i)));
  return {
    units,
    words,
    restore() {
      for (const { original, nodes } of swaps) {
        const first = nodes[0];
        if (first?.parentNode) first.parentNode.insertBefore(original, first);
        for (const n of nodes) n.remove();
      }
    }
  };
}
function indexLines(units) {
  let line = -1;
  let lastTop = -Infinity;
  for (const u of units) {
    const top = Math.round(u.getBoundingClientRect().top);
    if (top > lastTop + 2) {
      line++;
      lastTop = top;
    }
    u.style.setProperty("--fx-i", String(Math.max(0, line)));
  }
}

// src/effects/text.ts
var VIEW2 = { margin: "0px 0px -10% 0px" };
var DEFAULT_STAGGER = { words: "60ms", chars: "22ms", lines: "120ms" };
var textReveal = {
  name: "text-reveal",
  meta: META["text-reveal"],
  mount(el, ctx) {
    if (ctx.env.reduced) {
      setState(el, "in");
      return () => setState(el, "in", false);
    }
    const mode = ctx.str("split", "words") || "words";
    const split = splitText(el, DEFAULT_STAGGER[mode] ? mode : "words");
    el.style.setProperty("--_tr-st-def", DEFAULT_STAGGER[mode] ?? "60ms");
    setState(el, "split");
    let undoAria = null;
    if (mode === "chars" && !isInteractive(el) && !el.hasAttribute("aria-label")) {
      el.setAttribute("aria-label", (el.textContent || "").replace(/\s+/g, " ").trim());
      split.words.forEach((w) => w.setAttribute("aria-hidden", "true"));
      undoAria = () => el.removeAttribute("aria-label");
    }
    let ro = null;
    if (mode === "lines") {
      indexLines(split.units);
      let lastW = el.clientWidth;
      ro = new ResizeObserver(() => {
        if (el.clientWidth !== lastW) {
          lastW = el.clientWidth;
          indexLines(split.units);
        }
      });
      ro.observe(el);
    }
    const once = ctx.bool("once", true);
    let off = null;
    let raf2 = 0;
    if (ctx.str("trigger", "view") === "load") {
      whenLoaded(() => raf2 = requestAnimationFrame(() => raf2 = requestAnimationFrame(() => setState(el, "in"))));
    } else {
      off = onView(
        el,
        (visible) => {
          if (visible) {
            whenLoaded(() => setState(el, "in"));
            if (once) {
              off?.();
              off = null;
            }
          } else if (!once) setState(el, "in", false);
        },
        VIEW2
      );
    }
    return () => {
      cancelAnimationFrame(raf2);
      off?.();
      ro?.disconnect();
      undoAria?.();
      split.restore();
      el.style.removeProperty("--_tr-st-def");
      setState(el, "in", false);
      setState(el, "split", false);
    };
  }
};
var DEFAULT_CHARS = META.scramble.options.chars.default;
var scramble = {
  name: "scramble",
  meta: META.scramble,
  mount(el, ctx) {
    if (ctx.env.reduced) return;
    const per = ctx.time("speed", 28);
    const charset = Array.from(ctx.str("chars", DEFAULT_CHARS) || DEFAULT_CHARS);
    const trigger = ctx.str("trigger", "view");
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if ((n.nodeValue || "").trim()) nodes.push({ node: n, text: n.nodeValue || "" });
    }
    const total = nodes.reduce((s, n) => s + n.text.length, 0);
    if (!total) return;
    let raf2 = 0;
    let running = false;
    const finish = () => {
      for (const n of nodes) n.node.nodeValue = n.text;
      running = false;
      setState(el, "scrambling", false);
    };
    const play = () => {
      if (running) return;
      running = true;
      setState(el, "scrambling");
      let start2 = -1;
      const dur = total * per + 300;
      let frame = 0;
      const step = (now) => {
        if (start2 < 0) start2 = now;
        const revealed = Math.floor((now - start2) / dur * total * 1.15);
        if (revealed >= total) return finish();
        if (frame++ % 2 === 0) {
          let i = 0;
          for (const n of nodes) {
            let out = "";
            for (const ch of n.text) {
              out += i++ < revealed || /\s/.test(ch) ? ch : charset[Math.random() * charset.length | 0];
            }
            n.node.nodeValue = out;
          }
        }
        raf2 = requestAnimationFrame(step);
      };
      raf2 = requestAnimationFrame(step);
    };
    const offs = [];
    if (trigger === "hover") {
      el.addEventListener("pointerenter", play);
      el.addEventListener("focusin", play);
      offs.push(() => {
        el.removeEventListener("pointerenter", play);
        el.removeEventListener("focusin", play);
      });
    } else if (trigger === "load") whenLoaded(play);
    else {
      let off = onView(
        el,
        (v) => {
          if (v) {
            whenLoaded(play);
            off?.();
            off = null;
          }
        },
        VIEW2
      );
      offs.push(() => off?.());
    }
    return () => {
      cancelAnimationFrame(raf2);
      offs.forEach((f2) => f2());
      finish();
    };
  }
};
function parseNumber(text) {
  const m = /-?\d(?:[\d.,'\u00a0\u202f]*\d)?/.exec(text);
  if (!m) return null;
  const s = m[0];
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let decimalSep = "";
  if (lastDot > -1 && lastComma > -1) decimalSep = lastDot > lastComma ? "." : ",";
  else if (lastDot > -1 || lastComma > -1) {
    const sep = lastDot > -1 ? "." : ",";
    const count = s.split(sep).length - 1;
    const after = s.length - s.lastIndexOf(sep) - 1;
    if (count === 1 && after !== 3) decimalSep = sep;
  }
  const intPart = decimalSep ? s.slice(0, s.lastIndexOf(decimalSep)) : s;
  const groupMatch = /[^\d-]/.exec(intPart);
  const groupSep = groupMatch ? groupMatch[0] : "";
  const decimals = decimalSep ? s.length - s.lastIndexOf(decimalSep) - 1 : 0;
  const normalized = decimalSep ? intPart.replace(/[^\d-]/g, "") + "." + s.slice(s.lastIndexOf(decimalSep) + 1) : s.replace(/[^\d-]/g, "");
  return {
    prefix: text.slice(0, m.index),
    suffix: text.slice(m.index + s.length),
    value: parseFloat(normalized),
    decimals,
    decimalSep,
    groupSep
  };
}
function formatNumber(n, p) {
  const fixed = Math.abs(n).toFixed(p.decimals);
  let [int, frac] = fixed.split(".");
  if (p.groupSep) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, p.groupSep);
  return (n < 0 ? "-" : "") + int + (p.decimals ? p.decimalSep + frac : "");
}
var easeOutExpo = (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
var counter = {
  name: "counter",
  meta: META.counter,
  mount(el, ctx) {
    if (ctx.env.reduced) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = null;
    let parsed = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      parsed = parseNumber(n.nodeValue || "");
      if (parsed) {
        node = n;
        break;
      }
    }
    if (!node || !parsed) return;
    const target = node;
    const p = parsed;
    const original = target.nodeValue || "";
    const from = ctx.num("from", 0);
    const dur = ctx.time("duration", 1800);
    const render = (v) => target.nodeValue = p.prefix + formatNumber(v, p) + p.suffix;
    render(from);
    let raf2 = 0;
    let off = onView(
      el,
      (v) => {
        if (!v) return;
        off?.();
        off = null;
        let start2 = -1;
        const step = (now) => {
          if (start2 < 0) start2 = now;
          const t = Math.min(1, Math.max(0, (now - start2) / dur));
          if (t >= 1) {
            target.nodeValue = original;
            return;
          }
          render(from + (p.value - from) * easeOutExpo(t));
          raf2 = requestAnimationFrame(step);
        };
        whenLoaded(() => raf2 = requestAnimationFrame(step));
      },
      VIEW2
    );
    return () => {
      off?.();
      cancelAnimationFrame(raf2);
      target.nodeValue = original;
    };
  }
};

// src/effects/marquee.ts
var marquee = {
  name: "marquee",
  meta: META.marquee,
  mount(el, ctx) {
    let track = el.querySelector(":scope > .fx-mq-track");
    const created = !track;
    if (!track) {
      track = document.createElement("div");
      track.className = "fx-mq-track";
      track.append(...Array.from(el.childNodes));
      el.append(track);
    }
    const t = track;
    const clones = [];
    if (ctx.env.reduced) {
      return () => created && restore();
    }
    const vertical = ctx.bool("vertical", false);
    const speed = Math.max(1, ctx.num("speed", 60));
    const layout = rafThrottle(() => {
      const size = vertical ? el.clientHeight : el.clientWidth;
      const tsize = vertical ? t.offsetHeight : t.offsetWidth;
      if (!tsize || !size) return;
      const cs = getComputedStyle(el);
      const gap = parseFloat(vertical ? cs.rowGap : cs.columnGap) || 0;
      const need = Math.min(24, Math.max(1, Math.ceil(size / (tsize + gap))));
      while (clones.length < need) {
        const c = t.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.setAttribute("inert", "");
        c.setAttribute("data-fx-clone", "");
        el.append(c);
        clones.push(c);
      }
      while (clones.length > need) clones.pop().remove();
      el.style.setProperty("--fx-mq-dur", ((tsize + gap) / speed).toFixed(3) + "s");
    });
    const ro = new ResizeObserver(() => layout());
    ro.observe(el);
    ro.observe(t);
    layout();
    function restore() {
      if (t.parentNode === el) {
        while (t.firstChild) el.insertBefore(t.firstChild, t);
        t.remove();
      }
    }
    return () => {
      ro.disconnect();
      layout.cancel();
      clones.forEach((c) => c.remove());
      el.style.removeProperty("--fx-mq-dur");
      if (created) restore();
    };
  }
};

// src/core/pointer.ts
var pointer = { x: -1e5, y: -1e5, t: 0 };
var subs = /* @__PURE__ */ new Set();
var bound = false;
function onMove(e) {
  if (e.pointerType === "touch") return;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.t = performance.now();
  for (const fn of subs) fn();
}
function onScroll() {
  for (const fn of subs) fn();
}
function onPointer(fn) {
  subs.add(fn);
  if (!bound) {
    bound = true;
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  }
  return () => {
    subs.delete(fn);
    if (!subs.size && bound) {
      bound = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
    }
  };
}

// src/core/ticker.ts
var subs2 = /* @__PURE__ */ new Set();
var raf = 0;
var last = 0;
function loop(now) {
  const dt = last ? Math.min(64, now - last) : 16.7;
  last = now;
  for (const fn of [...subs2]) fn(now, dt);
  if (subs2.size) raf = requestAnimationFrame(loop);
  else {
    raf = 0;
    last = 0;
  }
}
function tick(fn) {
  subs2.add(fn);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    subs2.delete(fn);
  };
}
function sleeper(step) {
  let off = null;
  const run = (now, dt) => {
    if (!step(now, dt) && off) {
      off();
      off = null;
    }
  };
  return {
    wake() {
      if (!off) off = tick(run);
    },
    stop() {
      off?.();
      off = null;
    }
  };
}

// src/effects/pointer.ts
var NO_CHILDREN = /* @__PURE__ */ new Set(["IMG", "INPUT", "TEXTAREA", "SELECT", "VIDEO", "CANVAS", "IFRAME", "svg"]);
function overlay(el, cls) {
  if (NO_CHILDREN.has(el.tagName)) return null;
  const o = document.createElement("span");
  o.className = cls;
  o.setAttribute("aria-hidden", "true");
  el.append(o);
  return o;
}
var spotlight = {
  name: "spotlight",
  meta: META.spotlight,
  mount(el, ctx) {
    if (!ctx.env.finePointer) return;
    const layer = overlay(el, "fx-spot");
    if (!layer) return;
    let x = 0;
    let y = 0;
    const apply = rafThrottle(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--fx-mx", (x - r.left).toFixed(1) + "px");
      el.style.setProperty("--fx-my", (y - r.top).toFixed(1) + "px");
    });
    const offMove = on(el, "pointermove", (e) => {
      if (e.pointerType === "touch") return;
      x = e.clientX;
      y = e.clientY;
      apply();
    });
    return () => {
      offMove();
      apply.cancel();
      layer.remove();
      el.style.removeProperty("--fx-mx");
      el.style.removeProperty("--fx-my");
    };
  }
};
var magnetic = {
  name: "magnetic",
  meta: META.magnetic,
  mount(el, ctx) {
    if (!ctx.env.finePointer || ctx.env.reduced) return;
    const strength = clamp(ctx.num("strength", 0.35), 0, 1.5);
    const area = ctx.px("area", 40);
    const inner = el.querySelector("[data-fx-inner]");
    let x = 0;
    let y = 0;
    const loop2 = sleeper((_now, dt) => {
      const r = el.getBoundingClientRect();
      const cx = r.left - x + r.width / 2;
      const cy = r.top - y + r.height / 2;
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      const inside = Math.abs(dx) < r.width / 2 + area && Math.abs(dy) < r.height / 2 + area;
      const tx = inside ? dx * strength : 0;
      const ty = inside ? dy * strength : 0;
      x = damp(x, tx, 10, dt);
      y = damp(y, ty, 10, dt);
      const settled = Math.abs(x - tx) < 0.05 && Math.abs(y - ty) < 0.05;
      if (settled && !inside) {
        x = 0;
        y = 0;
      }
      el.style.translate = x || y ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : "";
      if (inner) inner.style.translate = x || y ? `${(x * 0.45).toFixed(2)}px ${(y * 0.45).toFixed(2)}px` : "";
      setState(el, "pulled", inside);
      return !settled || performance.now() - pointer.t < 120;
    });
    let offPointer = null;
    const offView = onView(
      el,
      (visible) => {
        if (visible && !offPointer) offPointer = onPointer(loop2.wake);
        else if (!visible && offPointer) {
          offPointer();
          offPointer = null;
        }
      },
      { margin: "100px" }
    );
    return () => {
      offView();
      offPointer?.();
      loop2.stop();
      el.style.translate = "";
      if (inner) inner.style.translate = "";
      setState(el, "pulled", false);
    };
  }
};
var tilt = {
  name: "tilt",
  meta: META.tilt,
  mount(el, ctx) {
    if (!ctx.env.finePointer || ctx.env.reduced) return;
    const max = ctx.num("max", 10);
    const scaleTo = ctx.num("scale", 1.03);
    const persp = ctx.px("perspective", 900);
    const glare = ctx.bool("glare", true) ? overlay(el, "fx-glare") : null;
    const depth = Array.from(el.querySelectorAll("[data-fx-depth]"));
    depth.forEach((d) => d.style.transform = `translateZ(${parseFloat(d.getAttribute("data-fx-depth") || "30") || 30}px)`);
    const cur = { rx: 0, ry: 0, s: 1, gx: 50, gy: 50, go: 0 };
    const tgt = { ...cur };
    let rect = el.getBoundingClientRect();
    let hover = false;
    const loop2 = sleeper((_now, dt) => {
      let moving = false;
      for (const k of Object.keys(cur)) {
        cur[k] = damp(cur[k], tgt[k], 9, dt);
        if (Math.abs(cur[k] - tgt[k]) > 0.01) moving = true;
      }
      if (!moving && !hover) {
        el.style.transform = "";
        el.style.removeProperty("--fx-go");
        return false;
      }
      el.style.transform = `perspective(${persp}px) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg) scale(${cur.s.toFixed(4)})`;
      el.style.setProperty("--fx-gx", cur.gx.toFixed(1) + "%");
      el.style.setProperty("--fx-gy", cur.gy.toFixed(1) + "%");
      el.style.setProperty("--fx-go", cur.go.toFixed(3));
      return true;
    });
    const offs = [
      on(el, "pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        hover = true;
        el.style.transform = "";
        rect = el.getBoundingClientRect();
        tgt.s = scaleTo;
        tgt.go = 1;
        setState(el, "tilting");
        loop2.wake();
      }),
      on(el, "pointermove", (e) => {
        if (!hover) return;
        const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const ny = clamp((e.clientY - rect.top) / rect.height, 0, 1);
        tgt.ry = (nx - 0.5) * 2 * max;
        tgt.rx = -(ny - 0.5) * 2 * max;
        tgt.gx = nx * 100;
        tgt.gy = ny * 100;
        loop2.wake();
      }),
      on(el, "pointerleave", () => {
        hover = false;
        Object.assign(tgt, { rx: 0, ry: 0, s: 1, go: 0 });
        setState(el, "tilting", false);
        loop2.wake();
      })
    ];
    return () => {
      offs.forEach((f2) => f2());
      loop2.stop();
      glare?.remove();
      depth.forEach((d) => d.style.transform = "");
      el.style.transform = "";
      ["--fx-gx", "--fx-gy", "--fx-go"].forEach((p) => el.style.removeProperty(p));
      setState(el, "tilting", false);
    };
  }
};
var shadow = {
  name: "shadow",
  meta: META.shadow,
  mount(el, ctx) {
    if (ctx.str("light", "top") !== "cursor" || !ctx.env.finePointer || ctx.env.reduced) return;
    let lx = 0;
    let ly = 1;
    const loop2 = sleeper((_now, dt) => {
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - pointer.x;
      const dy = r.top + r.height / 2 - pointer.y;
      const tx = clamp(dx / window.innerWidth * 4, -1.6, 1.6);
      const ty = clamp(dy / window.innerHeight * 4, -1.6, 1.6);
      lx = damp(lx, tx, 6, dt);
      ly = damp(ly, ty, 6, dt);
      el.style.setProperty("--fx-shx", lx.toFixed(3));
      el.style.setProperty("--fx-shy", ly.toFixed(3));
      return Math.abs(lx - tx) > 2e-3 || Math.abs(ly - ty) > 2e-3;
    });
    let offPointer = null;
    const offView = onView(el, (v) => {
      if (v && !offPointer) offPointer = onPointer(loop2.wake);
      else if (!v && offPointer) {
        offPointer();
        offPointer = null;
      }
    });
    return () => {
      offView();
      offPointer?.();
      loop2.stop();
      el.style.removeProperty("--fx-shx");
      el.style.removeProperty("--fx-shy");
    };
  }
};
var float = null;
var floatImg;
var floatLabel;
var users = 0;
var active = null;
var fpos = { x: -1e4, y: -1e4, r: 0 };
var floatLoop = null;
var offFloatPointer = null;
function ensureFloat() {
  if (float) return;
  float = document.createElement("div");
  float.className = "fx-float";
  float.setAttribute("aria-hidden", "true");
  const inner = document.createElement("div");
  inner.className = "fx-float-inner";
  floatImg = document.createElement("img");
  floatImg.alt = "";
  floatImg.decoding = "async";
  floatLabel = document.createElement("span");
  floatLabel.className = "fx-float-label";
  inner.append(floatImg, floatLabel);
  float.append(inner);
  document.body.append(float);
  floatLoop = sleeper((_now, dt) => {
    const f2 = float;
    const tx = pointer.x;
    const ty = pointer.y;
    if (fpos.x < -9e3) {
      fpos.x = tx;
      fpos.y = ty;
    }
    const px2 = fpos.x;
    fpos.x = damp(fpos.x, tx, 11, dt);
    fpos.y = damp(fpos.y, ty, 11, dt);
    const vx = (fpos.x - px2) / Math.max(dt, 1);
    fpos.r = damp(fpos.r, clamp(vx * 6, -12, 12), 8, dt);
    f2.style.translate = `${fpos.x.toFixed(1)}px ${fpos.y.toFixed(1)}px`;
    f2.style.rotate = fpos.r.toFixed(2) + "deg";
    const settled = Math.abs(fpos.x - tx) < 0.2 && Math.abs(fpos.y - ty) < 0.2 && Math.abs(fpos.r) < 0.05;
    return !settled || !!active;
  });
  offFloatPointer = onPointer(() => active && floatLoop.wake());
}
function releaseFloat() {
  if (--users > 0 || !float) return;
  offFloatPointer?.();
  floatLoop?.stop();
  float.remove();
  float = null;
  active = null;
}
var cursorImage = {
  name: "cursor-image",
  meta: META["cursor-image"],
  mount(el, ctx) {
    if (!ctx.env.finePointer) return;
    const src = ctx.str("src");
    const label = ctx.str("label");
    if (!src && !label) return;
    users++;
    ensureFloat();
    const size = ctx.px("size", 280);
    const hideCursor = ctx.str("cursor", "auto") === "none";
    let offPre = src ? onView(
      el,
      (v) => {
        if (!v) return;
        new Image().src = src;
        offPre?.();
        offPre = null;
      },
      { margin: "300px" }
    ) : null;
    const enter = (e) => {
      if (e.pointerType === "touch" || !float) return;
      active = el;
      if (src) {
        floatImg.src = src;
        floatImg.style.display = "";
        floatLabel.style.display = "none";
      } else {
        floatLabel.textContent = label || "";
        floatLabel.style.display = "";
        floatImg.style.display = "none";
      }
      float.style.setProperty("--fx-float-size", size + "px");
      if (fpos.x < -9e3) {
        fpos.x = e.clientX;
        fpos.y = e.clientY;
      }
      float.setAttribute("data-state", "in");
      if (hideCursor) el.style.cursor = "none";
      floatLoop.wake();
    };
    const leave = () => {
      if (active !== el || !float) return;
      active = null;
      float.removeAttribute("data-state");
      floatLoop.wake();
    };
    const offs = [on(el, "pointerenter", enter), on(el, "pointerleave", leave)];
    return () => {
      offs.forEach((f2) => f2());
      offPre?.();
      leave();
      if (hideCursor) el.style.cursor = "";
      releaseFloat();
    };
  }
};

// src/effects/scroll.ts
function whileVisible(el, fn, margin = "200px") {
  let off = null;
  const stopView = onView(
    el,
    (visible) => {
      if (visible && !off) off = tick(fn);
      else if (!visible && off) {
        off();
        off = null;
      }
    },
    { margin }
  );
  return () => {
    stopView();
    off?.();
  };
}
var parallax = {
  name: "parallax",
  meta: META.parallax,
  mount(el, ctx) {
    if (ctx.env.reduced || ctx.env.sda) return;
    const speed = ctx.num("speed", 0.25);
    let cur = 0;
    let lastY = NaN;
    const stop2 = whileVisible(el, () => {
      const r = el.getBoundingClientRect();
      const top = r.top - cur;
      if (top === lastY) return;
      lastY = top;
      const vh = window.innerHeight;
      const p = clamp((vh - top) / (vh + r.height), 0, 1);
      cur = speed * vh * 0.4 * (1 - 2 * p);
      el.style.translate = `0 ${cur.toFixed(2)}px`;
    });
    return () => {
      stop2();
      el.style.translate = "";
    };
  }
};
var stack = {
  name: "stack",
  meta: META.stack,
  mount(el, ctx) {
    const cards = () => Array.from(el.children);
    const index = () => cards().forEach((c, i) => c.style.setProperty("--fx-i", String(i)));
    index();
    const mo = new MutationObserver(index);
    mo.observe(el, { childList: true });
    const clear = () => cards().forEach((c) => ["--fx-i", "--fx-s", "--fx-br"].forEach((p) => c.style.removeProperty(p)));
    if (ctx.env.reduced) {
      return () => {
        mo.disconnect();
        clear();
      };
    }
    const shrink = ctx.num("shrink", 0.05);
    let lastKey = "";
    const stop2 = whileVisible(el, () => {
      const list = cards();
      const tops = list.map((c) => c.getBoundingClientRect().top);
      const key = tops.map((t) => t.toFixed(1)).join();
      if (key === lastKey) return;
      lastKey = key;
      for (let i = 0; i < list.length; i++) {
        const h = list[i].offsetHeight || 1;
        let cover = 0;
        for (let j = i + 1; j < list.length; j++) cover += clamp(1 - (tops[j] - tops[i]) / h, 0, 1);
        cover = Math.min(cover, 4);
        list[i].style.setProperty("--fx-s", (1 - shrink * cover).toFixed(4));
        list[i].style.setProperty("--fx-br", (1 - 0.09 * cover).toFixed(3));
      }
    }, "0px");
    return () => {
      stop2();
      mo.disconnect();
      clear();
    };
  }
};
var hscroll = {
  name: "hscroll",
  meta: META.hscroll,
  mount(el, ctx) {
    let sticky = el.querySelector(":scope > .fx-hs-sticky");
    const createdSticky = !sticky;
    let track = sticky?.querySelector(":scope > [data-fx-track]") ?? el.querySelector(":scope > [data-fx-track]") ?? (el.children.length === 1 ? el.firstElementChild : null);
    let createdTrack = false;
    let markedTrack = false;
    if (!track) {
      track = document.createElement("div");
      track.append(...Array.from(el.childNodes));
      createdTrack = true;
    }
    if (!track.hasAttribute("data-fx-track")) {
      track.setAttribute("data-fx-track", "");
      markedTrack = !createdTrack;
    }
    const placeholder = document.createComment("fx-track");
    if (!sticky) {
      sticky = document.createElement("div");
      sticky.className = "fx-hs-sticky";
      if (track.parentNode === el) el.insertBefore(placeholder, track);
      sticky.append(track);
      el.append(sticky);
    }
    const s = sticky;
    const t = track;
    const restore = () => {
      if (createdSticky) {
        if (createdTrack) {
          while (t.firstChild) el.insertBefore(t.firstChild, s);
        } else if (placeholder.parentNode) placeholder.replaceWith(t);
        else el.insertBefore(t, s);
        s.remove();
      }
      placeholder.remove();
      if (markedTrack) t.removeAttribute("data-fx-track");
    };
    if (ctx.env.reduced) {
      setState(el, "native");
      return () => {
        setState(el, "native", false);
        restore();
      };
    }
    let dist = 0;
    const layout = () => {
      dist = Math.max(0, t.scrollWidth - s.clientWidth);
      el.style.setProperty("--fx-hs-dist", dist + "px");
      el.style.height = `calc(100vh + ${dist}px)`;
    };
    const ro = new ResizeObserver(layout);
    ro.observe(t);
    ro.observe(s);
    layout();
    let stop2 = null;
    if (!ctx.env.sda) {
      stop2 = whileVisible(el, () => {
        const r = el.getBoundingClientRect();
        const range = r.height - window.innerHeight;
        const p = range > 0 ? clamp(-r.top / range, 0, 1) : 0;
        t.style.translate = `${(-p * dist).toFixed(1)}px 0`;
        el.style.setProperty("--fx-hs-p", p.toFixed(4));
      });
    }
    return () => {
      ro.disconnect();
      stop2?.();
      t.style.translate = "";
      el.style.height = "";
      el.style.removeProperty("--fx-hs-dist");
      el.style.removeProperty("--fx-hs-p");
      restore();
    };
  }
};

// src/effects/carousel.ts
function slidesOf(el) {
  return Array.from(el.children).filter((c) => !c.hasAttribute("data-fx-ui"));
}
var carousel = {
  name: "carousel",
  meta: META.carousel,
  mount(el, ctx) {
    const cleanups = [];
    cleanups.push(
      setAttrs(el, {
        role: "region",
        "aria-roledescription": "carousel",
        tabindex: "0",
        "aria-label": el.getAttribute("aria-label") || "Carousel"
      })
    );
    const labelSlides = () => {
      const list = slidesOf(el);
      list.forEach((s, i) => {
        s.setAttribute("role", s.getAttribute("role") || "group");
        s.setAttribute("aria-roledescription", "slide");
        if (!s.hasAttribute("aria-label") || s.hasAttribute("data-fx-auto-label")) {
          s.setAttribute("aria-label", `${i + 1} of ${list.length}`);
          s.setAttribute("data-fx-auto-label", "");
        }
      });
    };
    labelSlides();
    cleanups.push(
      () => slidesOf(el).forEach((s) => {
        if (s.hasAttribute("data-fx-auto-label")) {
          s.removeAttribute("aria-label");
          s.removeAttribute("data-fx-auto-label");
        }
        s.removeAttribute("aria-roledescription");
        if (s.getAttribute("role") === "group") s.removeAttribute("role");
      })
    );
    const pad = () => parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const scaleStyle = ctx.str("style", "default") === "scale";
    const current = () => {
      const list = slidesOf(el);
      const er = el.getBoundingClientRect();
      const anchor = scaleStyle ? er.left + er.width / 2 : er.left + pad();
      let best = 0;
      let bestD = Infinity;
      list.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs((scaleStyle ? r.left + r.width / 2 : r.left) - anchor);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    };
    const goTo = (i, smooth2 = !ctx.env.reduced) => {
      const list = slidesOf(el);
      const target = list[clamp(i, 0, list.length - 1)];
      if (!target) return;
      const er = el.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      const delta = scaleStyle ? r.left + r.width / 2 - (er.left + er.width / 2) : r.left - er.left - pad();
      el.scrollTo({ left: el.scrollLeft + delta, behavior: smooth2 ? "smooth" : "auto" });
    };
    const go = (dir) => {
      const list = slidesOf(el);
      const i = current() + dir;
      goTo(i < 0 ? list.length - 1 : i >= list.length ? 0 : i);
    };
    cleanups.push(
      on(el, "keydown", (e) => {
        if (e.key === "ArrowRight") e.preventDefault(), go(1);
        else if (e.key === "ArrowLeft") e.preventDefault(), go(-1);
      })
    );
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let v = 0;
    let moved = 0;
    let momentum = null;
    const stopMomentum = () => {
      momentum?.();
      momentum = null;
    };
    const release = () => {
      el.style.scrollSnapType = "";
      el.style.scrollBehavior = "";
      setState(el, "dragging", false);
    };
    const onMove2 = (e) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      el.scrollLeft = startScroll - dx;
      const dt = Math.max(1, now - lastT);
      v = 0.8 * ((e.clientX - lastX) / dt) + 0.2 * v;
      lastX = e.clientX;
      lastT = now;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener("pointermove", onMove2);
      window.removeEventListener("pointerup", onUp);
      if (performance.now() - lastT > 80) v = 0;
      momentum = tick((_now, dt) => {
        el.scrollLeft -= v * dt;
        v *= Math.pow(0.94, dt / 16.7);
        if (Math.abs(v) < 0.05) {
          stopMomentum();
          const i = current();
          goTo(i);
          setTimeout(release, 450);
        }
      });
    };
    cleanups.push(
      on(el, "pointerdown", (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        stopMomentum();
        dragging = true;
        moved = 0;
        v = 0;
        startX = lastX = e.clientX;
        lastT = performance.now();
        startScroll = el.scrollLeft;
        el.style.scrollSnapType = "none";
        el.style.scrollBehavior = "auto";
        setState(el, "dragging");
        window.addEventListener("pointermove", onMove2);
        window.addEventListener("pointerup", onUp);
      }),
      on(el, "dragstart", (e) => e.preventDefault()),
      // A drag should not count as a click on a link inside a slide.
      on(el, "click", (e) => moved > 6 && (e.preventDefault(), e.stopPropagation()), { capture: true }),
      () => {
        stopMomentum();
        window.removeEventListener("pointermove", onMove2);
        window.removeEventListener("pointerup", onUp);
        release();
      }
    );
    let dots = null;
    const update = rafThrottle(() => {
      const list = slidesOf(el);
      const er = el.getBoundingClientRect();
      const mid = er.left + er.width / 2;
      if (scaleStyle) {
        for (const s of list) {
          const r = s.getBoundingClientRect();
          const k = 1 - clamp(Math.abs(r.left + r.width / 2 - mid) / (r.width || 1), 0, 1);
          s.style.setProperty("--fx-k", k.toFixed(3));
        }
      }
      if (dots) {
        const i = current();
        dots.forEach((d, j) => d.setAttribute("aria-current", j === i ? "true" : "false"));
      }
    });
    cleanups.push(on(el, "scroll", update, { passive: true }), () => update.cancel());
    if (scaleStyle)
      cleanups.push(() => slidesOf(el).forEach((s) => s.style.removeProperty("--fx-k")));
    if (ctx.bool("controls", false)) {
      const nav = document.createElement("div");
      nav.className = "fx-carousel-nav";
      const btn = (label, text, fn) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fx-cb";
        b.setAttribute("aria-label", label);
        b.textContent = text;
        b.addEventListener("click", fn);
        return b;
      };
      const dotWrap = document.createElement("div");
      dotWrap.className = "fx-dots";
      dots = slidesOf(el).map((_, i) => {
        const d = btn(`Go to slide ${i + 1}`, "", () => goTo(i));
        d.className = "fx-dot";
        return d;
      });
      dotWrap.append(...dots);
      nav.append(btn("Previous slide", "\u2039", () => go(-1)), dotWrap, btn("Next slide", "\u203A", () => go(1)));
      el.after(nav);
      cleanups.push(() => nav.remove());
    }
    update();
    const every = ctx.time("autoplay", 0);
    if (every > 0 && !ctx.env.reduced) {
      let visible = false;
      let hold2 = false;
      const id = setInterval(() => visible && !hold2 && !dragging && document.visibilityState === "visible" && go(1), every);
      cleanups.push(
        () => clearInterval(id),
        onView(el, (v2) => visible = v2),
        on(el, "pointerenter", () => hold2 = true),
        on(el, "pointerleave", () => hold2 = false),
        on(el, "focusin", () => hold2 = true),
        on(el, "focusout", () => hold2 = false)
      );
    }
    return () => cleanups.reverse().forEach((f2) => f2());
  }
};
var stories = {
  name: "stories",
  meta: META.stories,
  mount(el, ctx) {
    const slides = slidesOf(el);
    if (!slides.length) return;
    const loop2 = ctx.bool("loop", true);
    const manual = ctx.env.reduced;
    const cleanups = [];
    cleanups.push(
      setAttrs(el, {
        role: "region",
        "aria-roledescription": "stories",
        tabindex: "0",
        "aria-label": el.getAttribute("aria-label") || "Stories"
      })
    );
    const bars = document.createElement("div");
    bars.className = "fx-st-bars";
    bars.setAttribute("data-fx-ui", "");
    bars.setAttribute("aria-hidden", "true");
    const barEls = slides.map((s) => {
      const b = document.createElement("span");
      b.className = "fx-st-bar";
      const d = s.getAttribute("data-fx-slide-duration");
      if (d) b.style.setProperty("--_st-dur", /\d$/.test(d) ? d + "ms" : d);
      b.append(document.createElement("i"));
      return b;
    });
    bars.append(...barEls);
    el.prepend(bars);
    if (manual) setState(el, "manual");
    let idx = 0;
    const show = (i) => {
      idx = i;
      slides.forEach((s, j) => {
        setState(s, "active", j === i);
        s.setAttribute("aria-hidden", j === i ? "false" : "true");
      });
      barEls.forEach((b, j) => {
        b.removeAttribute("data-s");
        if (j === i) void b.offsetWidth;
        if (j < i) b.setAttribute("data-s", "done");
        else if (j === i) b.setAttribute("data-s", "active");
      });
      slides.forEach((s, j) => {
        const v = s instanceof HTMLVideoElement ? s : s.querySelector("video");
        if (!v) return;
        if (j === i) v.play().catch(() => {
        });
        else v.pause();
      });
    };
    const next = () => idx < slides.length - 1 ? show(idx + 1) : loop2 ? show(0) : void 0;
    const prev = () => show(Math.max(0, idx - 1));
    let paused = /* @__PURE__ */ new Set();
    const setPaused = (reason, p) => {
      p ? paused.add(reason) : paused.delete(reason);
      setState(el, "paused", paused.size > 0);
    };
    cleanups.push(
      on(bars, "animationend", (e) => {
        if (e.animationName === "fx-story" && !manual) next();
      })
    );
    let downX = 0;
    let downT = 0;
    let holdTimer = 0;
    let held = false;
    cleanups.push(
      on(el, "pointerdown", (e) => {
        downX = e.clientX;
        downT = performance.now();
        held = false;
        holdTimer = window.setTimeout(() => {
          held = true;
          setPaused("hold", true);
        }, 220);
      }),
      on(el, "pointerup", (e) => {
        clearTimeout(holdTimer);
        if (held) {
          setPaused("hold", false);
          return;
        }
        const dx = e.clientX - downX;
        if (Math.abs(dx) > 40 && performance.now() - downT < 600) return dx < 0 ? next() : prev();
        const r = el.getBoundingClientRect();
        e.clientX - r.left < r.width / 3 ? prev() : next();
      }),
      on(el, "pointercancel", () => {
        clearTimeout(holdTimer);
        setPaused("hold", false);
      }),
      on(el, "contextmenu", (e) => held && e.preventDefault()),
      on(el, "keydown", (e) => {
        if (e.key === "ArrowRight") next();
        else if (e.key === "ArrowLeft") prev();
        else if (e.key === " ") {
          e.preventDefault();
          setPaused("key", !paused.has("key"));
        }
      }),
      onView(el, (v) => setPaused("offscreen", !v)),
      on(document, "visibilitychange", () => setPaused("tab", document.visibilityState !== "visible"))
    );
    show(0);
    return () => {
      cleanups.reverse().forEach((f2) => f2());
      clearTimeout(holdTimer);
      bars.remove();
      slides.forEach((s) => {
        setState(s, "active", false);
        s.removeAttribute("aria-hidden");
      });
      setState(el, "paused", false);
      setState(el, "manual", false);
      paused = /* @__PURE__ */ new Set();
    };
  }
};

// src/effects/squircle.ts
var rad = (deg) => deg * Math.PI / 180;
function corner(radius, smoothing, budget) {
  const r = Math.min(radius, budget);
  if (r <= 0) return { a: 0, b: 0, c: 0, d: 0, p: 0, arc: 0, r: 0 };
  let s = smoothing;
  let p = (1 + s) * r;
  const maxS = budget / r - 1;
  s = Math.max(0, Math.min(s, maxS));
  p = Math.min(p, budget);
  const arcMeasure = 90 * (1 - s);
  const arc = Math.sin(rad(arcMeasure / 2)) * r * Math.SQRT2;
  const alpha = (90 - arcMeasure) / 2;
  const p3p4 = r * Math.tan(rad(alpha / 2));
  const beta = 45 * s;
  const c = p3p4 * Math.cos(rad(beta));
  const d = c * Math.tan(rad(beta));
  const b = (p - arc - c - d) / 3;
  const a = 2 * b;
  return { a, b, c, d, p, arc, r };
}
var f = (n) => +n.toFixed(3);
function squirclePath(w, h, radius, smoothing = 0.6) {
  if (w <= 0 || h <= 0) return "";
  const k = corner(radius, smoothing, Math.min(w, h) / 2);
  const { a, b, c, d, p, arc, r } = k;
  if (!r) return `M0 0H${f(w)}V${f(h)}H0Z`;
  return [
    `M${f(w - p)} 0`,
    `c${f(a)} 0 ${f(a + b)} 0 ${f(a + b + c)} ${f(d)}`,
    `a${f(r)} ${f(r)} 0 0 1 ${f(arc)} ${f(arc)}`,
    `c${f(d)} ${f(c)} ${f(d)} ${f(b + c)} ${f(d)} ${f(a + b + c)}`,
    `L${f(w)} ${f(h - p)}`,
    `c0 ${f(a)} 0 ${f(a + b)} ${f(-d)} ${f(a + b + c)}`,
    `a${f(r)} ${f(r)} 0 0 1 ${f(-arc)} ${f(arc)}`,
    `c${f(-c)} ${f(d)} ${f(-(b + c))} ${f(d)} ${f(-(a + b + c))} ${f(d)}`,
    `L${f(p)} ${f(h)}`,
    `c${f(-a)} 0 ${f(-(a + b))} 0 ${f(-(a + b + c))} ${f(-d)}`,
    `a${f(r)} ${f(r)} 0 0 1 ${f(-arc)} ${f(-arc)}`,
    `c${f(-d)} ${f(-c)} ${f(-d)} ${f(-(b + c))} ${f(-d)} ${f(-(a + b + c))}`,
    `L0 ${f(p)}`,
    `c0 ${f(-a)} 0 ${f(-(a + b))} ${f(d)} ${f(-(a + b + c))}`,
    `a${f(r)} ${f(r)} 0 0 1 ${f(arc)} ${f(-arc)}`,
    `c${f(c)} ${f(-d)} ${f(b + c)} ${f(-d)} ${f(a + b + c)} ${f(-d)}`,
    "Z"
  ].join(" ");
}
var squircle = {
  name: "squircle",
  meta: META.squircle,
  mount(el, ctx) {
    if (ctx.env.cornerShape) return;
    const mode = ctx.str("fallback", "auto");
    if (mode === "radius") return;
    const cs = getComputedStyle(el);
    if (mode === "auto" && (cs.boxShadow !== "none" || px(cs.borderTopWidth) > 0)) return;
    const radius = px(cs.borderTopLeftRadius) || ctx.px("radius", 28);
    const smoothing = ctx.num("smoothing", 0.6);
    let lw = -1;
    let lh = -1;
    const apply = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w === lw && h === lh) return;
      lw = w;
      lh = h;
      el.style.clipPath = `path('${squirclePath(w, h, radius, smoothing)}')`;
    };
    el.style.borderRadius = "0";
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    el.setAttribute("data-fx-squircle", "clip");
    return () => {
      ro.disconnect();
      el.style.clipPath = "";
      el.style.borderRadius = "";
      el.removeAttribute("data-fx-squircle");
    };
  }
};

// src/effects/glass.ts
var SVGNS = "http://www.w3.org/2000/svg";
var defs = null;
var uid = 0;
function svgRoot() {
  if (defs && defs.isConnected) return defs;
  defs = document.createElementNS(SVGNS, "svg");
  defs.setAttribute("aria-hidden", "true");
  defs.setAttribute("width", "0");
  defs.setAttribute("height", "0");
  defs.setAttribute("class", "fx-svg-defs");
  defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  document.body.append(defs);
  return defs;
}
function displacementMap(w, h, radius, bezel) {
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));
  const data = new Uint8ClampedArray(W * H * 4);
  const hw = W / 2;
  const hh = H / 2;
  const r = Math.max(0, Math.min(radius, hw, hh));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px0 = x + 0.5 - hw;
      const py0 = y + 0.5 - hh;
      const ax = Math.abs(px0);
      const ay = Math.abs(py0);
      const qx = ax - (hw - r);
      const qy = ay - (hh - r);
      let dist;
      let nx;
      let ny;
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy) || 1;
        dist = r - l;
        nx = qx / l;
        ny = qy / l;
      } else if (qx > qy) {
        dist = hw - ax;
        nx = 1;
        ny = 0;
      } else {
        dist = hh - ay;
        nx = 0;
        ny = 1;
      }
      nx *= px0 < 0 ? -1 : 1;
      ny *= py0 < 0 ? -1 : 1;
      let m = 0;
      if (dist >= 0 && dist < bezel) {
        const t = dist / bezel;
        m = Math.pow(1 - t, 2.2);
      }
      const i = (y * W + x) * 4;
      data[i] = 128 - nx * m * 127;
      data[i + 1] = 128 - ny * m * 127;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return { data, width: W, height: H };
}
function mapURL(w, h, radius, bezel) {
  const scale = Math.min(1, 900 / Math.max(w, h));
  const m = displacementMap(w * scale, h * scale, radius * scale, bezel * scale);
  const canvas = document.createElement("canvas");
  canvas.width = m.width;
  canvas.height = m.height;
  const g = canvas.getContext("2d");
  if (!g) return null;
  g.putImageData(new ImageData(m.data, m.width, m.height), 0, 0);
  return canvas.toDataURL("image/png");
}
var glass = {
  name: "glass",
  meta: META.glass,
  mount(el, ctx) {
    if (!ctx.env.chromium || ctx.env.lite || ctx.str("mode", "liquid") === "frost") return;
    const strength = Math.max(0, ctx.num("refraction", 1));
    const aberration = Math.max(0, ctx.num("aberration", 1));
    if (!strength) return;
    const id = `fx-glass-${++uid}`;
    const filter = document.createElementNS(SVGNS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("color-interpolation-filters", "sRGB");
    svgRoot().append(filter);
    const blur = ctx.str("blur") ?? "0.6px";
    const sat = ctx.num("saturate", 1.6);
    let lw = -1;
    let lh = -1;
    const build = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h || w === lw && h === lh) return;
      lw = w;
      lh = h;
      const cs = getComputedStyle(el);
      const radius = px(cs.borderTopLeftRadius);
      const bezel = Math.max(6, Math.min(Math.max(radius, 18) * 0.9, Math.min(w, h) * 0.3, 42));
      const url = mapURL(w, h, radius, bezel);
      if (!url) return;
      const disp = bezel * 1.1 * strength;
      const scale = (s) => (disp * 2 * s).toFixed(2);
      const chain = aberration > 0 ? `<feDisplacementMap in="SourceGraphic" in2="m" scale="${scale(1)}" xChannelSelector="R" yChannelSelector="G" result="dr"/>
             <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/>
             <feDisplacementMap in="SourceGraphic" in2="m" scale="${scale(1 - 0.06 * aberration)}" xChannelSelector="R" yChannelSelector="G" result="dg"/>
             <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>
             <feDisplacementMap in="SourceGraphic" in2="m" scale="${scale(1 - 0.12 * aberration)}" xChannelSelector="R" yChannelSelector="G" result="db"/>
             <feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b"/>
             <feBlend in="r" in2="g" mode="screen" result="rg"/>
             <feBlend in="rg" in2="b" mode="screen"/>` : `<feDisplacementMap in="SourceGraphic" in2="m" scale="${scale(1)}" xChannelSelector="R" yChannelSelector="G"/>`;
      filter.innerHTML = `<feImage href="${url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>${chain}`;
    };
    build();
    const value = `url(#${id}) blur(${blur}) saturate(${sat}) brightness(1.04)`;
    el.style.backdropFilter = value;
    el.style.setProperty("-webkit-backdrop-filter", value);
    setState(el, "liquid");
    let timer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(build, 60);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
      filter.remove();
      el.style.backdropFilter = "";
      el.style.removeProperty("-webkit-backdrop-filter");
      setState(el, "liquid", false);
    };
  }
};

// src/effects/ripple.ts
var VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}`;
var FRAG = `precision mediump float;
uniform sampler2D t;
uniform vec2 m;     // pointer, 0\u20131
uniform vec2 vel;   // pointer velocity
uniform float h;    // hover amount 0\u20131
uniform float time;
uniform float k;    // strength
uniform vec2 res;
uniform vec4 fit;   // object-fit: scale.xy, offset.zw
varying vec2 v;
void main(){
  vec2 asp = vec2(res.x / res.y, 1.0);
  vec2 d = (v - m) * asp;
  float r = length(d);
  vec2 dir = r > 0.0001 ? d / r : vec2(0.0);
  float lens = exp(-r * r * 18.0);
  float ring = sin(r * 40.0 - time * 5.0) * exp(-r * 5.5);
  vec2 off = dir * ring * 0.016 * k - dir * lens * 0.05 * k;
  off += vel * lens * 0.8;
  off = off / asp * h;
  vec2 uv = (v + off) * fit.xy + fit.zw;
  float sh = (0.002 + length(vel) * 0.18) * k * h * (lens + 0.3);
  vec4 c = texture2D(t, uv);
  c.r = texture2D(t, uv + vec2(sh, 0.0)).r;
  c.b = texture2D(t, uv - vec2(sh, 0.0)).b;
  gl_FragColor = c;
}`;
function program(gl) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  return p;
}
var ripple = {
  name: "ripple",
  meta: META.ripple,
  mount(el, ctx) {
    let host = el;
    let img = el instanceof HTMLImageElement ? el : el.querySelector("img");
    let wrapper = null;
    if (el instanceof HTMLImageElement) {
      wrapper = document.createElement("span");
      wrapper.className = "fx-ripple-wrap";
      el.replaceWith(wrapper);
      wrapper.append(el);
      host = wrapper;
    }
    const src = ctx.str("src");
    let ownImg = false;
    if (!img && src) {
      img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      ownImg = true;
    }
    const unwrap = () => {
      if (wrapper) {
        wrapper.replaceWith(el);
        wrapper = null;
      }
    };
    if (!img || ctx.env.reduced || ctx.env.lite || !ctx.env.finePointer) {
      setState(host, "nogl");
      return () => {
        setState(host, "nogl", false);
        unwrap();
      };
    }
    const image = img;
    const strength = ctx.num("strength", 1);
    const canvas = document.createElement("canvas");
    canvas.className = "fx-ripple-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.append(canvas);
    let gl = null;
    let u = {};
    let failed = false;
    const s = { h: 0, ht: 0, mx: 0.5, my: 0.5, tx: 0.5, ty: 0.5, vx: 0, vy: 0, time: 0 };
    const fail = () => {
      failed = true;
      setState(host, "nogl");
      canvas.remove();
    };
    const init = () => {
      if (gl || failed) return !!gl;
      if (!image.complete || !image.naturalWidth) return false;
      try {
        gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
        if (!gl) throw new Error("no webgl");
        const p = program(gl);
        gl.useProgram(p);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(p, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        for (const n of ["t", "m", "vel", "h", "time", "k", "res", "fit"]) u[n] = gl.getUniformLocation(p, n);
        setState(host, "ready");
        return true;
      } catch (err) {
        console.warn("[lumafx] ripple: falling back to CSS", err);
        gl = null;
        fail();
        return false;
      }
    };
    const resize = () => {
      if (!gl) return;
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr));
      const hh = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== hh) {
        canvas.width = w;
        canvas.height = hh;
      }
      gl.viewport(0, 0, w, hh);
      const ea = r.width / r.height;
      const ia = image.naturalWidth / image.naturalHeight;
      const cover = getComputedStyle(image).objectFit !== "fill" || ownImg;
      let sx = 1;
      let sy = 1;
      if (cover) {
        if (ia > ea) sx = ea / ia;
        else sy = ia / ea;
      }
      gl.uniform4f(u.fit, sx, sy, (1 - sx) / 2, (1 - sy) / 2);
      gl.uniform2f(u.res, r.width, r.height);
    };
    const loop2 = sleeper((_now, dt) => {
      if (!gl) return false;
      s.h = damp(s.h, s.ht, 5, dt);
      const px2 = s.mx;
      const py = s.my;
      s.mx = damp(s.mx, s.tx, 10, dt);
      s.my = damp(s.my, s.ty, 10, dt);
      s.vx = damp(s.vx, (s.mx - px2) * 6, 8, dt);
      s.vy = damp(s.vy, (s.my - py) * 6, 8, dt);
      s.time += dt / 1e3;
      setState(host, "gl", s.h > 0.01);
      gl.uniform2f(u.m, s.mx, s.my);
      gl.uniform2f(u.vel, s.vx, s.vy);
      gl.uniform1f(u.h, s.h);
      gl.uniform1f(u.time, s.time);
      gl.uniform1f(u.k, strength);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return s.ht > 0 || s.h > 2e-3;
    });
    const local = (e) => {
      const r = host.getBoundingClientRect();
      s.tx = (e.clientX - r.left) / r.width;
      s.ty = (e.clientY - r.top) / r.height;
    };
    const offs = [
      on(host, "pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        if (!init()) {
          if (!failed) image.addEventListener("load", () => init(), { once: true });
          return;
        }
        resize();
        local(e);
        s.mx = s.tx;
        s.my = s.ty;
        s.ht = 1;
        loop2.wake();
      }),
      on(host, "pointermove", (e) => {
        if (!gl) return;
        local(e);
        loop2.wake();
      }),
      on(host, "pointerleave", () => {
        s.ht = 0;
        loop2.wake();
      })
    ];
    return () => {
      offs.forEach((f2) => f2());
      loop2.stop();
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      ["gl", "ready", "nogl"].forEach((t) => setState(host, t, false));
      unwrap();
    };
  }
};

// src/effects/navigation.ts
var ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
var SVGNS2 = "http://www.w3.org/2000/svg";
function tween(ms, frame) {
  return new Promise((resolve) => {
    let start2 = -1;
    const step = (now) => {
      if (start2 < 0) start2 = now;
      const t = Math.min(1, (now - start2) / ms);
      frame(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
var active2 = null;
var page = {
  cover: (x, y) => active2?.cover(x, y) ?? Promise.resolve(),
  reveal: () => active2?.reveal() ?? Promise.resolve()
};
var pageTransition = {
  name: "page-transition",
  meta: META["page-transition"],
  mount(el, ctx) {
    const style = ctx.str("style", "wave") || "wave";
    const dur = ctx.time("duration", 750);
    const label = ctx.str("label");
    const linkSel = ctx.str("links", "a[href]") || "a[href]";
    const cs = getComputedStyle(el);
    const c1 = cs.getPropertyValue("--fx-color").trim() || "#0b0c12";
    const c2 = cs.getPropertyValue("--fx-color-2").trim() || "#ffb547";
    const layer = document.createElement("div");
    layer.className = "fx-pt";
    layer.setAttribute("aria-hidden", "true");
    layer.dataset.style = style;
    layer.style.setProperty("--_pt-c1", c1);
    layer.style.setProperty("--_pt-c2", c2);
    let paths = [];
    let cols = [];
    if (style === "wave") {
      const svg = document.createElementNS(SVGNS2, "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("preserveAspectRatio", "none");
      paths = [c2, c1].map((fill) => {
        const p = document.createElementNS(SVGNS2, "path");
        p.setAttribute("fill", fill);
        p.setAttribute("d", "M0 100 H100 V100 H0 Z");
        svg.append(p);
        return p;
      });
      layer.append(svg);
    } else if (style === "curtain") {
      for (let i = 0; i < 5; i++) {
        const c = document.createElement("i");
        c.style.setProperty("--i", String(i));
        layer.append(c);
        cols.push(c);
      }
    } else {
      layer.append(document.createElement("i"));
    }
    if (label) {
      const l = document.createElement("span");
      l.className = "fx-pt-label";
      l.textContent = label;
      layer.append(l);
    }
    document.body.append(layer);
    const reduced = ctx.env.reduced;
    let busy = false;
    const wave = (path, p, covering) => {
      const e = ease(p);
      const bulge = Math.sin(e * Math.PI) * 22;
      if (covering) {
        const y = 100 - e * 100;
        path.setAttribute("d", `M0 ${y} Q50 ${y - bulge} 100 ${y} V100 H0 Z`);
      } else {
        const y = 100 - e * 100;
        path.setAttribute("d", `M0 0 H100 V${y} Q50 ${y - bulge} 0 ${y} Z`);
      }
    };
    const setCovered = (on2) => {
      layer.toggleAttribute("data-covered", on2);
      if (on2) {
        paths.forEach((p) => p.setAttribute("d", "M0 0 H100 V100 H0 Z"));
        cols.forEach((c) => c.style.translate = "0 0");
      }
    };
    const api = {
      async cover(x, y) {
        layer.setAttribute("data-active", "");
        if (reduced) return void setCovered(true);
        if (style === "wave") {
          await tween(dur, (p) => {
            wave(paths[0], Math.min(1, p * 1.15), true);
            wave(paths[1], Math.max(0, p * 1.15 - 0.15), true);
          });
        } else if (style === "curtain") {
          const anims = cols.map(
            (c, i) => c.animate([{ translate: "0 100%" }, { translate: "0 0" }], { duration: dur * 0.75, delay: i * dur * 0.06, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" })
          );
          await Promise.all(anims.map((a) => a.finished));
        } else if (style === "circle") {
          const px2 = x ?? innerWidth / 2;
          const py = y ?? innerHeight / 2;
          const r = Math.hypot(Math.max(px2, innerWidth - px2), Math.max(py, innerHeight - py));
          const shape = layer.querySelector("i");
          await shape.animate(
            [{ clipPath: `circle(0px at ${px2}px ${py}px)` }, { clipPath: `circle(${r}px at ${px2}px ${py}px)` }],
            { duration: dur, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }
          ).finished;
        } else {
          const shape = layer.querySelector("i");
          await shape.animate([{ translate: "0 100%" }, { translate: "0 0" }], { duration: dur, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" }).finished;
        }
        setCovered(true);
      },
      async reveal() {
        layer.setAttribute("data-active", "");
        setCovered(true);
        layer.setAttribute("data-leaving", "");
        if (!reduced) {
          if (style === "wave") {
            await tween(dur, (p) => {
              wave(paths[1], Math.min(1, p * 1.15), false);
              wave(paths[0], Math.max(0, p * 1.15 - 0.15), false);
            });
          } else if (style === "curtain") {
            const anims = cols.map(
              (c, i) => c.animate([{ translate: "0 0" }, { translate: "0 -100%" }], { duration: dur * 0.75, delay: i * dur * 0.06, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" })
            );
            await Promise.all(anims.map((a) => a.finished));
          } else if (style === "circle") {
            const shape = layer.querySelector("i");
            const r = Math.hypot(innerWidth, innerHeight) / 2;
            await shape.animate(
              [{ clipPath: `circle(${r}px at 50% 50%)` }, { clipPath: `circle(0px at 50% 50%)` }],
              { duration: dur, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }
            ).finished;
          } else {
            const shape = layer.querySelector("i");
            await shape.animate([{ translate: "0 0" }, { translate: "0 -100%" }], { duration: dur, easing: "cubic-bezier(.7,0,.3,1)", fill: "forwards" }).finished;
          }
        }
        layer.removeAttribute("data-covered");
        layer.removeAttribute("data-active");
        layer.removeAttribute("data-leaving");
        layer.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        cols.forEach((c) => c.style.translate = "");
        paths.forEach((p) => p.setAttribute("d", "M0 100 H100 V100 H0 Z"));
      }
    };
    active2 = api;
    let arriving = false;
    try {
      const raw = sessionStorage.getItem(ARRIVAL_KEY);
      if (raw && Date.now() - JSON.parse(raw).t < 6e3) arriving = true;
      sessionStorage.removeItem(ARRIVAL_KEY);
    } catch {
    }
    if (arriving) {
      setCovered(true);
      layer.setAttribute("data-active", "");
      document.documentElement.classList.remove("fx-pt-arriving");
      requestAnimationFrame(() => api.reveal());
    }
    const shouldHandle = (a, e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
      if (a.target && a.target !== "_self") return false;
      if (a.hasAttribute("download") || a.closest("[data-fx-no-transition]")) return false;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return false;
      if (url.pathname === location.pathname && url.search === location.search) return false;
      return true;
    };
    const onClick = async (e) => {
      const a = e.target?.closest?.(linkSel);
      if (!a || !(a instanceof HTMLAnchorElement) || busy || !shouldHandle(a, e)) return;
      e.preventDefault();
      busy = true;
      try {
        sessionStorage.setItem(ARRIVAL_KEY, JSON.stringify({ style, color: c1, t: Date.now() }));
      } catch {
      }
      await api.cover(e.clientX, e.clientY);
      location.href = a.href;
      setTimeout(() => {
        busy = false;
        api.reveal();
      }, 4e3);
    };
    const onShow = (e) => {
      if (e.persisted) {
        busy = false;
        layer.removeAttribute("data-covered");
        layer.removeAttribute("data-active");
        layer.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        paths.forEach((p) => p.setAttribute("d", "M0 100 H100 V100 H0 Z"));
      }
    };
    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onShow);
      layer.remove();
      if (active2 === api) active2 = null;
    };
  }
};
var preloader = {
  name: "preloader",
  meta: META.preloader,
  mount(el, ctx) {
    if (el.hasAttribute("data-fx-done")) return;
    el.getAnimations?.().forEach((a) => a.cancel());
    const release = hold();
    const min = ctx.time("min", 900);
    const style = ctx.str("style", "slide") || "slide";
    let counter2 = el.querySelector("[data-fx-count]");
    const created = !counter2;
    if (!counter2) {
      counter2 = document.createElement("span");
      counter2.setAttribute("data-fx-count", "");
      el.append(counter2);
    }
    const out = counter2;
    setState(el, "run");
    el.setAttribute("role", "progressbar");
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", "100");
    el.setAttribute("aria-label", el.getAttribute("aria-label") || "Loading");
    document.documentElement.classList.add("fx-loading");
    const start2 = performance.now();
    const imgs = Array.from(document.images).filter((i) => i.loading !== "lazy");
    let shown = 0;
    let raf2 = 0;
    let done = false;
    const loaded = () => imgs.filter((i) => i.complete).length;
    const target = () => {
      const ready = document.readyState === "complete" ? 1 : 0;
      const frac = (loaded() + ready) / (imgs.length + 1);
      const creep = Math.min(0.9, (performance.now() - start2) / 6e3);
      return Math.max(frac, creep) * 100;
    };
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf2);
      out.textContent = "100";
      el.setAttribute("aria-valuenow", "100");
      el.style.setProperty("--fx-p", "1");
      document.documentElement.classList.remove("fx-loading");
      setTimeout(release, ctx.env.reduced ? 0 : 180);
      const exit = ctx.env.reduced || style === "fade" ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ctx.env.reduced ? 200 : 500, fill: "forwards" }) : style === "wave" ? el.animate(
        [
          { translate: "0 0", borderBottomLeftRadius: "0 0", borderBottomRightRadius: "0 0" },
          { translate: "0 -100%", borderBottomLeftRadius: "50% 18vh", borderBottomRightRadius: "50% 18vh" }
        ],
        { duration: 900, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" }
      ) : el.animate([{ translate: "0 0" }, { translate: "0 -100%" }], { duration: 850, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
      exit.finished.then(() => {
        el.setAttribute("data-fx-done", "");
        setState(el, "done");
        document.dispatchEvent(new CustomEvent("fx:loaded"));
      });
    };
    const step = () => {
      const t = Math.min(100, target());
      shown += (t - shown) * 0.08 + 0.15;
      shown = Math.min(shown, t);
      const v = Math.floor(shown);
      out.textContent = String(v).padStart(3, "0");
      el.setAttribute("aria-valuenow", String(v));
      el.style.setProperty("--fx-p", (v / 100).toFixed(3));
      if (document.readyState === "complete" && shown >= 99.5 && performance.now() - start2 > min) return finish();
      raf2 = requestAnimationFrame(step);
    };
    raf2 = requestAnimationFrame(step);
    const hardStop = setTimeout(finish, 8e3);
    return () => {
      release();
      cancelAnimationFrame(raf2);
      clearTimeout(hardStop);
      document.documentElement.classList.remove("fx-loading");
      setState(el, "run", false);
      el.style.removeProperty("--fx-p");
      if (created) out.remove();
    };
  }
};

// src/effects/modal.ts
var SVGNS3 = "http://www.w3.org/2000/svg";
var clamp2 = (v, a, b) => Math.min(b, Math.max(a, v));
var lerp2 = (a, b, t) => a + (b - a) * t;
var smooth = (a, b, x) => {
  const t = clamp2((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
var easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
var gooReady = false;
function ensureGoo() {
  if (gooReady && document.getElementById("fx-goo")) return;
  const svg = document.createElementNS(SVGNS3, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "fx-svg-defs");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  svg.innerHTML = '<filter id="fx-goo" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/></filter>';
  document.body.append(svg);
  gooReady = true;
}
var instances = /* @__PURE__ */ new WeakMap();
var delegated = false;
function delegate() {
  if (delegated) return;
  delegated = true;
  document.addEventListener("click", (e) => {
    const t = e.target?.closest?.('[data-fx-open], a[href^="#"]');
    if (!t) return;
    const sel = t.getAttribute("data-fx-open") || t.getAttribute("href") || "";
    if (sel.length < 2) return;
    let target = null;
    try {
      target = document.querySelector(sel);
    } catch {
      return;
    }
    if (target instanceof HTMLDialogElement && instances.has(target)) {
      e.preventDefault();
      instances.get(target).open(t);
    }
  });
}
var SIDES = ["center", "right", "left", "bottom", "top"];
function sheetRoot(sel) {
  const tries = [sel, "[data-fx-sheet-root]", "#__next", "#root", "#app", ".wp-site-blocks"].filter(Boolean);
  for (const t of tries) {
    try {
      const el = document.querySelector(t);
      if (el && el !== document.body && el !== document.documentElement) return el;
    } catch {
    }
  }
  return null;
}
function mountDialog(el, ctx, name, defaults) {
  if (!(el instanceof HTMLDialogElement)) {
    console.warn(`[lumafx] ${name}: use it on a <dialog> element`);
    return;
  }
  {
    const dlg = el;
    const sideOpt = ctx.str("side", defaults.side) || defaults.side;
    const side = SIDES.includes(sideOpt) ? sideOpt : defaults.side;
    const style = ctx.env.reduced ? "fade" : ctx.str("style", defaults.style) || defaults.style;
    dlg.setAttribute("data-fx-style-active", style);
    dlg.setAttribute("data-fx-side-active", side);
    let panel = dlg.querySelector(":scope > .fx-md-panel");
    const createdPanel = !panel;
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "fx-md-panel";
      panel.append(...Array.from(dlg.childNodes));
      dlg.append(panel);
    }
    const p = panel;
    let goo = null;
    let shape, neck, drop;
    if (style === "liquid") {
      ensureGoo();
      goo = document.createElement("div");
      goo.className = "fx-md-goo";
      goo.setAttribute("aria-hidden", "true");
      shape = document.createElement("i");
      shape.className = "fx-md-shape";
      neck = document.createElement("i");
      neck.className = "fx-md-neck";
      drop = document.createElement("i");
      drop.className = "fx-md-drop";
      goo.append(drop, neck, shape);
      dlg.prepend(goo);
    }
    let animating = false;
    const anims = [];
    const clearAnims = () => {
      anims.forEach((a) => a.cancel());
      anims.length = 0;
    };
    const geometry = () => {
      const r = p.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      return { r, vh, vw, rise: vh - r.top + 40 };
    };
    let raf2 = 0;
    let trigger = null;
    const stopLiquid = () => cancelAnimationFrame(raf2);
    const isClear = (c) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c);
    const sourceOf = (W, vw, vh) => {
      const mode = ctx.str("from", "auto") || "auto";
      if (mode !== "bottom" && trigger && trigger.isConnected && !dlg.contains(trigger)) {
        const t = trigger.getBoundingClientRect();
        if (t.width > 0 && t.height > 0 && t.bottom > 0 && t.top < vh && t.right > 0 && t.left < vw) {
          const cs = getComputedStyle(trigger);
          const bg = cs.backgroundColor;
          const rr = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, t.height / 2, t.width / 2);
          return { kind: "trigger", x: t.left, y: t.top, w: t.width, h: t.height, radius: rr + "px", color: isClear(bg) ? "" : bg };
        }
      }
      const w = clamp2(W * 0.36, 110, 200);
      const h = 80;
      return { kind: "bottom", x: vw / 2 - w / 2, y: vh - h * 0.36, w, h, radius: "50%", color: "" };
    };
    const playLiquid = (opening) => new Promise((resolve) => {
      const { r, vh, vw } = geometry();
      if (r.width < 1 || r.height < 1) return resolve();
      const W = r.width;
      const H = r.height;
      const src = sourceOf(W, vw, vh);
      const fromBottom = src.kind === "bottom";
      const pad = 70;
      const left = Math.max(0, Math.min(r.left, src.x) - pad);
      const top = Math.max(0, Math.min(r.top, src.y) - pad);
      const right = Math.min(vw, Math.max(r.right, src.x + src.w) + pad);
      const bottomEdge = fromBottom ? vh : Math.min(vh, Math.max(r.bottom, src.y + src.h) + pad);
      const width = right - left;
      const height = bottomEdge - top;
      Object.assign(goo.style, { left: left + "px", top: top + "px", width: width + "px", height: height + "px" });
      const radius = parseFloat(getComputedStyle(p).borderTopLeftRadius) || 26;
      const cx = r.left - left + W / 2;
      const cy = r.top - top + H / 2;
      const ox = src.x - left + src.w / 2;
      const oy = fromBottom ? vh - top : src.y - top + src.h / 2;
      const d0 = fromBottom ? clamp2(W * 0.12, 40, 66) : clamp2(Math.min(src.w, src.h), 30, 64);
      const sy0 = fromBottom ? oy - d0 * 0.2 : oy;
      const dx = cx - ox;
      const dy = cy - sy0;
      const dist = Math.hypot(dx, dy) || 1;
      const travelDeg = Math.atan2(dy, dx) * 180 / Math.PI;
      const nx = -dy / dist * dist * 0.06;
      const ny = dx / dist * dist * 0.06;
      const panelColor = getComputedStyle(dlg).getPropertyValue("--_md-c").trim() || "#20232e";
      const srcColor = src.color || panelColor;
      Object.assign(shape.style, { left: r.left - left + "px", top: r.top - top + "px", width: W + "px", height: H + "px" });
      Object.assign(drop.style, { left: src.x - left + "px", top: src.y - top + "px", width: src.w + "px", height: src.h + "px", borderRadius: src.radius, transformOrigin: fromBottom ? "50% 100%" : "50% 50%", backgroundColor: srcColor });
      Object.assign(neck.style, { left: "0px", top: "0px", width: "100px", height: "100px", backgroundColor: srcColor });
      const render = (k) => {
        const q = easeInOut(clamp2((k - 0.03) / 0.6, 0, 1));
        const grow = easeInOut(clamp2((k - 0.24) / 0.46, 0, 1));
        const emerge = smooth(0, 0.08, k);
        const arc = Math.sin(q * Math.PI);
        const px2 = ox + dx * q + nx * arc;
        const py = sy0 + dy * q + ny * arc;
        let sx = lerp2(d0 / W, 1, grow) * emerge;
        let sy = lerp2(d0 / H, 1, grow) * emerge;
        const stretch = arc * 0.34 * (1 - grow * 0.6);
        const land = clamp2((k - 0.66) / 0.34, 0, 1);
        const wobble = Math.sin(land * Math.PI * 2) * (1 - land) * 0.05;
        sx *= 1 + wobble;
        sy *= 1 - wobble;
        const c = smooth(0.3, 0.72, k);
        shape.style.transform = `translate(${(px2 - cx).toFixed(2)}px, ${(py - cy).toFixed(2)}px) rotate(${travelDeg.toFixed(2)}deg) scale(${(1 + stretch).toFixed(4)}, ${(1 - stretch * 0.45).toFixed(4)}) rotate(${(-travelDeg).toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
        shape.style.borderRadius = `${lerp2(W / 2, radius, c).toFixed(2)}px / ${lerp2(H / 2, radius, c).toFixed(2)}px`;
        shape.style.backgroundColor = src.color ? `color-mix(in oklab, ${src.color} ${((1 - grow) * 100).toFixed(1)}%, ${panelColor})` : "";
        if (fromBottom) {
          const swell = smooth(0, 0.12, k) * (1 - smooth(0.3, 0.55, k));
          drop.style.transform = `translate(0px, ${((1 - swell) * src.h * 0.7).toFixed(2)}px) scale(${(0.55 + 0.45 * swell).toFixed(4)}, ${(0.45 + 0.55 * swell).toFixed(4)})`;
          drop.style.opacity = swell > 0.01 ? "1" : "0";
        } else {
          const swell = smooth(0, 0.12, k);
          const release = smooth(0.26, 0.56, k);
          const sc = (1 + 0.1 * swell) * (1 - 0.35 * release);
          drop.style.transform = `scale(${sc.toFixed(4)})`;
          drop.style.opacity = (1 - release).toFixed(3);
        }
        const nw = d0 * 0.36 * (1 - smooth(0.14, 0.36, k)) * emerge;
        const ax = ox;
        const ay = fromBottom ? oy + 6 : oy;
        const len = Math.hypot(px2 - ax, py - ay);
        if (nw > 0.5 && len > 1) {
          const ang = Math.atan2(py - ay, px2 - ax) * 180 / Math.PI;
          neck.style.opacity = "1";
          neck.style.transform = `translate(${ax.toFixed(2)}px, ${ay.toFixed(2)}px) rotate(${ang.toFixed(2)}deg) translate(0px, ${(-nw / 2).toFixed(2)}px) scale(${(len / 100).toFixed(4)}, ${(nw / 100).toFixed(4)})`;
        } else neck.style.opacity = "0";
        const show = smooth(0.68, 0.9, k);
        p.style.opacity = show.toFixed(3);
        p.style.translate = `0 ${((1 - show) * 12).toFixed(2)}px`;
      };
      const duration = opening ? 1e3 : 820;
      let start2 = -1;
      const step = (now) => {
        if (start2 < 0) start2 = now;
        const t = Math.min(1, (now - start2) / duration);
        render(opening ? t : 1 - t);
        if (t < 1) raf2 = requestAnimationFrame(step);
        else {
          p.style.opacity = "";
          p.style.translate = "";
          resolve();
        }
      };
      render(opening ? 0 : 1);
      raf2 = requestAnimationFrame(step);
    });
    const away = {
      center: "0 0",
      right: "calc(100% + 24px) 0",
      left: "calc(-100% - 24px) 0",
      bottom: "0 calc(100% + 24px)",
      top: "0 calc(-100% - 24px)"
    };
    const horizontal = side === "left" || side === "right";
    let pageAnim = null;
    let pageRoot = null;
    const scalePage = (opening, duration) => {
      if (opening) {
        pageRoot = sheetRoot(ctx.str("root"));
        if (!pageRoot) return;
        const r = pageRoot.getBoundingClientRect();
        const vh = window.innerHeight;
        const topIn = Math.max(0, -r.top);
        const botIn = Math.max(0, r.bottom - vh);
        pageRoot.style.transformOrigin = `50% ${(topIn + Math.min(vh, r.height) / 2).toFixed(1)}px`;
        document.documentElement.style.backgroundColor = "#000";
        pageAnim = pageRoot.animate(
          [
            { scale: 1, clipPath: `inset(${topIn}px 0 ${botIn}px 0 round 0px)`, filter: "brightness(1)" },
            { scale: 0.93, clipPath: `inset(${topIn}px 0 ${botIn}px 0 round 22px)`, filter: "brightness(.8)" }
          ],
          { duration, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
        );
      } else if (pageAnim && pageRoot) {
        const root = pageRoot;
        const a = pageAnim;
        a.updatePlaybackRate(duration > 0 ? a.effect?.getTiming().duration / duration : 1);
        a.reverse();
        a.finished.then(() => {
          a.cancel();
          root.style.transformOrigin = "";
          document.documentElement.style.backgroundColor = "";
        });
        pageAnim = null;
      }
    };
    let moveAnim = null;
    let moveTarget = null;
    const movePage = (opening, duration, easing) => {
      if (style !== "push" && style !== "dock") return;
      if (opening) {
        const pr = p.getBoundingClientRect();
        const dist = Math.round((horizontal ? pr.width : pr.height) + 12);
        const root = sheetRoot(ctx.str("root"));
        let frames2;
        if (style === "push" && root) {
          const sign = side === "right" || side === "bottom" ? -1 : 1;
          frames2 = [{ translate: "0 0" }, { translate: horizontal ? `${sign * dist}px 0` : `0 ${sign * dist}px` }];
          moveTarget = root;
        } else {
          const target = style === "dock" ? root || document.body : document.body;
          const near = { right: "marginRight", left: "marginLeft", bottom: "marginBottom", top: "marginTop", center: "marginRight" }[side];
          const far = { right: "marginLeft", left: "marginRight", bottom: "marginTop", top: "marginBottom", center: "marginLeft" }[side];
          frames2 = style === "dock" ? [{ [near]: "0px" }, { [near]: dist + "px" }] : [
            { [near]: "0px", [far]: "0px" },
            { [near]: dist + "px", [far]: -dist + "px" }
          ];
          moveTarget = target;
        }
        moveAnim = moveTarget.animate(frames2, { duration, easing, fill: "forwards" });
      } else if (moveAnim) {
        const a = moveAnim;
        a.updatePlaybackRate(a.effect?.getTiming().duration / Math.max(1, duration));
        a.reverse();
        a.finished.then(() => a.cancel());
        moveAnim = null;
      }
    };
    const playSheet = async (opening) => {
      const { rise } = geometry();
      let frames2;
      let duration;
      let easing;
      if (side !== "center" && style !== "fade") {
        const off = away[side];
        const stretch = horizontal ? "0.9 1.02" : "1.02 0.9";
        const over = horizontal ? "1.015 0.995" : "0.995 1.015";
        frames2 = style === "glass" ? [
          { translate: off, scale: stretch, opacity: 0.7 },
          { translate: "0 0", scale: over, opacity: 1, offset: 0.62 },
          { translate: "0 0", scale: "1 1", opacity: 1 }
        ] : [{ translate: off }, { translate: "0 0" }];
        p.style.transformOrigin = { right: "100% 50%", left: "0 50%", bottom: "50% 100%", top: "50% 0", center: "50% 50%" }[side];
        duration = opening ? style === "glass" ? 720 : 560 : 380;
        easing = opening ? "cubic-bezier(.2,.9,.25,1.04)" : "cubic-bezier(.25,.8,.45,1)";
      } else {
        frames2 = style === "glass" ? [
          { translate: `0 ${rise}px`, scale: "0.92 1.08", opacity: 0.6 },
          { translate: "0 -8px", scale: "1.01 0.99", opacity: 1, offset: 0.7 },
          { translate: "0 0", scale: "1 1", opacity: 1 }
        ] : style === "scale" ? [
          { scale: "0.9", opacity: 0 },
          { scale: "1", opacity: 1 }
        ] : [{ opacity: 0 }, { opacity: 1 }];
        duration = style === "glass" ? 700 : style === "scale" ? 420 : 260;
        easing = style === "glass" ? "cubic-bezier(.2,.9,.25,1.05)" : style === "scale" ? "cubic-bezier(.2,.9,.25,1.1)" : "ease-out";
        if (!opening) duration = Math.round(duration * 0.7);
      }
      if (style === "scale") scalePage(opening, duration);
      movePage(opening, duration, opening ? easing : "cubic-bezier(.55,0,.75,.2)");
      const a = p.animate(frames2, { duration, easing, fill: "both", direction: opening ? "normal" : "reverse" });
      anims.push(a);
      await a.finished;
    };
    const api = {
      async open(from) {
        if (dlg.open || animating) return;
        trigger = from ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
        animating = true;
        clearAnims();
        stopLiquid();
        if (style === "dock") dlg.show();
        else dlg.showModal();
        setState(dlg, "opening");
        try {
          await (style === "liquid" ? playLiquid(true) : playSheet(true));
        } catch {
        }
        setState(dlg, "opening", false);
        setState(dlg, "shown");
        animating = false;
        dlg.dispatchEvent(new CustomEvent("fx:open"));
      },
      async close() {
        if (!dlg.open || animating) return;
        animating = true;
        clearAnims();
        setState(dlg, "shown", false);
        setState(dlg, "closing");
        try {
          await (style === "liquid" ? playLiquid(false) : playSheet(false));
        } catch {
        }
        dlg.close();
        clearAnims();
        setState(dlg, "closing", false);
        animating = false;
        dlg.dispatchEvent(new CustomEvent("fx:close"));
      }
    };
    instances.set(dlg, api);
    delegate();
    const onCancel = (e) => {
      e.preventDefault();
      api.close();
    };
    const onClick = (e) => {
      const t = e.target;
      if (t.closest("[data-fx-close]")) {
        e.preventDefault();
        return api.close();
      }
      if (!p.contains(t)) api.close();
    };
    dlg.addEventListener("cancel", onCancel);
    const onKey = (e) => {
      if (e.key === "Escape" && dlg.open && style === "dock") api.close();
    };
    document.addEventListener("keydown", onKey);
    dlg.addEventListener("click", onClick);
    return () => {
      dlg.removeEventListener("cancel", onCancel);
      document.removeEventListener("keydown", onKey);
      moveAnim?.cancel();
      dlg.removeEventListener("click", onClick);
      stopLiquid();
      clearAnims();
      instances.delete(dlg);
      goo?.remove();
      if (createdPanel) {
        while (p.firstChild) dlg.insertBefore(p.firstChild, p);
        p.remove();
      }
      dlg.removeAttribute("data-fx-style-active");
      dlg.removeAttribute("data-fx-side-active");
      ["opening", "shown", "closing"].forEach((s) => setState(dlg, s, false));
    };
  }
}
var modal = {
  name: "modal",
  meta: META.modal,
  mount: (el, ctx) => mountDialog(el, ctx, "modal", { style: "liquid", side: "center" })
};
var drawer = {
  name: "drawer",
  meta: META.drawer,
  mount: (el, ctx) => mountDialog(el, ctx, "drawer", { style: "slide", side: "right" })
};
var modals = {
  open: (target, opts = {}) => {
    const d = typeof target === "string" ? document.querySelector(target) : target;
    if (d instanceof HTMLDialogElement) instances.get(d)?.open(opts.from ?? null);
  },
  close: (target) => {
    const d = typeof target === "string" ? document.querySelector(target) : target;
    if (d instanceof HTMLDialogElement) instances.get(d)?.close();
  }
};

// src/effects/components.ts
function placeCard(t, c, vw, vh, prefer = "auto", gap = 10) {
  const room = { top: t.top, bottom: vh - t.bottom, left: t.left, right: vw - t.right };
  const fits = (s) => s === "top" || s === "bottom" ? room[s] >= c.height + gap + 8 : room[s] >= c.width + gap + 8;
  let side = ["top", "bottom", "left", "right"].includes(prefer) && fits(prefer) ? prefer : "";
  if (!side) side = fits("bottom") ? "bottom" : fits("top") ? "top" : room.right >= room.left ? "right" : "left";
  let x;
  let y;
  if (side === "bottom" || side === "top") {
    x = t.left + t.width / 2 - c.width / 2;
    y = side === "bottom" ? t.bottom + gap : t.top - gap - c.height;
  } else {
    y = t.top + t.height / 2 - c.height / 2;
    x = side === "right" ? t.right + gap : t.left - gap - c.width;
  }
  x = clamp(x, 8, Math.max(8, vw - c.width - 8));
  y = clamp(y, 8, Math.max(8, vh - c.height - 8));
  const ox = clamp(t.left + t.width / 2 - x, 0, c.width);
  const oy = side === "bottom" ? 0 : side === "top" ? c.height : clamp(t.top + t.height / 2 - y, 0, c.height);
  return { x, y, side, ox, oy };
}
var card = null;
var cardOwner = null;
var hideTimer = 0;
var cardUsers = 0;
function ensureCard() {
  if (card) return card;
  card = document.createElement("div");
  card.className = "fx-hc";
  card.id = "fx-hovercard";
  card.setAttribute("role", "tooltip");
  card.addEventListener("pointerenter", () => clearTimeout(hideTimer));
  card.addEventListener("pointerleave", () => scheduleHide());
  document.body.append(card);
  return card;
}
function hideCard() {
  if (!card) return;
  card.removeAttribute("data-state");
  cardOwner?.removeAttribute("aria-describedby");
  cardOwner = null;
}
function scheduleHide(ms = 140) {
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hideCard, ms);
}
var hovercard = {
  name: "hovercard",
  meta: META.hovercard,
  mount(el, ctx) {
    const sel = ctx.str("for");
    const text = ctx.str("text");
    if (!sel && !text) return;
    cardUsers++;
    const prefer = ctx.str("placement", "auto") || "auto";
    const delay = ctx.time("delay", 90);
    let openTimer = 0;
    const show = () => {
      const c = ensureCard();
      clearTimeout(hideTimer);
      if (cardOwner !== el) {
        if (sel) {
          const src = document.querySelector(sel);
          if (!src) return;
          const from = src instanceof HTMLTemplateElement ? src.content.cloneNode(true) : src.cloneNode(true);
          c.replaceChildren(...Array.from(from.childNodes));
        } else c.textContent = text || "";
        cardOwner?.removeAttribute("aria-describedby");
        cardOwner = el;
      }
      el.setAttribute("aria-describedby", "fx-hovercard");
      c.style.left = "0px";
      c.style.top = "0px";
      const cr = c.getBoundingClientRect();
      const p = placeCard(el.getBoundingClientRect(), cr, window.innerWidth, window.innerHeight, prefer);
      c.style.left = p.x + "px";
      c.style.top = p.y + "px";
      c.style.transformOrigin = `${p.ox}px ${p.oy}px`;
      c.dataset.side = p.side;
      c.setAttribute("data-state", "open");
    };
    const offs = [
      on(el, "pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        clearTimeout(openTimer);
        openTimer = window.setTimeout(show, delay);
      }),
      on(el, "pointerleave", () => {
        clearTimeout(openTimer);
        scheduleHide();
      }),
      on(el, "focusin", show),
      on(el, "focusout", () => scheduleHide(60)),
      on(el, "keydown", (e) => e.key === "Escape" && hideCard())
    ];
    return () => {
      offs.forEach((f2) => f2());
      clearTimeout(openTimer);
      if (cardOwner === el) hideCard();
      if (--cardUsers <= 0 && card) {
        card.remove();
        card = null;
      }
    };
  }
};
var smartHeader = {
  name: "smart-header",
  meta: META["smart-header"],
  mount(el, ctx) {
    const threshold = ctx.px("threshold", 80);
    const hide = ctx.bool("hide", true) && !ctx.env.reduced;
    const logo = el.querySelector("[data-fx-logo]");
    let lastY = window.scrollY;
    let raf2 = 0;
    let g = null;
    const measure = () => {
      if (!logo) return;
      logo.style.transform = "";
      const r = logo.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const vw = document.documentElement.clientWidth;
      const frac = parseFloat(logo.getAttribute("data-fx-logo") || "") || 0.9;
      const targetW = vw * frac;
      const s = targetW / r.width;
      const range = clamp((s - 1) * r.height + 60, 120, window.innerHeight * 0.6);
      g = { s, tx: (vw - targetW) / 2 - r.left, ty: el.offsetHeight + 12 - top, range };
    };
    const update = () => {
      raf2 = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      setState(el, "scrolled", y > threshold);
      let docking = false;
      if (logo && g) {
        const p = clamp(y / g.range, 0, 1);
        const k = (1 - p) * (1 - p);
        docking = p < 1;
        logo.style.transform = k > 1e-3 ? `translate(${(g.tx * k).toFixed(2)}px, ${(g.ty * k).toFixed(2)}px) scale(${(1 + (g.s - 1) * k).toFixed(4)})` : "";
        setState(el, "docked", !docking);
      }
      if (hide && Math.abs(dy) > 4) {
        setState(el, "hidden", dy > 0 && y > threshold + el.offsetHeight && !docking && !el.matches(":focus-within"));
      }
      if (Math.abs(dy) > 4 || y < threshold) lastY = y;
    };
    const onScroll2 = () => {
      if (!raf2) raf2 = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      update();
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll2, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = logo ? new ResizeObserver(() => onResize()) : null;
    if (logo) ro.observe(logo);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf2);
      window.removeEventListener("scroll", onScroll2);
      window.removeEventListener("resize", onResize);
      if (logo) logo.style.transform = "";
      ["scrolled", "hidden", "docked"].forEach((s) => setState(el, s, false));
    };
  }
};
var scrollbarActive = false;
var scrollbar = {
  name: "scrollbar",
  meta: META.scrollbar,
  mount(el, ctx) {
    if (!ctx.env.finePointer || scrollbarActive) return;
    scrollbarActive = true;
    const html = document.documentElement;
    html.setAttribute("data-fx-scrollbar", "");
    const color = getComputedStyle(el).getPropertyValue("--fx-color").trim();
    const sel = ctx.str("sections", "h2, [data-fx-section]") || "h2, [data-fx-section]";
    const rail = document.createElement("div");
    rail.className = "fx-sb";
    rail.setAttribute("aria-hidden", "true");
    if (color) rail.style.setProperty("--_sb-c", color);
    const track = document.createElement("div");
    track.className = "fx-sb-track";
    const marks = document.createElement("div");
    marks.className = "fx-sb-marks";
    const thumb = document.createElement("div");
    thumb.className = "fx-sb-thumb";
    const tip = document.createElement("div");
    tip.className = "fx-sb-tip";
    track.append(marks, thumb);
    rail.append(track, tip);
    document.body.append(rail);
    let sections = [];
    let docH = 1;
    let vh = 1;
    let trackH = 1;
    let thumbH = 40;
    const measure = () => {
      docH = html.scrollHeight;
      vh = window.innerHeight;
      trackH = track.clientHeight || 1;
      thumbH = Math.max(36, vh / docH * trackH);
      thumb.style.height = thumbH + "px";
      rail.hidden = docH <= vh + 4;
      sections = Array.from(document.querySelectorAll(sel)).filter((s) => s.offsetParent !== null && !rail.contains(s)).map((s) => ({
        top: s.getBoundingClientRect().top + window.scrollY,
        label: (s.getAttribute("data-fx-section") || s.getAttribute("aria-label") || s.textContent || "").trim().replace(/\s+/g, " ").slice(0, 64)
      })).filter((s) => s.label);
      marks.replaceChildren(
        ...sections.map((s) => {
          const m = document.createElement("i");
          m.style.top = (s.top / docH * 100).toFixed(3) + "%";
          return m;
        })
      );
    };
    const target = () => window.scrollY / Math.max(1, docH - vh) * (trackH - thumbH);
    let pos = target();
    let idleTimer = 0;
    const loop2 = sleeper((_now, dt) => {
      const t = target();
      const prev = pos;
      pos = damp(pos, t, 16, dt);
      const v = (pos - prev) / Math.max(dt, 1);
      const stretch = 1 + Math.min(Math.abs(v) * 0.9, 0.55);
      thumb.style.translate = `0 ${pos.toFixed(2)}px`;
      thumb.style.scale = `1 ${stretch.toFixed(3)}`;
      thumb.style.transformOrigin = v >= 0 ? "50% 100%" : "50% 0";
      return Math.abs(pos - t) > 0.3 || stretch > 1.005;
    });
    const activate = () => {
      setState(rail, "active");
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => !rail.matches(":hover") && setState(rail, "active", false), 1200);
    };
    const onScroll2 = () => {
      loop2.wake();
      activate();
    };
    const sectionAt = (frac) => {
      const y = frac * docH;
      let found = sections[0];
      for (const s of sections) if (s.top <= y + vh * 0.3) found = s;
      return found;
    };
    const onMove2 = (e) => {
      const r = track.getBoundingClientRect();
      const frac = clamp((e.clientY - r.top) / r.height, 0, 1);
      const s = sectionAt(frac);
      tip.textContent = (s ? s.label + " \xB7 " : "") + Math.round(frac * 100) + "%";
      tip.style.top = clamp(e.clientY - rail.getBoundingClientRect().top, 14, r.height - 14) + "px";
      setState(rail, "tip");
    };
    let drag = null;
    const offs = [
      on(window, "scroll", onScroll2, { passive: true }),
      on(window, "resize", () => (measure(), loop2.wake())),
      on(rail, "pointerenter", () => setState(rail, "active")),
      on(rail, "pointermove", onMove2),
      on(rail, "pointerleave", () => {
        setState(rail, "tip", false);
        activate();
      }),
      on(thumb, "pointerdown", (e) => {
        e.preventDefault();
        thumb.setPointerCapture(e.pointerId);
        drag = { y: e.clientY, scroll: window.scrollY };
        setState(rail, "dragging");
      }),
      on(thumb, "pointermove", (e) => {
        if (!drag) return;
        const ratio = (docH - vh) / Math.max(1, trackH - thumbH);
        window.scrollTo({ top: drag.scroll + (e.clientY - drag.y) * ratio, behavior: "instant" });
      }),
      on(thumb, "pointerup", () => {
        drag = null;
        setState(rail, "dragging", false);
      }),
      on(track, "click", (e) => {
        if (e.target === thumb) return;
        const r = track.getBoundingClientRect();
        const frac = clamp((e.clientY - r.top) / r.height, 0, 1);
        const s = sectionAt(frac);
        const top = s && Math.abs(s.top / docH - frac) < 0.04 ? s.top - 24 : frac * docH - vh / 2;
        window.scrollTo({ top, behavior: ctx.env.reduced ? "auto" : "smooth" });
      })
    ];
    const ro = new ResizeObserver(() => (measure(), loop2.wake()));
    ro.observe(document.body);
    measure();
    loop2.wake();
    return () => {
      offs.forEach((f2) => f2());
      ro.disconnect();
      loop2.stop();
      clearTimeout(idleTimer);
      rail.remove();
      html.removeAttribute("data-fx-scrollbar");
      scrollbarActive = false;
    };
  }
};
var scrollProgress = {
  name: "scroll-progress",
  meta: META["scroll-progress"],
  mount(el, ctx) {
    el.setAttribute("aria-hidden", "true");
    if (ctx.env.sda) return () => el.removeAttribute("aria-hidden");
    let raf2 = 0;
    const update = () => {
      raf2 = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.scale = `${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0} 1`;
    };
    const onScroll2 = () => {
      if (!raf2) raf2 = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll2, { passive: true });
    window.addEventListener("resize", onScroll2);
    return () => {
      cancelAnimationFrame(raf2);
      window.removeEventListener("scroll", onScroll2);
      window.removeEventListener("resize", onScroll2);
      el.style.scale = "";
      el.removeAttribute("aria-hidden");
    };
  }
};
var dock = {
  name: "dock",
  meta: META.dock,
  mount(el, ctx) {
    if (!ctx.env.finePointer || ctx.env.reduced) return;
    const mag = Math.max(1, ctx.num("magnify", 1.8));
    const range = ctx.px("range", 150);
    const items = () => Array.from(el.children);
    let px2 = null;
    let centers = [];
    const scales = /* @__PURE__ */ new Map();
    const loop2 = sleeper((_now, dt) => {
      let moving = false;
      items().forEach((it, i) => {
        const c = centers[i] ?? 0;
        const d = px2 === null ? Infinity : Math.abs(px2 - c);
        const k = d < range ? Math.cos(d / range * (Math.PI / 2)) : 0;
        const target = 1 + (mag - 1) * k * k;
        const cur = damp(scales.get(it) ?? 1, target, 14, dt);
        scales.set(it, cur);
        it.style.setProperty("--fx-s", cur.toFixed(4));
        if (Math.abs(cur - target) > 2e-3) moving = true;
      });
      return moving || px2 !== null;
    });
    const offs = [
      on(el, "pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        centers = items().map((it) => {
          const r = it.getBoundingClientRect();
          return r.left + r.width / 2;
        });
      }),
      on(el, "pointermove", (e) => {
        if (e.pointerType === "touch") return;
        px2 = e.clientX;
        loop2.wake();
      }),
      on(el, "pointerleave", () => {
        px2 = null;
        loop2.wake();
      })
    ];
    return () => {
      offs.forEach((f2) => f2());
      loop2.stop();
      items().forEach((it) => it.style.removeProperty("--fx-s"));
    };
  }
};
var lb = null;
var lbUsers = 0;
var hrefOf = (a) => a.getAttribute("href") || a.getAttribute("data-fx-src") || "";
var thumbOf = (a) => a.querySelector("img");
function lbSet(i, animate = true) {
  if (!lb) return;
  const n = lb.items.length;
  lb.index = (i + n) % n;
  const a = lb.items[lb.index];
  const t = thumbOf(a);
  lb.img.src = hrefOf(a);
  lb.img.alt = t?.alt || "";
  lb.cap.textContent = a.getAttribute("data-fx-caption") || a.closest("figure")?.querySelector("figcaption")?.textContent || t?.alt || "";
  lb.count.textContent = `${lb.index + 1} / ${n}`;
  lb.dlg.removeAttribute("data-zoom");
  lb.img.style.transformOrigin = "";
  if (animate) lb.img.animate([{ opacity: 0.2, scale: 0.98 }, { opacity: 1, scale: 1 }], { duration: 260, easing: "ease-out" });
  [-1, 1].forEach((d) => {
    const next = lb.items[(lb.index + d + n) % n];
    if (next) new Image().src = hrefOf(next);
  });
}
function ensureViewer(reduced) {
  if (lb) return lb;
  const dlg = document.createElement("dialog");
  dlg.className = "fx-lb";
  dlg.setAttribute("aria-label", "Image viewer");
  dlg.innerHTML = '<figure class="fx-lb-fig"><img class="fx-lb-img" alt=""><figcaption class="fx-lb-cap"></figcaption></figure><button type="button" class="fx-lb-btn fx-lb-prev" aria-label="Previous image">\u2039</button><button type="button" class="fx-lb-btn fx-lb-next" aria-label="Next image">\u203A</button><button type="button" class="fx-lb-btn fx-lb-close" aria-label="Close">\xD7</button><span class="fx-lb-count"></span>';
  document.body.append(dlg);
  lb = {
    dlg,
    img: dlg.querySelector(".fx-lb-img"),
    cap: dlg.querySelector(".fx-lb-cap"),
    count: dlg.querySelector(".fx-lb-count"),
    items: [],
    index: 0
  };
  const v = lb;
  dlg.querySelector(".fx-lb-prev").addEventListener("click", () => lbSet(v.index - 1));
  dlg.querySelector(".fx-lb-next").addEventListener("click", () => lbSet(v.index + 1));
  dlg.querySelector(".fx-lb-close").addEventListener("click", () => lbClose(reduced));
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    lbClose(reduced);
  });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") lbSet(v.index + 1);
    else if (e.key === "ArrowLeft") lbSet(v.index - 1);
  });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) lbClose(reduced);
  });
  v.img.addEventListener("click", (e) => {
    const r = v.img.getBoundingClientRect();
    v.img.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`;
    dlg.toggleAttribute("data-zoom");
  });
  v.img.addEventListener("pointermove", (e) => {
    if (!dlg.hasAttribute("data-zoom") || e.pointerType === "touch") return;
    const r = dlg.getBoundingClientRect();
    v.img.style.transformOrigin = `${e.clientX / r.width * 100}% ${e.clientY / r.height * 100}%`;
  });
  let sx = 0;
  dlg.addEventListener("pointerdown", (e) => sx = e.clientX);
  dlg.addEventListener("pointerup", (e) => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 60 && !dlg.hasAttribute("data-zoom")) lbSet(v.index + (dx < 0 ? 1 : -1));
  });
  return lb;
}
function morph2(from, to, update, reduced) {
  const doc = document;
  if (!doc.startViewTransition || reduced || !from || !to) return update();
  from.style.viewTransitionName = "fx-lb";
  const vt = doc.startViewTransition(() => {
    from.style.viewTransitionName = "";
    to.style.viewTransitionName = "fx-lb";
    update();
  });
  vt.finished.finally(() => to.style.viewTransitionName = "");
}
function lbClose(reduced) {
  if (!lb || !lb.dlg.open) return;
  const v = lb;
  morph2(v.img, thumbOf(v.items[v.index]), () => v.dlg.close(), reduced);
}
var lightbox = {
  name: "lightbox",
  meta: META.lightbox,
  mount(el, ctx) {
    const own = !!hrefOf(el);
    const links = own ? [el] : Array.from(el.querySelectorAll("a[href]")).filter((a) => thumbOf(a) && /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i.test(hrefOf(a)));
    if (!links.length) return;
    lbUsers++;
    const reduced = ctx.env.reduced;
    const offs = links.map(
      (link) => on(link, "click", (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        const v = ensureViewer(reduced);
        if (own) {
          const group = el.getAttribute("data-fx-group") || "";
          v.items = Array.from(document.querySelectorAll('[data-fx~="lightbox"],.fx-lightbox')).filter(
            (a) => (a.getAttribute("data-fx-group") || "") === group && hrefOf(a)
          );
        } else v.items = links;
        const i = Math.max(0, v.items.indexOf(link));
        morph2(thumbOf(link), v.img, () => {
          lbSet(i, false);
          v.dlg.showModal();
        }, reduced);
      })
    );
    return () => {
      offs.forEach((f2) => f2());
      if (--lbUsers <= 0 && lb) {
        lb.dlg.remove();
        lb = null;
      }
    };
  }
};

// src/effects/chat.ts
var ICON_CHAT = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.9 2 11.6c0 2.4 1.2 4.6 3.2 6.1L4.4 21l3.9-1.9c1.2.4 2.4.6 3.7.6 5.5 0 10-3.9 10-8.6S17.5 3 12 3Z"/></svg>';
var ICON_CLOSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>';
var ICON_SEND = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z"/></svg>';
var uid2 = 0;
var chat = {
  name: "chat",
  meta: META.chat,
  mount(el, ctx) {
    const id = `fx-chat-${++uid2}`;
    const title = ctx.str("title", "Chat") || "Chat";
    const subtitle = ctx.str("subtitle", "") || "";
    const greeting = ctx.str("greeting");
    const placeholder = ctx.str("placeholder", "Write a message\u2026") || "Write a message\u2026";
    const quick = (ctx.str("quick") || "").split(",").map((s) => s.trim()).filter(Boolean);
    el.dataset.position = ctx.str("position", "right") === "left" ? "left" : "right";
    const ui = document.createElement("div");
    ui.className = "fx-chat-ui";
    ui.innerHTML = `
      <section class="fx-chat-panel" id="${id}" role="dialog" aria-label="${title.replace(/"/g, "&quot;")}">
        <header class="fx-chat-head">
          <span class="fx-chat-avatar" aria-hidden="true"></span>
          <span class="fx-chat-titles"><b></b><small></small></span>
          <button type="button" class="fx-chat-x" aria-label="Close chat">${ICON_CLOSE}</button>
        </header>
        <div class="fx-chat-log" role="log" aria-live="polite"></div>
        <div class="fx-chat-quick"></div>
        <form class="fx-chat-form">
          <input type="text" autocomplete="off" aria-label="Message">
          <button type="submit" aria-label="Send">${ICON_SEND}</button>
        </form>
      </section>
      <button type="button" class="fx-chat-launch" aria-expanded="false" aria-controls="${id}" aria-label="Open chat">
        <span class="fx-chat-i1">${ICON_CHAT}</span><span class="fx-chat-i2">${ICON_CLOSE}</span>
      </button>`;
    el.append(ui);
    const $ = (s) => ui.querySelector(s);
    $(".fx-chat-titles b").textContent = title;
    $(".fx-chat-titles small").textContent = subtitle;
    const input = $(".fx-chat-form input");
    input.placeholder = placeholder;
    const log = $(".fx-chat-log");
    const launch = $(".fx-chat-launch");
    const quickBox = $(".fx-chat-quick");
    let typingEl = null;
    const scrollDown = () => typeof log.scrollTo === "function" ? log.scrollTo({ top: log.scrollHeight, behavior: ctx.env.reduced ? "auto" : "smooth" }) : log.scrollTop = log.scrollHeight;
    const add = (text, from) => {
      const m = document.createElement("div");
      m.className = "fx-msg";
      m.dataset.from = from;
      m.textContent = text;
      if (typingEl) log.insertBefore(m, typingEl);
      else log.append(m);
      scrollDown();
      return m;
    };
    const api = {
      open() {
        if (el.hasAttribute("data-open")) return;
        el.setAttribute("data-open", "");
        launch.setAttribute("aria-expanded", "true");
        launch.setAttribute("aria-label", "Close chat");
        setTimeout(() => input.focus({ preventScroll: true }), 120);
        el.dispatchEvent(new CustomEvent("fx:chat-open", { bubbles: true }));
      },
      close() {
        if (!el.hasAttribute("data-open")) return;
        el.removeAttribute("data-open");
        launch.setAttribute("aria-expanded", "false");
        launch.setAttribute("aria-label", "Open chat");
        launch.focus({ preventScroll: true });
      },
      toggle() {
        el.hasAttribute("data-open") ? api.close() : api.open();
      },
      typing(on2) {
        if (on2 && !typingEl) {
          typingEl = document.createElement("div");
          typingEl.className = "fx-msg fx-typing";
          typingEl.dataset.from = "them";
          typingEl.setAttribute("aria-label", "Typing");
          typingEl.innerHTML = "<i></i><i></i><i></i>";
          log.append(typingEl);
          scrollDown();
        } else if (!on2 && typingEl) {
          typingEl.remove();
          typingEl = null;
        }
      },
      async reply(text, opts = {}) {
        const wait = opts.typing ?? Math.min(1600, 350 + text.length * 18);
        if (wait > 0) {
          api.typing(true);
          await new Promise((r) => setTimeout(r, ctx.env.reduced ? 0 : wait));
          api.typing(false);
        }
        add(text, "them");
      },
      send(text) {
        const t = text.trim();
        if (!t) return;
        add(t, "me");
        quickBox.replaceChildren();
        el.dispatchEvent(new CustomEvent("fx:chat-send", { bubbles: true, detail: { text: t } }));
      }
    };
    el.fxChat = api;
    if (greeting) add(greeting, "them");
    quickBox.append(
      ...quick.map((q, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = q;
        b.style.setProperty("--i", String(i));
        b.addEventListener("click", () => api.send(q));
        return b;
      })
    );
    const form2 = $(".fx-chat-form");
    const onSubmit = (e) => {
      e.preventDefault();
      api.send(input.value);
      input.value = "";
    };
    const onKey = (e) => e.key === "Escape" && api.close();
    form2.addEventListener("submit", onSubmit);
    launch.addEventListener("click", api.toggle);
    $(".fx-chat-x").addEventListener("click", api.close);
    ui.addEventListener("keydown", onKey);
    setState(el, "ready");
    return () => {
      ui.remove();
      delete el.fxChat;
      el.removeAttribute("data-open");
      el.removeAttribute("data-position");
      setState(el, "ready", false);
    };
  }
};

// src/effects/media.ts
var VIEW3 = { margin: "0px 0px -12% 0px" };
function whileVisible2(el, fn, margin = "150px") {
  let off = null;
  const stop2 = onView(
    el,
    (v) => {
      if (v && !off) off = tick((_n, dt) => fn(dt));
      else if (!v && off) {
        off();
        off = null;
      }
    },
    { margin }
  );
  return () => {
    stop2();
    off?.();
  };
}
function pinnedProgress(rectTop, rectHeight, vh) {
  const range = rectHeight - vh;
  return range > 0 ? clamp(-rectTop / range, 0, 1) : 0;
}
function framePath(pattern, n) {
  return pattern.replace(/#+/, (m) => String(n).padStart(m.length, "0"));
}
var imageReveal = {
  name: "image-reveal",
  meta: META["image-reveal"],
  mount(el, ctx) {
    if (ctx.env.reduced) {
      setState(el, "in");
      return () => setState(el, "in", false);
    }
    let off = onView(
      el,
      (v) => {
        if (!v) return;
        whenLoaded(() => setState(el, "in"));
        off?.();
        off = null;
      },
      VIEW3
    );
    return () => {
      off?.();
      setState(el, "in", false);
    };
  }
};
var expand = {
  name: "expand",
  meta: META.expand,
  mount(el, ctx) {
    if (ctx.env.reduced || ctx.env.sda) return;
    const inset = ctx.str("inset", "8vw") || "8vw";
    const radius = ctx.str("radius", "32px") || "32px";
    const stop2 = whileVisible2(el, () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh - r.top) / ((vh + r.height) / 2), 0, 1);
      const k = 1 - p;
      el.style.clipPath = `inset(0 calc(${inset} * ${k.toFixed(4)}) round calc(${radius} * ${k.toFixed(4)}))`;
    });
    return () => {
      stop2();
      el.style.clipPath = "";
    };
  }
};
var imageTrail = {
  name: "image-trail",
  meta: META["image-trail"],
  mount(el, ctx) {
    if (!ctx.env.finePointer || ctx.env.reduced) return;
    const fromAttr = (ctx.str("images") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const fromKids = Array.from(el.querySelectorAll("img[data-fx-trail]")).map((i) => i.currentSrc || i.src);
    const srcs = fromAttr.length ? fromAttr : fromKids;
    if (!srcs.length) return;
    const size = ctx.px("size", 190);
    const spacing = ctx.px("spacing", 90);
    let lastX = NaN;
    let lastY = NaN;
    let idx = 0;
    let preloaded = false;
    const live = /* @__PURE__ */ new Set();
    const spawn = (x, y) => {
      const img = document.createElement("img");
      img.className = "fx-trail";
      img.alt = "";
      img.src = srcs[idx++ % srcs.length];
      img.style.width = size + "px";
      img.style.left = x + "px";
      img.style.top = y + "px";
      img.style.setProperty("--r", (Math.random() * 14 - 7).toFixed(1) + "deg");
      el.append(img);
      live.add(img);
      const a = img.animate(
        [
          { opacity: 0, scale: 0.6, translate: "-50% -50%", offset: 0 },
          { opacity: 1, scale: 1, translate: "-50% -50%", offset: 0.12 },
          { opacity: 1, scale: 1, translate: "-50% -50%", offset: 0.55 },
          { opacity: 0, scale: 0.85, translate: "-50% calc(-50% + 18px)", offset: 1 }
        ],
        { duration: 1100, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
      );
      a.finished.then(() => {
        img.remove();
        live.delete(img);
      });
      if (live.size > 14) {
        const first = live.values().next().value;
        first.remove();
        live.delete(first);
      }
    };
    const offs = [
      on(el, "pointerenter", () => {
        if (preloaded) return;
        preloaded = true;
        srcs.forEach((s) => new Image().src = s);
      }),
      on(el, "pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        if (Number.isNaN(lastX) || Math.hypot(x - lastX, y - lastY) > spacing) {
          lastX = x;
          lastY = y;
          spawn(x, y);
        }
      }),
      on(el, "pointerleave", () => {
        lastX = NaN;
        lastY = NaN;
      })
    ];
    return () => {
      offs.forEach((f2) => f2());
      live.forEach((i) => i.remove());
    };
  }
};
function pin(el) {
  let sticky = el.querySelector(":scope > .fx-pin");
  const created = !sticky;
  if (!sticky) {
    sticky = document.createElement("div");
    sticky.className = "fx-pin";
    sticky.append(...Array.from(el.childNodes));
    el.append(sticky);
  }
  const s = sticky;
  return {
    sticky: s,
    restore() {
      if (!created) return;
      while (s.firstChild) el.insertBefore(s.firstChild, s);
      s.remove();
    }
  };
}
var videoScrub = {
  name: "video-scrub",
  meta: META["video-scrub"],
  mount(el, ctx) {
    const video = el.querySelector("video");
    if (!video) return;
    const { restore } = pin(el);
    const smooth2 = Math.max(1, ctx.num("smooth", 8));
    video.muted = true;
    video.playsInline = true;
    video.pause();
    video.removeAttribute("autoplay");
    try {
      const p = video.play();
      p?.then(() => video.pause()).catch(() => {
      });
    } catch {
    }
    let blobUrl = "";
    let cancelled = false;
    const origSrc = video.getAttribute("src");
    const ensureSeekable = () => {
      const r = video.seekable;
      const seekable = r.length > 0 && r.end(r.length - 1) > 0.1;
      const src = video.currentSrc;
      if (seekable || blobUrl || !src || src.startsWith("blob:") || typeof fetch !== "function") return;
      fetch(src).then((res) => res.ok ? res.blob() : Promise.reject(res.status)).then((b) => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(b);
        video.src = blobUrl;
      }).catch(() => {
      });
    };
    if (video.readyState >= 1) ensureSeekable();
    else video.addEventListener("loadedmetadata", ensureSeekable, { once: true });
    let t = 0;
    const stop2 = whileVisible2(el, (dt) => {
      const d = video.duration;
      if (!d || Number.isNaN(d)) return;
      const r = el.getBoundingClientRect();
      const p = pinnedProgress(r.top, r.height, window.innerHeight);
      el.style.setProperty("--fx-p", p.toFixed(4));
      const target = p * (d - 0.04);
      t = ctx.env.reduced ? target : damp(t, target, smooth2, dt);
      if (!video.seeking && Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t;
    }, "300px");
    setState(el, "pinned");
    return () => {
      cancelled = true;
      stop2();
      video.removeEventListener("loadedmetadata", ensureSeekable);
      if (blobUrl) {
        if (origSrc === null) video.removeAttribute("src");
        else video.setAttribute("src", origSrc);
        video.load();
        URL.revokeObjectURL(blobUrl);
      }
      el.style.removeProperty("--fx-p");
      setState(el, "pinned", false);
      restore();
    };
  }
};
var frames = {
  name: "frames",
  meta: META.frames,
  mount(el, ctx) {
    const pattern = ctx.str("src");
    const count = Math.max(1, Math.round(ctx.num("count", 60)));
    const first = Math.round(ctx.num("start", 1));
    if (!pattern) return;
    const { sticky, restore } = pin(el);
    const canvas = document.createElement("canvas");
    canvas.className = "fx-frames-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", el.getAttribute("aria-label") || "Animation");
    sticky.prepend(canvas);
    const g = canvas.getContext("2d");
    const imgs = new Array(count).fill(null);
    const load = (i) => new Promise((res) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => {
        imgs[i] = im;
        drawn = -1;
        res();
      };
      im.onerror = () => res();
      im.src = framePath(pattern, first + i);
    });
    let cancelled = false;
    let started = false;
    const loadAll = async () => {
      await load(0);
      let next = 1;
      const worker = async () => {
        while (!cancelled && next < count) await load(next++);
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      setState(el, "loaded");
    };
    const offLoad = onView(el, (v) => {
      if (v && !started) {
        started = true;
        loadAll();
      }
    }, { margin: "600px" });
    let cur = 0;
    let drawn = -1;
    const draw = (i) => {
      if (!g) return;
      let k = -1;
      for (let d = 0; d < count; d++) {
        if (imgs[i - d]) {
          k = i - d;
          break;
        }
        if (imgs[i + d]) {
          k = i + d;
          break;
        }
      }
      const im = k >= 0 ? imgs[k] : null;
      if (!im || k === drawn) return;
      drawn = k;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = sticky.clientWidth;
      const h = sticky.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const s = Math.max(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight);
      const dw = im.naturalWidth * s;
      const dh = im.naturalHeight * s;
      g.drawImage(im, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    };
    const stop2 = whileVisible2(el, (dt) => {
      const r = el.getBoundingClientRect();
      const p = pinnedProgress(r.top, r.height, window.innerHeight);
      el.style.setProperty("--fx-p", p.toFixed(4));
      cur = ctx.env.reduced ? p : damp(cur, p, 10, dt);
      draw(Math.round(cur * (count - 1)));
    }, "300px");
    const onResize = () => drawn = -1;
    window.addEventListener("resize", onResize);
    setState(el, "pinned");
    return () => {
      cancelled = true;
      offLoad();
      stop2();
      window.removeEventListener("resize", onResize);
      canvas.remove();
      el.style.removeProperty("--fx-p");
      ["pinned", "loaded"].forEach((s) => setState(el, s, false));
      restore();
    };
  }
};

// src/effects/live.ts
var SVGNS4 = "http://www.w3.org/2000/svg";
var uid3 = 0;
var svgDraw = {
  name: "svg-draw",
  meta: META["svg-draw"],
  mount(el, ctx) {
    const shapes = Array.from(el.querySelectorAll("path, line, polyline, polygon, circle, ellipse, rect")).filter((s) => {
      if (!(s instanceof SVGGeometryElement) || s.closest("defs, clipPath, mask") || s.classList.contains("fx-pulse")) return false;
      const stroke = getComputedStyle(s).stroke;
      return stroke && stroke !== "none";
    });
    if (!shapes.length) return;
    const mode = ctx.str("mode", "view") || "view";
    const dur = ctx.time("duration", 1800);
    const stagger2 = ctx.time("stagger", 140);
    const pulses = Math.max(0, Math.round(ctx.num("pulse", 0)));
    const color = getComputedStyle(el).getPropertyValue("--fx-color").trim() || "#ffb547";
    const lens = shapes.map((s) => {
      try {
        return s.getTotalLength() || 0;
      } catch {
        return 0;
      }
    });
    const saved = shapes.map((s) => [s.style.strokeDasharray, s.style.strokeDashoffset, s.style.transition]);
    const reduced = ctx.env.reduced;
    if (!reduced) {
      shapes.forEach((s, i) => {
        s.style.strokeDasharray = `${lens[i]} ${lens[i]}`;
        s.style.strokeDashoffset = String(lens[i]);
      });
    }
    const added = [];
    const addedIds = [];
    const startPulses = () => {
      if (!pulses || reduced) return;
      shapes.forEach((s, i) => {
        if (!(s instanceof SVGPathElement) && !(s instanceof SVGPolylineElement) && !(s instanceof SVGLineElement)) return;
        if (!s.id) {
          s.id = `fx-path-${++uid3}`;
          addedIds.push(s);
        }
        const seconds = Math.max(1.6, lens[i] / 140);
        for (let k = 0; k < pulses; k++) {
          const c = document.createElementNS(SVGNS4, "circle");
          c.setAttribute("class", "fx-pulse");
          c.setAttribute("r", String(Math.max(2.2, (parseFloat(getComputedStyle(s).strokeWidth) || 1.5) * 1.6)));
          c.setAttribute("fill", color);
          const m = document.createElementNS(SVGNS4, "animateMotion");
          m.setAttribute("dur", seconds + "s");
          m.setAttribute("repeatCount", "indefinite");
          m.setAttribute("begin", `${-(seconds / pulses) * k}s`);
          m.setAttribute("rotate", "auto");
          const mp = document.createElementNS(SVGNS4, "mpath");
          mp.setAttribute("href", "#" + s.id);
          m.append(mp);
          c.append(m);
          s.parentNode.insertBefore(c, s.nextSibling);
          added.push(c);
        }
      });
    };
    let stop2 = null;
    if (reduced) {
      startPulses();
    } else if (mode === "scroll") {
      stop2 = (() => {
        let off = null;
        const v = onView(el, (vis) => {
          if (vis && !off)
            off = tick(() => {
              const r = el.getBoundingClientRect();
              const vh = window.innerHeight;
              const p = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.4), 0, 1);
              shapes.forEach((s, i) => s.style.strokeDashoffset = String(lens[i] * (1 - p)));
            });
          else if (!vis && off) {
            off();
            off = null;
          }
        }, { margin: "100px" });
        startPulses();
        return () => (v(), off?.());
      })();
    } else {
      let off = onView(
        el,
        (vis) => {
          if (!vis) return;
          off?.();
          off = null;
          whenLoaded(() => {
            shapes.forEach((s, i) => {
              s.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.65,0,.35,1) ${i * stagger2}ms`;
              s.style.strokeDashoffset = "0";
            });
            setState(el, "in");
            window.setTimeout(startPulses, dur * 0.6 + shapes.length * stagger2);
          });
        },
        { margin: "0px 0px -10% 0px" }
      );
      stop2 = () => off?.();
    }
    return () => {
      stop2?.();
      added.forEach((a) => a.remove());
      addedIds.forEach((s) => s.removeAttribute("id"));
      shapes.forEach((s, i) => {
        [s.style.strokeDasharray, s.style.strokeDashoffset, s.style.transition] = saved[i];
      });
      setState(el, "in", false);
    };
  }
};
var dotField = {
  name: "dot-field",
  meta: META["dot-field"],
  mount(el, ctx) {
    const canvas = document.createElement("canvas");
    canvas.className = "fx-dotfield";
    canvas.setAttribute("aria-hidden", "true");
    el.prepend(canvas);
    const g = canvas.getContext("2d");
    if (!g) return () => canvas.remove();
    const gap = Math.max(8, ctx.px("gap", 22));
    const force = ctx.num("force", 1);
    const color = getComputedStyle(el).getPropertyValue("--fx-color").trim() || "#ffb547";
    const still = ctx.env.reduced;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let pts = new Float32Array(0);
    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = el.clientWidth;
      H = el.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const cols = Math.ceil(W / gap) + 1;
      const rows = Math.ceil(H / gap) + 1;
      pts = new Float32Array(cols * rows * 4);
      let k = 0;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          pts[k++] = x * gap + (W - (cols - 1) * gap) / 2;
          pts[k++] = y * gap + (H - (rows - 1) * gap) / 2;
          pts[k++] = 0;
          pts[k++] = 0;
        }
    };
    let time = 0;
    const R = 130;
    const frame = (dt) => {
      time += dt / 1e3;
      const r = canvas.getBoundingClientRect();
      const mx = pointer.x - r.left;
      const my = pointer.y - r.top;
      const near = mx > -R && my > -R && mx < W + R && my < H + R && performance.now() - pointer.t < 4e3;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.fillStyle = color;
      for (let k = 0; k < pts.length; k += 4) {
        const x = pts[k];
        const y = pts[k + 1];
        let tx = 0;
        let ty = 0;
        if (near && !still) {
          const ddx = x - mx;
          const ddy = y - my;
          const d = Math.hypot(ddx, ddy);
          if (d < R && d > 0.01) {
            const f2 = Math.pow(1 - d / R, 2) * 22 * force;
            tx = ddx / d * f2;
            ty = ddy / d * f2;
          }
        }
        pts[k + 2] = damp(pts[k + 2], tx, 9, dt);
        pts[k + 3] = damp(pts[k + 3], ty, 9, dt);
        const push = Math.hypot(pts[k + 2], pts[k + 3]);
        const wave = still ? 0.5 : 0.5 + 0.5 * Math.sin(time * 1.4 - (x + y) * 0.012);
        g.globalAlpha = Math.min(1, 0.18 + wave * 0.32 + push / 26);
        const size = 1.1 + push / 14;
        g.beginPath();
        g.arc(x + pts[k + 2], y + pts[k + 3], size, 0, Math.PI * 2);
        g.fill();
      }
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    let off = null;
    const offPointer = onPointer(() => {
    });
    const offView = onView(el, (v) => {
      if (v && !off) off = tick((_n, dt) => frame(dt));
      else if (!v && off) {
        off();
        off = null;
      }
    });
    if (still) frame(16);
    return () => {
      offView();
      off?.();
      offPointer();
      ro.disconnect();
      canvas.remove();
    };
  }
};
var typewriter = {
  name: "typewriter",
  meta: META.typewriter,
  mount(el, ctx) {
    if (ctx.env.reduced) return;
    const lines = el.children.length && !isInteractive(el) ? Array.from(el.children) : [el];
    const texts = lines.map((l) => l.textContent || "");
    const speed = ctx.time("speed", 34);
    const delay = ctx.time("delay", 0);
    const loop2 = ctx.bool("loop", false);
    const parts = lines.map((l, i) => {
      const box = document.createElement("span");
      box.className = "fx-tw-box";
      box.setAttribute("aria-hidden", "true");
      const ghost = document.createElement("span");
      ghost.className = "fx-tw-ghost";
      ghost.textContent = texts[i];
      const typed = document.createElement("span");
      typed.className = "fx-tw";
      const text = document.createTextNode("");
      typed.append(text);
      box.append(ghost, typed);
      const sr = document.createElement("span");
      sr.className = "fx-sr";
      sr.textContent = texts[i];
      l.textContent = "";
      l.append(box, sr);
      return { typed, text };
    });
    const caret = document.createElement("span");
    caret.className = "fx-caret";
    let timer = 0;
    let stopped = false;
    const wait = (ms) => new Promise((r) => timer = window.setTimeout(r, ms));
    const run = async () => {
      do {
        for (let i = 0; i < parts.length && !stopped; i++) {
          parts[i].typed.append(caret);
          for (let c = 1; c <= texts[i].length && !stopped; c++) {
            parts[i].text.data = texts[i].slice(0, c);
            const ch = texts[i][c - 1];
            await wait(speed * (/[.,!?:;]/.test(ch) ? 6 : 0.6 + Math.random() * 0.8));
          }
          await wait(speed * 8);
        }
        if (!loop2 || stopped) break;
        await wait(1800);
        for (let i = parts.length - 1; i >= 0 && !stopped; i--) {
          parts[i].typed.append(caret);
          while (parts[i].text.data && !stopped) {
            parts[i].text.data = parts[i].text.data.slice(0, -1);
            await wait(speed * 0.4);
          }
        }
        await wait(500);
      } while (!stopped);
      setState(el, "typed");
    };
    let off = onView(el, (v) => {
      if (!v) return;
      off?.();
      off = null;
      whenLoaded(() => {
        setState(el, "typing");
        wait(delay).then(run);
      });
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      off?.();
      lines.forEach((l, i) => l.textContent = texts[i]);
      ["typing", "typed"].forEach((s) => setState(el, s, false));
    };
  }
};
var rotateWords = {
  name: "rotate-words",
  meta: META["rotate-words"],
  mount(el, ctx) {
    const original = el.textContent || "";
    const words = [original.trim(), ...(ctx.str("words") || "").split(",").map((s) => s.trim())].filter(Boolean);
    if (words.length < 2 || ctx.env.reduced) return;
    const interval = ctx.time("interval", 2200);
    const style = ctx.str("style", "flip") || "flip";
    el.textContent = "";
    const sr = document.createElement("span");
    sr.className = "fx-sr";
    sr.textContent = words.join(", ");
    const box = document.createElement("span");
    box.className = "fx-rw";
    box.setAttribute("aria-hidden", "true");
    const cur = document.createElement("span");
    cur.className = "fx-rw-word";
    cur.textContent = words[0];
    box.append(cur);
    el.append(box, sr);
    let i = 0;
    let visible = true;
    const frames2 = {
      flip: [
        [{ transform: "perspective(400px) rotateX(0)", opacity: 1 }, { transform: "perspective(400px) rotateX(90deg)", opacity: 0 }],
        [{ transform: "perspective(400px) rotateX(-90deg)", opacity: 0 }, { transform: "perspective(400px) rotateX(0)", opacity: 1 }]
      ],
      slide: [
        [{ translate: "0 0", opacity: 1 }, { translate: "0 -70%", opacity: 0 }],
        [{ translate: "0 70%", opacity: 0 }, { translate: "0 0", opacity: 1 }]
      ],
      blur: [
        [{ filter: "blur(0)", opacity: 1 }, { filter: "blur(8px)", opacity: 0 }],
        [{ filter: "blur(8px)", opacity: 0 }, { filter: "blur(0)", opacity: 1 }]
      ]
    };
    const [outF, inF] = frames2[style] || frames2.flip;
    const step = () => {
      if (!visible || document.hidden) return;
      i = (i + 1) % words.length;
      const old = box.querySelector(".fx-rw-word:last-child");
      const next = document.createElement("span");
      next.className = "fx-rw-word";
      next.textContent = words[i];
      const from = box.offsetWidth;
      box.append(next);
      old.classList.add("fx-rw-out");
      const to = next.offsetWidth;
      box.animate([{ width: from + "px" }, { width: to + "px" }], { duration: 520, easing: "cubic-bezier(.65,0,.35,1)" });
      old.animate(outF, { duration: 420, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }).finished.then(() => old.remove());
      next.animate(inF, { duration: 520, delay: 120, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    };
    const id = window.setInterval(step, interval);
    const offView = onView(el, (v) => visible = v);
    return () => {
      clearInterval(id);
      offView();
      el.textContent = original;
    };
  }
};
function makeClockFormatter(tz, seconds = true, hour12 = false) {
  const opts = { hour: "2-digit", minute: "2-digit", hour12 };
  if (seconds) opts.second = "2-digit";
  try {
    return new Intl.DateTimeFormat(void 0, tz ? { ...opts, timeZone: tz } : opts);
  } catch {
    console.warn(`[lumafx] clock: unknown time zone "${tz}", using local time`);
    return new Intl.DateTimeFormat(void 0, opts);
  }
}
var clock = {
  name: "clock",
  meta: META.clock,
  mount(el, ctx) {
    const original = el.textContent || "";
    const seconds = ctx.bool("seconds", true);
    const fmt = makeClockFormatter(ctx.str("tz"), seconds, ctx.bool("hour12", false));
    let timer = 0;
    const render = () => {
      const now = /* @__PURE__ */ new Date();
      el.textContent = fmt.format(now);
      if (el instanceof HTMLTimeElement) el.dateTime = now.toISOString();
      timer = window.setTimeout(render, (seconds ? 1e3 : 6e4) - now.getTime() % (seconds ? 1e3 : 6e4) + 5);
    };
    render();
    return () => {
      clearTimeout(timer);
      el.textContent = original;
    };
  }
};
var ring = {
  name: "ring",
  meta: META.ring,
  mount(el, ctx) {
    let track = el.querySelector(":scope > .fx-ring-track");
    const created = !track;
    if (!track) {
      track = document.createElement("div");
      track.className = "fx-ring-track";
      track.append(...Array.from(el.childNodes));
      el.append(track);
    }
    const t = track;
    const items = () => Array.from(t.children);
    const n = items().length;
    if (n < 3) return () => created && restore();
    const step = 360 / n;
    const tilt2 = ctx.num("tilt", 8);
    const idle = ctx.env.reduced ? 0 : ctx.num("speed", 6);
    let angle = 0;
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let lastT = 0;
    let hover = false;
    let radius = 300;
    el.setAttribute("role", el.getAttribute("role") || "region");
    el.setAttribute("aria-roledescription", "carousel");
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    const layout = () => {
      const w = items()[0]?.offsetWidth || 200;
      radius = Math.round(w / 2 / Math.tan(Math.PI / n) * 1.12);
      el.style.setProperty("--fx-ring-r", radius + "px");
      items().forEach((it, i) => it.style.setProperty("--fx-ring-a", i * step + "deg"));
    };
    const apply = () => {
      t.style.transform = `translateZ(${-radius}px) rotateX(${-tilt2}deg) rotateY(${angle.toFixed(3)}deg)`;
      items().forEach((it, i) => {
        const a = (i * step + angle) % 360 * (Math.PI / 180);
        const facing = Math.cos(a);
        it.style.opacity = (0.28 + 0.72 * Math.max(0, facing)).toFixed(3);
        it.style.zIndex = String(Math.round(facing * 100) + 100);
        it.toggleAttribute("inert", facing < 0.2);
      });
    };
    let visible = false;
    const loop2 = sleeper((_now, dt) => {
      if (!dragging) {
        if (Math.abs(vel) > 2e-3) {
          angle += vel * dt;
          vel *= Math.pow(0.95, dt / 16.7);
        } else if (idle && !hover) angle += idle * dt / 1e3;
      }
      apply();
      return visible && (dragging || Math.abs(vel) > 2e-3 || !!idle && !hover);
    });
    const offs = [
      on(el, "pointerdown", (e) => {
        dragging = true;
        lastX = e.clientX;
        lastT = performance.now();
        vel = 0;
        el.setPointerCapture(e.pointerId);
        setState(el, "dragging");
        loop2.wake();
      }),
      on(el, "pointermove", (e) => {
        if (!dragging) return;
        const now = performance.now();
        const d = (e.clientX - lastX) * 0.28;
        angle += d;
        vel = d / Math.max(1, now - lastT);
        lastX = e.clientX;
        lastT = now;
      }),
      on(el, "pointerup", () => {
        dragging = false;
        setState(el, "dragging", false);
        loop2.wake();
      }),
      on(el, "pointerenter", () => hover = true),
      on(el, "pointerleave", () => {
        hover = false;
        loop2.wake();
      }),
      on(el, "keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const target = Math.round(angle / step) * step + (e.key === "ArrowLeft" ? step : -step);
        const from = angle;
        const start2 = performance.now();
        const anim = (now) => {
          const p = Math.min(1, (now - start2) / 450);
          angle = from + (target - from) * (1 - Math.pow(1 - p, 3));
          apply();
          if (p < 1) requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
      })
    ];
    const offView = onView(el, (v) => {
      visible = v;
      if (v) loop2.wake();
    });
    const ro = new ResizeObserver(() => (layout(), apply()));
    ro.observe(el);
    layout();
    apply();
    setState(el, "on");
    function restore() {
      while (t.firstChild) el.insertBefore(t.firstChild, t);
      t.remove();
    }
    return () => {
      offs.forEach((f2) => f2());
      offView();
      ro.disconnect();
      loop2.stop();
      items().forEach((it) => {
        it.style.removeProperty("--fx-ring-a");
        it.style.opacity = "";
        it.style.zIndex = "";
        it.removeAttribute("inert");
      });
      t.style.transform = "";
      el.removeAttribute("aria-roledescription");
      setState(el, "on", false);
      setState(el, "dragging", false);
      if (created) restore();
    };
  }
};

// src/effects/cards.ts
var card2 = {
  name: "card",
  meta: META.card,
  mount(el, ctx) {
    const style = ctx.str("style", "glow") || "glow";
    const offs = [];
    if (style === "glow" && ctx.env.finePointer) {
      let x = 0;
      let y = 0;
      const apply = rafThrottle(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--fx-mx", (x - r.left).toFixed(1) + "px");
        el.style.setProperty("--fx-my", (y - r.top).toFixed(1) + "px");
      });
      offs.push(
        on(el, "pointermove", (e) => {
          if (e.pointerType === "touch") return;
          x = e.clientX;
          y = e.clientY;
          apply();
        }),
        () => {
          apply.cancel();
          el.style.removeProperty("--fx-mx");
          el.style.removeProperty("--fx-my");
        }
      );
    }
    if (style === "flip") {
      let inner = el.querySelector(":scope > .fx-card-flip");
      const created = !inner;
      if (!inner) {
        const kids = Array.from(el.children);
        if (kids.length >= 2) {
          inner = document.createElement("div");
          inner.className = "fx-card-flip";
          const front = document.createElement("div");
          front.className = "fx-card-face fx-card-front";
          const back = document.createElement("div");
          back.className = "fx-card-face fx-card-back";
          front.append(...kids.slice(0, -1));
          back.append(kids[kids.length - 1]);
          inner.append(front, back);
          el.append(inner);
        }
      }
      if (inner) {
        const i = inner;
        offs.push(
          on(el, "click", (e) => {
            if (e.target.closest("a, button, input, select, textarea, label")) return;
            el.toggleAttribute("data-flipped");
          }),
          on(el, "keydown", (e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === el) {
              e.preventDefault();
              el.toggleAttribute("data-flipped");
            }
          }),
          () => {
            el.removeAttribute("data-flipped");
            if (!created) return;
            const faces = Array.from(i.children);
            faces.forEach((f2) => i.before(...Array.from(f2.childNodes)));
            i.remove();
          }
        );
        if (!el.hasAttribute("tabindex") && !isInteractive(el)) {
          el.setAttribute("tabindex", "0");
          offs.push(() => el.removeAttribute("tabindex"));
        }
      }
    }
    setState(el, "ready");
    return () => {
      offs.forEach((f2) => f2());
      setState(el, "ready", false);
    };
  }
};
var SPARKS = 12;
function burst(x, y, color) {
  const host = document.body;
  const ring2 = document.createElement("span");
  ring2.className = "fx-spark-ring";
  ring2.style.left = x + "px";
  ring2.style.top = y + "px";
  ring2.style.borderColor = color;
  host.append(ring2);
  ring2.animate([{ scale: 0.2, opacity: 0.9 }, { scale: 1, opacity: 0 }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }).finished.then(() => ring2.remove());
  for (let i = 0; i < SPARKS; i++) {
    const s = document.createElement("span");
    s.className = "fx-spark";
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.background = i % 3 === 2 ? "#fff" : color;
    const a = i / SPARKS * Math.PI * 2 + Math.random() * 0.4;
    const d = 34 + Math.random() * 38;
    const size = 4 + Math.random() * 4;
    s.style.width = s.style.height = size + "px";
    host.append(s);
    s.animate(
      [
        { translate: "-50% -50%", scale: 1, opacity: 1 },
        { translate: `calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px) calc(-50% + ${(Math.sin(a) * d).toFixed(1)}px)`, scale: 0.2, opacity: 0 }
      ],
      { duration: 560 + Math.random() * 200, easing: "cubic-bezier(.15,.7,.3,1)", fill: "forwards" }
    ).finished.then(() => s.remove());
  }
}
var press = {
  name: "press",
  meta: META.press,
  mount(el, ctx) {
    const style = ctx.str("style", "ripple") || "ripple";
    const done = ctx.str("done");
    const reduced = ctx.env.reduced;
    const offs = [];
    const accent = () => getComputedStyle(el).getPropertyValue("--fx-color").trim() || getComputedStyle(el).color;
    let layer = null;
    const ensureLayer = () => {
      if (layer && layer.isConnected) return layer;
      layer = document.createElement("span");
      layer.className = "fx-press-fx";
      layer.setAttribute("aria-hidden", "true");
      if (style === "fill") layer.append(Object.assign(document.createElement("span"), { className: "fx-press-fill" }));
      el.prepend(layer);
      return layer;
    };
    if (style === "fill") ensureLayer();
    const pointOf = (e) => {
      const r = el.getBoundingClientRect();
      return e.detail === 0 || e.clientX === 0 && e.clientY === 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2, r } : { x: e.clientX, y: e.clientY, r };
    };
    if (style === "ripple" && !reduced) {
      const ripple2 = (x, y, r) => {
        const d = 2 * Math.max(Math.hypot(x - r.left, y - r.top), Math.hypot(r.right - x, y - r.top), Math.hypot(x - r.left, r.bottom - y), Math.hypot(r.right - x, r.bottom - y));
        const s = document.createElement("span");
        s.className = "fx-press-ripple";
        s.style.width = s.style.height = d + "px";
        s.style.left = x - r.left + "px";
        s.style.top = y - r.top + "px";
        ensureLayer().append(s);
        s.animate([{ scale: 0, opacity: 0.38 }, { scale: 1, opacity: 0 }], { duration: 650, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }).finished.then(() => s.remove());
      };
      offs.push(
        on(el, "pointerdown", (e) => {
          if (e.button !== 0) return;
          ripple2(e.clientX, e.clientY, el.getBoundingClientRect());
        }),
        on(el, "click", (e) => {
          if (e.detail !== 0) return;
          const p = pointOf(e);
          ripple2(p.x, p.y, p.r);
        })
      );
    }
    if (style === "burst" && !reduced) {
      offs.push(
        on(el, "click", (e) => {
          const p = pointOf(e);
          burst(p.x, p.y, accent());
        })
      );
    }
    if (style === "fill") {
      const at = (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--fx-x", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        el.style.setProperty("--fx-y", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      };
      offs.push(on(el, "pointerenter", at), on(el, "pointerleave", at), () => {
        el.style.removeProperty("--fx-x");
        el.style.removeProperty("--fx-y");
      });
    }
    if (done) {
      let timer = 0;
      let saved = null;
      const restore = () => {
        if (!saved) return;
        el.replaceChildren(...layer ? [layer] : [], ...saved);
        saved = null;
        el.style.minWidth = "";
        setState(el, "done", false);
      };
      offs.push(
        on(el, "click", () => {
          if (saved) return;
          el.style.minWidth = el.getBoundingClientRect().width + "px";
          saved = Array.from(el.childNodes).filter((n) => n !== layer);
          const label = document.createElement("span");
          label.className = "fx-press-done";
          label.textContent = done;
          el.replaceChildren(...layer ? [layer] : [], label);
          setState(el, "done");
          timer = window.setTimeout(restore, 1800);
        }),
        () => {
          clearTimeout(timer);
          restore();
        }
      );
    }
    setState(el, "ready");
    return () => {
      offs.forEach((f2) => f2());
      layer?.remove();
      setState(el, "ready", false);
    };
  }
};

// src/effects/form.ts
var uid4 = 0;
var SKIP2 = /^(submit|button|reset|hidden|image|file)$/;
var ruleFor = (c, country) => {
  const rules = parseRules(c.getAttribute("data-rules") || "");
  const has = (n) => rules.some((r) => r.name === n);
  const add = (name, arg) => !has(name) && rules.push({ name, arg });
  const type = (c.getAttribute("type") || "").toLowerCase();
  if (c.hasAttribute("required")) {
    if (type === "checkbox") add("accepted");
    else if (!has("required")) rules.unshift({ name: "required" });
  }
  if (type === "email") add("email");
  if (type === "tel") add("phone", c.getAttribute("data-fx-country") || country);
  if (type === "url") add("url");
  if (type === "number") add("number");
  for (const a of ["min", "max", "minlength", "maxlength"]) {
    const v = c.getAttribute(a);
    if (v !== null && v !== "" && (a.endsWith("length") || type === "number" || type === "range")) add(a, v);
  }
  const pat = c.getAttribute("pattern");
  if (pat) add("pattern", pat);
  for (const r of rules) if (r.name === "phone" && !r.arg) r.arg = c.getAttribute("data-fx-country") || country;
  return rules;
};
var form = {
  name: "form",
  meta: META.form,
  mount(el, ctx) {
    if (!(el instanceof HTMLFormElement)) {
      console.warn("[lumafx] form: use it on a <form> element");
      return;
    }
    const f2 = el;
    const country = (ctx.str("country", "AL") || "AL").toUpperCase();
    const opts = { locale: ctx.str("locale") || document.documentElement.lang || "en", country };
    const ajax = ctx.bool("ajax", false);
    const spam = ctx.bool("spam", true);
    const reduced = ctx.env.reduced;
    const prevNoValidate = f2.noValidate;
    f2.noValidate = true;
    const created = [];
    const id = ++uid4;
    if (spam && !f2.querySelector('[name="_hp"]')) {
      const hp = document.createElement("input");
      Object.assign(hp, { type: "text", name: "_hp", tabIndex: -1, autocomplete: "off", className: "fx-hp" });
      hp.setAttribute("aria-hidden", "true");
      const ts = Object.assign(document.createElement("input"), { type: "hidden", name: "_ts", value: String(Date.now()) });
      f2.append(hp, ts);
      created.push(hp, ts);
    }
    const fields = /* @__PURE__ */ new Map();
    for (const node of Array.from(f2.elements)) {
      const c = node;
      if (!c.name || c.name.startsWith("_") || c.disabled || SKIP2.test(c.type || "")) continue;
      const existing = fields.get(c.name);
      if (existing) {
        existing.controls.push(c);
        continue;
      }
      const isChoice = c instanceof HTMLInputElement && (c.type === "checkbox" || c.type === "radio");
      const anchor = isChoice ? c.closest("fieldset") || c.closest("label") || c : c;
      fields.set(c.name, { name: c.name, controls: [c], rules: ruleFor(c, country), touched: false, anchor });
    }
    const valueOf = (fd) => {
      const c = fd.controls[0];
      if (c instanceof HTMLInputElement && c.type === "radio") return fd.controls.find((x) => x.checked)?.value ?? "";
      if (c instanceof HTMLInputElement && c.type === "checkbox") {
        const on2 = fd.controls.filter((x) => x.checked);
        return on2.length ? on2.map((x) => x.value || "on").join(",") : "";
      }
      return c.value;
    };
    const values = () => Object.fromEntries([...fields.values()].map((fd) => [fd.name, valueOf(fd)]));
    const after = (fd, node) => {
      const lastControl = fd.controls[fd.controls.length - 1];
      const target = fd.controls.length > 1 && fd.anchor.tagName !== "FIELDSET" ? lastControl.closest("label") || lastControl : fd.anchor;
      let ref = target;
      while (ref.nextElementSibling && ref.nextElementSibling.matches(".fx-error, .fx-hint, .fx-count, .fx-meter")) ref = ref.nextElementSibling;
      ref.after(node);
      created.push(node);
    };
    const describe = (fd, nodeId, on2) => {
      for (const c of fd.controls) {
        const ids = (c.getAttribute("aria-describedby") || "").split(/\s+/).filter((x) => x && x !== nodeId);
        if (on2) ids.push(nodeId);
        if (ids.length) c.setAttribute("aria-describedby", ids.join(" "));
        else c.removeAttribute("aria-describedby");
      }
    };
    const showError = (fd, text) => {
      if (!fd.error) {
        fd.error = document.createElement("p");
        fd.error.className = "fx-error";
        fd.error.id = `fx-err-${id}-${fd.name.replace(/\W/g, "")}`;
        fd.error.setAttribute("aria-live", "polite");
        fd.error.append(document.createElement("span"));
        after(fd, fd.error);
      }
      fd.error.firstChild.textContent = text;
      fd.error.setAttribute("data-show", "");
      describe(fd, fd.error.id, true);
      fd.controls.forEach((c) => {
        c.setAttribute("aria-invalid", "true");
        c.removeAttribute("data-fx-valid");
      });
    };
    const clearError = (fd) => {
      if (fd.error) {
        fd.error.removeAttribute("data-show");
        describe(fd, fd.error.id, false);
      }
      fd.controls.forEach((c) => c.removeAttribute("aria-invalid"));
    };
    const showHint = (fd, suggestion) => {
      if (!suggestion) {
        fd.hint?.removeAttribute("data-show");
        return;
      }
      if (!fd.hint) {
        fd.hint = document.createElement("p");
        fd.hint.className = "fx-hint";
        after(fd, fd.hint);
      }
      const [before, rest = ""] = message("emailSuggest", opts, { s: "\0" }).split("\0");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = suggestion;
      btn.addEventListener("click", () => {
        fd.controls[0].value = suggestion;
        fd.controls[0].dispatchEvent(new Event("input", { bubbles: true }));
        check(fd, true);
        fd.controls[0].focus();
      });
      fd.hint.replaceChildren(document.createTextNode(before), btn, document.createTextNode(rest));
      fd.hint.setAttribute("data-show", "");
    };
    const extras = (fd) => {
      const c = fd.controls[0];
      const max = Number(c.getAttribute("maxlength"));
      if (max > 0 && (c instanceof HTMLTextAreaElement || c.hasAttribute("data-fx-counter"))) {
        if (!fd.counter) {
          fd.counter = document.createElement("span");
          fd.counter.className = "fx-count";
          fd.counter.setAttribute("aria-hidden", "true");
          after(fd, fd.counter);
        }
        const n = [...c.value].length;
        fd.counter.textContent = `${n} / ${max}`;
        fd.counter.toggleAttribute("data-near", n >= max * 0.9);
      }
      if (fd.rules.some((r) => r.name === "password")) {
        if (!fd.meter) {
          fd.meter = document.createElement("div");
          fd.meter.className = "fx-meter";
          fd.meter.setAttribute("aria-hidden", "true");
          fd.meter.innerHTML = "<i></i><i></i><i></i><i></i>";
          after(fd, fd.meter);
        }
        fd.meter.dataset.level = String(passwordScore(c.value));
      }
    };
    const check = (fd, show) => {
      const v = valueOf(fd);
      const r = checkValue(v, fd.rules, values(), opts);
      showHint(fd, r.suggestion || r.error?.suggestion);
      if (r.error) {
        if (show) showError(fd, r.error.suggestion ? message("email", opts) : r.error.message);
        return false;
      }
      clearError(fd);
      fd.controls.forEach((c) => c.toggleAttribute("data-fx-valid", v !== "" && fd.rules.length > 0 && !(c instanceof HTMLSelectElement) && !["checkbox", "radio"].includes(c.type)));
      const phone = fd.rules.find((x) => x.name === "phone");
      if (phone && show && v && document.activeElement !== fd.controls[0]) {
        const p = parsePhone(v, phone.arg || country);
        if (p) fd.controls[0].value = p.international;
      }
      return true;
    };
    const fieldOf = (t) => {
      const c = t;
      return c && c.name ? fields.get(c.name) : void 0;
    };
    const shake = (c) => {
      if (reduced) return;
      c.animate?.(
        [{ translate: "0 0" }, { translate: "-6px 0" }, { translate: "5px 0" }, { translate: "-3px 0" }, { translate: "2px 0" }, { translate: "0 0" }],
        { duration: 420, easing: "ease-out" }
      );
    };
    const onInput = (e) => {
      const fd = fieldOf(e.target);
      if (!fd) return;
      extras(fd);
      if (fd.touched || fd.controls[0].getAttribute("aria-invalid") === "true") check(fd, true);
      else showHint(fd, void 0);
      formError(null);
    };
    const onBlur = (e) => {
      const fd = fieldOf(e.target);
      if (!fd) return;
      if (valueOf(fd) === "" && !fd.touched) return;
      fd.touched = true;
      check(fd, true);
    };
    const onChange = (e) => {
      const fd = fieldOf(e.target);
      if (fd && fd.controls[0] instanceof HTMLInputElement && ["checkbox", "radio"].includes(fd.controls[0].type)) {
        fd.touched = true;
        check(fd, true);
      }
    };
    let formMsg = null;
    const formError = (text) => {
      if (!text) return formMsg?.removeAttribute("data-show");
      if (!formMsg) {
        formMsg = document.createElement("p");
        formMsg.className = "fx-form-error";
        formMsg.setAttribute("role", "alert");
        const submit = f2.querySelector('[type="submit"], button:not([type])');
        (submit ? submit : f2.lastElementChild || f2).before?.(formMsg);
        if (!formMsg.isConnected) f2.append(formMsg);
        created.push(formMsg);
      }
      formMsg.textContent = text;
      formMsg.setAttribute("data-show", "");
    };
    const validateAll = () => {
      let first = null;
      for (const fd of fields.values()) {
        fd.touched = true;
        if (!check(fd, true) && !first) first = fd;
      }
      if (first) {
        first.controls[0].focus({ preventScroll: false });
        shake(first.controls[0]);
        return false;
      }
      return true;
    };
    const showErrors = (errors) => {
      let first = null;
      for (const [name, err] of Object.entries(errors || {})) {
        const text = typeof err === "string" ? err : err?.message;
        if (!text) continue;
        const fd = fields.get(name);
        if (fd) {
          fd.touched = true;
          showError(fd, text);
          first ?? (first = fd);
        } else formError(text);
      }
      if (first) {
        first.controls[0].focus();
        shake(first.controls[0]);
      }
    };
    const onSubmit = async (e) => {
      if (!validateAll()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        f2.dispatchEvent(new CustomEvent("fx:invalid", { bubbles: true }));
        return;
      }
      const go = f2.dispatchEvent(new CustomEvent("fx:submit", { bubbles: true, cancelable: true, detail: { values: values(), form: f2 } }));
      if (!go) return e.preventDefault();
      if (!ajax) return;
      e.preventDefault();
      const btn = e.submitter || f2.querySelector('[type="submit"], button:not([type])');
      setState(f2, "sending");
      formError(null);
      if (btn) {
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
      }
      let json = null;
      let ok = false;
      try {
        const res = await fetch(f2.action || location.href, {
          method: (f2.getAttribute("method") || "post").toUpperCase(),
          body: new FormData(f2),
          headers: { Accept: "application/json" }
        });
        json = await res.json().catch(() => null);
        ok = res.ok && (!json || json.ok !== false);
        if (!ok) {
          if (json && json.errors) showErrors(json.errors);
          else formError(message("spam", opts));
        }
      } catch {
        formError(message("spam", opts));
      }
      setState(f2, "sending", false);
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
      if (!ok) return;
      setState(f2, "sent");
      const sent = btn?.getAttribute("data-fx-sent");
      if (btn && sent) btn.textContent = sent;
      const success = f2.querySelector("[data-fx-success]") || (ctx.str("success") ? document.querySelector(ctx.str("success")) : null);
      if (success) success.hidden = false;
      if (ctx.bool("reset", false)) {
        f2.reset();
        fields.forEach((fd) => {
          fd.touched = false;
          clearError(fd);
          fd.controls.forEach((c) => c.removeAttribute("data-fx-valid"));
        });
      }
      f2.dispatchEvent(new CustomEvent("fx:success", { bubbles: true, detail: json }));
    };
    f2.addEventListener("input", onInput);
    f2.addEventListener("focusout", onBlur);
    f2.addEventListener("change", onChange);
    f2.addEventListener("submit", onSubmit);
    fields.forEach(extras);
    const api = { validate: validateAll, values, showErrors };
    f2.fxForm = api;
    setState(f2, "ready");
    return () => {
      f2.removeEventListener("input", onInput);
      f2.removeEventListener("focusout", onBlur);
      f2.removeEventListener("change", onChange);
      f2.removeEventListener("submit", onSubmit);
      f2.noValidate = prevNoValidate;
      created.forEach((n) => n.remove());
      fields.forEach(
        (fd) => fd.controls.forEach((c) => {
          c.removeAttribute("aria-invalid");
          c.removeAttribute("data-fx-valid");
          if (fd.error) describe(fd, fd.error.id, false);
        })
      );
      delete f2.fxForm;
      ["ready", "sending", "sent"].forEach((s) => setState(f2, s, false));
    };
  }
};

// src/effects/loader3d.ts
var MAX = 6;
var VERT2 = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
var FRAG2 = (
  /* glsl */
  `
precision highp float;
uniform vec2 uRes;
uniform int uN;
uniform int uMode;            // 0 pages, 1 stack
uniform vec4 uM[${MAX * 3}];  // world -> slab space, three rows per slab
uniform vec3 uCol[${MAX}];    // linear colours
uniform vec3 uBase;
uniform vec3 uSize;           // slab half extents: profile x, profile y, thickness
uniform vec2 uRound;          // profile corner radius, edge radius
uniform vec4 uPlate;          // half x, half z, half thickness, y
uniform vec2 uPlateR;
uniform vec4 uCam;            // yaw, height, distance, focal length
uniform vec3 uTarget;
uniform vec4 uBound;          // bounding sphere
uniform float uGround;

// A rounded rectangle in the xy plane, extruded along z, with rounded edges.
float slab(vec3 p, vec3 b, float rc, float re) {
  vec2 q = abs(p.xy) - b.xy + rc;
  float d2 = min(max(q.x, q.y), 0.) + length(max(q, 0.)) - rc;
  vec2 w = vec2(d2 + re, abs(p.z) - b.z + re);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - re;
}

float plateD(vec3 p) {
  vec3 q = p - vec3(0., uPlate.w, 0.);
  return slab(vec3(q.x, q.z, q.y), uPlate.xyz, uPlateR.x, uPlateR.y);
}

vec2 map(vec3 p) {
  vec2 res = vec2(plateD(p), 0.);
  vec4 P = vec4(p, 1.);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    vec3 q = vec3(dot(uM[i * 3], P), dot(uM[i * 3 + 1], P), dot(uM[i * 3 + 2], P));
    float d = slab(q, uSize, uRound.x, uRound.y);
    if (d < res.x) res = vec2(d, float(i + 1));
  }
  return res;
}

vec3 normal(vec3 p) {
  const vec2 k = vec2(1., -1.);
  const float e = .0008;
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x + k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

float shadow(vec3 ro, vec3 rd) {
  float res = 1., t = .02;
  for (int i = 0; i < 32; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, 9. * h / t);
    t += clamp(h, .015, .18);
    if (res < .003 || t > 3.) break;
  }
  return clamp(res, 0., 1.);
}

float occlusion(vec3 p, vec3 n) {
  float o = 0., s = 1.;
  for (int i = 0; i < 5; i++) {
    float h = .012 + .07 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= .72;
  }
  return clamp(1. - 2.6 * o, 0., 1.);
}

// A soft rectangular light seen in direction d.
float softbox(vec3 d, vec3 L, vec3 U, vec2 size, float soft) {
  float c = dot(d, L);
  if (c <= 0.) return 0.;
  vec3 h = d / c - L;
  vec3 R = normalize(cross(L, U));
  vec3 Up = cross(R, L);
  vec2 q = abs(vec2(dot(h, R), dot(h, Up))) - size;
  float sd = length(max(q, 0.)) + min(max(q.x, q.y), 0.);
  return 1. - smoothstep(-soft, soft, sd);
}

// Bright studio for the stack.
vec3 envStudio(vec3 d) {
  float y = d.y;
  vec3 c = mix(vec3(.18, .2, .34), vec3(.62, .66, .86), smoothstep(-.45, .1, y));
  c = mix(c, vec3(.92, .94, 1.), smoothstep(.1, .95, y));
  c += vec3(3.2, 3.15, 3.) * softbox(d, normalize(vec3(-.55, .78, .32)), vec3(0., 1., 0.), vec2(.42, .26), .1);
  c += vec3(1.3, 1.4, 1.8) * softbox(d, normalize(vec3(.85, .3, -.3)), vec3(0., 1., 0.), vec2(.9, .05), .05);
  c += vec3(.9, .8, 1.3) * softbox(d, normalize(vec3(.2, .25, .95)), vec3(0., 1., 0.), vec2(.7, .04), .06);
  return c;
}

// Dark stage with coloured lights for the pages: lavender key, magenta side light,
// cyan bounce from the plate below, and soft cloudy variation for iridescent reflections.
vec3 envStage(vec3 d) {
  vec3 c = vec3(.006, .005, .02);
  c += vec3(1.5, 1.4, 2.4) * softbox(d, normalize(vec3(-.45, .75, .55)), vec3(0., 1., 0.), vec2(.55, .4), .35);
  c += vec3(2.6, .55, 1.7) * softbox(d, normalize(vec3(.95, .15, -.25)), vec3(0., 1., 0.), vec2(.35, .7), .4);
  c += vec3(.9, .7, 2.2) * softbox(d, normalize(vec3(-.9, .1, -.4)), vec3(0., 1., 0.), vec2(.3, .8), .4);
  c += vec3(.45, 1.1, 1.5) * smoothstep(-.15, -.85, d.y);
  // A cloudy pink-white glow in front, behind the viewer: faces turned to the camera pick it up.
  float cloud = sin(d.x * 9.3 + 1.7) * sin(d.y * 7.1 - d.x * 3.) * sin(d.z * 5.7 + d.y * 4.) * .5 + .5;
  c += mix(vec3(.9, .35, 1.1), vec3(1.4, 1.3, 1.6), cloud) * softbox(d, normalize(vec3(.5, .2, .85)), vec3(0., 1., 0.), vec2(.8, .55), .6) * (.18 + .62 * cloud);
  float n = sin(d.x * 6.1 + d.y * 2.7) * sin(d.y * 4.3 - d.z * 5.2) * .5 + .5;
  return c * (.7 + .6 * n);
}

vec3 env(vec3 d) {
  return uMode == 0 ? envStage(d) : envStudio(d);
}

vec3 albedo(float id, vec3 p, out vec3 q, out vec3 axis) {
  q = p;
  axis = vec3(0., 1., 0.);
  if (id < .5) return uBase;
  vec3 c = uCol[0];
  vec4 P = vec4(p, 1.);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    if (abs(id - float(i + 1)) < .5) {
      c = uCol[i];
      q = vec3(dot(uM[i * 3], P), dot(uM[i * 3 + 1], P), dot(uM[i * 3 + 2], P));
      axis = uM[i * 3 + 2].xyz;
    }
  }
  vec2 u = q.xy / uSize.xy;
  // Pages: lighter towards the lower left. Stack: a gentle diagonal.
  return uMode == 0 ? c * (.4 + 1.1 * clamp(.5 - .45 * u.y - .3 * u.x, 0., 1.)) : c * (.86 + .3 * clamp(.5 + .275 * (q.y - q.x), 0., 1.));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 ro = vec3(sin(uCam.x) * uCam.z, uCam.y, cos(uCam.x) * uCam.z);
  vec3 ww = normalize(uTarget - ro);
  vec3 uu = normalize(cross(ww, vec3(0., 1., 0.)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + uCam.w * ww);

  vec3 col = vec3(0.);
  float alpha = 0.;

  // Bounding sphere around everything that can be hit.
  vec3 oc = ro - uBound.xyz;
  float b = dot(oc, rd);
  float disc = b * b - (dot(oc, oc) - uBound.w * uBound.w);
  bool hit = false;
  float t = 0.;
  vec2 h = vec2(1., 0.);
  if (disc > 0.) {
    float sq = sqrt(disc);
    t = max(0., -b - sq);
    float tmax = -b + sq;
    for (int i = 0; i < 120; i++) {
      h = map(ro + rd * t);
      if (h.x < .0006 * t) { hit = true; break; }
      t += h.x * .9;
      if (t > tmax) break;
    }
  }

  bool stage = uMode == 0;
  vec3 L = stage ? normalize(vec3(-.5, .8, .6)) : normalize(vec3(-.55, .9, .42));
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normal(p);
    vec3 v = -rd;
    vec3 q, axis;
    vec3 a = albedo(h.y, p, q, axis);
    float occ = occlusion(p, n);
    float sha = shadow(p + n * .004, L);
    float ndl = dot(n, L);
    float wrap = clamp(ndl * .5 + .5, 0., 1.);
    float nv = clamp(dot(n, v), 0., 1.);
    float fre = pow(1. - nv, 5.);
    vec3 r = reflect(rd, n);
    vec3 hv = normalize(L + v);
    bool plate = h.y < .5;

    if (stage) {
      if (plate) {
        // Pale glass-blue plate: bright top, darker sides, nearly black underneath.
        float top = smoothstep(.2, .9, n.y);
        float under = smoothstep(.2, .9, -n.y);
        vec3 dif = a * mix(.32, .9 + .25 * wrap, top) * mix(1., .08, under) * mix(.6, 1., occ);
        float rs = shadow(p + n * .01, r);
        vec3 spec = env(r) * (.04 + .5 * fre) * mix(.35, 1., rs) * top;
        spec += vec3(1.) * pow(clamp(dot(n, hv), 0., 1.), 70.) * .6 * sha * top;
        col = dif + spec;
      } else {
        // Deep glossy panels: low diffuse, strong coat, edges that catch the light.
        vec3 dif = a * (.04 + .32 * clamp(ndl, 0., 1.) * mix(.3, 1., sha)) * occ;
        dif += a * vec3(.55, .85, 1.25) * smoothstep(.1, .9, -n.y) * 1.4;   // light bouncing up from the plate
        dif += a * vec3(.5, .45, 1.) * pow(1. - nv, 2.5) * .9 * occ;       // lavender rim
        vec3 spec = env(r) * (.1 + .9 * fre) * mix(.4, 1., occ);
        spec += vec3(1.) * pow(clamp(dot(n, hv), 0., 1.), 160.) * 2. * sha;
        // Thin bright rims where the rounded edges turn away from the faces.
        float edge = 1. - smoothstep(.35, .8, abs(dot(n, axis)));
        spec += vec3(.62, .6, 1.25) * edge * .35;
        col = dif + spec;
      }
    } else {
      vec3 dif = a * (.16 + .84 * wrap * mix(.42, 1., sha)) * mix(.55, 1., occ);
      dif += a * a * .5 * clamp(n.y * .5 + .5, 0., 1.) * occ;
      dif += a * .55 * pow(clamp(1. - nv, 0., 1.), 2.) * occ;
      float coat = plate ? .05 + .6 * fre : .045 + .9 * fre;
      vec3 spec = env(r) * coat * mix(.35, 1., occ);
      if (plate) {
        float rs = shadow(p + n * .01, r);
        spec *= mix(.45, 1., rs);
        dif += vec3(.05, .07, .12) * (1. - rs);
      }
      spec += vec3(1.) * pow(clamp(dot(n, hv), 0., 1.), plate ? 60. : 140.) * (plate ? .8 : 2.2) * sha;
      col = dif + spec;
    }
    alpha = 1.;
  }

  // Soft contact shadow on an invisible floor, so the plate looks like it floats.
  if (!hit && rd.y < 0.) {
    float tg = (uGround - ro.y) / rd.y;
    vec3 g = ro + rd * tg;
    vec2 q = abs(g.xz) - uPlate.xy + uPlateR.x;
    float d2 = min(max(q.x, q.y), 0.) + length(max(q, 0.)) - uPlateR.x;
    float lift = uPlate.w - uGround;
    float s = (1. - smoothstep(-.32, .12 + lift * .25, d2)) * (.34 - lift * .18);
    alpha = clamp(s, 0., 1.);
    col = vec3(0., 0., .015);
  }

  // Never end in a hard line at the canvas edge.
  vec2 e = min(gl_FragCoord.xy, uRes - gl_FragCoord.xy) / uRes.y;
  alpha *= smoothstep(0., .06, min(e.x, e.y));

  // Filmic tone map, then gamma.
  vec3 c = col;
  c = (c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14);
  c = pow(clamp(c, 0., 1.), vec3(1. / 2.2));
  gl_FragColor = vec4(c * alpha, alpha);
}
`
);
var shared;
function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}
function setup(r) {
  const { gl } = r;
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT2));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAG2));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) || "link");
  gl.useProgram(p);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  r.u = {};
  for (const n of ["uRes", "uN", "uMode", "uM", "uCol", "uBase", "uSize", "uRound", "uPlate", "uPlateR", "uCam", "uTarget", "uBound", "uGround"]) r.u[n] = gl.getUniformLocation(p, n);
  r.ok = true;
}
function renderer() {
  if (shared !== void 0) return shared;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error("no webgl");
    const r = { gl, canvas, u: {}, ok: false };
    setup(r);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      r.ok = false;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      try {
        setup(r);
      } catch {
      }
    });
    shared = r;
  } catch (err) {
    console.warn("[lumafx] loader-3d: WebGL unavailable, using the CSS version", err);
    shared = null;
  }
  return shared;
}
function parseColor(c) {
  const s = c.trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    const n = parseInt(h, 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  if (m) return [+m[1], +m[2], +m[3]];
  if (typeof document === "undefined") return null;
  const probe = document.createElement("span");
  probe.style.color = s;
  if (!probe.style.color) return null;
  document.body.append(probe);
  const out = parseColor(getComputedStyle(probe).color);
  probe.remove();
  return out;
}
var toLinear = (rgb) => rgb.map((v) => Math.pow(v / 255, 2.2));
function palette(list, n) {
  if (list.length >= n) return list.slice(0, n);
  const out = [];
  for (let i = 0; i < n; i++) {
    const f2 = n === 1 ? 0 : i / (n - 1) * (list.length - 1);
    const a = list[Math.floor(f2)];
    const b = list[Math.min(list.length - 1, Math.floor(f2) + 1)];
    const k = f2 - Math.floor(f2);
    out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
  }
  return out;
}
var easeInOut2 = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
var easeOutBack = (t) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
function fanAt(p) {
  p = (p % 1 + 1) % 1;
  if (p < 0.1) return 0;
  if (p < 0.44) return easeOutBack((p - 0.1) / 0.34);
  if (p < 0.6) return 1;
  if (p < 0.94) return 1 - easeInOut2((p - 0.6) / 0.34);
  return 0;
}
function poses(n, time, duration, still = false) {
  const out = new Float32Array(MAX * 4);
  const bob = still ? 0 : Math.sin(time / 1e3 * 2.1) * 0.025;
  const open = n > 1 ? Math.min(0.17, Math.max(0.03, 0.9 / (n - 1) - 0.13)) : 0;
  const base = n > 4 ? -0.3 - (n - 4) * 0.04 : -0.3;
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1) - 0.5;
    const e = still ? 0.85 : fanAt(time / duration - (n - 1 - i) * 0.035);
    const a = e * k * 1.9;
    out[i * 4] = base + bob + i * (0.13 + e * open);
    out[i * 4 + 1] = Math.cos(a);
    out[i * 4 + 2] = Math.sin(a);
    out[i * 4 + 3] = e * k * 0.16;
  }
  return out;
}
var T = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
function mul(A, B) {
  const o = new Array(12);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) o[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c] + (c === 3 ? A[r * 4 + 3] : 0);
  return o;
}
var PIVOT = [-0.36, -0.36];
function stackMatrices(n, time, duration, still = false) {
  const ps = poses(n, time, duration, still);
  const out = new Float32Array(MAX * 12);
  for (let i = 0; i < n; i++) {
    const [y, c, s, tilt2] = [ps[i * 4], ps[i * 4 + 1], ps[i * 4 + 2], ps[i * 4 + 3]];
    const ct = Math.cos(tilt2);
    const st = Math.sin(tilt2);
    let m = T(0, -y, 0);
    m = mul(T(-PIVOT[0], 0, -PIVOT[1]), m);
    m = mul([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0], m);
    m = mul(T(PIVOT[0], 0, PIVOT[1]), m);
    m = mul([1, 0, 0, 0, 0, ct, -st, 0, 0, st, ct, 0], m);
    m = mul([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0], m);
    out.set(m, i * 12);
  }
  return out;
}
var smooth01 = (t) => easeInOut2(Math.min(1, Math.max(0, t)));
function pageState(n, p, still = false) {
  const fan = 0.55;
  const ring2 = Math.PI * 2 / Math.max(1, n);
  if (still) return { angles: Array.from({ length: n }, (_, i) => i * fan * 0.9), open: 1 };
  p = (p % 1 + 1) % 1;
  const spin = ring2 * smooth01((p - 0.34) / 0.6);
  const angles = [];
  let open = 0;
  for (let i = 0; i < n; i++) {
    const fanA = i * fan;
    const ringA = i * ring2 + spin;
    let a = 0;
    if (p < 0.08) a = 0;
    else if (p < 0.34) {
      const k = smooth01((p - 0.08 - i * 0.012) / 0.24);
      a = fanA * k;
      open = smooth01((p - 0.08) / 0.24);
    } else if (p < 0.52) {
      a = fanA + (ringA - fanA) * smooth01((p - 0.34) / 0.18);
      open = 1;
    } else if (p < 0.7) {
      a = ringA;
      open = 1;
    } else if (p < 0.94) {
      const k = smooth01((p - 0.7) / 0.24);
      a = ringA * (1 - k);
      open = 1 - k;
    }
    angles.push(a);
  }
  return { angles, open };
}
var PAGE = { halfW: 0.42, halfH: 0.5, halfT: 0.032, hinge: 0.05, centerY: 0.2 };
function pageMatrices(n, time, duration, still = false) {
  const { angles, open } = pageState(n, time / duration, still);
  const bob = still ? 0 : Math.sin(time / 1e3 * 1.9) * 0.03;
  const deck = 1 - open;
  const C = angles.map((_, i) => [
    -(PAGE.hinge + PAGE.halfW) + 0.05 * i * deck,
    PAGE.centerY + bob + 0.035 * i * deck,
    -(2 * PAGE.halfT + 0.03) * i * deck
  ]);
  let gx = 0;
  let gz = 0;
  const turn = angles.map((a) => -a);
  turn.forEach((a, i) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    gx += C[i][0] * c + C[i][2] * s;
    gz += -C[i][0] * s + C[i][2] * c;
  });
  gx /= Math.max(1, n);
  gz /= Math.max(1, n);
  const out = new Float32Array(MAX * 12);
  turn.forEach((a, i) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const [cx, cy, cz] = C[i];
    out.set([c, 0, -s, c * gx - s * gz - cx, 0, 1, 0, -cy, s, 0, c, s * gx + c * gz - cz], i * 12);
  });
  return out;
}
var SCENES = {
  pages: {
    size: [PAGE.halfW, PAGE.halfH, PAGE.halfT],
    round: [0.075, 0.022],
    plate: [0.7, 0.7, 0.032],
    plateR: [0.06, 0.018],
    plateY: -0.58,
    cam: [0.55, -0.38, 5.4, 2.3],
    target: [0, 0.02, 0],
    bound: [0, 0, 0, 1.6],
    ground: -0.88
  },
  stack: {
    size: [0.5, 0.5, 0.058],
    round: [0.17, 0.05],
    plate: [0.76, 0.76, 0.05],
    plateR: [0.27, 0.05],
    plateY: -0.56,
    cam: [0.66, 2.7, 5.2, 2.45],
    target: [-0.1, -0.2, -0.06],
    bound: [0, -0.15, 0, 2.1],
    ground: -0.74
  }
};
var DEFAULT_COLORS = "#3a6bff,#5560ff,#7457ff,#9a5cf6";
var DEFAULT_PAGES = "#2b26c9,#3326c8,#3d25c5,#4925c1,#5726bd";
var loader3d = {
  name: "loader-3d",
  meta: META["loader-3d"],
  mount(el, ctx) {
    const mode = ctx.str("style", "pages") === "stack" ? "stack" : "pages";
    const fallback = mode === "pages" ? DEFAULT_PAGES : DEFAULT_COLORS;
    const listed = (ctx.str("colors", fallback) || fallback).split(/,(?![^(]*\))/).map(parseColor).filter((c) => !!c);
    const colors = listed.length ? listed : fallback.split(",").map(parseColor);
    const count = clamp(Math.round(ctx.num("count", listed.length > 1 ? listed.length : mode === "pages" ? 5 : 4)), 1, MAX);
    const slabs = palette(colors, count);
    const baseDefault = mode === "pages" ? "#a6d8ea" : "#b2d6ff";
    const base = parseColor(ctx.str("base", baseDefault) || baseDefault) || [166, 216, 234];
    const duration = Math.max(600, ctx.time("duration", mode === "pages" ? 3600 : 2800));
    const scene = SCENES[mode];
    const still = ctx.env.reduced;
    const offs = [];
    if (el.parentElement?.closest('[role="progressbar"], [data-fx~="preloader"], .fx-preloader')) {
      el.setAttribute("aria-hidden", "true");
      offs.push(() => el.removeAttribute("aria-hidden"));
    } else if (!el.hasAttribute("role")) {
      el.setAttribute("role", "progressbar");
      const label = !el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby");
      if (label) el.setAttribute("aria-label", "Loading");
      offs.push(() => {
        el.removeAttribute("role");
        if (label) el.removeAttribute("aria-label");
      });
    }
    const r = renderer();
    if (!r) {
      const box = document.createElement("div");
      box.className = "fx-l3d-css" + (mode === "pages" ? " fx-l3d-pages" : "");
      box.setAttribute("aria-hidden", "true");
      box.style.setProperty("--n", String(count));
      const plate = document.createElement("i");
      plate.className = "fx-l3d-plate";
      plate.style.setProperty("--c", `rgb(${base.join(" ")})`);
      box.append(plate);
      slabs.forEach((c, i) => {
        const s = document.createElement("i");
        s.className = "fx-l3d-slab";
        s.style.setProperty("--i", String(i));
        s.style.setProperty("--k", String(count === 1 ? 0 : i / (count - 1) - 0.5));
        s.style.setProperty("--c", `rgb(${c.map(Math.round).join(" ")})`);
        box.append(s);
      });
      el.append(box);
      setState(el, "ready css");
      return () => {
        offs.forEach((f2) => f2());
        box.remove();
        setState(el, "ready css", false);
      };
    }
    const canvas = document.createElement("canvas");
    canvas.className = "fx-l3d-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.append(canvas);
    const g = canvas.getContext("2d");
    const linSlabs = new Float32Array(MAX * 3);
    slabs.forEach((c, i) => linSlabs.set(toLinear(c), i * 3));
    const linBase = toLinear(base);
    let W = 0;
    let H = 0;
    let quality = 1;
    let ema = 16.7;
    let frames2 = 0;
    const layout = () => {
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const scale = (rect.width * dpr <= 420 ? Math.min(2.5, dpr * 1.6) : Math.min(2, dpr)) * quality;
      W = Math.max(1, Math.round(rect.width * scale));
      H = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
    };
    let time = 0;
    const draw = () => {
      if (!r.ok || !W || !H) return;
      const { gl, u } = r;
      if (r.canvas.width < W || r.canvas.height < H) {
        r.canvas.width = Math.max(r.canvas.width, W);
        r.canvas.height = Math.max(r.canvas.height, H);
      }
      gl.viewport(0, 0, W, H);
      gl.uniform2f(u.uRes, W, H);
      const sc = scene;
      const sway = still ? 0 : Math.sin(time / 1e3 * 0.45) * (mode === "pages" ? 0.14 : 0.2);
      const float2 = still ? 0 : Math.sin(time / 1e3 * 1.6 + 1) * 0.035;
      gl.uniform1i(u.uN, count);
      gl.uniform1i(u.uMode, mode === "pages" ? 0 : 1);
      gl.uniform4fv(u.uM, mode === "pages" ? pageMatrices(count, time, duration, still) : stackMatrices(count, time, duration, still));
      gl.uniform3fv(u.uCol, linSlabs);
      gl.uniform3f(u.uBase, linBase[0], linBase[1], linBase[2]);
      gl.uniform3f(u.uSize, sc.size[0], sc.size[1], sc.size[2]);
      gl.uniform2f(u.uRound, sc.round[0], sc.round[1]);
      gl.uniform4f(u.uPlate, sc.plate[0], sc.plate[1], sc.plate[2], sc.plateY + float2);
      gl.uniform2f(u.uPlateR, sc.plateR[0], sc.plateR[1]);
      gl.uniform4f(u.uCam, sc.cam[0] + sway, sc.cam[1], sc.cam[2], sc.cam[3]);
      gl.uniform3f(u.uTarget, sc.target[0], sc.target[1], sc.target[2]);
      gl.uniform4f(u.uBound, sc.bound[0], sc.bound[1], sc.bound[2], sc.bound[3]);
      gl.uniform1f(u.uGround, sc.ground);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      g.clearRect(0, 0, W, H);
      g.drawImage(r.canvas, 0, r.canvas.height - H, W, H, 0, 0, W, H);
    };
    layout();
    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(el);
    let off = null;
    const offView = onView(el, (v) => {
      if (still) {
        if (v) draw();
        return;
      }
      if (v && !off)
        off = tick((_now, dt) => {
          time += dt;
          draw();
          ema = ema * 0.92 + dt * 0.08;
          if (++frames2 > 8 && ema > 30 && quality > 0.4) {
            quality = Math.max(0.4, quality * (ema > 80 ? 0.6 : 0.8));
            frames2 = 0;
            layout();
          }
        });
      else if (!v && off) {
        off();
        off = null;
      }
    });
    setState(el, "ready");
    el.fxLoader = {
      /** Jump to a moment in the loop (ms) and draw it — handy for screenshots and tests. */
      seek(ms) {
        time = ms;
        draw();
      }
    };
    return () => {
      offView();
      off?.();
      ro.disconnect();
      canvas.remove();
      offs.forEach((f2) => f2());
      delete el.fxLoader;
      setState(el, "ready", false);
    };
  }
};
async function loading(target, work, opts = {}) {
  const host = typeof target === "string" ? document.querySelector(target) : target;
  if (!host) return typeof work === "function" ? work() : work;
  const box = document.createElement("div");
  box.className = "fx-loading-box" + (opts.overlay ? " fx-loading-overlay" : "");
  const l = document.createElement("div");
  l.setAttribute("data-fx", "loader-3d");
  l.setAttribute("aria-label", opts.label || "Loading");
  if (opts.colors) l.setAttribute("data-fx-colors", opts.colors);
  if (opts.size) l.style.setProperty("--fx-size", opts.size);
  box.append(l);
  host.append(box);
  host.setAttribute("aria-busy", "true");
  const t0 = performance.now();
  try {
    return await (typeof work === "function" ? work() : work);
  } finally {
    const wait = (opts.min ?? 500) - (performance.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    host.removeAttribute("aria-busy");
    const out = box.animate?.([{ opacity: 1 }, { opacity: 0, scale: 0.94 }], { duration: 260, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
    await out?.finished.catch(() => {
    });
    box.remove();
  }
}

// src/effects/index.ts
var css = (name) => ({ name, meta: META[name] });
var borderBeam = css("border-beam");
var shimmer = css("shimmer");
var shine = css("shine");
var aurora = css("aurora");
var hoverIcon = css("hover-icon");
var dapple = css("dapple");
var allEffects = [
  borderBeam,
  shimmer,
  shine,
  aurora,
  squircle,
  glass,
  shadow,
  reveal,
  stagger,
  textReveal,
  scramble,
  counter,
  marquee,
  spotlight,
  magnetic,
  tilt,
  cursorImage,
  parallax,
  stack,
  hscroll,
  carousel,
  stories,
  ripple,
  morph,
  // v0.2
  pageTransition,
  preloader,
  modal,
  drawer,
  hovercard,
  chat,
  smartHeader,
  scrollbar,
  scrollProgress,
  dock,
  hoverIcon,
  lightbox,
  imageReveal,
  expand,
  imageTrail,
  videoScrub,
  frames,
  svgDraw,
  dotField,
  typewriter,
  rotateWords,
  clock,
  dapple,
  ring,
  // v0.3
  card2,
  press,
  form,
  loader3d
];

// src/index.ts
register(...allEffects);
var version = true ? "0.5.0" : "dev";
var lumafx = { version, start, stop, refresh, register, mount, stats, registered, isStarted, env, transition, page, modals, forms: core_exports, loading, effects: EFFECT_NAMES };
var src_default = lumafx;

export {
  reveal,
  stagger,
  textReveal,
  scramble,
  counter,
  marquee,
  spotlight,
  magnetic,
  tilt,
  shadow,
  cursorImage,
  parallax,
  stack,
  hscroll,
  carousel,
  stories,
  squircle,
  glass,
  ripple,
  page,
  pageTransition,
  preloader,
  modal,
  drawer,
  modals,
  hovercard,
  smartHeader,
  scrollbar,
  scrollProgress,
  dock,
  lightbox,
  chat,
  imageReveal,
  expand,
  imageTrail,
  videoScrub,
  frames,
  svgDraw,
  dotField,
  typewriter,
  rotateWords,
  clock,
  ring,
  card2 as card,
  press,
  form,
  loader3d,
  loading,
  borderBeam,
  shimmer,
  shine,
  aurora,
  hoverIcon,
  dapple,
  allEffects,
  version,
  src_default
};
