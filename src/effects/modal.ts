import { META } from '../meta';
import type { Effect } from '../core/types';
import { setState } from '../core/util';

const SVGNS = 'http://www.w3.org/2000/svg';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let gooReady = false;

/** The "gooey" filter: blur, then sharpen the alpha so nearby shapes melt together. */
function ensureGoo() {
  if (gooReady && document.getElementById('fx-goo')) return;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'fx-svg-defs');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML =
    '<filter id="fx-goo" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
    '<feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b"/>' +
    '<feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/></filter>';
  document.body.append(svg);
  gooReady = true;
}

interface ModalApi {
  open(trigger?: Element | null): void;
  close(): void;
}
const instances = new WeakMap<HTMLDialogElement, ModalApi>();
let delegated = false;

/** One document-level listener handles every data-fx-open trigger. */
function delegate() {
  if (delegated) return;
  delegated = true;
  // Triggers: data-fx-open="#id", or a plain link to the dialog (href="#id"), which is what
  // page builders and the WordPress Button block produce.
  document.addEventListener('click', (e) => {
    const t = (e.target as Element | null)?.closest?.('[data-fx-open], a[href^="#"]');
    if (!t) return;
    const sel = t.getAttribute('data-fx-open') || t.getAttribute('href') || '';
    if (sel.length < 2) return;
    let target: Element | null = null;
    try {
      target = document.querySelector(sel);
    } catch {
      return;
    }
    if (target instanceof HTMLDialogElement && instances.has(target)) {
      e.preventDefault();
      instances.get(target)!.open(t);
    }
  });
}

export const modal: Effect = {
  name: 'modal',
  meta: META.modal,
  mount(el, ctx) {
    if (!(el instanceof HTMLDialogElement)) {
      console.warn('[lumafx] modal: use it on a <dialog> element');
      return;
    }
    const dlg = el;
    const style = ctx.env.reduced ? 'fade' : ctx.str('style', 'liquid') || 'liquid';
    dlg.setAttribute('data-fx-style-active', style);

    // Structure: dialog > (.fx-md-goo > shape, neck, drop) + .fx-md-panel > content.
    let panel = dlg.querySelector<HTMLElement>(':scope > .fx-md-panel');
    const createdPanel = !panel;
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'fx-md-panel';
      panel.append(...Array.from(dlg.childNodes));
      dlg.append(panel);
    }
    const p = panel;
    let goo: HTMLElement | null = null;
    let shape: HTMLElement, neck: HTMLElement, drop: HTMLElement;
    if (style === 'liquid') {
      ensureGoo();
      goo = document.createElement('div');
      goo.className = 'fx-md-goo';
      goo.setAttribute('aria-hidden', 'true');
      shape = document.createElement('i');
      shape.className = 'fx-md-shape';
      neck = document.createElement('i');
      neck.className = 'fx-md-neck';
      drop = document.createElement('i');
      drop.className = 'fx-md-drop';
      goo.append(drop, neck, shape);
      dlg.prepend(goo);
    }

    let animating = false;
    const anims: Animation[] = [];
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

    /*
     * Liquid: drawn frame by frame so every part stays connected.
     * A low pool swells at the bottom edge, a droplet rises out of it on a strand,
     * the strand thins and snaps, and the droplet settles into the panel with a small wobble.
     * Closing plays the same path backwards (the panel drops, reconnects, and is absorbed).
     * The pieces sit in one layer under an SVG "goo" filter, which melts them into a single shape.
     */
    let raf = 0;
    const stopLiquid = () => cancelAnimationFrame(raf);
    const playLiquid = (opening: boolean) =>
      new Promise<void>((resolve) => {
        const { r, vh, vw } = geometry();
        if (r.width < 1 || r.height < 1) return resolve();
        const pad = 70;
        const left = Math.max(0, r.left - pad);
        const top = Math.max(0, r.top - pad);
        const width = Math.min(vw, r.right + pad) - left;
        const height = vh - top;
        Object.assign(goo!.style, { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' });

        const W = r.width;
        const H = r.height;
        const radius = parseFloat(getComputedStyle(p).borderTopLeftRadius) || 26;
        const cx = r.left - left + W / 2;
        const cy = r.top - top + H / 2;
        const bottom = height; // the viewport's bottom edge, in layer coordinates
        const d0 = clamp(W * 0.12, 40, 66); // droplet diameter as it leaves the edge
        const poolW = clamp(W * 0.36, 110, 200);
        const poolH = 80;

        Object.assign(shape.style, { left: r.left - left + 'px', top: r.top - top + 'px', width: W + 'px', height: H + 'px' });
        Object.assign(drop.style, { left: cx - poolW / 2 + 'px', top: bottom - poolH * 0.36 + 'px', width: poolW + 'px', height: poolH + 'px' });
        Object.assign(neck.style, { left: '0px', top: '0px', width: '100px', height: '100px' });

        const render = (k: number) => {
          // Travel and growth of the droplet.
          // The droplet stays small while the strand holds it, then blooms into the panel once free.
          const q = easeInOut(clamp((k - 0.03) / 0.6, 0, 1));
          const grow = easeInOut(clamp((k - 0.24) / 0.46, 0, 1));
          const emerge = smooth(0, 0.08, k);
          const y = lerp(bottom - d0 * 0.2, cy, q);
          let sx = lerp(d0 / W, 1, grow) * emerge;
          let sy = lerp(d0 / H, 1, grow) * emerge;
          // Stretched like a drop while it travels...
          const stretch = Math.sin(q * Math.PI) * 0.34 * (1 - grow * 0.6);
          sy *= 1 + stretch;
          sx *= 1 - stretch * 0.45;
          // ...and a damped wobble as it lands.
          const land = clamp((k - 0.66) / 0.34, 0, 1);
          const wobble = Math.sin(land * Math.PI * 2) * (1 - land) * 0.05;
          sx *= 1 + wobble;
          sy *= 1 - wobble;
          // Round while travelling, panel corners on arrival.
          const c = smooth(0.3, 0.72, k);
          shape.style.transform = `translate(0px, ${(y - cy).toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
          shape.style.borderRadius = `${lerp(W / 2, radius, c).toFixed(2)}px / ${lerp(H / 2, radius, c).toFixed(2)}px`;

          // The pool swells while it feeds the droplet, then sinks back below the edge.
          const swell = smooth(0, 0.12, k) * (1 - smooth(0.3, 0.55, k));
          drop.style.transform = `translate(0px, ${((1 - swell) * poolH * 0.7).toFixed(2)}px) scale(${(0.55 + 0.45 * swell).toFixed(4)}, ${(0.45 + 0.55 * swell).toFixed(4)})`;
          drop.style.opacity = swell > 0.01 ? '1' : '0';

          // The strand between them thins and snaps.
          const dropBottom = y + (H * sy) / 2;
          const nw = d0 * 0.36 * (1 - smooth(0.14, 0.36, k)) * emerge;
          const y1 = dropBottom - 14;
          const y2 = bottom + 6;
          if (nw > 0.5 && y2 > y1) {
            neck.style.opacity = '1';
            neck.style.transform = `translate(${(cx - nw / 2).toFixed(2)}px, ${y1.toFixed(2)}px) scale(${(nw / 100).toFixed(4)}, ${((y2 - y1) / 100).toFixed(4)})`;
          } else neck.style.opacity = '0';

          // The content appears only once the panel has formed.
          const show = smooth(0.68, 0.9, k);
          p.style.opacity = show.toFixed(3);
          p.style.translate = `0 ${((1 - show) * 12).toFixed(2)}px`;
        };

        const duration = opening ? 1000 : 820;
        let start = -1;
        const step = (now: number) => {
          if (start < 0) start = now;
          const t = Math.min(1, (now - start) / duration);
          render(opening ? t : 1 - t);
          if (t < 1) raf = requestAnimationFrame(step);
          else {
            p.style.opacity = '';
            p.style.translate = '';
            resolve();
          }
        };
        render(opening ? 0 : 1);
        raf = requestAnimationFrame(step);
      });

    const playSheet = async (opening: boolean) => {
      const { rise } = geometry();
      const frames: Keyframe[] =
        style === 'glass'
          ? [
              { translate: `0 ${rise}px`, scale: '0.92 1.08', opacity: 0.6 },
              { translate: '0 -8px', scale: '1.01 0.99', opacity: 1, offset: 0.7 },
              { translate: '0 0', scale: '1 1', opacity: 1 },
            ]
          : style === 'scale'
            ? [
                { scale: '0.9', opacity: 0 },
                { scale: '1', opacity: 1 },
              ]
            : [{ opacity: 0 }, { opacity: 1 }];
      const a = p.animate(frames, {
        duration: style === 'glass' ? 700 : 260,
        easing: style === 'glass' ? 'cubic-bezier(.2,.9,.25,1.05)' : 'ease-out',
        fill: 'both',
        direction: opening ? 'normal' : 'reverse',
      });
      anims.push(a);
      await a.finished;
    };

    const api: ModalApi = {
      async open() {
        if (dlg.open || animating) return;
        animating = true;
        clearAnims();
        stopLiquid();
        dlg.showModal();
        setState(dlg, 'opening');
        try {
          await (style === 'liquid' ? playLiquid(true) : playSheet(true));
        } catch {
          /* cancelled */
        }
        setState(dlg, 'opening', false);
        setState(dlg, 'shown');
        animating = false;
        dlg.dispatchEvent(new CustomEvent('fx:open'));
      },
      async close() {
        if (!dlg.open || animating) return;
        animating = true;
        clearAnims();
        setState(dlg, 'shown', false);
        setState(dlg, 'closing');
        try {
          await (style === 'liquid' ? playLiquid(false) : playSheet(false));
        } catch {
          /* cancelled */
        }
        dlg.close();
        clearAnims();
        setState(dlg, 'closing', false);
        animating = false;
        dlg.dispatchEvent(new CustomEvent('fx:close'));
      },
    };
    instances.set(dlg, api);
    delegate();

    const onCancel = (e: Event) => {
      e.preventDefault();
      api.close();
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest('[data-fx-close]')) {
        e.preventDefault();
        return api.close();
      }
      // Clicks outside the panel (on the dialog's transparent area) close it.
      if (!p.contains(t)) api.close();
    };
    dlg.addEventListener('cancel', onCancel);
    dlg.addEventListener('click', onClick);

    return () => {
      dlg.removeEventListener('cancel', onCancel);
      dlg.removeEventListener('click', onClick);
      stopLiquid();
      clearAnims();
      instances.delete(dlg);
      goo?.remove();
      if (createdPanel) {
        while (p.firstChild) dlg.insertBefore(p.firstChild, p);
        p.remove();
      }
      dlg.removeAttribute('data-fx-style-active');
      ['opening', 'shown', 'closing'].forEach((s) => setState(dlg, s, false));
    };
  },
};

/** Opens or closes a lumafx modal from code. */
export const modals = {
  open: (target: string | HTMLDialogElement) => {
    const d = typeof target === 'string' ? document.querySelector(target) : target;
    if (d instanceof HTMLDialogElement) instances.get(d)?.open();
  },
  close: (target: string | HTMLDialogElement) => {
    const d = typeof target === 'string' ? document.querySelector(target) : target;
    if (d instanceof HTMLDialogElement) instances.get(d)?.close();
  },
};
