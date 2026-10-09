import { META } from '../meta';
import type { Effect } from '../core/types';
import { tick } from '../core/ticker';
import { onView } from '../core/view';
import { clamp, on, rafThrottle, setAttrs, setState } from '../core/util';

function slidesOf(el: HTMLElement) {
  return (Array.from(el.children) as HTMLElement[]).filter((c) => !c.hasAttribute('data-fx-ui'));
}

export const carousel: Effect = {
  name: 'carousel',
  meta: META.carousel,
  mount(el, ctx) {
    const cleanups: (() => void)[] = [];
    cleanups.push(
      setAttrs(el, {
        role: 'region',
        'aria-roledescription': 'carousel',
        tabindex: '0',
        'aria-label': el.getAttribute('aria-label') || 'Carousel',
      }),
    );
    const labelSlides = () => {
      const list = slidesOf(el);
      list.forEach((s, i) => {
        s.setAttribute('role', s.getAttribute('role') || 'group');
        s.setAttribute('aria-roledescription', 'slide');
        if (!s.hasAttribute('aria-label') || s.hasAttribute('data-fx-auto-label')) {
          s.setAttribute('aria-label', `${i + 1} of ${list.length}`);
          s.setAttribute('data-fx-auto-label', '');
        }
      });
    };
    labelSlides();
    cleanups.push(() =>
      slidesOf(el).forEach((s) => {
        if (s.hasAttribute('data-fx-auto-label')) {
          s.removeAttribute('aria-label');
          s.removeAttribute('data-fx-auto-label');
        }
        s.removeAttribute('aria-roledescription');
        if (s.getAttribute('role') === 'group') s.removeAttribute('role');
      }),
    );

    const pad = () => parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const scaleStyle = ctx.str('style', 'default') === 'scale';
    const current = () => {
      const list = slidesOf(el);
      const er = el.getBoundingClientRect();
      const anchor = scaleStyle ? er.left + er.width / 2 : er.left + pad();
      let best = 0;
      let bestD = Infinity;
      list.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs((scaleStyle ? r.left + r.width / 2 : r.left) - anchor);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    };
    const goTo = (i: number, smooth = !ctx.env.reduced) => {
      const list = slidesOf(el);
      const target = list[clamp(i, 0, list.length - 1)];
      if (!target) return;
      const er = el.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      const delta = scaleStyle ? r.left + r.width / 2 - (er.left + er.width / 2) : r.left - er.left - pad();
      el.scrollTo({ left: el.scrollLeft + delta, behavior: smooth ? 'smooth' : 'auto' });
    };
    const go = (dir: number) => {
      const list = slidesOf(el);
      const i = current() + dir;
      goTo(i < 0 ? list.length - 1 : i >= list.length ? 0 : i);
    };

    // Keyboard
    cleanups.push(
      on(el, 'keydown', (e) => {
        if (e.key === 'ArrowRight') (e.preventDefault(), go(1));
        else if (e.key === 'ArrowLeft') (e.preventDefault(), go(-1));
      }),
    );

    // Mouse drag with momentum (touch already has native momentum scrolling).
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let v = 0;
    let moved = 0;
    let momentum: (() => void) | null = null;
    const stopMomentum = () => {
      momentum?.();
      momentum = null;
    };
    const release = () => {
      el.style.scrollSnapType = '';
      el.style.scrollBehavior = '';
      setState(el, 'dragging', false);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      el.scrollLeft = startScroll - dx;
      const dt = Math.max(1, now - lastT);
      v = 0.8 * ((e.clientX - lastX) / dt) + 0.2 * v;
      lastX = e.clientX;
      lastT = now;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (performance.now() - lastT > 80) v = 0;
      // Glide, then snap to the nearest slide.
      momentum = tick((_now, dt) => {
        el.scrollLeft -= v * dt;
        v *= Math.pow(0.94, dt / 16.7);
        if (Math.abs(v) < 0.05) {
          stopMomentum();
          const i = current();
          goTo(i);
          setTimeout(release, 450);
        }
      });
    };
    cleanups.push(
      on(el, 'pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        stopMomentum();
        dragging = true;
        moved = 0;
        v = 0;
        startX = lastX = e.clientX;
        lastT = performance.now();
        startScroll = el.scrollLeft;
        el.style.scrollSnapType = 'none';
        el.style.scrollBehavior = 'auto';
        setState(el, 'dragging');
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      }),
      on(el, 'dragstart', (e) => e.preventDefault()),
      // A drag should not count as a click on a link inside a slide.
      on(el, 'click', (e) => moved > 6 && (e.preventDefault(), e.stopPropagation()), { capture: true }),
      () => {
        stopMomentum();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        release();
      },
    );

    // Coverflow-style scaling + dot state
    let dots: HTMLButtonElement[] | null = null;
    const update = rafThrottle(() => {
      const list = slidesOf(el);
      const er = el.getBoundingClientRect();
      const mid = er.left + er.width / 2;
      if (scaleStyle) {
        for (const s of list) {
          const r = s.getBoundingClientRect();
          const k = 1 - clamp(Math.abs(r.left + r.width / 2 - mid) / (r.width || 1), 0, 1);
          s.style.setProperty('--fx-k', k.toFixed(3));
        }
      }
      if (dots) {
        const i = current();
        dots.forEach((d, j) => d.setAttribute('aria-current', j === i ? 'true' : 'false'));
      }
    });
    cleanups.push(on(el, 'scroll', update, { passive: true }), () => update.cancel());
    if (scaleStyle)
      cleanups.push(() => slidesOf(el).forEach((s) => s.style.removeProperty('--fx-k')));

    // Optional controls
    if (ctx.bool('controls', false)) {
      const nav = document.createElement('div');
      nav.className = 'fx-carousel-nav';
      const btn = (label: string, text: string, fn: () => void) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fx-cb';
        b.setAttribute('aria-label', label);
        b.textContent = text;
        b.addEventListener('click', fn);
        return b;
      };
      const dotWrap = document.createElement('div');
      dotWrap.className = 'fx-dots';
      dots = slidesOf(el).map((_, i) => {
        const d = btn(`Go to slide ${i + 1}`, '', () => goTo(i));
        d.className = 'fx-dot';
        return d;
      });
      dotWrap.append(...dots);
      nav.append(btn('Previous slide', '‹', () => go(-1)), dotWrap, btn('Next slide', '›', () => go(1)));
      el.after(nav);
      cleanups.push(() => nav.remove());
    }
    update();

    // Optional autoplay — pauses on hover, focus and when off-screen; disabled for reduced motion.
    const every = ctx.time('autoplay', 0);
    if (every > 0 && !ctx.env.reduced) {
      let visible = false;
      let hold = false;
      const id = setInterval(() => visible && !hold && !dragging && document.visibilityState === 'visible' && go(1), every);
      cleanups.push(
        () => clearInterval(id),
        onView(el, (v) => (visible = v)),
        on(el, 'pointerenter', () => (hold = true)),
        on(el, 'pointerleave', () => (hold = false)),
        on(el, 'focusin', () => (hold = true)),
        on(el, 'focusout', () => (hold = false)),
      );
    }

    return () => cleanups.reverse().forEach((f) => f());
  },
};

export const stories: Effect = {
  name: 'stories',
  meta: META.stories,
  mount(el, ctx) {
    const slides = slidesOf(el);
    if (!slides.length) return;
    const loop = ctx.bool('loop', true);
    const manual = ctx.env.reduced;
    const cleanups: (() => void)[] = [];
    cleanups.push(
      setAttrs(el, {
        role: 'region',
        'aria-roledescription': 'stories',
        tabindex: '0',
        'aria-label': el.getAttribute('aria-label') || 'Stories',
      }),
    );

    const bars = document.createElement('div');
    bars.className = 'fx-st-bars';
    bars.setAttribute('data-fx-ui', '');
    bars.setAttribute('aria-hidden', 'true');
    const barEls = slides.map((s) => {
      const b = document.createElement('span');
      b.className = 'fx-st-bar';
      const d = s.getAttribute('data-fx-slide-duration');
      if (d) b.style.setProperty('--_st-dur', /\d$/.test(d) ? d + 'ms' : d);
      b.append(document.createElement('i'));
      return b;
    });
    bars.append(...barEls);
    el.prepend(bars);
    if (manual) setState(el, 'manual');

    let idx = 0;
    const show = (i: number) => {
      idx = i;
      slides.forEach((s, j) => {
        setState(s, 'active', j === i);
        s.setAttribute('aria-hidden', j === i ? 'false' : 'true');
      });
      barEls.forEach((b, j) => {
        b.removeAttribute('data-s');
        // Force a reflow so the active bar's animation restarts.
        if (j === i) void b.offsetWidth;
        if (j < i) b.setAttribute('data-s', 'done');
        else if (j === i) b.setAttribute('data-s', 'active');
      });
      // Videos play only while their slide is showing.
      slides.forEach((s, j) => {
        const v = s instanceof HTMLVideoElement ? s : s.querySelector('video');
        if (!v) return;
        if (j === i) v.play().catch(() => {});
        else v.pause();
      });
    };
    const next = () => (idx < slides.length - 1 ? show(idx + 1) : loop ? show(0) : undefined);
    const prev = () => show(Math.max(0, idx - 1));

    let paused = new Set<string>();
    const setPaused = (reason: string, p: boolean) => {
      p ? paused.add(reason) : paused.delete(reason);
      setState(el, 'paused', paused.size > 0);
    };

    cleanups.push(
      on(bars, 'animationend', (e) => {
        if ((e as AnimationEvent).animationName === 'fx-story' && !manual) next();
      }),
    );

    // Tap left/right, hold to pause, swipe.
    let downX = 0;
    let downT = 0;
    let holdTimer = 0;
    let held = false;
    cleanups.push(
      on(el, 'pointerdown', (e) => {
        downX = e.clientX;
        downT = performance.now();
        held = false;
        holdTimer = window.setTimeout(() => {
          held = true;
          setPaused('hold', true);
        }, 220);
      }),
      on(el, 'pointerup', (e) => {
        clearTimeout(holdTimer);
        if (held) {
          setPaused('hold', false);
          return;
        }
        const dx = e.clientX - downX;
        if (Math.abs(dx) > 40 && performance.now() - downT < 600) return dx < 0 ? next() : prev();
        const r = el.getBoundingClientRect();
        e.clientX - r.left < r.width / 3 ? prev() : next();
      }),
      on(el, 'pointercancel', () => {
        clearTimeout(holdTimer);
        setPaused('hold', false);
      }),
      on(el, 'contextmenu', (e) => held && e.preventDefault()),
      on(el, 'keydown', (e) => {
        if (e.key === 'ArrowRight') next();
        else if (e.key === 'ArrowLeft') prev();
        else if (e.key === ' ') {
          e.preventDefault();
          setPaused('key', !paused.has('key'));
        }
      }),
      onView(el, (v) => setPaused('offscreen', !v)),
      on(document as unknown as HTMLElement, 'visibilitychange', () => setPaused('tab', document.visibilityState !== 'visible')),
    );

    show(0);

    return () => {
      cleanups.reverse().forEach((f) => f());
      clearTimeout(holdTimer);
      bars.remove();
      slides.forEach((s) => {
        setState(s, 'active', false);
        s.removeAttribute('aria-hidden');
      });
      setState(el, 'paused', false);
      setState(el, 'manual', false);
      paused = new Set();
    };
  },
};
