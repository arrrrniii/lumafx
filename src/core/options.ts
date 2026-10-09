import type { OptType } from '../meta';
import type { Env } from './env';
import type { Ctx } from './types';

const BARE = /^-?\d*\.?\d+$/;

/** Normalizes an attribute value into a CSS value: bare numbers get the option's unit. */
export function cssValue(type: OptType, raw: string): string {
  const v = raw.trim();
  if (BARE.test(v)) {
    if (type === 'time') return v + 'ms';
    if (type === 'length') return v + 'px';
    if (type === 'percent') return v + '%';
  }
  return v;
}

/** "1.2s" → 1200, "400ms" → 400, "400" → 400. */
export function parseTime(v: string | undefined | null, def: number): number {
  if (v == null || v.trim() === '') return def;
  const s = v.trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return def;
  if (/ms$/i.test(s)) return n;
  if (/s$/i.test(s)) return n * 1000;
  return n;
}

export function parsePx(v: string | undefined | null, def: number, el?: Element): number {
  if (v == null || v.trim() === '') return def;
  const s = v.trim();
  const n = parseFloat(s);
  if (Number.isNaN(n)) return def;
  if (/rem$/.test(s)) return n * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  if (/em$/.test(s)) return n * (el ? parseFloat(getComputedStyle(el).fontSize) || 16 : 16);
  if (/vh$/.test(s)) return (n * window.innerHeight) / 100;
  if (/vw$/.test(s)) return (n * window.innerWidth) / 100;
  return n;
}

export function makeCtx(el: HTMLElement, env: Env): Ctx {
  let cs: CSSStyleDeclaration | null = null;
  const raw = (key: string): string | undefined => {
    const a = el.getAttribute('data-fx-' + key);
    if (a !== null) return a;
    cs ??= getComputedStyle(el);
    const v = cs.getPropertyValue('--fx-' + key).trim();
    return v === '' ? undefined : v;
  };
  return {
    el,
    env,
    str: (key, def) => raw(key) ?? def,
    num: (key, def) => {
      const v = parseFloat(raw(key) ?? '');
      return Number.isNaN(v) ? def : v;
    },
    time: (key, def) => parseTime(raw(key), def),
    px: (key, def) => parsePx(raw(key), def, el),
    bool: (key, def) => {
      if (el.classList.contains('fx-no-' + key)) return false;
      if (el.classList.contains('fx-' + key)) return true;
      const a = el.getAttribute('data-fx-' + key);
      if (a === null) return def;
      return !/^(false|0|no|off)$/i.test(a.trim());
    },
  };
}
