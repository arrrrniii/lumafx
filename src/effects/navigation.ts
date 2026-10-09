import { META } from '../meta';
import type { Effect } from '../core/types';
import { setState } from '../core/util';
import { ARRIVAL_KEY as KEY, type Arrival } from '../core/arrival';
import { hold } from '../core/gate';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const SVGNS = 'http://www.w3.org/2000/svg';

/** Runs `frame(p)` for p 0→1 over `ms`, resolving when done. */
function tween(ms: number, frame: (p: number) => void): Promise<void> {
  return new Promise((resolve) => {
    let start = -1;
    const step = (now: number) => {
      if (start < 0) start = now;
      const t = Math.min(1, (now - start) / ms);
      frame(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

type Api = { cover(x?: number, y?: number): Promise<void>; reveal(): Promise<void> };
let active: Api | null = null;

/** Programmatic page transitions for SPAs (Next.js router events, etc.). */
export const page = {
  cover: (x?: number, y?: number) => active?.cover(x, y) ?? Promise.resolve(),
  reveal: () => active?.reveal() ?? Promise.resolve(),
};

export const pageTransition: Effect = {
  name: 'page-transition',
  meta: META['page-transition'],
  mount(el, ctx) {
    const style = ctx.str('style', 'wave') || 'wave';
    const dur = ctx.time('duration', 750);
    const label = ctx.str('label');
    const linkSel = ctx.str('links', 'a[href]') || 'a[href]';
    const cs = getComputedStyle(el);
    const c1 = cs.getPropertyValue('--fx-color').trim() || '#0b0c12';
    const c2 = cs.getPropertyValue('--fx-color-2').trim() || '#ffb547';

    const layer = document.createElement('div');
    layer.className = 'fx-pt';
    layer.setAttribute('aria-hidden', 'true');
    layer.dataset.style = style;
    layer.style.setProperty('--_pt-c1', c1);
    layer.style.setProperty('--_pt-c2', c2);

    let paths: SVGPathElement[] = [];
    let cols: HTMLElement[] = [];
    if (style === 'wave') {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      paths = [c2, c1].map((fill) => {
        const p = document.createElementNS(SVGNS, 'path');
        p.setAttribute('fill', fill);
        p.setAttribute('d', 'M0 100 H100 V100 H0 Z');
        svg.append(p);
        return p;
      });
      layer.append(svg);
    } else if (style === 'curtain') {
      for (let i = 0; i < 5; i++) {
        const c = document.createElement('i');
        c.style.setProperty('--i', String(i));
        layer.append(c);
        cols.push(c);
      }
    } else {
      layer.append(document.createElement('i'));
    }
    if (label) {
      const l = document.createElement('span');
      l.className = 'fx-pt-label';
      l.textContent = label;
      layer.append(l);
    }
    document.body.append(layer);

    const reduced = ctx.env.reduced;
    let busy = false;

    // Wave edge: a curve that bulges in the direction of travel.
    const wave = (path: SVGPathElement, p: number, covering: boolean) => {
      const e = ease(p);
      const bulge = Math.sin(e * Math.PI) * 22;
      if (covering) {
        const y = 100 - e * 100;
        path.setAttribute('d', `M0 ${y} Q50 ${y - bulge} 100 ${y} V100 H0 Z`);
      } else {
        const y = 100 - e * 100;
        path.setAttribute('d', `M0 0 H100 V${y} Q50 ${y - bulge} 0 ${y} Z`);
      }
    };

    const setCovered = (on: boolean) => {
      layer.toggleAttribute('data-covered', on);
      if (on) {
        paths.forEach((p) => p.setAttribute('d', 'M0 0 H100 V100 H0 Z'));
        cols.forEach((c) => (c.style.translate = '0 0'));
      }
    };

    const api: Api = {
      async cover(x?: number, y?: number) {
        layer.setAttribute('data-active', '');
        if (reduced) return void setCovered(true);
        if (style === 'wave') {
          await tween(dur, (p) => {
            wave(paths[0], Math.min(1, p * 1.15), true);
            wave(paths[1], Math.max(0, p * 1.15 - 0.15), true);
          });
        } else if (style === 'curtain') {
          const anims = cols.map((c, i) =>
            c.animate([{ translate: '0 100%' }, { translate: '0 0' }], { duration: dur * 0.75, delay: i * dur * 0.06, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }),
          );
          await Promise.all(anims.map((a) => a.finished));
        } else if (style === 'circle') {
          const px = x ?? innerWidth / 2;
          const py = y ?? innerHeight / 2;
          const r = Math.hypot(Math.max(px, innerWidth - px), Math.max(py, innerHeight - py));
          const shape = layer.querySelector('i')!;
          await shape.animate(
            [{ clipPath: `circle(0px at ${px}px ${py}px)` }, { clipPath: `circle(${r}px at ${px}px ${py}px)` }],
            { duration: dur, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
          ).finished;
        } else {
          const shape = layer.querySelector('i')!;
          await shape.animate([{ translate: '0 100%' }, { translate: '0 0' }], { duration: dur, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished;
        }
        setCovered(true);
      },
      async reveal() {
        layer.setAttribute('data-active', '');
        setCovered(true);
        layer.setAttribute('data-leaving', '');
        if (!reduced) {
          if (style === 'wave') {
            await tween(dur, (p) => {
              wave(paths[1], Math.min(1, p * 1.15), false);
              wave(paths[0], Math.max(0, p * 1.15 - 0.15), false);
            });
          } else if (style === 'curtain') {
            const anims = cols.map((c, i) =>
              c.animate([{ translate: '0 0' }, { translate: '0 -100%' }], { duration: dur * 0.75, delay: i * dur * 0.06, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }),
            );
            await Promise.all(anims.map((a) => a.finished));
          } else if (style === 'circle') {
            const shape = layer.querySelector('i')!;
            const r = Math.hypot(innerWidth, innerHeight) / 2;
            await shape.animate(
              [{ clipPath: `circle(${r}px at 50% 50%)` }, { clipPath: `circle(0px at 50% 50%)` }],
              { duration: dur, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
            ).finished;
          } else {
            const shape = layer.querySelector('i')!;
            await shape.animate([{ translate: '0 0' }, { translate: '0 -100%' }], { duration: dur, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished;
          }
        }
        layer.removeAttribute('data-covered');
        layer.removeAttribute('data-active');
        layer.removeAttribute('data-leaving');
        layer.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        cols.forEach((c) => (c.style.translate = ''));
        paths.forEach((p) => p.setAttribute('d', 'M0 100 H100 V100 H0 Z'));
      },
    };
    active = api;

    // Arriving from a covered page: reveal.
    let arriving = false;
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw && Date.now() - (JSON.parse(raw) as Arrival).t < 6000) arriving = true;
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    if (arriving) {
      setCovered(true);
      layer.setAttribute('data-active', '');
      document.documentElement.classList.remove('fx-pt-arriving');
      requestAnimationFrame(() => api.reveal());
    }

    const shouldHandle = (a: HTMLAnchorElement, e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
      if (a.target && a.target !== '_self') return false;
      if (a.hasAttribute('download') || a.closest('[data-fx-no-transition]')) return false;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return false;
      // Same page, different hash: let the browser scroll.
      if (url.pathname === location.pathname && url.search === location.search) return false;
      return true;
    };

    const onClick = async (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.(linkSel) as HTMLAnchorElement | null;
      if (!a || !(a instanceof HTMLAnchorElement) || busy || !shouldHandle(a, e)) return;
      e.preventDefault();
      busy = true;
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ style, color: c1, t: Date.now() } satisfies Arrival));
      } catch {
        /* ignore */
      }
      await api.cover(e.clientX, e.clientY);
      location.href = a.href;
      // If navigation is cancelled (e.g. a download), uncover after a moment.
      setTimeout(() => {
        busy = false;
        api.reveal();
      }, 4000);
    };
    // Back/forward cache: the page comes back still covered.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        busy = false;
        layer.removeAttribute('data-covered');
        layer.removeAttribute('data-active');
        layer.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        paths.forEach((p) => p.setAttribute('d', 'M0 100 H100 V100 H0 Z'));
      }
    };
    document.addEventListener('click', onClick);
    window.addEventListener('pageshow', onShow);

    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('pageshow', onShow);
      layer.remove();
      if (active === api) active = null;
    };
  },
};

export const preloader: Effect = {
  name: 'preloader',
  meta: META.preloader,
  mount(el, ctx) {
    if (el.hasAttribute('data-fx-done')) return;
    // A replay: drop the previous exit animation.
    el.getAnimations?.().forEach((a) => a.cancel());
    const release = hold();
    const min = ctx.time('min', 900);
    const style = ctx.str('style', 'slide') || 'slide';
    let counter = el.querySelector<HTMLElement>('[data-fx-count]');
    const created = !counter;
    if (!counter) {
      counter = document.createElement('span');
      counter.setAttribute('data-fx-count', '');
      el.append(counter);
    }
    const out = counter;
    setState(el, 'run');
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    el.setAttribute('aria-label', el.getAttribute('aria-label') || 'Loading');
    document.documentElement.classList.add('fx-loading');

    const start = performance.now();
    const imgs = Array.from(document.images).filter((i) => i.loading !== 'lazy');
    let shown = 0;
    let raf = 0;
    let done = false;
    const loaded = () => imgs.filter((i) => i.complete).length;
    const target = () => {
      const ready = document.readyState === 'complete' ? 1 : 0;
      const frac = (loaded() + ready) / (imgs.length + 1);
      // Never sit at 0: creep forward so the counter feels alive on slow networks.
      const creep = Math.min(0.9, (performance.now() - start) / 6000);
      return Math.max(frac, creep) * 100;
    };
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      out.textContent = '100';
      el.setAttribute('aria-valuenow', '100');
      el.style.setProperty('--fx-p', '1');
      document.documentElement.classList.remove('fx-loading');
      // Entrances start as the curtain lifts.
      setTimeout(release, ctx.env.reduced ? 0 : 180);
      const exit =
        ctx.env.reduced || style === 'fade'
          ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ctx.env.reduced ? 200 : 500, fill: 'forwards' })
          : style === 'wave'
            ? el.animate(
                [
                  { translate: '0 0', borderBottomLeftRadius: '0 0', borderBottomRightRadius: '0 0' },
                  { translate: '0 -100%', borderBottomLeftRadius: '50% 18vh', borderBottomRightRadius: '50% 18vh' },
                ],
                { duration: 900, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' },
              )
            : el.animate([{ translate: '0 0' }, { translate: '0 -100%' }], { duration: 850, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
      exit.finished.then(() => {
        el.setAttribute('data-fx-done', '');
        setState(el, 'done');
        document.dispatchEvent(new CustomEvent('fx:loaded'));
      });
    };
    const step = () => {
      const t = Math.min(100, target());
      shown += (t - shown) * 0.08 + 0.15;
      shown = Math.min(shown, t);
      const v = Math.floor(shown);
      out.textContent = String(v).padStart(3, '0');
      el.setAttribute('aria-valuenow', String(v));
      el.style.setProperty('--fx-p', (v / 100).toFixed(3));
      if (document.readyState === 'complete' && shown >= 99.5 && performance.now() - start > min) return finish();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const hardStop = setTimeout(finish, 8000);

    return () => {
      release();
      cancelAnimationFrame(raf);
      clearTimeout(hardStop);
      document.documentElement.classList.remove('fx-loading');
      setState(el, 'run', false);
      el.style.removeProperty('--fx-p');
      if (created) out.remove();
    };
  },
};
