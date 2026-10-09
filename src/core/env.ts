export interface Env {
  /** prefers-reduced-motion (or forced with start({ motion: 'reduce' })). */
  reduced: boolean;
  /** A mouse or trackpad: hover effects are enabled. */
  finePointer: boolean;
  /** Save-Data or a very low-memory device: heavy effects degrade. */
  lite: boolean;
  /** Chromium engine: SVG filters in backdrop-filter actually render. */
  chromium: boolean;
  /** CSS scroll-driven animations. */
  sda: boolean;
  /** CSS corner-shape (native squircles). */
  cornerShape: boolean;
  /** View Transitions API. */
  vt: boolean;
}

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const env: Env = {
  reduced: false,
  finePointer: false,
  lite: false,
  chromium: false,
  sda: false,
  cornerShape: false,
  vt: false,
};

const mq = (q: string): MediaQueryList | null =>
  isBrowser && typeof window.matchMedia === 'function' ? window.matchMedia(q) : null;

const supports = (s: string): boolean => {
  try {
    return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(s);
  } catch {
    return false;
  }
};

export type EnvOverrides = Partial<Env>;

export function detect(overrides: EnvOverrides = {}): Env {
  if (!isBrowser) return env;
  const nav = navigator as Navigator & {
    userAgentData?: { brands?: { brand: string }[] };
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  env.reduced = !!mq('(prefers-reduced-motion: reduce)')?.matches;
  env.finePointer = !!mq('(hover: hover) and (pointer: fine)')?.matches;
  env.sda = supports('animation-timeline: view()');
  env.cornerShape = supports('corner-shape: squircle');
  env.vt = typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function';
  // Safari parses `backdrop-filter: url()` but renders nothing, so CSS.supports() lies.
  // userAgentData only exists in Chromium-based browsers.
  env.chromium = !!nav.userAgentData?.brands?.some((b) => /Chromium/i.test(b.brand));
  env.lite = !!nav.connection?.saveData || (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2);
  Object.assign(env, overrides);
  return env;
}

export function watchReducedMotion(cb: () => void): () => void {
  const m = mq('(prefers-reduced-motion: reduce)');
  if (!m) return () => {};
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}
