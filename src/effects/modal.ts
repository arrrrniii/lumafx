import { META } from '../meta';
import type { Ctx, Effect } from '../core/types';
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

type Side = 'center' | 'right' | 'left' | 'bottom' | 'top';
const SIDES: Side[] = ['center', 'right', 'left', 'bottom', 'top'];

/** The page wrapper that shrinks back behind a sheet (style "scale"). Never <body>: fixed elements would jump. */
function sheetRoot(sel: string | undefined): HTMLElement | null {
  const tries = [sel, '[data-fx-sheet-root]', '#__next', '#root', '#app', '.wp-site-blocks'].filter(Boolean) as string[];
  for (const t of tries) {
    try {
      const el = document.querySelector<HTMLElement>(t);
      if (el && el !== document.body && el !== document.documentElement) return el;
    } catch {
      /* bad selector */
    }
  }
  return null;
}

/** Shared engine for modal (centred) and drawer (docked to an edge). */
function mountDialog(el: HTMLElement, ctx: Ctx, name: string, defaults: { style: string; side: Side }) {
  if (!(el instanceof HTMLDialogElement)) {
    console.warn(`[lumafx] ${name}: use it on a <dialog> element`);
    return;
  }
  {
    const dlg = el;
    const sideOpt = (ctx.str('side', defaults.side) || defaults.side) as Side;
    const side: Side = SIDES.includes(sideOpt) ? sideOpt : defaults.side;
    const style = ctx.env.reduced ? 'fade' : ctx.str('style', defaults.style) || defaults.style;
    dlg.setAttribute('data-fx-style-active', style);
    dlg.setAttribute('data-fx-side-active', side);

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
     * It comes out of whatever opened the modal (a button, a dock icon, a nav link), or out of
     * the bottom edge when there is no trigger. The source swells, a droplet pulls away on a
     * strand that thins and snaps, the droplet travels while it changes from the trigger's colour
     * to the panel's, then blooms into the panel and settles with a small wobble.
     * Closing plays the same path backwards, back into the trigger.
     * The pieces sit in one layer under an SVG "goo" filter, which melts them into one shape.
     */
    let raf = 0;
    let trigger: Element | null = null;
    const stopLiquid = () => cancelAnimationFrame(raf);

    interface Source {
      kind: 'trigger' | 'bottom';
      x: number;
      y: number;
      w: number;
      h: number;
      radius: string;
      color: string;
    }
    const isClear = (c: string) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c);
    const sourceOf = (W: number, vw: number, vh: number): Source => {
      const mode = ctx.str('from', 'auto') || 'auto';
      if (mode !== 'bottom' && trigger && trigger.isConnected && !dlg.contains(trigger)) {
        const t = trigger.getBoundingClientRect();
        if (t.width > 0 && t.height > 0 && t.bottom > 0 && t.top < vh && t.right > 0 && t.left < vw) {
          const cs = getComputedStyle(trigger);
          const bg = cs.backgroundColor;
          const rr = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, t.height / 2, t.width / 2);
          return { kind: 'trigger', x: t.left, y: t.top, w: t.width, h: t.height, radius: rr + 'px', color: isClear(bg) ? '' : bg };
        }
      }
      const w = clamp(W * 0.36, 110, 200);
      const h = 80;
      return { kind: 'bottom', x: vw / 2 - w / 2, y: vh - h * 0.36, w, h, radius: '50%', color: '' };
    };

    const playLiquid = (opening: boolean) =>
      new Promise<void>((resolve) => {
        const { r, vh, vw } = geometry();
        if (r.width < 1 || r.height < 1) return resolve();
        const W = r.width;
        const H = r.height;
        const src = sourceOf(W, vw, vh);
        const fromBottom = src.kind === 'bottom';

        // The layer covers the panel, the source and the path between them (a smaller filter area renders faster).
        const pad = 70;
        const left = Math.max(0, Math.min(r.left, src.x) - pad);
        const top = Math.max(0, Math.min(r.top, src.y) - pad);
        const right = Math.min(vw, Math.max(r.right, src.x + src.w) + pad);
        const bottomEdge = fromBottom ? vh : Math.min(vh, Math.max(r.bottom, src.y + src.h) + pad);
        const width = right - left;
        const height = bottomEdge - top;
        Object.assign(goo!.style, { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' });

        const radius = parseFloat(getComputedStyle(p).borderTopLeftRadius) || 26;
        const cx = r.left - left + W / 2;
        const cy = r.top - top + H / 2;
        // Where the droplet starts, and where the strand is anchored.
        const ox = src.x - left + src.w / 2;
        const oy = fromBottom ? vh - top : src.y - top + src.h / 2;
        const d0 = fromBottom ? clamp(W * 0.12, 40, 66) : clamp(Math.min(src.w, src.h), 30, 64);
        const sy0 = fromBottom ? oy - d0 * 0.2 : oy;
        const dx = cx - ox;
        const dy = cy - sy0;
        const dist = Math.hypot(dx, dy) || 1;
        const travelDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        // A slight arc reads as thrown liquid rather than a straight slide.
        const nx = (-dy / dist) * dist * 0.06;
        const ny = (dx / dist) * dist * 0.06;
        const panelColor = getComputedStyle(dlg).getPropertyValue('--_md-c').trim() || '#20232e';
        const srcColor = src.color || panelColor;

        Object.assign(shape.style, { left: r.left - left + 'px', top: r.top - top + 'px', width: W + 'px', height: H + 'px' });
        Object.assign(drop.style, { left: src.x - left + 'px', top: src.y - top + 'px', width: src.w + 'px', height: src.h + 'px', borderRadius: src.radius, transformOrigin: fromBottom ? '50% 100%' : '50% 50%', backgroundColor: srcColor });
        Object.assign(neck.style, { left: '0px', top: '0px', width: '100px', height: '100px', backgroundColor: srcColor });

        const render = (k: number) => {
          // The droplet stays small while the strand holds it, then blooms into the panel once free.
          const q = easeInOut(clamp((k - 0.03) / 0.6, 0, 1));
          const grow = easeInOut(clamp((k - 0.24) / 0.46, 0, 1));
          const emerge = smooth(0, 0.08, k);
          const arc = Math.sin(q * Math.PI);
          const px = ox + dx * q + nx * arc;
          const py = sy0 + dy * q + ny * arc;
          let sx = lerp(d0 / W, 1, grow) * emerge;
          let sy = lerp(d0 / H, 1, grow) * emerge;
          // Stretched along its path like a drop while it travels, with a damped wobble as it lands.
          const stretch = arc * 0.34 * (1 - grow * 0.6);
          const land = clamp((k - 0.66) / 0.34, 0, 1);
          const wobble = Math.sin(land * Math.PI * 2) * (1 - land) * 0.05;
          sx *= 1 + wobble;
          sy *= 1 - wobble;
          const c = smooth(0.3, 0.72, k);
          shape.style.transform =
            `translate(${(px - cx).toFixed(2)}px, ${(py - cy).toFixed(2)}px) rotate(${travelDeg.toFixed(2)}deg) ` +
            `scale(${(1 + stretch).toFixed(4)}, ${(1 - stretch * 0.45).toFixed(4)}) rotate(${(-travelDeg).toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
          shape.style.borderRadius = `${lerp(W / 2, radius, c).toFixed(2)}px / ${lerp(H / 2, radius, c).toFixed(2)}px`;
          // Colour flows from the trigger into the panel's.
          shape.style.backgroundColor = src.color ? `color-mix(in oklab, ${src.color} ${((1 - grow) * 100).toFixed(1)}%, ${panelColor})` : '';

          // The source: the trigger melts and swells, or a pool rises at the bottom edge; then it lets go.
          if (fromBottom) {
            const swell = smooth(0, 0.12, k) * (1 - smooth(0.3, 0.55, k));
            drop.style.transform = `translate(0px, ${((1 - swell) * src.h * 0.7).toFixed(2)}px) scale(${(0.55 + 0.45 * swell).toFixed(4)}, ${(0.45 + 0.55 * swell).toFixed(4)})`;
            drop.style.opacity = swell > 0.01 ? '1' : '0';
          } else {
            const swell = smooth(0, 0.12, k);
            const release = smooth(0.26, 0.56, k);
            const sc = (1 + 0.1 * swell) * (1 - 0.35 * release);
            drop.style.transform = `scale(${sc.toFixed(4)})`;
            drop.style.opacity = (1 - release).toFixed(3);
          }

          // The strand from the source to the droplet thins and snaps.
          const nw = d0 * 0.36 * (1 - smooth(0.14, 0.36, k)) * emerge;
          const ax = ox;
          const ay = fromBottom ? oy + 6 : oy;
          const len = Math.hypot(px - ax, py - ay);
          if (nw > 0.5 && len > 1) {
            const ang = (Math.atan2(py - ay, px - ax) * 180) / Math.PI;
            neck.style.opacity = '1';
            neck.style.transform = `translate(${ax.toFixed(2)}px, ${ay.toFixed(2)}px) rotate(${ang.toFixed(2)}deg) translate(0px, ${(-nw / 2).toFixed(2)}px) scale(${(len / 100).toFixed(4)}, ${(nw / 100).toFixed(4)})`;
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

    // Off-screen offset for a panel docked to an edge.
    const away: Record<Side, string> = {
      center: '0 0',
      right: 'calc(100% + 24px) 0',
      left: 'calc(-100% - 24px) 0',
      bottom: '0 calc(100% + 24px)',
      top: '0 calc(-100% - 24px)',
    };
    const horizontal = side === 'left' || side === 'right';

    // "scale": the page behind shrinks back into a rounded card (needs a page wrapper, see sheetRoot).
    let pageAnim: Animation | null = null;
    let pageRoot: HTMLElement | null = null;
    const scalePage = (opening: boolean, duration: number) => {
      if (opening) {
        pageRoot = sheetRoot(ctx.str('root'));
        if (!pageRoot) return;
        const r = pageRoot.getBoundingClientRect();
        const vh = window.innerHeight;
        // Clip to the visible part so the rounded corners show on screen, not at the page ends.
        const topIn = Math.max(0, -r.top);
        const botIn = Math.max(0, r.bottom - vh);
        pageRoot.style.transformOrigin = `50% ${(topIn + Math.min(vh, r.height) / 2).toFixed(1)}px`;
        document.documentElement.style.backgroundColor = '#000';
        pageAnim = pageRoot.animate(
          [
            { scale: 1, clipPath: `inset(${topIn}px 0 ${botIn}px 0 round 0px)`, filter: 'brightness(1)' },
            { scale: 0.93, clipPath: `inset(${topIn}px 0 ${botIn}px 0 round 22px)`, filter: 'brightness(.8)' },
          ],
          { duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
        );
      } else if (pageAnim && pageRoot) {
        const root = pageRoot;
        const a = pageAnim;
        a.updatePlaybackRate(duration > 0 ? (a.effect?.getTiming().duration as number) / duration : 1);
        a.reverse();
        a.finished.then(() => {
          a.cancel();
          root.style.transformOrigin = '';
          document.documentElement.style.backgroundColor = '';
        });
        pageAnim = null;
      }
    };

    const playSheet = async (opening: boolean) => {
      const { rise } = geometry();
      let frames: Keyframe[];
      let duration: number;
      let easing: string;
      if (side !== 'center' && style !== 'fade') {
        const off = away[side];
        // Jelly: stretched along the axis it travels, a small overshoot, then settled.
        const stretch = horizontal ? '0.9 1.02' : '1.02 0.9';
        const over = horizontal ? '1.015 0.995' : '0.995 1.015';
        frames =
          style === 'glass'
            ? [
                { translate: off, scale: stretch, opacity: 0.7 },
                { translate: '0 0', scale: over, opacity: 1, offset: 0.62 },
                { translate: '0 0', scale: '1 1', opacity: 1 },
              ]
            : [{ translate: off }, { translate: '0 0' }];
        p.style.transformOrigin = { right: '100% 50%', left: '0 50%', bottom: '50% 100%', top: '50% 0', center: '50% 50%' }[side];
        duration = opening ? (style === 'glass' ? 720 : 560) : 380;
        // Closing runs the keyframes in reverse, so an ease-out curve reads as accelerating away.
        easing = opening ? 'cubic-bezier(.2,.9,.25,1.04)' : 'cubic-bezier(.25,.8,.45,1)';
      } else {
        frames =
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
        duration = style === 'glass' ? 700 : style === 'scale' ? 420 : 260;
        easing = style === 'glass' ? 'cubic-bezier(.2,.9,.25,1.05)' : style === 'scale' ? 'cubic-bezier(.2,.9,.25,1.1)' : 'ease-out';
        if (!opening) duration = Math.round(duration * 0.7);
      }
      if (style === 'scale') scalePage(opening, duration);
      // On close, play the same path backwards (the panel leaves the way it came).
      const a = p.animate(frames, { duration, easing, fill: 'both', direction: opening ? 'normal' : 'reverse' });
      anims.push(a);
      await a.finished;
    };

    const api: ModalApi = {
      async open(from) {
        if (dlg.open || animating) return;
        trigger = from ?? (document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
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
      dlg.removeAttribute('data-fx-side-active');
      ['opening', 'shown', 'closing'].forEach((s) => setState(dlg, s, false));
    };
  }
}

export const modal: Effect = {
  name: 'modal',
  meta: META.modal,
  mount: (el, ctx) => mountDialog(el, ctx, 'modal', { style: 'liquid', side: 'center' }),
};

/** A modal docked to an edge: side panels, bottom sheets. */
export const drawer: Effect = {
  name: 'drawer',
  meta: META.drawer,
  mount: (el, ctx) => mountDialog(el, ctx, 'drawer', { style: 'slide', side: 'right' }),
};

/** Opens or closes a lumafx modal from code. `from` is the element the liquid comes out of. */
export const modals = {
  open: (target: string | HTMLDialogElement, opts: { from?: Element | null } = {}) => {
    const d = typeof target === 'string' ? document.querySelector(target) : target;
    if (d instanceof HTMLDialogElement) instances.get(d)?.open(opts.from ?? null);
  },
  close: (target: string | HTMLDialogElement) => {
    const d = typeof target === 'string' ? document.querySelector(target) : target;
    if (d instanceof HTMLDialogElement) instances.get(d)?.close();
  },
};
