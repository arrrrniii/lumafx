import { META } from '../meta';
import type { Effect } from '../core/types';
import { onView } from '../core/view';
import { tick } from '../core/ticker';
import { clamp, setState } from '../core/util';

/** Runs `fn` every frame while `el` is near the viewport. */
function whileVisible(el: Element, fn: () => void, margin = '200px') {
  let off: (() => void) | null = null;
  const stopView = onView(
    el,
    (visible) => {
      if (visible && !off) off = tick(fn);
      else if (!visible && off) {
        off();
        off = null;
      }
    },
    { margin },
  );
  return () => {
    stopView();
    off?.();
  };
}

export const parallax: Effect = {
  name: 'parallax',
  meta: META.parallax,
  mount(el, ctx) {
    // Modern browsers run the CSS scroll-driven version on the compositor; this is the fallback.
    if (ctx.env.reduced || ctx.env.sda) return;
    const speed = ctx.num('speed', 0.25);
    let cur = 0;
    let lastY = NaN;
    const stop = whileVisible(el, () => {
      const r = el.getBoundingClientRect();
      const top = r.top - cur;
      if (top === lastY) return;
      lastY = top;
      const vh = window.innerHeight;
      const p = clamp((vh - top) / (vh + r.height), 0, 1);
      cur = speed * vh * 0.4 * (1 - 2 * p);
      el.style.translate = `0 ${cur.toFixed(2)}px`;
    });
    return () => {
      stop();
      el.style.translate = '';
    };
  },
};

export const stack: Effect = {
  name: 'stack',
  meta: META.stack,
  mount(el, ctx) {
    const cards = () => Array.from(el.children) as HTMLElement[];
    const index = () => cards().forEach((c, i) => c.style.setProperty('--fx-i', String(i)));
    index();
    const mo = new MutationObserver(index);
    mo.observe(el, { childList: true });
    const clear = () =>
      cards().forEach((c) => ['--fx-i', '--fx-s', '--fx-br'].forEach((p) => c.style.removeProperty(p)));
    if (ctx.env.reduced) {
      return () => {
        mo.disconnect();
        clear();
      };
    }
    const shrink = ctx.num('shrink', 0.05);
    let lastKey = '';
    const stop = whileVisible(el, () => {
      const list = cards();
      const tops = list.map((c) => c.getBoundingClientRect().top);
      const key = tops.map((t) => t.toFixed(1)).join();
      if (key === lastKey) return;
      lastKey = key;
      for (let i = 0; i < list.length; i++) {
        const h = list[i].offsetHeight || 1;
        let cover = 0;
        for (let j = i + 1; j < list.length; j++) cover += clamp(1 - (tops[j] - tops[i]) / h, 0, 1);
        cover = Math.min(cover, 4);
        list[i].style.setProperty('--fx-s', (1 - shrink * cover).toFixed(4));
        list[i].style.setProperty('--fx-br', (1 - 0.09 * cover).toFixed(3));
      }
    }, '0px');
    return () => {
      stop();
      mo.disconnect();
      clear();
    };
  },
};

export const hscroll: Effect = {
  name: 'hscroll',
  meta: META.hscroll,
  mount(el, ctx) {
    // Structure: host > .fx-hs-sticky > [data-fx-track]. Reuse what the markup provides.
    let sticky = el.querySelector<HTMLElement>(':scope > .fx-hs-sticky');
    const createdSticky = !sticky;
    let track =
      sticky?.querySelector<HTMLElement>(':scope > [data-fx-track]') ??
      el.querySelector<HTMLElement>(':scope > [data-fx-track]') ??
      (el.children.length === 1 ? (el.firstElementChild as HTMLElement) : null);
    let createdTrack = false;
    let markedTrack = false;
    if (!track) {
      track = document.createElement('div');
      track.append(...Array.from(el.childNodes));
      createdTrack = true;
    }
    if (!track.hasAttribute('data-fx-track')) {
      track.setAttribute('data-fx-track', '');
      markedTrack = !createdTrack;
    }
    const placeholder = document.createComment('fx-track');
    if (!sticky) {
      sticky = document.createElement('div');
      sticky.className = 'fx-hs-sticky';
      if (track.parentNode === el) el.insertBefore(placeholder, track);
      sticky.append(track);
      el.append(sticky);
    }
    const s = sticky;
    const t = track;

    const restore = () => {
      if (createdSticky) {
        if (createdTrack) {
          while (t.firstChild) el.insertBefore(t.firstChild, s);
        } else if (placeholder.parentNode) placeholder.replaceWith(t);
        else el.insertBefore(t, s);
        s.remove();
      }
      placeholder.remove();
      if (markedTrack) t.removeAttribute('data-fx-track');
    };

    if (ctx.env.reduced) {
      setState(el, 'native');
      return () => {
        setState(el, 'native', false);
        restore();
      };
    }

    let dist = 0;
    const layout = () => {
      dist = Math.max(0, t.scrollWidth - s.clientWidth);
      el.style.setProperty('--fx-hs-dist', dist + 'px');
      el.style.height = `calc(100vh + ${dist}px)`;
    };
    const ro = new ResizeObserver(layout);
    ro.observe(t);
    ro.observe(s);
    layout();

    let stop: (() => void) | null = null;
    if (!ctx.env.sda) {
      stop = whileVisible(el, () => {
        const r = el.getBoundingClientRect();
        const range = r.height - window.innerHeight;
        const p = range > 0 ? clamp(-r.top / range, 0, 1) : 0;
        t.style.translate = `${(-p * dist).toFixed(1)}px 0`;
        el.style.setProperty('--fx-hs-p', p.toFixed(4));
      });
    }

    return () => {
      ro.disconnect();
      stop?.();
      t.style.translate = '';
      el.style.height = '';
      el.style.removeProperty('--fx-hs-dist');
      el.style.removeProperty('--fx-hs-p');
      restore();
    };
  },
};
