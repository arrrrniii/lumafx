import { META } from '../meta';
import type { Effect } from '../core/types';
import { sleeper } from '../core/ticker';
import { clamp, damp, on, setState } from '../core/util';

/* ======================================================================
   hovercard
   ====================================================================== */

export interface Placement {
  x: number;
  y: number;
  side: 'top' | 'bottom' | 'left' | 'right';
  ox: number;
  oy: number;
}

/** Pure placement math (unit-tested): pick a side with room, then keep the card inside the viewport. */
export function placeCard(
  t: { left: number; top: number; right: number; bottom: number; width: number; height: number },
  c: { width: number; height: number },
  vw: number,
  vh: number,
  prefer = 'auto',
  gap = 10,
): Placement {
  const room = { top: t.top, bottom: vh - t.bottom, left: t.left, right: vw - t.right };
  const fits = (s: string) => (s === 'top' || s === 'bottom' ? room[s as 'top'] >= c.height + gap + 8 : room[s as 'left'] >= c.width + gap + 8);
  let side = (['top', 'bottom', 'left', 'right'].includes(prefer) && fits(prefer) ? prefer : '') as Placement['side'];
  if (!side) side = fits('bottom') ? 'bottom' : fits('top') ? 'top' : room.right >= room.left ? 'right' : 'left';
  let x: number;
  let y: number;
  if (side === 'bottom' || side === 'top') {
    x = t.left + t.width / 2 - c.width / 2;
    y = side === 'bottom' ? t.bottom + gap : t.top - gap - c.height;
  } else {
    y = t.top + t.height / 2 - c.height / 2;
    x = side === 'right' ? t.right + gap : t.left - gap - c.width;
  }
  x = clamp(x, 8, Math.max(8, vw - c.width - 8));
  y = clamp(y, 8, Math.max(8, vh - c.height - 8));
  // Grow out of the trigger.
  const ox = clamp(t.left + t.width / 2 - x, 0, c.width);
  const oy = side === 'bottom' ? 0 : side === 'top' ? c.height : clamp(t.top + t.height / 2 - y, 0, c.height);
  return { x, y, side, ox, oy };
}

let card: HTMLElement | null = null;
let cardOwner: HTMLElement | null = null;
let hideTimer = 0;
let cardUsers = 0;

function ensureCard() {
  if (card) return card;
  card = document.createElement('div');
  card.className = 'fx-hc';
  card.id = 'fx-hovercard';
  card.setAttribute('role', 'tooltip');
  card.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  card.addEventListener('pointerleave', () => scheduleHide());
  document.body.append(card);
  return card;
}
function hideCard() {
  if (!card) return;
  card.removeAttribute('data-state');
  cardOwner?.removeAttribute('aria-describedby');
  cardOwner = null;
}
function scheduleHide(ms = 140) {
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hideCard, ms);
}

export const hovercard: Effect = {
  name: 'hovercard',
  meta: META.hovercard,
  mount(el, ctx) {
    const sel = ctx.str('for');
    const text = ctx.str('text');
    if (!sel && !text) return;
    cardUsers++;
    const prefer = ctx.str('placement', 'auto') || 'auto';
    const delay = ctx.time('delay', 90);
    let openTimer = 0;

    const show = () => {
      const c = ensureCard();
      clearTimeout(hideTimer);
      if (cardOwner !== el) {
        if (sel) {
          const src = document.querySelector(sel);
          if (!src) return;
          // <template> keeps its content in a fragment; anything else is cloned as is.
          const from = src instanceof HTMLTemplateElement ? src.content.cloneNode(true) : src.cloneNode(true);
          c.replaceChildren(...Array.from(from.childNodes));
        } else c.textContent = text || '';
        cardOwner?.removeAttribute('aria-describedby');
        cardOwner = el;
      }
      el.setAttribute('aria-describedby', 'fx-hovercard');
      c.style.left = '0px';
      c.style.top = '0px';
      const cr = c.getBoundingClientRect();
      const p = placeCard(el.getBoundingClientRect(), cr, window.innerWidth, window.innerHeight, prefer);
      c.style.left = p.x + 'px';
      c.style.top = p.y + 'px';
      c.style.transformOrigin = `${p.ox}px ${p.oy}px`;
      c.dataset.side = p.side;
      c.setAttribute('data-state', 'open');
    };
    const offs = [
      on(el, 'pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        clearTimeout(openTimer);
        openTimer = window.setTimeout(show, delay);
      }),
      on(el, 'pointerleave', () => {
        clearTimeout(openTimer);
        scheduleHide();
      }),
      on(el, 'focusin', show),
      on(el, 'focusout', () => scheduleHide(60)),
      on(el, 'keydown', (e) => e.key === 'Escape' && hideCard()),
    ];
    return () => {
      offs.forEach((f) => f());
      clearTimeout(openTimer);
      if (cardOwner === el) hideCard();
      if (--cardUsers <= 0 && card) {
        card.remove();
        card = null;
      }
    };
  },
};

/* ======================================================================
   smart-header
   ====================================================================== */

export const smartHeader: Effect = {
  name: 'smart-header',
  meta: META['smart-header'],
  mount(el, ctx) {
    const threshold = ctx.px('threshold', 80);
    const hide = ctx.bool('hide', true) && !ctx.env.reduced;
    const logo = el.querySelector<HTMLElement>('[data-fx-logo]');
    let lastY = window.scrollY;
    let raf = 0;
    let g: { s: number; tx: number; ty: number; range: number } | null = null;

    // A big hero wordmark that docks into the header as you scroll (the logo's natural size is the docked size).
    const measure = () => {
      if (!logo) return;
      logo.style.transform = '';
      const r = logo.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const vw = document.documentElement.clientWidth;
      const frac = parseFloat(logo.getAttribute('data-fx-logo') || '') || 0.9;
      const targetW = vw * frac;
      const s = targetW / r.width;
      // Dock over roughly the distance the extra logo height needs, so it never sits on the content below.
      const range = clamp((s - 1) * r.height + 60, 120, window.innerHeight * 0.6);
      g = { s, tx: (vw - targetW) / 2 - r.left, ty: el.offsetHeight + 12 - top, range };
    };
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      setState(el, 'scrolled', y > threshold);
      let docking = false;
      if (logo && g) {
        const p = clamp(y / g.range, 0, 1);
        // Ease-out: shrinks fastest at the start, while the content below is closest.
        const k = (1 - p) * (1 - p);
        docking = p < 1;
        logo.style.transform = k > 0.001 ? `translate(${(g.tx * k).toFixed(2)}px, ${(g.ty * k).toFixed(2)}px) scale(${(1 + (g.s - 1) * k).toFixed(4)})` : '';
        setState(el, 'docked', !docking);
      }
      if (hide && Math.abs(dy) > 4) {
        setState(el, 'hidden', dy > 0 && y > threshold + el.offsetHeight && !docking && !el.matches(':focus-within'));
      }
      if (Math.abs(dy) > 4 || y < threshold) lastY = y;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      update();
    };
    measure();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // Web fonts change the logo's natural size: re-measure when it changes (transforms don't trigger this).
    const ro = logo ? new ResizeObserver(() => onResize()) : null;
    if (logo) ro!.observe(logo);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (logo) logo.style.transform = '';
      ['scrolled', 'hidden', 'docked'].forEach((s) => setState(el, s, false));
    };
  },
};

/* ======================================================================
   scrollbar
   ====================================================================== */

let scrollbarActive = false;

export const scrollbar: Effect = {
  name: 'scrollbar',
  meta: META.scrollbar,
  mount(el, ctx) {
    if (!ctx.env.finePointer || scrollbarActive) return;
    scrollbarActive = true;
    const html = document.documentElement;
    html.setAttribute('data-fx-scrollbar', '');
    const color = getComputedStyle(el).getPropertyValue('--fx-color').trim();
    const sel = ctx.str('sections', 'h2, [data-fx-section]') || 'h2, [data-fx-section]';

    const rail = document.createElement('div');
    rail.className = 'fx-sb';
    rail.setAttribute('aria-hidden', 'true');
    if (color) rail.style.setProperty('--_sb-c', color);
    const track = document.createElement('div');
    track.className = 'fx-sb-track';
    const marks = document.createElement('div');
    marks.className = 'fx-sb-marks';
    const thumb = document.createElement('div');
    thumb.className = 'fx-sb-thumb';
    const tip = document.createElement('div');
    tip.className = 'fx-sb-tip';
    track.append(marks, thumb);
    rail.append(track, tip);
    document.body.append(rail);

    let sections: { top: number; label: string }[] = [];
    let docH = 1;
    let vh = 1;
    let trackH = 1;
    let thumbH = 40;
    const measure = () => {
      docH = html.scrollHeight;
      vh = window.innerHeight;
      trackH = track.clientHeight || 1;
      thumbH = Math.max(36, (vh / docH) * trackH);
      thumb.style.height = thumbH + 'px';
      rail.hidden = docH <= vh + 4;
      sections = Array.from(document.querySelectorAll<HTMLElement>(sel))
        .filter((s) => s.offsetParent !== null && !rail.contains(s))
        .map((s) => ({
          top: s.getBoundingClientRect().top + window.scrollY,
          label: (s.getAttribute('data-fx-section') || s.getAttribute('aria-label') || s.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 64),
        }))
        .filter((s) => s.label);
      marks.replaceChildren(
        ...sections.map((s) => {
          const m = document.createElement('i');
          m.style.top = ((s.top / docH) * 100).toFixed(3) + '%';
          return m;
        }),
      );
    };
    const target = () => (window.scrollY / Math.max(1, docH - vh)) * (trackH - thumbH);

    let pos = target();
    let idleTimer = 0;
    const loop = sleeper((_now, dt) => {
      const t = target();
      const prev = pos;
      pos = damp(pos, t, 16, dt);
      const v = (pos - prev) / Math.max(dt, 1);
      // The thumb stretches with speed, like something elastic being pulled.
      const stretch = 1 + Math.min(Math.abs(v) * 0.9, 0.55);
      thumb.style.translate = `0 ${pos.toFixed(2)}px`;
      thumb.style.scale = `1 ${stretch.toFixed(3)}`;
      thumb.style.transformOrigin = v >= 0 ? '50% 100%' : '50% 0';
      return Math.abs(pos - t) > 0.3 || stretch > 1.005;
    });
    const activate = () => {
      setState(rail, 'active');
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => !rail.matches(':hover') && setState(rail, 'active', false), 1200);
    };
    const onScroll = () => {
      loop.wake();
      activate();
    };

    // Hover: show which section sits at that point of the page, right next to the cursor.
    const sectionAt = (frac: number) => {
      const y = frac * docH;
      let found = sections[0];
      for (const s of sections) if (s.top <= y + vh * 0.3) found = s;
      return found;
    };
    const onMove = (e: PointerEvent) => {
      const r = track.getBoundingClientRect();
      const frac = clamp((e.clientY - r.top) / r.height, 0, 1);
      const s = sectionAt(frac);
      tip.textContent = (s ? s.label + ' · ' : '') + Math.round(frac * 100) + '%';
      tip.style.top = clamp(e.clientY - rail.getBoundingClientRect().top, 14, r.height - 14) + 'px';
      setState(rail, 'tip');
    };
    let drag: { y: number; scroll: number } | null = null;
    const offs = [
      on(window as unknown as HTMLElement, 'scroll', onScroll, { passive: true }),
      on(window as unknown as HTMLElement, 'resize', () => (measure(), loop.wake())),
      on(rail, 'pointerenter', () => setState(rail, 'active')),
      on(rail, 'pointermove', onMove),
      on(rail, 'pointerleave', () => {
        setState(rail, 'tip', false);
        activate();
      }),
      on(thumb, 'pointerdown', (e) => {
        e.preventDefault();
        thumb.setPointerCapture(e.pointerId);
        drag = { y: e.clientY, scroll: window.scrollY };
        setState(rail, 'dragging');
      }),
      on(thumb, 'pointermove', (e) => {
        if (!drag) return;
        const ratio = (docH - vh) / Math.max(1, trackH - thumbH);
        window.scrollTo({ top: drag.scroll + (e.clientY - drag.y) * ratio, behavior: 'instant' as ScrollBehavior });
      }),
      on(thumb, 'pointerup', () => {
        drag = null;
        setState(rail, 'dragging', false);
      }),
      on(track, 'click', (e) => {
        if (e.target === thumb) return;
        const r = track.getBoundingClientRect();
        const frac = clamp((e.clientY - r.top) / r.height, 0, 1);
        const s = sectionAt(frac);
        const top = s && Math.abs(s.top / docH - frac) < 0.04 ? s.top - 24 : frac * docH - vh / 2;
        window.scrollTo({ top, behavior: ctx.env.reduced ? 'auto' : 'smooth' });
      }),
    ];
    const ro = new ResizeObserver(() => (measure(), loop.wake()));
    ro.observe(document.body);
    measure();
    loop.wake();

    return () => {
      offs.forEach((f) => f());
      ro.disconnect();
      loop.stop();
      clearTimeout(idleTimer);
      rail.remove();
      html.removeAttribute('data-fx-scrollbar');
      scrollbarActive = false;
    };
  },
};

/* ======================================================================
   scroll-progress (CSS scroll timeline; JS fallback)
   ====================================================================== */

export const scrollProgress: Effect = {
  name: 'scroll-progress',
  meta: META['scroll-progress'],
  mount(el, ctx) {
    el.setAttribute('aria-hidden', 'true');
    if (ctx.env.sda) return () => el.removeAttribute('aria-hidden');
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.scale = `${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0} 1`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      el.style.scale = '';
      el.removeAttribute('aria-hidden');
    };
  },
};

/* ======================================================================
   dock
   ====================================================================== */

export const dock: Effect = {
  name: 'dock',
  meta: META.dock,
  mount(el, ctx) {
    if (!ctx.env.finePointer || ctx.env.reduced) return;
    const mag = Math.max(1, ctx.num('magnify', 1.8));
    const range = ctx.px('range', 150);
    const items = () => Array.from(el.children) as HTMLElement[];
    let px: number | null = null;
    let centers: number[] = [];
    const scales = new Map<HTMLElement, number>();
    const loop = sleeper((_now, dt) => {
      let moving = false;
      items().forEach((it, i) => {
        const c = centers[i] ?? 0;
        const d = px === null ? Infinity : Math.abs(px - c);
        const k = d < range ? Math.cos((d / range) * (Math.PI / 2)) : 0;
        const target = 1 + (mag - 1) * k * k;
        const cur = damp(scales.get(it) ?? 1, target, 14, dt);
        scales.set(it, cur);
        it.style.setProperty('--fx-s', cur.toFixed(4));
        if (Math.abs(cur - target) > 0.002) moving = true;
      });
      return moving || px !== null;
    });
    const offs = [
      on(el, 'pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        centers = items().map((it) => {
          const r = it.getBoundingClientRect();
          return r.left + r.width / 2;
        });
      }),
      on(el, 'pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        px = e.clientX;
        loop.wake();
      }),
      on(el, 'pointerleave', () => {
        px = null;
        loop.wake();
      }),
    ];
    return () => {
      offs.forEach((f) => f());
      loop.stop();
      items().forEach((it) => it.style.removeProperty('--fx-s'));
    };
  },
};

/* ======================================================================
   lightbox
   ====================================================================== */

type DocVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
let lb: {
  dlg: HTMLDialogElement;
  img: HTMLImageElement;
  cap: HTMLElement;
  count: HTMLElement;
  items: HTMLElement[];
  index: number;
} | null = null;
let lbUsers = 0;

const hrefOf = (a: HTMLElement) => a.getAttribute('href') || a.getAttribute('data-fx-src') || '';
const thumbOf = (a: HTMLElement) => a.querySelector('img');

function lbSet(i: number, animate = true) {
  if (!lb) return;
  const n = lb.items.length;
  lb.index = (i + n) % n;
  const a = lb.items[lb.index];
  const t = thumbOf(a);
  lb.img.src = hrefOf(a);
  lb.img.alt = t?.alt || '';
  lb.cap.textContent = a.getAttribute('data-fx-caption') || a.closest('figure')?.querySelector('figcaption')?.textContent || t?.alt || '';
  lb.count.textContent = `${lb.index + 1} / ${n}`;
  lb.dlg.removeAttribute('data-zoom');
  lb.img.style.transformOrigin = '';
  if (animate) lb.img.animate([{ opacity: 0.2, scale: 0.98 }, { opacity: 1, scale: 1 }], { duration: 260, easing: 'ease-out' });
  [-1, 1].forEach((d) => {
    const next = lb!.items[(lb!.index + d + n) % n];
    if (next) new Image().src = hrefOf(next);
  });
}

function ensureViewer(reduced: boolean) {
  if (lb) return lb;
  const dlg = document.createElement('dialog');
  dlg.className = 'fx-lb';
  dlg.setAttribute('aria-label', 'Image viewer');
  dlg.innerHTML =
    '<figure class="fx-lb-fig"><img class="fx-lb-img" alt=""><figcaption class="fx-lb-cap"></figcaption></figure>' +
    '<button type="button" class="fx-lb-btn fx-lb-prev" aria-label="Previous image">‹</button>' +
    '<button type="button" class="fx-lb-btn fx-lb-next" aria-label="Next image">›</button>' +
    '<button type="button" class="fx-lb-btn fx-lb-close" aria-label="Close">×</button>' +
    '<span class="fx-lb-count"></span>';
  document.body.append(dlg);
  lb = {
    dlg,
    img: dlg.querySelector('.fx-lb-img')!,
    cap: dlg.querySelector('.fx-lb-cap')!,
    count: dlg.querySelector('.fx-lb-count')!,
    items: [],
    index: 0,
  };
  const v = lb;
  dlg.querySelector('.fx-lb-prev')!.addEventListener('click', () => lbSet(v.index - 1));
  dlg.querySelector('.fx-lb-next')!.addEventListener('click', () => lbSet(v.index + 1));
  dlg.querySelector('.fx-lb-close')!.addEventListener('click', () => lbClose(reduced));
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    lbClose(reduced);
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') lbSet(v.index + 1);
    else if (e.key === 'ArrowLeft') lbSet(v.index - 1);
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) lbClose(reduced);
  });
  // Click to zoom toward the click point; move to pan.
  v.img.addEventListener('click', (e) => {
    const r = v.img.getBoundingClientRect();
    v.img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    dlg.toggleAttribute('data-zoom');
  });
  v.img.addEventListener('pointermove', (e) => {
    if (!dlg.hasAttribute('data-zoom') || e.pointerType === 'touch') return;
    const r = dlg.getBoundingClientRect();
    v.img.style.transformOrigin = `${(e.clientX / r.width) * 100}% ${(e.clientY / r.height) * 100}%`;
  });
  let sx = 0;
  dlg.addEventListener('pointerdown', (e) => (sx = e.clientX));
  dlg.addEventListener('pointerup', (e) => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 60 && !dlg.hasAttribute('data-zoom')) lbSet(v.index + (dx < 0 ? 1 : -1));
  });
  return lb;
}

function morph(from: Element | null, to: Element | null, update: () => void, reduced: boolean) {
  const doc = document as DocVT;
  if (!doc.startViewTransition || reduced || !from || !to) return update();
  (from as HTMLElement).style.viewTransitionName = 'fx-lb';
  const vt = doc.startViewTransition(() => {
    (from as HTMLElement).style.viewTransitionName = '';
    (to as HTMLElement).style.viewTransitionName = 'fx-lb';
    update();
  });
  vt.finished.finally(() => ((to as HTMLElement).style.viewTransitionName = ''));
}

function lbClose(reduced: boolean) {
  if (!lb || !lb.dlg.open) return;
  const v = lb;
  morph(v.img, thumbOf(v.items[v.index]), () => v.dlg.close(), reduced);
}

export const lightbox: Effect = {
  name: 'lightbox',
  meta: META.lightbox,
  mount(el, ctx) {
    // On a link: that one image (paged with others in the same data-fx-group).
    // On a container (a gallery): every linked image inside, paged together.
    const own = !!hrefOf(el);
    const links = own ? [el] : Array.from(el.querySelectorAll<HTMLElement>('a[href]')).filter((a) => thumbOf(a) && /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i.test(hrefOf(a)));
    if (!links.length) return;
    lbUsers++;
    const reduced = ctx.env.reduced;
    const offs = links.map((link) =>
      on(link, 'click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        const v = ensureViewer(reduced);
        if (own) {
          const group = el.getAttribute('data-fx-group') || '';
          v.items = Array.from(document.querySelectorAll<HTMLElement>('[data-fx~="lightbox"],.fx-lightbox')).filter(
            (a) => (a.getAttribute('data-fx-group') || '') === group && hrefOf(a),
          );
        } else v.items = links;
        const i = Math.max(0, v.items.indexOf(link));
        morph(thumbOf(link), v.img, () => {
          lbSet(i, false);
          v.dlg.showModal();
        }, reduced);
      }),
    );
    return () => {
      offs.forEach((f) => f());
      if (--lbUsers <= 0 && lb) {
        lb.dlg.remove();
        lb = null;
      }
    };
  },
};
