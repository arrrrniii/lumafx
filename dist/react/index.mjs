// src/react/index.ts
import { createElement } from "react";

// src/meta.ts
var META = { "border-beam": { "name": "border-beam", "kind": "css", "loop": true, "options": { "duration": { "type": "time", "css": true, "default": "6s" }, "delay": { "type": "time", "css": true, "default": "0s" }, "color": { "type": "color", "css": true, "default": "#a78bfa" }, "color-2": { "type": "color", "css": true, "default": "#22d3ee" }, "length": { "type": "percent", "css": true, "default": "22%" }, "width": { "type": "length", "css": true, "default": "1.5px" }, "count": { "type": "number", "css": true, "default": 1 }, "mode": { "type": "enum", "default": "beam", "values": ["beam", "full"] }, "glow": { "type": "boolean", "default": false } } }, "shimmer": { "name": "shimmer", "kind": "css", "loop": true, "options": { "duration": { "type": "time", "css": true, "default": "2.8s" }, "color": { "type": "color", "css": true, "default": "currentColor" }, "color-2": { "type": "color", "css": true, "default": "#ffffff" } } }, "shine": { "name": "shine", "kind": "css", "loop": true, "options": { "duration": { "type": "time", "css": true, "default": "3.2s" }, "intensity": { "type": "number", "css": true, "default": 0.35 }, "trigger": { "type": "enum", "default": "loop", "values": ["loop", "hover"] } } }, "aurora": { "name": "aurora", "kind": "css", "loop": true, "options": { "duration": { "type": "time", "css": true, "default": "18s" }, "color": { "type": "color", "css": true, "default": "#7c3aed" }, "color-2": { "type": "color", "css": true, "default": "#06b6d4" }, "color-3": { "type": "color", "css": true, "default": "#ec4899" }, "opacity": { "type": "number", "css": true, "default": 0.55 } } }, "squircle": { "name": "squircle", "kind": "hybrid", "options": { "radius": { "type": "length", "css": true, "default": "28px" }, "smoothing": { "type": "number", "css": false, "default": 0.6 }, "fallback": { "type": "enum", "default": "auto", "values": ["auto", "clip", "radius"] } } }, "glass": { "name": "glass", "kind": "hybrid", "options": { "blur": { "type": "length", "css": true, "default": "14px" }, "saturate": { "type": "number", "css": true, "default": 1.6 }, "tint": { "type": "color", "css": true, "default": "rgb(255 255 255 / 0.08)" }, "refraction": { "type": "number", "css": false, "default": 1 }, "aberration": { "type": "number", "css": false, "default": 1 }, "mode": { "type": "enum", "default": "liquid", "values": ["liquid", "frost"] } } }, "shadow": { "name": "shadow", "kind": "hybrid", "options": { "elevation": { "type": "number", "css": true, "default": 1 }, "color": { "type": "color", "css": true, "default": "rgb(15 17 35)" }, "lift": { "type": "boolean", "default": false }, "light": { "type": "enum", "default": "top", "values": ["top", "cursor"] } } }, "reveal": { "name": "reveal", "kind": "js", "options": { "from": { "type": "enum", "default": "up", "values": ["up", "down", "left", "right", "zoom", "blur", "book", "clip"] }, "duration": { "type": "time", "css": true, "default": "900ms" }, "delay": { "type": "time", "css": true, "default": "0ms" }, "distance": { "type": "length", "css": true, "default": "28px" }, "ease": { "type": "string", "css": true, "default": "cubic-bezier(.16,1,.3,1)" }, "once": { "type": "boolean", "default": true } } }, "stagger": { "name": "stagger", "kind": "js", "options": { "from": { "type": "enum", "default": "up", "values": ["up", "down", "left", "right", "zoom", "blur", "book", "clip"] }, "stagger": { "type": "time", "css": true, "default": "70ms" }, "duration": { "type": "time", "css": true, "default": "800ms" }, "delay": { "type": "time", "css": true, "default": "0ms" }, "distance": { "type": "length", "css": true, "default": "24px" }, "ease": { "type": "string", "css": true, "default": "cubic-bezier(.16,1,.3,1)" }, "once": { "type": "boolean", "default": true } } }, "text-reveal": { "name": "text-reveal", "kind": "js", "options": { "split": { "type": "enum", "default": "words", "values": ["words", "chars", "lines"] }, "style": { "type": "enum", "default": "blur", "values": ["blur", "rise", "flip", "fade"] }, "stagger": { "type": "time", "css": true, "default": "" }, "duration": { "type": "time", "css": true, "default": "800ms" }, "delay": { "type": "time", "css": true, "default": "0ms" }, "trigger": { "type": "enum", "default": "view", "values": ["view", "load"] }, "once": { "type": "boolean", "default": true } } }, "scramble": { "name": "scramble", "kind": "js", "options": { "trigger": { "type": "enum", "default": "view", "values": ["view", "hover", "load"] }, "speed": { "type": "time", "css": false, "default": "28ms" }, "chars": { "type": "string", "default": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?/<>" } } }, "counter": { "name": "counter", "kind": "js", "options": { "from": { "type": "number", "css": false, "default": 0 }, "duration": { "type": "time", "css": false, "default": "1800ms" } } }, "marquee": { "name": "marquee", "kind": "hybrid", "loop": true, "options": { "speed": { "type": "number", "css": false, "default": 60 }, "gap": { "type": "length", "css": true, "default": "2rem" }, "fade": { "type": "percent", "css": true, "default": "8%" }, "reverse": { "type": "boolean", "default": false }, "vertical": { "type": "boolean", "default": false }, "pause": { "type": "boolean", "default": true } } }, "spotlight": { "name": "spotlight", "kind": "js", "options": { "color": { "type": "color", "css": true, "default": "#a78bfa" }, "size": { "type": "length", "css": true, "default": "360px" }, "border": { "type": "boolean", "default": true } } }, "magnetic": { "name": "magnetic", "kind": "js", "options": { "strength": { "type": "number", "css": false, "default": 0.35 }, "area": { "type": "length", "css": false, "default": "40px" } } }, "tilt": { "name": "tilt", "kind": "js", "options": { "max": { "type": "number", "css": false, "default": 10 }, "scale": { "type": "number", "css": false, "default": 1.03 }, "perspective": { "type": "length", "css": false, "default": "900px" }, "glare": { "type": "boolean", "default": true } } }, "cursor-image": { "name": "cursor-image", "kind": "js", "options": { "src": { "type": "string" }, "label": { "type": "string" }, "size": { "type": "length", "css": false, "default": "280px" }, "cursor": { "type": "enum", "default": "auto", "values": ["auto", "none"] } } }, "parallax": { "name": "parallax", "kind": "hybrid", "options": { "speed": { "type": "number", "css": true, "default": 0.25 } } }, "stack": { "name": "stack", "kind": "hybrid", "options": { "top": { "type": "length", "css": true, "default": "12vh" }, "offset": { "type": "length", "css": true, "default": "16px" }, "shrink": { "type": "number", "css": false, "default": 0.05 } } }, "hscroll": { "name": "hscroll", "kind": "hybrid", "options": { "gap": { "type": "length", "css": true, "default": "2rem" } } }, "carousel": { "name": "carousel", "kind": "hybrid", "options": { "slide": { "type": "length", "css": true, "default": "80%" }, "gap": { "type": "length", "css": true, "default": "16px" }, "style": { "type": "enum", "default": "default", "values": ["default", "scale"] }, "controls": { "type": "boolean", "default": false }, "autoplay": { "type": "time", "css": false, "default": "0" } } }, "stories": { "name": "stories", "kind": "js", "options": { "duration": { "type": "time", "css": true, "default": "5000ms" }, "loop": { "type": "boolean", "default": true } } }, "ripple": { "name": "ripple", "kind": "webgl", "options": { "strength": { "type": "number", "css": false, "default": 1 }, "src": { "type": "string" } } }, "morph": { "name": "morph", "kind": "js", "options": { "name": { "type": "string" } } }, "page-transition": { "name": "page-transition", "kind": "js", "options": { "style": { "type": "enum", "default": "wave", "values": ["wave", "curtain", "circle", "slide"] }, "color": { "type": "color", "css": true, "default": "#0b0c12" }, "color-2": { "type": "color", "css": true, "default": "#ffb547" }, "duration": { "type": "time", "css": false, "default": "750ms" }, "label": { "type": "string" }, "links": { "type": "string", "default": "a[href]" } } }, "preloader": { "name": "preloader", "kind": "js", "options": { "style": { "type": "enum", "default": "slide", "values": ["slide", "wave", "fade"] }, "color": { "type": "color", "css": true, "default": "#0b0c12" }, "min": { "type": "time", "css": false, "default": "900ms" } } }, "modal": { "name": "modal", "kind": "js", "options": { "style": { "type": "enum", "default": "liquid", "values": ["liquid", "glass", "scale", "slide"] }, "from": { "type": "enum", "default": "auto", "values": ["auto", "trigger", "bottom"] }, "side": { "type": "enum", "default": "center", "values": ["center", "right", "left", "bottom", "top"] }, "size": { "type": "length", "css": true, "default": "560px" }, "root": { "type": "string" }, "color": { "type": "color", "css": true, "default": "#20232e" } } }, "drawer": { "name": "drawer", "kind": "js", "options": { "side": { "type": "enum", "default": "right", "values": ["right", "left", "bottom", "top"] }, "style": { "type": "enum", "default": "slide", "values": ["slide", "glass", "scale", "push", "dock", "liquid"] }, "size": { "type": "length", "css": true, "default": "560px" }, "color": { "type": "color", "css": true, "default": "#20232e" }, "from": { "type": "enum", "default": "auto", "values": ["auto", "trigger", "bottom"] }, "root": { "type": "string" } } }, "hovercard": { "name": "hovercard", "kind": "js", "options": { "for": { "type": "string" }, "text": { "type": "string" }, "placement": { "type": "enum", "default": "auto", "values": ["auto", "top", "bottom", "left", "right"] }, "delay": { "type": "time", "css": false, "default": "90ms" } } }, "chat": { "name": "chat", "kind": "js", "options": { "title": { "type": "string", "default": "Chat" }, "subtitle": { "type": "string" }, "greeting": { "type": "string" }, "placeholder": { "type": "string", "default": "Write a message\u2026" }, "quick": { "type": "string" }, "color": { "type": "color", "css": true, "default": "#ffb547" }, "position": { "type": "enum", "default": "right", "values": ["right", "left"] } } }, "smart-header": { "name": "smart-header", "kind": "hybrid", "options": { "threshold": { "type": "length", "css": false, "default": "80px" }, "hide": { "type": "boolean", "default": true } } }, "scrollbar": { "name": "scrollbar", "kind": "js", "options": { "sections": { "type": "string", "default": "h2, [data-fx-section]" }, "color": { "type": "color", "css": true, "default": "#ffb547" } } }, "scroll-progress": { "name": "scroll-progress", "kind": "hybrid", "options": { "color": { "type": "color", "css": true, "default": "#ffb547" }, "height": { "type": "length", "css": true, "default": "3px" } } }, "dock": { "name": "dock", "kind": "js", "options": { "magnify": { "type": "number", "css": false, "default": 1.8 }, "range": { "type": "length", "css": false, "default": "150px" } } }, "hover-icon": { "name": "hover-icon", "kind": "css", "options": { "icon": { "type": "string", "default": "\u2192" }, "side": { "type": "enum", "default": "left", "values": ["left", "right"] } } }, "lightbox": { "name": "lightbox", "kind": "js", "options": { "group": { "type": "string" } } }, "image-reveal": { "name": "image-reveal", "kind": "js", "options": { "from": { "type": "enum", "default": "up", "values": ["up", "down", "left", "right", "center", "circle", "diagonal"] }, "duration": { "type": "time", "css": true, "default": "1200ms" }, "delay": { "type": "time", "css": true, "default": "0ms" }, "scale": { "type": "number", "css": true, "default": 1.25 } } }, "expand": { "name": "expand", "kind": "hybrid", "options": { "inset": { "type": "length", "css": true, "default": "8vw" }, "radius": { "type": "length", "css": true, "default": "32px" } } }, "image-trail": { "name": "image-trail", "kind": "js", "options": { "images": { "type": "string" }, "size": { "type": "length", "css": false, "default": "190px" }, "spacing": { "type": "length", "css": false, "default": "90px" } } }, "video-scrub": { "name": "video-scrub", "kind": "js", "options": { "length": { "type": "length", "css": true, "default": "300vh" }, "smooth": { "type": "number", "css": false, "default": 8 } } }, "frames": { "name": "frames", "kind": "js", "options": { "src": { "type": "string" }, "count": { "type": "number", "css": false, "default": 60 }, "start": { "type": "number", "css": false, "default": 1 }, "length": { "type": "length", "css": true, "default": "300vh" } } }, "svg-draw": { "name": "svg-draw", "kind": "js", "options": { "mode": { "type": "enum", "default": "view", "values": ["view", "scroll"] }, "duration": { "type": "time", "css": true, "default": "1800ms" }, "stagger": { "type": "time", "css": true, "default": "140ms" }, "pulse": { "type": "number", "css": false, "default": 0 }, "color": { "type": "color", "css": true, "default": "#ffb547" } } }, "dot-field": { "name": "dot-field", "kind": "js", "options": { "color": { "type": "color", "css": true, "default": "#ffb547" }, "gap": { "type": "length", "css": false, "default": "22px" }, "force": { "type": "number", "css": false, "default": 1 } } }, "typewriter": { "name": "typewriter", "kind": "js", "options": { "speed": { "type": "time", "css": false, "default": "34ms" }, "delay": { "type": "time", "css": false, "default": "0ms" }, "loop": { "type": "boolean", "default": false } } }, "rotate-words": { "name": "rotate-words", "kind": "js", "options": { "words": { "type": "string" }, "interval": { "type": "time", "css": false, "default": "2200ms" }, "style": { "type": "enum", "default": "flip", "values": ["flip", "slide", "blur"] } } }, "clock": { "name": "clock", "kind": "js", "options": { "tz": { "type": "string" }, "seconds": { "type": "boolean", "default": true }, "hour12": { "type": "boolean", "default": false } } }, "dapple": { "name": "dapple", "kind": "css", "loop": true, "options": { "opacity": { "type": "number", "css": true, "default": 0.4 }, "duration": { "type": "time", "css": true, "default": "16s" } } }, "ring": { "name": "ring", "kind": "js", "options": { "speed": { "type": "number", "css": false, "default": 6 }, "tilt": { "type": "number", "css": false, "default": 8 } } }, "card": { "name": "card", "kind": "hybrid", "options": { "style": { "type": "enum", "default": "glow", "values": ["glow", "product", "flip", "cover", "ticket"] }, "color": { "type": "color", "css": true, "default": "#ffb547" }, "radius": { "type": "length", "css": true, "default": "22px" } } }, "press": { "name": "press", "kind": "js", "options": { "style": { "type": "enum", "default": "ripple", "values": ["ripple", "burst", "fill", "squish"] }, "color": { "type": "color", "css": true, "default": "" }, "done": { "type": "string" } } }, "form": { "name": "form", "kind": "js", "options": { "locale": { "type": "string" }, "country": { "type": "string", "default": "AL" }, "ajax": { "type": "boolean", "default": false }, "spam": { "type": "boolean", "default": true }, "reset": { "type": "boolean", "default": false }, "success": { "type": "string" }, "color": { "type": "color", "css": true, "default": "#ffb547" } } }, "loader-3d": { "name": "loader-3d", "kind": "webgl", "options": { "style": { "type": "enum", "default": "pages", "values": ["pages", "stack"] }, "colors": { "type": "string" }, "count": { "type": "number", "css": false, "default": 5 }, "base": { "type": "color", "css": true, "default": "#a6d8ea" }, "duration": { "type": "time", "css": true, "default": "3.6s" }, "size": { "type": "length", "css": true, "default": "160px" } } } };

// src/react/index.ts
var kebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()).replace(/([a-z])(\d)/g, "$1-$2");
function optionAttrs(options, out) {
  if (!options) return;
  for (const [k, v] of Object.entries(options)) {
    if (v === void 0 || v === null) continue;
    out["data-fx-" + kebab(k)] = v === true ? "" : String(v);
  }
}
function Fx({ as = "div", effect, options, ...rest }) {
  const props = { ...rest };
  if (effect) props["data-fx"] = Array.isArray(effect) ? effect.join(" ") : effect;
  optionAttrs(options, props);
  return createElement(as, props);
}
function named(name, defaultAs = "div", render) {
  const keys = new Map(Object.keys(META[name].options).map((k) => [k.replace(/-(\w)/g, (_, c) => c.toUpperCase()), k]));
  const Component = ({ as = defaultAs, children, ...rest }) => {
    const props = { "data-fx": name };
    const options = {};
    for (const [k, v] of Object.entries(rest)) {
      const opt = keys.get(k);
      if (opt) options[opt] = v;
      else props[k] = v;
    }
    optionAttrs(options, props);
    return createElement(as, props, render ? render(children) : children);
  };
  Component.displayName = "Fx(" + name + ")";
  return Component;
}
var BorderBeam = named("border-beam");
var Shimmer = named("shimmer", "span");
var Shine = named("shine");
var Aurora = named("aurora", "section");
var Squircle = named("squircle");
var Glass = named("glass");
var Shadow = named("shadow");
var Reveal = named("reveal");
var Stagger = named("stagger");
var Scramble = named("scramble", "span");
var Counter = named("counter", "span");
var Spotlight = named("spotlight");
var Magnetic = named("magnetic");
var Tilt = named("tilt");
var CursorImage = named("cursor-image", "a");
var Parallax = named("parallax");
var Stack = named("stack");
var Carousel = named("carousel");
var Stories = named("stories");
var Ripple = named("ripple");
var Morph = named("morph");
var TextRevealBase = named("text-reveal", "span");
function TextReveal(props) {
  const key = typeof props.children === "string" ? props.children : void 0;
  return createElement(TextRevealBase, { ...props, key });
}
var Marquee = named(
  "marquee",
  "div",
  (children) => createElement("div", { className: "fx-mq-track" }, children)
);
var HScroll = named(
  "hscroll",
  "section",
  (children) => createElement("div", { className: "fx-hs-sticky" }, createElement("div", { "data-fx-track": "" }, children))
);
var keyed = (base, extra = []) => function Keyed(props) {
  const text = typeof props.children === "string" ? props.children : "";
  return createElement(base, { ...props, key: [text, ...extra.map((k) => String(props[k] ?? ""))].join("|") });
};
var PageTransition = named("page-transition");
var Preloader = named("preloader");
var Modal = named("modal", "dialog", (children) => createElement("div", { className: "fx-md-panel" }, children));
var Hovercard = named("hovercard", "span");
var Chat = named("chat");
var SmartHeader = named("smart-header", "header");
var Scrollbar = named("scrollbar");
var ScrollProgress = named("scroll-progress");
var Dock = named("dock", "nav");
var HoverIcon = named("hover-icon", "a");
var Lightbox = named("lightbox", "a");
var ImageReveal = named("image-reveal", "figure");
var Expand = named("expand");
var ImageTrail = named("image-trail", "section");
var VideoScrub = named("video-scrub", "section", (children) => createElement("div", { className: "fx-pin" }, children));
var Frames = named("frames", "section", (children) => createElement("div", { className: "fx-pin" }, children));
var SvgDraw = named("svg-draw", "svg");
var DotField = named("dot-field", "section");
var Typewriter = keyed(named("typewriter", "p"));
var RotateWords = keyed(named("rotate-words", "span"), ["words"]);
var Clock = named("clock", "time");
var Dapple = named("dapple", "section");
var Ring = named("ring", "div", (children) => createElement("div", { className: "fx-ring-track" }, children));
var Card = named("card", "article");
var Press = named("press", "button");
var Drawer = named("drawer", "dialog", (children) => createElement("div", { className: "fx-md-panel" }, children));
var Form = named("form", "form");
var Loader3D = named("loader-3d", "div");
export {
  Aurora,
  BorderBeam,
  Card,
  Carousel,
  Chat,
  Clock,
  Counter,
  CursorImage,
  Dapple,
  Dock,
  DotField,
  Drawer,
  Expand,
  Form,
  Frames,
  Fx,
  Glass,
  HScroll,
  HoverIcon,
  Hovercard,
  ImageReveal,
  ImageTrail,
  Lightbox,
  Loader3D,
  Magnetic,
  Marquee,
  Modal,
  Morph,
  PageTransition,
  Parallax,
  Preloader,
  Press,
  Reveal,
  Ring,
  Ripple,
  RotateWords,
  Scramble,
  ScrollProgress,
  Scrollbar,
  Shadow,
  Shimmer,
  Shine,
  SmartHeader,
  Spotlight,
  Squircle,
  Stack,
  Stagger,
  Stories,
  SvgDraw,
  TextReveal,
  Tilt,
  Typewriter,
  VideoScrub
};
