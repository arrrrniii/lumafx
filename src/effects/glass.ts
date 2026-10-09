import { META } from '../meta';
import type { Effect } from '../core/types';
import { px, setState } from '../core/util';

const SVGNS = 'http://www.w3.org/2000/svg';
let defs: SVGSVGElement | null = null;
let uid = 0;

function svgRoot() {
  if (defs && defs.isConnected) return defs;
  defs = document.createElementNS(SVGNS, 'svg');
  defs.setAttribute('aria-hidden', 'true');
  defs.setAttribute('width', '0');
  defs.setAttribute('height', '0');
  defs.setAttribute('class', 'fx-svg-defs');
  defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  document.body.append(defs);
  return defs;
}

/**
 * Builds a displacement map for a rounded rectangle: neutral grey in the middle,
 * and a vector pointing toward the centre inside the bezel. Sampling inward keeps
 * the lookup inside the backdrop, which avoids dark fringes at the edges.
 * Red = x displacement, green = y displacement, 128 = none.
 */
export function displacementMap(w: number, h: number, radius: number, bezel: number) {
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
      let dist: number;
      let nx: number;
      let ny: number;
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
        // Convex rim: strongest bend at the very edge, easing smoothly into flat glass.
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

function mapURL(w: number, h: number, radius: number, bezel: number) {
  // Cap the map resolution; the field is smooth so feImage can scale it up.
  const scale = Math.min(1, 900 / Math.max(w, h));
  const m = displacementMap(w * scale, h * scale, radius * scale, bezel * scale);
  const canvas = document.createElement('canvas');
  canvas.width = m.width;
  canvas.height = m.height;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.putImageData(new ImageData(m.data, m.width, m.height), 0, 0);
  return canvas.toDataURL('image/png');
}

export const glass: Effect = {
  name: 'glass',
  meta: META.glass,
  mount(el, ctx) {
    // Refraction needs SVG filters inside backdrop-filter, which only Chromium renders.
    if (!ctx.env.chromium || ctx.env.lite || ctx.str('mode', 'liquid') === 'frost') return;
    const strength = Math.max(0, ctx.num('refraction', 1));
    const aberration = Math.max(0, ctx.num('aberration', 1));
    if (!strength) return;
    const id = `fx-glass-${++uid}`;
    const filter = document.createElementNS(SVGNS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    svgRoot().append(filter);

    const blur = ctx.str('blur') ?? '0.6px';
    const sat = ctx.num('saturate', 1.6);

    let lw = -1;
    let lh = -1;
    const build = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h || (w === lw && h === lh)) return;
      lw = w;
      lh = h;
      const cs = getComputedStyle(el);
      const radius = px(cs.borderTopLeftRadius);
      const bezel = Math.max(6, Math.min(Math.max(radius, 18) * 0.9, Math.min(w, h) * 0.3, 42));
      const url = mapURL(w, h, radius, bezel);
      if (!url) return;
      const disp = bezel * 1.1 * strength;
      const scale = (s: number) => (disp * 2 * s).toFixed(2);
      const chain =
        aberration > 0
          ? `<feDisplacementMap in="SourceGraphic" in2="m" scale="${scale(1)}" xChannelSelector="R" yChannelSelector="G" result="dr"/>
             <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/>
             <feDisplacementMap in="SourceGraphic" in2="m" scale="${scale(1 - 0.06 * aberration)}" xChannelSelector="R" yChannelSelector="G" result="dg"/>
             <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>
             <feDisplacementMap in="SourceGraphic" in2="m" scale="${scale(1 - 0.12 * aberration)}" xChannelSelector="R" yChannelSelector="G" result="db"/>
             <feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b"/>
             <feBlend in="r" in2="g" mode="screen" result="rg"/>
             <feBlend in="rg" in2="b" mode="screen"/>`
          : `<feDisplacementMap in="SourceGraphic" in2="m" scale="${scale(1)}" xChannelSelector="R" yChannelSelector="G"/>`;
      filter.innerHTML = `<feImage href="${url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>${chain}`;
    };
    build();
    const value = `url(#${id}) blur(${blur}) saturate(${sat}) brightness(1.04)`;
    el.style.backdropFilter = value;
    el.style.setProperty('-webkit-backdrop-filter', value);
    setState(el, 'liquid');

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
      el.style.backdropFilter = '';
      el.style.removeProperty('-webkit-backdrop-filter');
      setState(el, 'liquid', false);
    };
  },
};
