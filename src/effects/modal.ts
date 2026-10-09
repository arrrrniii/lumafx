import { META } from '../meta';
import type { Effect } from '../core/types';
import { setState } from '../core/util';

const SVGNS = 'http://www.w3.org/2000/svg';
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

    const playLiquid = async (opening: boolean) => {
      const { r, vh, vw } = geometry();
      const fill: FillMode = 'both';
      // The shape takes the panel's box; neck and drop sit at the bottom edge under it.
      Object.assign(shape.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      const dropSize = Math.min(220, r.width * 0.55);
      Object.assign(drop.style, { left: vw / 2 - dropSize / 2 + 'px', top: vh - dropSize * 0.35 + 'px', width: dropSize + 'px', height: dropSize + 'px' });
      const neckW = Math.min(120, r.width * 0.32);
      Object.assign(neck.style, { left: vw / 2 - neckW / 2 + 'px', top: r.bottom - 20 + 'px', width: neckW + 'px', height: vh - r.bottom + 40 + 'px', transformOrigin: '50% 100%' });

      const fromY = vh - r.top - r.height * 0.15;
      // Overall timing is linear; each segment carries its own easing so the stretch and the
      // "snap" where the panel detaches read clearly.
      const shapeFrames: Keyframe[] = [
        { translate: `0 ${fromY}px`, scale: '0.35 0.25', borderRadius: '50%', offset: 0, easing: 'cubic-bezier(.45,0,.3,1)' },
        { translate: `0 ${fromY * 0.32}px`, scale: '0.72 0.88', borderRadius: '42%', offset: 0.46, easing: 'cubic-bezier(.3,.5,.3,1)' },
        { translate: '0 -12px', scale: '1.035 1.045', borderRadius: '28px', offset: 0.72, easing: 'cubic-bezier(.3,0,.3,1)' },
        { translate: '0 0', scale: '1 1', borderRadius: '24px', offset: 1 },
      ];
      // The neck stretches, thins, and snaps as the panel pulls away from the edge.
      const neckFrames: Keyframe[] = [
        { scale: '1 0.2', opacity: 1, offset: 0, easing: 'ease-out' },
        { scale: '0.75 1', opacity: 1, offset: 0.42, easing: 'ease-in' },
        { scale: '0.07 1', opacity: 1, offset: 0.64 },
        { scale: '0 0.4', opacity: 0, offset: 0.7 },
        { scale: '0 0.4', opacity: 0, offset: 1 },
      ];
      // The pool at the bottom swells while it feeds the drop, then sinks away.
      const dropFrames: Keyframe[] = [
        { translate: `0 ${dropSize * 0.6}px`, scale: '0.6', offset: 0, easing: 'ease-out' },
        { translate: '0 0', scale: '1', offset: 0.28 },
        { translate: '0 0', scale: '1.1', offset: 0.62, easing: 'cubic-bezier(.5,0,.75,0)' },
        { translate: `0 ${dropSize}px`, scale: '0.5', offset: 1 },
      ];
      const timing = { duration: opening ? 1150 : 950, easing: 'linear', fill };
      const dir: PlaybackDirection = opening ? 'normal' : 'reverse';
      const a1 = shape.animate(shapeFrames, { ...timing, direction: dir });
      const a2 = neck.animate(neckFrames, { ...timing, direction: dir });
      const a3 = drop.animate(dropFrames, { ...timing, direction: dir });
      const a4 = p.animate(
        [
          { opacity: 0, translate: '0 14px' },
          { opacity: 0, translate: '0 14px', offset: 0.64 },
          { opacity: 1, translate: '0 0' },
        ],
        { duration: opening ? 1150 : 950, easing: 'ease-out', fill, direction: dir },
      );
      anims.push(a1, a2, a3, a4);
      await Promise.all([a1.finished, a4.finished]);
    };

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
    // Keep the liquid background glued to the panel if the window is resized while open.
    const onResize = () => {
      if (style !== 'liquid' || !dlg.open || animating) return;
      const r = p.getBoundingClientRect();
      Object.assign(shape.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    };
    dlg.addEventListener('cancel', onCancel);
    dlg.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    return () => {
      dlg.removeEventListener('cancel', onCancel);
      dlg.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
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
