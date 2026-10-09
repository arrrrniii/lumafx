'use client';
"use client";

// src/react/runtime.ts
import { createElement, useEffect, useRef } from "react";
function FxRuntime(props) {
  useEffect(() => {
    let cancelled = false;
    import("lumafx").then((m) => {
      if (!cancelled) m.start(props);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
function FxUIRuntime() {
  useEffect(() => {
    import("lumafx/ui");
  }, []);
  return null;
}
function FxUIStream({ value, done, lang, timeZone, className, onAsk, onSelect, onDone }) {
  const ref = useRef(null);
  const s = useRef(null);
  const ended = useRef(false);
  const latest = useRef({ value, done, onAsk, onSelect, onDone });
  latest.current = { value, done, onAsk, onSelect, onDone };
  const push = () => {
    const st = s.current;
    if (!st) return;
    const { value: v, done: d } = latest.current;
    if (v !== void 0 && v !== null) st.set(v);
    if (d && !ended.current) {
      ended.current = true;
      latest.current.onDone?.(st.end());
    } else if (!d) ended.current = false;
  };
  useEffect(() => {
    const el = ref.current;
    let alive = true;
    let mod;
    const ask = (e) => {
      const text = e.detail?.text;
      if (text && latest.current.onAsk) {
        e.preventDefault();
        latest.current.onAsk(text);
      }
    };
    const select = (e) => latest.current.onSelect?.(e.detail);
    el.addEventListener("fxui:ask", ask);
    el.addEventListener("fxui:select", select);
    import("lumafx/ui").then((m) => {
      if (!alive) return;
      mod = m;
      s.current = m.stream(el, { lang, timeZone });
      push();
    });
    return () => {
      alive = false;
      el.removeEventListener("fxui:ask", ask);
      el.removeEventListener("fxui:select", select);
      mod?.destroy(el);
      s.current = null;
    };
  }, [lang, timeZone]);
  useEffect(push, [value, done]);
  return createElement("div", { ref, className });
}
export {
  FxRuntime,
  FxUIRuntime,
  FxUIStream
};
