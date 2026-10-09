import { META } from '../meta';
import type { Effect } from '../core/types';
import { on, rafThrottle, setState, isInteractive } from '../core/util';

/* ======================================================================
   card
   ====================================================================== */

export const card: Effect = {
  name: 'card',
  meta: META.card,
  mount(el, ctx) {
    const style = ctx.str('style', 'glow') || 'glow';
    const offs: (() => void)[] = [];

    // glow: the border and surface light up around the cursor.
    if (style === 'glow' && ctx.env.finePointer) {
      let x = 0;
      let y = 0;
      const apply = rafThrottle(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--fx-mx', (x - r.left).toFixed(1) + 'px');
        el.style.setProperty('--fx-my', (y - r.top).toFixed(1) + 'px');
      });
      offs.push(
        on(el, 'pointermove', (e) => {
          if (e.pointerType === 'touch') return;
          x = e.clientX;
          y = e.clientY;
          apply();
        }),
        () => {
          apply.cancel();
          el.style.removeProperty('--fx-mx');
          el.style.removeProperty('--fx-my');
        },
      );
    }

    // flip: front and back faces on a 3D hinge. Hover flips with a mouse, tap flips on touch,
    // and keyboard focus inside the back face flips it too.
    if (style === 'flip') {
      let inner = el.querySelector<HTMLElement>(':scope > .fx-card-flip');
      const created = !inner;
      if (!inner) {
        const kids = Array.from(el.children) as HTMLElement[];
        if (kids.length >= 2) {
          inner = document.createElement('div');
          inner.className = 'fx-card-flip';
          const front = document.createElement('div');
          front.className = 'fx-card-face fx-card-front';
          const back = document.createElement('div');
          back.className = 'fx-card-face fx-card-back';
          front.append(...kids.slice(0, -1));
          back.append(kids[kids.length - 1]);
          inner.append(front, back);
          el.append(inner);
        }
      }
      if (inner) {
        const i = inner;
        offs.push(
          on(el, 'click', (e) => {
            if ((e.target as Element).closest('a, button, input, select, textarea, label')) return;
            el.toggleAttribute('data-flipped');
          }),
          on(el, 'keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target === el) {
              e.preventDefault();
              el.toggleAttribute('data-flipped');
            }
          }),
          () => {
            el.removeAttribute('data-flipped');
            if (!created) return;
            const faces = Array.from(i.children);
            faces.forEach((f) => i.before(...Array.from(f.childNodes)));
            i.remove();
          },
        );
        if (!el.hasAttribute('tabindex') && !isInteractive(el)) {
          el.setAttribute('tabindex', '0');
          offs.push(() => el.removeAttribute('tabindex'));
        }
      }
    }

    setState(el, 'ready');
    return () => {
      offs.forEach((f) => f());
      setState(el, 'ready', false);
    };
  },
};

/* ======================================================================
   press
   ====================================================================== */

const SPARKS = 12;

function burst(x: number, y: number, color: string) {
  const host = document.body;
  const ring = document.createElement('span');
  ring.className = 'fx-spark-ring';
  ring.style.left = x + 'px';
  ring.style.top = y + 'px';
  ring.style.borderColor = color;
  host.append(ring);
  ring
    .animate([{ scale: 0.2, opacity: 0.9 }, { scale: 1, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' })
    .finished.then(() => ring.remove());
  for (let i = 0; i < SPARKS; i++) {
    const s = document.createElement('span');
    s.className = 'fx-spark';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.background = i % 3 === 2 ? '#fff' : color;
    const a = (i / SPARKS) * Math.PI * 2 + Math.random() * 0.4;
    const d = 34 + Math.random() * 38;
    const size = 4 + Math.random() * 4;
    s.style.width = s.style.height = size + 'px';
    host.append(s);
    s.animate(
      [
        { translate: '-50% -50%', scale: 1, opacity: 1 },
        { translate: `calc(-50% + ${(Math.cos(a) * d).toFixed(1)}px) calc(-50% + ${(Math.sin(a) * d).toFixed(1)}px)`, scale: 0.2, opacity: 0 },
      ],
      { duration: 560 + Math.random() * 200, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' },
    ).finished.then(() => s.remove());
  }
}

export const press: Effect = {
  name: 'press',
  meta: META.press,
  mount(el, ctx) {
    const style = ctx.str('style', 'ripple') || 'ripple';
    const done = ctx.str('done');
    const reduced = ctx.env.reduced;
    const offs: (() => void)[] = [];
    const accent = () => getComputedStyle(el).getPropertyValue('--fx-color').trim() || getComputedStyle(el).color;

    // Ripples and the fill live in their own clipped layer, so they stay inside the button's shape
    // whatever overflow the page gives the button.
    let layer: HTMLElement | null = null;
    const ensureLayer = () => {
      if (layer && layer.isConnected) return layer;
      layer = document.createElement('span');
      layer.className = 'fx-press-fx';
      layer.setAttribute('aria-hidden', 'true');
      if (style === 'fill') layer.append(Object.assign(document.createElement('span'), { className: 'fx-press-fill' }));
      el.prepend(layer);
      return layer;
    };
    if (style === 'fill') ensureLayer();

    // Keyboard activation (detail 0) gets the effect from the centre.
    const pointOf = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      return e.detail === 0 || (e.clientX === 0 && e.clientY === 0) ? { x: r.left + r.width / 2, y: r.top + r.height / 2, r } : { x: e.clientX, y: e.clientY, r };
    };

    if (style === 'ripple' && !reduced) {
      const ripple = (x: number, y: number, r: DOMRect) => {
        const d = 2 * Math.max(Math.hypot(x - r.left, y - r.top), Math.hypot(r.right - x, y - r.top), Math.hypot(x - r.left, r.bottom - y), Math.hypot(r.right - x, r.bottom - y));
        const s = document.createElement('span');
        s.className = 'fx-press-ripple';
        s.style.width = s.style.height = d + 'px';
        s.style.left = x - r.left + 'px';
        s.style.top = y - r.top + 'px';
        ensureLayer().append(s);
        s.animate([{ scale: 0, opacity: 0.38 }, { scale: 1, opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).finished.then(() => s.remove());
      };
      offs.push(
        on(el, 'pointerdown', (e) => {
          if (e.button !== 0) return;
          ripple(e.clientX, e.clientY, el.getBoundingClientRect());
        }),
        on(el, 'click', (e) => {
          if (e.detail !== 0) return;
          const p = pointOf(e);
          ripple(p.x, p.y, p.r);
        }),
      );
    }

    if (style === 'burst' && !reduced) {
      offs.push(
        on(el, 'click', (e) => {
          const p = pointOf(e);
          burst(p.x, p.y, accent());
        }),
      );
    }

    // fill: a circle grows in from where the cursor enters and shrinks out where it leaves.
    if (style === 'fill') {
      const at = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--fx-x', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        el.style.setProperty('--fx-y', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      };
      offs.push(on(el, 'pointerenter', at), on(el, 'pointerleave', at), () => {
        el.style.removeProperty('--fx-x');
        el.style.removeProperty('--fx-y');
      });
    }

    // A done state: the label swaps for a moment ("Added ✓") without the button changing width.
    if (done) {
      let timer = 0;
      let saved: Node[] | null = null;
      const restore = () => {
        if (!saved) return;
        el.replaceChildren(...(layer ? [layer] : []), ...saved);
        saved = null;
        el.style.minWidth = '';
        setState(el, 'done', false);
      };
      offs.push(
        on(el, 'click', () => {
          if (saved) return;
          el.style.minWidth = el.getBoundingClientRect().width + 'px';
          saved = Array.from(el.childNodes).filter((n) => n !== layer);
          const label = document.createElement('span');
          label.className = 'fx-press-done';
          label.textContent = done;
          el.replaceChildren(...(layer ? [layer] : []), label);
          setState(el, 'done');
          timer = window.setTimeout(restore, 1800);
        }),
        () => {
          clearTimeout(timer);
          restore();
        },
      );
    }

    setState(el, 'ready');
    return () => {
      offs.forEach((f) => f());
      layer?.remove();
      setState(el, 'ready', false);
    };
  },
};
