import { META, optionAttributes } from '../meta';
import { env, detect, isBrowser, watchReducedMotion, type EnvOverrides } from './env';
import { cssValue, makeCtx } from './options';
import type { Cleanup, Effect } from './types';
import { onView } from './view';

export interface StartOptions {
  /** Element to scan and watch. Defaults to the whole document. */
  root?: Element;
  /** 'auto' follows the OS setting; 'reduce' forces reduced motion everywhere. */
  motion?: 'auto' | 'reduce';
  /** Force or disable lite mode (heavy effects degrade). Defaults to automatic detection. */
  lite?: boolean;
  /** Override feature detection, e.g. { sda: false } to test fallbacks. */
  features?: EnvOverrides;
}

const registry = new Map<string, Effect>();
/** element → effect name → cleanup */
const mounted = new Map<HTMLElement, Map<string, Cleanup | void>>();
/** element → CSS variables the runtime wrote, so they can be removed again */
const writtenVars = new WeakMap<HTMLElement, string[]>();
const pauseWatch = new WeakMap<HTMLElement, Cleanup>();

let started = false;
let observer: MutationObserver | null = null;
let rootEl: Element | null = null;
let stopReduced: Cleanup | null = null;
let startOpts: StartOptions = {};
let queued = false;
let pendingRecords: MutationRecord[] = [];

const warned = new Set<string>();
const warn = (msg: string, err?: unknown) => {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn('[lumafx] ' + msg, err ?? '');
};

const SELECTOR = '[data-fx],[class*="fx-"]';

export function register(...effects: Effect[]) {
  for (const e of effects) registry.set(e.name, e);
  if (started && rootEl) scan(rootEl);
}

export function registered(): string[] {
  return [...registry.keys()];
}

function namesFor(el: Element): string[] {
  const out: string[] = [];
  const attr = el.getAttribute('data-fx');
  if (attr) {
    for (const n of attr.split(/\s+/)) {
      if (!n) continue;
      if (registry.has(n)) out.push(n);
      else warn(`Unknown effect "${n}". Available: ${[...registry.keys()].join(', ')}`);
    }
  }
  if (el.classList.length) {
    for (const c of el.classList) {
      if (c.startsWith('fx-')) {
        const n = c.slice(3);
        if (registry.has(n) && !out.includes(n)) out.push(n);
      }
    }
  }
  return out;
}

function mapVars(el: HTMLElement, names: string[]) {
  const prev = writtenVars.get(el);
  if (prev) for (const v of prev) el.style.removeProperty(v);
  const written: string[] = [];
  for (const n of names) {
    const meta = META[n];
    if (!meta) continue;
    for (const [key, opt] of Object.entries(meta.options)) {
      if (!opt.css) continue;
      const raw = el.getAttribute('data-fx-' + key);
      if (raw === null || raw.trim() === '') continue;
      const prop = '--fx-' + key;
      el.style.setProperty(prop, cssValue(opt.type, raw));
      written.push(prop);
    }
  }
  if (written.length) writtenVars.set(el, written);
  else writtenVars.delete(el);
}

function runCleanup(fn: Cleanup | void, name: string) {
  if (!fn) return;
  try {
    fn();
  } catch (err) {
    warn(`Cleanup of "${name}" failed`, err);
  }
}

function unmount(el: HTMLElement) {
  const m = mounted.get(el);
  if (m) for (const [n, c] of m) runCleanup(c, n);
  mounted.delete(el);
  pauseWatch.get(el)?.();
  pauseWatch.delete(el);
  el.removeAttribute('data-fx-paused');
  const vars = writtenVars.get(el);
  if (vars) for (const v of vars) el.style.removeProperty(v);
  writtenVars.delete(el);
}

function sync(el: HTMLElement) {
  if (!el.isConnected || el.closest('[data-fx-off]')) {
    if (mounted.has(el)) unmount(el);
    return;
  }
  const want = namesFor(el);
  if (!want.length) {
    if (mounted.has(el)) unmount(el);
    return;
  }
  const have = mounted.get(el) ?? new Map<string, Cleanup | void>();
  for (const [n, c] of have) {
    if (!want.includes(n)) {
      runCleanup(c, n);
      have.delete(n);
    }
  }
  mapVars(el, want);
  for (const n of want) {
    if (have.has(n)) continue;
    const effect = registry.get(n)!;
    let cleanup: Cleanup | void = undefined;
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

  // Infinite CSS animations pause while off-screen to save battery.
  const loops = want.some((n) => META[n]?.loop);
  if (loops && !pauseWatch.has(el)) {
    pauseWatch.set(
      el,
      onView(el, (visible) => (visible ? el.removeAttribute('data-fx-paused') : el.setAttribute('data-fx-paused', '')), {
        margin: '120px',
      }),
    );
  } else if (!loops && pauseWatch.has(el)) {
    pauseWatch.get(el)!();
    pauseWatch.delete(el);
    el.removeAttribute('data-fx-paused');
  }
}

function remount(el: HTMLElement) {
  unmount(el);
  sync(el);
}

function scan(root: Element) {
  if (root instanceof HTMLElement && root.matches(SELECTOR)) sync(root);
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach(sync);
}

function sweep() {
  for (const el of [...mounted.keys()]) if (!el.isConnected) unmount(el);
}

function flush() {
  queued = false;
  const records = pendingRecords;
  pendingRecords = [];
  let removed = false;
  const toSync = new Set<HTMLElement>();
  const toRemount = new Set<HTMLElement>();
  const toScan = new Set<Element>();
  for (const r of records) {
    if (r.type === 'attributes') {
      const t = r.target as HTMLElement;
      if (r.attributeName === 'data-fx' || r.attributeName === 'class') toSync.add(t);
      else if (mounted.has(t)) toRemount.add(t);
    } else {
      r.addedNodes.forEach((n) => n.nodeType === 1 && toScan.add(n as Element));
      if (r.removedNodes.length) removed = true;
    }
  }
  if (removed) sweep();
  toScan.forEach((n) => n.isConnected && scan(n));
  toSync.forEach((el) => !toRemount.has(el) && sync(el));
  toRemount.forEach(remount);
}

function observe(root: Element) {
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
    attributeFilter: ['data-fx', 'class', ...optionAttributes()],
  });
}

function applyEnvToDocument() {
  const html = document.documentElement;
  html.toggleAttribute('data-fx-reduced', startOpts.motion === 'reduce');
  html.toggleAttribute('data-fx-lite', env.lite);
  // Debug switches so the JavaScript fallbacks can be tested in any browser.
  html.toggleAttribute('data-fx-nosda', startOpts.features?.sda === false);
  html.toggleAttribute('data-fx-nocs', startOpts.features?.cornerShape === false);
}

function detectAll() {
  detect(startOpts.features);
  if (startOpts.motion === 'reduce') env.reduced = true;
  if (typeof startOpts.lite === 'boolean') env.lite = startOpts.lite;
  applyEnvToDocument();
}

/** Starts the runtime: mounts every effect in the page and watches for changes. Safe to call more than once. */
export function start(opts: StartOptions = {}) {
  if (!isBrowser || started) return;
  started = true;
  startOpts = opts;
  detectAll();
  const html = document.documentElement;
  html.classList.add('fx-ready', 'fx-booted');
  const run = () => {
    rootEl = opts.root ?? document.body ?? html;
    scan(rootEl);
    observe(rootEl);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  stopReduced = watchReducedMotion(() => refresh());
}

/** Unmounts every effect and stops watching the page. */
export function stop() {
  if (!started) return;
  started = false;
  observer?.disconnect();
  observer = null;
  stopReduced?.();
  stopReduced = null;
  for (const el of [...mounted.keys()]) unmount(el);
  document.documentElement.classList.remove('fx-ready', 'fx-booted');
}

/** Re-detects the environment and remounts everything. */
export function refresh() {
  if (!started || !rootEl) return;
  detectAll();
  for (const el of [...mounted.keys()]) unmount(el);
  scan(rootEl);
}

/** Mounts effects under `root` right away (useful after injecting HTML when you can't wait a microtask). */
export function mount(root: Element) {
  if (started) scan(root);
}

/** Debug helper: how many elements each effect is running on. */
export function stats(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of mounted.values()) for (const n of m.keys()) out[n] = (out[n] || 0) + 1;
  return out;
}

export function isStarted() {
  return started;
}
