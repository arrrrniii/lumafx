import { META } from '../meta';
import type { Effect } from '../core/types';
import { onView } from '../core/view';
import { tick } from '../core/ticker';
import { clamp, damp, on, setState } from '../core/util';
import { whenLoaded } from '../core/gate';

const VIEW = { margin: '0px 0px -12% 0px' };

/** Calls `fn` every frame while `el` is near the viewport. */
function whileVisible(el: Element, fn: (dt: number) => void, margin = '150px') {
  let off: (() => void) | null = null;
  const stop = onView(
    el,
    (v) => {
      if (v && !off) off = tick((_n, dt) => fn(dt));
      else if (!v && off) {
        off();
        off = null;
      }
    },
    { margin },
  );
  return () => {
    stop();
    off?.();
  };
}

/** Pinned scroll range: 0 when the section's top reaches the viewport top, 1 when its bottom reaches the viewport bottom. */
export function pinnedProgress(rectTop: number, rectHeight: number, vh: number) {
  const range = rectHeight - vh;
  return range > 0 ? clamp(-rectTop / range, 0, 1) : 0;
}

/** "f-###.jpg" + 7 → "f-007.jpg" */
export function framePath(pattern: string, n: number) {
  return pattern.replace(/#+/, (m) => String(n).padStart(m.length, '0'));
}

/* ---------------- image-reveal ---------------- */

export const imageReveal: Effect = {
  name: 'image-reveal',
  meta: META['image-reveal'],
  mount(el, ctx) {
    if (ctx.env.reduced) {
      setState(el, 'in');
      return () => setState(el, 'in', false);
    }
    let off: (() => void) | null = onView(
      el,
      (v) => {
        if (!v) return;
        whenLoaded(() => setState(el, 'in'));
        off?.();
        off = null;
      },
      VIEW,
    );
    return () => {
      off?.();
      setState(el, 'in', false);
    };
  },
};

/* ---------------- expand (CSS view timeline; JS fallback) ---------------- */

export const expand: Effect = {
  name: 'expand',
  meta: META.expand,
  mount(el, ctx) {
    if (ctx.env.reduced || ctx.env.sda) return;
    const inset = ctx.str('inset', '8vw') || '8vw';
    const radius = ctx.str('radius', '32px') || '32px';
    const stop = whileVisible(el, () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh - r.top) / ((vh + r.height) / 2), 0, 1);
      const k = 1 - p;
      el.style.clipPath = `inset(0 calc(${inset} * ${k.toFixed(4)}) round calc(${radius} * ${k.toFixed(4)}))`;
    });
    return () => {
      stop();
      el.style.clipPath = '';
    };
  },
};

/* ---------------- image-trail ---------------- */

export const imageTrail: Effect = {
  name: 'image-trail',
  meta: META['image-trail'],
  mount(el, ctx) {
    if (!ctx.env.finePointer || ctx.env.reduced) return;
    const fromAttr = (ctx.str('images') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const fromKids = Array.from(el.querySelectorAll<HTMLImageElement>('img[data-fx-trail]')).map((i) => i.currentSrc || i.src);
    const srcs = fromAttr.length ? fromAttr : fromKids;
    if (!srcs.length) return;
    const size = ctx.px('size', 190);
    const spacing = ctx.px('spacing', 90);
    let lastX = NaN;
    let lastY = NaN;
    let idx = 0;
    let preloaded = false;
    const live = new Set<HTMLElement>();

    const spawn = (x: number, y: number) => {
      const img = document.createElement('img');
      img.className = 'fx-trail';
      img.alt = '';
      img.src = srcs[idx++ % srcs.length];
      img.style.width = size + 'px';
      img.style.left = x + 'px';
      img.style.top = y + 'px';
      img.style.setProperty('--r', (Math.random() * 14 - 7).toFixed(1) + 'deg');
      el.append(img);
      live.add(img);
      const a = img.animate(
        [
          { opacity: 0, scale: 0.6, translate: '-50% -50%', offset: 0 },
          { opacity: 1, scale: 1, translate: '-50% -50%', offset: 0.12 },
          { opacity: 1, scale: 1, translate: '-50% -50%', offset: 0.55 },
          { opacity: 0, scale: 0.85, translate: '-50% calc(-50% + 18px)', offset: 1 },
        ],
        { duration: 1100, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
      );
      a.finished.then(() => {
        img.remove();
        live.delete(img);
      });
      // Keep the DOM small however fast the cursor moves.
      if (live.size > 14) {
        const first = live.values().next().value as HTMLElement;
        first.remove();
        live.delete(first);
      }
    };
    const offs = [
      on(el, 'pointerenter', () => {
        if (preloaded) return;
        preloaded = true;
        srcs.forEach((s) => (new Image().src = s));
      }),
      on(el, 'pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        if (Number.isNaN(lastX) || Math.hypot(x - lastX, y - lastY) > spacing) {
          lastX = x;
          lastY = y;
          spawn(x, y);
        }
      }),
      on(el, 'pointerleave', () => {
        lastX = NaN;
        lastY = NaN;
      }),
    ];
    return () => {
      offs.forEach((f) => f());
      live.forEach((i) => i.remove());
    };
  },
};

/* ---------------- pinned scroll scenes (video-scrub, frames) ---------------- */

function pin(el: HTMLElement) {
  let sticky = el.querySelector<HTMLElement>(':scope > .fx-pin');
  const created = !sticky;
  if (!sticky) {
    sticky = document.createElement('div');
    sticky.className = 'fx-pin';
    sticky.append(...Array.from(el.childNodes));
    el.append(sticky);
  }
  const s = sticky;
  return {
    sticky: s,
    restore() {
      if (!created) return;
      while (s.firstChild) el.insertBefore(s.firstChild, s);
      s.remove();
    },
  };
}

export const videoScrub: Effect = {
  name: 'video-scrub',
  meta: META['video-scrub'],
  mount(el, ctx) {
    const video = el.querySelector('video');
    if (!video) return;
    const { restore } = pin(el);
    const smooth = Math.max(1, ctx.num('smooth', 8));
    video.muted = true;
    video.playsInline = true;
    video.pause();
    video.removeAttribute('autoplay');
    // iOS only paints frames after the video has played once. (Older engines return nothing from play().)
    try {
      const p = video.play() as Promise<void> | undefined;
      p?.then(() => video.pause()).catch(() => {});
    } catch {
      /* not supported */
    }
    // Servers without HTTP range support make a video unseekable (every seek snaps back to 0).
    // Then load the file into memory once: a blob: URL can always seek.
    let blobUrl = '';
    let cancelled = false;
    const origSrc = video.getAttribute('src');
    const ensureSeekable = () => {
      const r = video.seekable;
      const seekable = r.length > 0 && r.end(r.length - 1) > 0.1;
      const src = video.currentSrc;
      if (seekable || blobUrl || !src || src.startsWith('blob:') || typeof fetch !== 'function') return;
      fetch(src)
        .then((res) => (res.ok ? res.blob() : Promise.reject(res.status)))
        .then((b) => {
          if (cancelled) return;
          blobUrl = URL.createObjectURL(b);
          video.src = blobUrl;
        })
        .catch(() => {});
    };
    if (video.readyState >= 1) ensureSeekable();
    else video.addEventListener('loadedmetadata', ensureSeekable, { once: true });

    let t = 0;
    const stop = whileVisible(el, (dt) => {
      const d = video.duration;
      if (!d || Number.isNaN(d)) return;
      const r = el.getBoundingClientRect();
      const p = pinnedProgress(r.top, r.height, window.innerHeight);
      el.style.setProperty('--fx-p', p.toFixed(4));
      const target = p * (d - 0.04);
      t = ctx.env.reduced ? target : damp(t, target, smooth, dt);
      // Only ask for a new frame when the previous seek has finished.
      if (!video.seeking && Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t;
    }, '300px');
    setState(el, 'pinned');
    return () => {
      cancelled = true;
      stop();
      video.removeEventListener('loadedmetadata', ensureSeekable);
      if (blobUrl) {
        if (origSrc === null) video.removeAttribute('src');
        else video.setAttribute('src', origSrc);
        video.load();
        URL.revokeObjectURL(blobUrl);
      }
      el.style.removeProperty('--fx-p');
      setState(el, 'pinned', false);
      restore();
    };
  },
};

export const frames: Effect = {
  name: 'frames',
  meta: META.frames,
  mount(el, ctx) {
    const pattern = ctx.str('src');
    const count = Math.max(1, Math.round(ctx.num('count', 60)));
    const first = Math.round(ctx.num('start', 1));
    if (!pattern) return;
    const { sticky, restore } = pin(el);
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-frames-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', el.getAttribute('aria-label') || 'Animation');
    sticky.prepend(canvas);
    const g = canvas.getContext('2d');
    const imgs: (HTMLImageElement | null)[] = new Array(count).fill(null);

    // Load the first frame first, then the rest a few at a time.
    const load = (i: number) =>
      new Promise<void>((res) => {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => {
          imgs[i] = im;
          drawn = -1;
          res();
        };
        im.onerror = () => res();
        im.src = framePath(pattern, first + i);
      });
    let cancelled = false;
    let started = false;
    const loadAll = async () => {
      await load(0);
      let next = 1;
      const worker = async () => {
        while (!cancelled && next < count) await load(next++);
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      setState(el, 'loaded');
    };
    const offLoad = onView(el, (v) => {
      if (v && !started) {
        started = true;
        loadAll();
      }
    }, { margin: '600px' });

    let cur = 0;
    let drawn = -1;
    const draw = (i: number) => {
      if (!g) return;
      // Nearest loaded frame so scrubbing never shows a blank canvas.
      let k = -1;
      for (let d = 0; d < count; d++) {
        if (imgs[i - d]) {
          k = i - d;
          break;
        }
        if (imgs[i + d]) {
          k = i + d;
          break;
        }
      }
      const im = k >= 0 ? imgs[k] : null;
      if (!im || k === drawn) return;
      drawn = k;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = sticky.clientWidth;
      const h = sticky.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const s = Math.max(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight);
      const dw = im.naturalWidth * s;
      const dh = im.naturalHeight * s;
      g.drawImage(im, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    };
    const stop = whileVisible(el, (dt) => {
      const r = el.getBoundingClientRect();
      const p = pinnedProgress(r.top, r.height, window.innerHeight);
      el.style.setProperty('--fx-p', p.toFixed(4));
      cur = ctx.env.reduced ? p : damp(cur, p, 10, dt);
      draw(Math.round(cur * (count - 1)));
    }, '300px');
    const onResize = () => (drawn = -1);
    window.addEventListener('resize', onResize);
    setState(el, 'pinned');
    return () => {
      cancelled = true;
      offLoad();
      stop();
      window.removeEventListener('resize', onResize);
      canvas.remove();
      el.style.removeProperty('--fx-p');
      ['pinned', 'loaded'].forEach((s) => setState(el, s, false));
      restore();
    };
  },
};
