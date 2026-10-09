export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent smoothing toward a target. `lambda` ≈ responsiveness (higher = snappier). */
export const damp = (current: number, target: number, lambda: number, dtMs: number) =>
  lerp(current, target, 1 - Math.exp((-lambda * dtMs) / 1000));

export function on<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  fn: (e: HTMLElementEventMap[K]) => void,
  opts?: AddEventListenerOptions,
): () => void;
export function on(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): () => void;
export function on(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}

/** Runs `fn` at most once per animation frame. */
export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void) {
  let id = 0;
  let last: A;
  const run = (...args: A) => {
    last = args;
    if (!id) id = requestAnimationFrame(() => ((id = 0), fn(...last)));
  };
  run.cancel = () => id && cancelAnimationFrame(id);
  return run;
}

/** `data-fx-state` holds runtime state tokens (in, active, paused…), separate from options. */
export function hasState(el: Element, token: string) {
  return (el.getAttribute('data-fx-state') || '').split(/\s+/).includes(token);
}
export function setState(el: Element, token: string, onOff = true) {
  const tokens = new Set((el.getAttribute('data-fx-state') || '').split(/\s+/).filter(Boolean));
  const had = tokens.has(token);
  if (onOff === had) return;
  onOff ? tokens.add(token) : tokens.delete(token);
  if (tokens.size) el.setAttribute('data-fx-state', [...tokens].join(' '));
  else el.removeAttribute('data-fx-state');
}

/** Sets attributes and returns a function that restores the previous values. */
export function setAttrs(el: Element, attrs: Record<string, string>) {
  const prev: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(attrs)) {
    prev[k] = el.getAttribute(k);
    if (prev[k] === null) el.setAttribute(k, v);
  }
  return () => {
    for (const [k, v] of Object.entries(prev)) if (v === null) el.removeAttribute(k);
  };
}

export const isInteractive = (el: Element) => !!el.querySelector('a,button,input,select,textarea,[tabindex]');

export const px = (v: string | null | undefined) => (v ? parseFloat(v) || 0 : 0);
