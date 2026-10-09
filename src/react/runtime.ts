'use client';
/**
 * Client island that boots the lumafx runtime. Render it once, e.g. in app/layout.tsx:
 *   import { FxRuntime } from 'lumafx/react/runtime';
 *   <body>{children}<FxRuntime /></body>
 */
import { createElement, useEffect, useRef } from 'react';
import type { StartOptions } from 'lumafx';

export function FxRuntime(props: StartOptions) {
  useEffect(() => {
    let cancelled = false;
    import('lumafx').then((m) => {
      if (!cancelled) m.start(props);
    });
    return () => {
      cancelled = true;
    };
    // Options are read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * Loads lumafx/ui in the browser so server-rendered <FxUI> blocks become interactive (tabs, quiz,
 * tickets, live data). Render it once, next to <FxRuntime />.
 */
export function FxUIRuntime() {
  useEffect(() => {
    import('lumafx/ui');
  }, []);
  return null;
}

type UIModule = typeof import('lumafx/ui');

export interface FxUIStreamProps {
  /** What the model has written so far: JSON text (it may be cut off mid-way) or the parsed value. */
  value: unknown;
  /** True once the model has finished: validates strictly and starts live data. */
  done?: boolean;
  lang?: string;
  timeZone?: string;
  className?: string;
  /** A follow-up chip was clicked: send it as the user's next message. */
  onAsk?: (text: string) => void;
  /** A ticket tier or seating zone was picked. */
  onSelect?: (detail: { block: string; tier?: string; zone?: string }) => void;
  /** Validation result when `done` turns true. */
  onDone?: (result: { doc: unknown; errors: { path: string; message: string }[] }) => void;
}

/**
 * Renders a model's UI while it streams, for chat interfaces:
 *
 *   <FxUIStream value={toolCall.argsText} done={toolCall.state === 'result'} onAsk={sendMessage} />
 */
export function FxUIStream({ value, done, lang, timeZone, className, onAsk, onSelect, onDone }: FxUIStreamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const s = useRef<ReturnType<UIModule['stream']> | null>(null);
  const ended = useRef(false);
  const latest = useRef({ value, done, onAsk, onSelect, onDone });
  latest.current = { value, done, onAsk, onSelect, onDone };

  const push = () => {
    const st = s.current;
    if (!st) return;
    const { value: v, done: d } = latest.current;
    if (v !== undefined && v !== null) st.set(v);
    if (d && !ended.current) {
      ended.current = true;
      latest.current.onDone?.(st.end());
    } else if (!d) ended.current = false;
  };

  useEffect(() => {
    const el = ref.current!;
    let alive = true;
    let mod: UIModule | undefined;
    const ask = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text;
      if (text && latest.current.onAsk) {
        e.preventDefault();
        latest.current.onAsk(text);
      }
    };
    const select = (e: Event) => latest.current.onSelect?.((e as CustomEvent).detail);
    el.addEventListener('fxui:ask', ask);
    el.addEventListener('fxui:select', select);
    import('lumafx/ui').then((m) => {
      if (!alive) return;
      mod = m;
      s.current = m.stream(el, { lang, timeZone });
      push();
    });
    return () => {
      alive = false;
      el.removeEventListener('fxui:ask', ask);
      el.removeEventListener('fxui:select', select);
      mod?.destroy(el);
      s.current = null;
    };
    // The stream is created once; value and done flow through push().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, timeZone]);

  useEffect(push, [value, done]);

  return createElement('div', { ref, className });
}
