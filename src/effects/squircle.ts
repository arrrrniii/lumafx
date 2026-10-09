import { META } from '../meta';
import type { Effect } from '../core/types';
import { px } from '../core/util';

/**
 * Figma-style smoothed corners as an SVG path.
 * The geometry follows the "corner smoothing" construction popularised by
 * figma-squircle (MIT, Tien Pham): a circular arc in the middle of each corner,
 * blended into the straight edges with two cubic Béziers.
 */
interface Corner {
  a: number;
  b: number;
  c: number;
  d: number;
  p: number;
  arc: number;
  r: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

function corner(radius: number, smoothing: number, budget: number): Corner {
  const r = Math.min(radius, budget);
  if (r <= 0) return { a: 0, b: 0, c: 0, d: 0, p: 0, arc: 0, r: 0 };
  let s = smoothing;
  let p = (1 + s) * r;
  // Not enough room for full smoothing: reduce it rather than overflow the side.
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

const f = (n: number) => +n.toFixed(3);

export function squirclePath(w: number, h: number, radius: number, smoothing = 0.6): string {
  if (w <= 0 || h <= 0) return '';
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
    'Z',
  ].join(' ');
}

export const squircle: Effect = {
  name: 'squircle',
  meta: META.squircle,
  mount(el, ctx) {
    // Native corner-shape draws real squircles (with borders and shadows) — nothing to do.
    if (ctx.env.cornerShape) return;
    const mode = ctx.str('fallback', 'auto');
    if (mode === 'radius') return;
    const cs = getComputedStyle(el);
    if (mode === 'auto' && (cs.boxShadow !== 'none' || px(cs.borderTopWidth) > 0)) return;
    const radius = px(cs.borderTopLeftRadius) || ctx.px('radius', 28);
    const smoothing = ctx.num('smoothing', 0.6);
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
    el.style.borderRadius = '0';
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    el.setAttribute('data-fx-squircle', 'clip');
    return () => {
      ro.disconnect();
      el.style.clipPath = '';
      el.style.borderRadius = '';
      el.removeAttribute('data-fx-squircle');
    };
  },
};
