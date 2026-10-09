import { META } from '../meta';
import type { Effect } from '../core/types';
import { onView } from '../core/view';
import { tick, sleeper } from '../core/ticker';
import { pointer, onPointer } from '../core/pointer';
import { clamp, damp, on, setState, isInteractive } from '../core/util';
import { whenLoaded } from '../core/gate';

const SVGNS = 'http://www.w3.org/2000/svg';
let uid = 0;

/* ---------------- svg-draw (+ flowing pulses) ---------------- */

type Drawable = SVGGeometryElement;

export const svgDraw: Effect = {
  name: 'svg-draw',
  meta: META['svg-draw'],
  mount(el, ctx) {
    const shapes = Array.from(el.querySelectorAll<Drawable>('path, line, polyline, polygon, circle, ellipse, rect')).filter((s) => {
      if (!(s instanceof SVGGeometryElement) || s.closest('defs, clipPath, mask') || s.classList.contains('fx-pulse')) return false;
      const stroke = getComputedStyle(s).stroke;
      return stroke && stroke !== 'none';
    });
    if (!shapes.length) return;
    const mode = ctx.str('mode', 'view') || 'view';
    const dur = ctx.time('duration', 1800);
    const stagger = ctx.time('stagger', 140);
    const pulses = Math.max(0, Math.round(ctx.num('pulse', 0)));
    const color = getComputedStyle(el).getPropertyValue('--fx-color').trim() || '#ffb547';
    const lens = shapes.map((s) => {
      try {
        return s.getTotalLength() || 0;
      } catch {
        return 0;
      }
    });
    const saved = shapes.map((s) => [s.style.strokeDasharray, s.style.strokeDashoffset, s.style.transition]);
    const reduced = ctx.env.reduced;
    if (!reduced) {
      shapes.forEach((s, i) => {
        s.style.strokeDasharray = `${lens[i]} ${lens[i]}`;
        s.style.strokeDashoffset = String(lens[i]);
      });
    }

    const added: Element[] = [];
    const addedIds: Element[] = [];
    const startPulses = () => {
      if (!pulses || reduced) return;
      shapes.forEach((s, i) => {
        if (!(s instanceof SVGPathElement) && !(s instanceof SVGPolylineElement) && !(s instanceof SVGLineElement)) return;
        if (!s.id) {
          s.id = `fx-path-${++uid}`;
          addedIds.push(s);
        }
        const seconds = Math.max(1.6, lens[i] / 140);
        for (let k = 0; k < pulses; k++) {
          const c = document.createElementNS(SVGNS, 'circle');
          c.setAttribute('class', 'fx-pulse');
          c.setAttribute('r', String(Math.max(2.2, (parseFloat(getComputedStyle(s).strokeWidth) || 1.5) * 1.6)));
          c.setAttribute('fill', color);
          const m = document.createElementNS(SVGNS, 'animateMotion');
          m.setAttribute('dur', seconds + 's');
          m.setAttribute('repeatCount', 'indefinite');
          m.setAttribute('begin', `${-(seconds / pulses) * k}s`);
          m.setAttribute('rotate', 'auto');
          const mp = document.createElementNS(SVGNS, 'mpath');
          mp.setAttribute('href', '#' + s.id);
          m.append(mp);
          c.append(m);
          s.parentNode!.insertBefore(c, s.nextSibling);
          added.push(c);
        }
      });
    };

    let stop: (() => void) | null = null;
    if (reduced) {
      startPulses();
    } else if (mode === 'scroll') {
      stop = (() => {
        let off: (() => void) | null = null;
        const v = onView(el, (vis) => {
          if (vis && !off)
            off = tick(() => {
              const r = el.getBoundingClientRect();
              const vh = window.innerHeight;
              const p = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.4), 0, 1);
              shapes.forEach((s, i) => (s.style.strokeDashoffset = String(lens[i] * (1 - p))));
            });
          else if (!vis && off) {
            off();
            off = null;
          }
        }, { margin: '100px' });
        startPulses();
        return () => (v(), off?.());
      })();
    } else {
      let off: (() => void) | null = onView(
        el,
        (vis) => {
          if (!vis) return;
          off?.();
          off = null;
          whenLoaded(() => {
            shapes.forEach((s, i) => {
              s.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.65,0,.35,1) ${i * stagger}ms`;
              s.style.strokeDashoffset = '0';
            });
            setState(el, 'in');
            window.setTimeout(startPulses, dur * 0.6 + shapes.length * stagger);
          });
        },
        { margin: '0px 0px -10% 0px' },
      );
      stop = () => off?.();
    }

    return () => {
      stop?.();
      added.forEach((a) => a.remove());
      addedIds.forEach((s) => s.removeAttribute('id'));
      shapes.forEach((s, i) => {
        [s.style.strokeDasharray, s.style.strokeDashoffset, s.style.transition] = saved[i];
      });
      setState(el, 'in', false);
    };
  },
};

/* ---------------- dot-field ---------------- */

export const dotField: Effect = {
  name: 'dot-field',
  meta: META['dot-field'],
  mount(el, ctx) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-dotfield';
    canvas.setAttribute('aria-hidden', 'true');
    el.prepend(canvas);
    const g = canvas.getContext('2d');
    if (!g) return () => canvas.remove();
    const gap = Math.max(8, ctx.px('gap', 22));
    const force = ctx.num('force', 1);
    const color = getComputedStyle(el).getPropertyValue('--fx-color').trim() || '#ffb547';
    const still = ctx.env.reduced;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let pts: Float32Array = new Float32Array(0); // x, y, dx, dy per dot
    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = el.clientWidth;
      H = el.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const cols = Math.ceil(W / gap) + 1;
      const rows = Math.ceil(H / gap) + 1;
      pts = new Float32Array(cols * rows * 4);
      let k = 0;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          pts[k++] = x * gap + (W - (cols - 1) * gap) / 2;
          pts[k++] = y * gap + (H - (rows - 1) * gap) / 2;
          pts[k++] = 0;
          pts[k++] = 0;
        }
    };
    let time = 0;
    const R = 130;
    const frame = (dt: number) => {
      time += dt / 1000;
      const r = canvas.getBoundingClientRect();
      const mx = pointer.x - r.left;
      const my = pointer.y - r.top;
      const near = mx > -R && my > -R && mx < W + R && my < H + R && performance.now() - pointer.t < 4000;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.fillStyle = color;
      for (let k = 0; k < pts.length; k += 4) {
        const x = pts[k];
        const y = pts[k + 1];
        let tx = 0;
        let ty = 0;
        if (near && !still) {
          const ddx = x - mx;
          const ddy = y - my;
          const d = Math.hypot(ddx, ddy);
          if (d < R && d > 0.01) {
            const f = Math.pow(1 - d / R, 2) * 22 * force;
            tx = (ddx / d) * f;
            ty = (ddy / d) * f;
          }
        }
        pts[k + 2] = damp(pts[k + 2], tx, 9, dt);
        pts[k + 3] = damp(pts[k + 3], ty, 9, dt);
        const push = Math.hypot(pts[k + 2], pts[k + 3]);
        const wave = still ? 0.5 : 0.5 + 0.5 * Math.sin(time * 1.4 - (x + y) * 0.012);
        g.globalAlpha = Math.min(1, 0.18 + wave * 0.32 + push / 26);
        const size = 1.1 + push / 14;
        g.beginPath();
        g.arc(x + pts[k + 2], y + pts[k + 3], size, 0, Math.PI * 2);
        g.fill();
      }
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    let off: (() => void) | null = null;
    const offPointer = onPointer(() => {});
    const offView = onView(el, (v) => {
      if (v && !off) off = tick((_n, dt) => frame(dt));
      else if (!v && off) {
        off();
        off = null;
      }
    });
    if (still) frame(16);
    return () => {
      offView();
      off?.();
      offPointer();
      ro.disconnect();
      canvas.remove();
    };
  },
};

/* ---------------- typewriter ---------------- */

export const typewriter: Effect = {
  name: 'typewriter',
  meta: META.typewriter,
  mount(el, ctx) {
    if (ctx.env.reduced) return;
    const lines = el.children.length && !isInteractive(el) ? (Array.from(el.children) as HTMLElement[]) : [el];
    const texts = lines.map((l) => l.textContent || '');
    const speed = ctx.time('speed', 34);
    const delay = ctx.time('delay', 0);
    const loop = ctx.bool('loop', false);
    // Each line keeps an invisible full-length copy underneath, so the layout never jumps while typing.
    // Screen readers get the full text once, from .fx-sr.
    const parts = lines.map((l, i) => {
      const box = document.createElement('span');
      box.className = 'fx-tw-box';
      box.setAttribute('aria-hidden', 'true');
      const ghost = document.createElement('span');
      ghost.className = 'fx-tw-ghost';
      ghost.textContent = texts[i];
      const typed = document.createElement('span');
      typed.className = 'fx-tw';
      const text = document.createTextNode('');
      typed.append(text);
      box.append(ghost, typed);
      const sr = document.createElement('span');
      sr.className = 'fx-sr';
      sr.textContent = texts[i];
      l.textContent = '';
      l.append(box, sr);
      return { typed, text };
    });
    const caret = document.createElement('span');
    caret.className = 'fx-caret';
    let timer = 0;
    let stopped = false;
    const wait = (ms: number) => new Promise<void>((r) => (timer = window.setTimeout(r, ms)));
    const run = async () => {
      do {
        for (let i = 0; i < parts.length && !stopped; i++) {
          parts[i].typed.append(caret);
          for (let c = 1; c <= texts[i].length && !stopped; c++) {
            parts[i].text.data = texts[i].slice(0, c);
            const ch = texts[i][c - 1];
            await wait(speed * (/[.,!?:;]/.test(ch) ? 6 : 0.6 + Math.random() * 0.8));
          }
          await wait(speed * 8);
        }
        if (!loop || stopped) break;
        await wait(1800);
        for (let i = parts.length - 1; i >= 0 && !stopped; i--) {
          parts[i].typed.append(caret);
          while (parts[i].text.data && !stopped) {
            parts[i].text.data = parts[i].text.data.slice(0, -1);
            await wait(speed * 0.4);
          }
        }
        await wait(500);
      } while (!stopped);
      setState(el, 'typed');
    };
    let off: (() => void) | null = onView(el, (v) => {
      if (!v) return;
      off?.();
      off = null;
      whenLoaded(() => {
        setState(el, 'typing');
        wait(delay).then(run);
      });
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      off?.();
      lines.forEach((l, i) => (l.textContent = texts[i]));
      ['typing', 'typed'].forEach((s) => setState(el, s, false));
    };
  },
};

/* ---------------- rotate-words ---------------- */

export const rotateWords: Effect = {
  name: 'rotate-words',
  meta: META['rotate-words'],
  mount(el, ctx) {
    const original = el.textContent || '';
    const words = [original.trim(), ...(ctx.str('words') || '').split(',').map((s) => s.trim())].filter(Boolean);
    if (words.length < 2 || ctx.env.reduced) return;
    const interval = ctx.time('interval', 2200);
    const style = ctx.str('style', 'flip') || 'flip';
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'fx-sr';
    sr.textContent = words.join(', ');
    const box = document.createElement('span');
    box.className = 'fx-rw';
    box.setAttribute('aria-hidden', 'true');
    const cur = document.createElement('span');
    cur.className = 'fx-rw-word';
    cur.textContent = words[0];
    box.append(cur);
    el.append(box, sr);
    let i = 0;
    let visible = true;
    const frames: Record<string, [Keyframe[], Keyframe[]]> = {
      flip: [
        [{ transform: 'perspective(400px) rotateX(0)', opacity: 1 }, { transform: 'perspective(400px) rotateX(90deg)', opacity: 0 }],
        [{ transform: 'perspective(400px) rotateX(-90deg)', opacity: 0 }, { transform: 'perspective(400px) rotateX(0)', opacity: 1 }],
      ],
      slide: [
        [{ translate: '0 0', opacity: 1 }, { translate: '0 -70%', opacity: 0 }],
        [{ translate: '0 70%', opacity: 0 }, { translate: '0 0', opacity: 1 }],
      ],
      blur: [
        [{ filter: 'blur(0)', opacity: 1 }, { filter: 'blur(8px)', opacity: 0 }],
        [{ filter: 'blur(8px)', opacity: 0 }, { filter: 'blur(0)', opacity: 1 }],
      ],
    };
    const [outF, inF] = frames[style] || frames.flip;
    const step = () => {
      if (!visible || document.hidden) return;
      i = (i + 1) % words.length;
      const old = box.querySelector<HTMLElement>('.fx-rw-word:last-child')!;
      const next = document.createElement('span');
      next.className = 'fx-rw-word';
      next.textContent = words[i];
      const from = box.offsetWidth;
      box.append(next);
      old.classList.add('fx-rw-out');
      const to = next.offsetWidth;
      box.animate([{ width: from + 'px' }, { width: to + 'px' }], { duration: 520, easing: 'cubic-bezier(.65,0,.35,1)' });
      old.animate(outF, { duration: 420, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished.then(() => old.remove());
      next.animate(inF, { duration: 520, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    };
    const id = window.setInterval(step, interval);
    const offView = onView(el, (v) => (visible = v));
    return () => {
      clearInterval(id);
      offView();
      el.textContent = original;
    };
  },
};

/* ---------------- clock ---------------- */

export function makeClockFormatter(tz?: string, seconds = true, hour12 = false) {
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12 };
  if (seconds) opts.second = '2-digit';
  try {
    return new Intl.DateTimeFormat(undefined, tz ? { ...opts, timeZone: tz } : opts);
  } catch {
    console.warn(`[lumafx] clock: unknown time zone "${tz}", using local time`);
    return new Intl.DateTimeFormat(undefined, opts);
  }
}

export const clock: Effect = {
  name: 'clock',
  meta: META.clock,
  mount(el, ctx) {
    const original = el.textContent || '';
    const seconds = ctx.bool('seconds', true);
    const fmt = makeClockFormatter(ctx.str('tz'), seconds, ctx.bool('hour12', false));
    let timer = 0;
    const render = () => {
      const now = new Date();
      el.textContent = fmt.format(now);
      if (el instanceof HTMLTimeElement) el.dateTime = now.toISOString();
      timer = window.setTimeout(render, (seconds ? 1000 : 60000) - (now.getTime() % (seconds ? 1000 : 60000)) + 5);
    };
    render();
    return () => {
      clearTimeout(timer);
      el.textContent = original;
    };
  },
};

/* ---------------- ring (3D carousel) ---------------- */

export const ring: Effect = {
  name: 'ring',
  meta: META.ring,
  mount(el, ctx) {
    let track = el.querySelector<HTMLElement>(':scope > .fx-ring-track');
    const created = !track;
    if (!track) {
      track = document.createElement('div');
      track.className = 'fx-ring-track';
      track.append(...Array.from(el.childNodes));
      el.append(track);
    }
    const t = track;
    const items = () => Array.from(t.children) as HTMLElement[];
    const n = items().length;
    if (n < 3) return () => created && restore();
    const step = 360 / n;
    const tilt = ctx.num('tilt', 8);
    const idle = ctx.env.reduced ? 0 : ctx.num('speed', 6);
    let angle = 0;
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let lastT = 0;
    let hover = false;
    let radius = 300;
    el.setAttribute('role', el.getAttribute('role') || 'region');
    el.setAttribute('aria-roledescription', 'carousel');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');

    const layout = () => {
      const w = items()[0]?.offsetWidth || 200;
      radius = Math.round((w / 2 / Math.tan(Math.PI / n)) * 1.12);
      el.style.setProperty('--fx-ring-r', radius + 'px');
      items().forEach((it, i) => it.style.setProperty('--fx-ring-a', i * step + 'deg'));
    };
    const apply = () => {
      t.style.transform = `translateZ(${-radius}px) rotateX(${-tilt}deg) rotateY(${angle.toFixed(3)}deg)`;
      items().forEach((it, i) => {
        const a = ((i * step + angle) % 360) * (Math.PI / 180);
        const facing = Math.cos(a);
        it.style.opacity = (0.28 + 0.72 * Math.max(0, facing)).toFixed(3);
        it.style.zIndex = String(Math.round(facing * 100) + 100);
        it.toggleAttribute('inert', facing < 0.2);
      });
    };
    let visible = false;
    const loop = sleeper((_now, dt) => {
      if (!dragging) {
        if (Math.abs(vel) > 0.002) {
          angle += vel * dt;
          vel *= Math.pow(0.95, dt / 16.7);
        } else if (idle && !hover) angle += (idle * dt) / 1000;
      }
      apply();
      return visible && (dragging || Math.abs(vel) > 0.002 || (!!idle && !hover));
    });
    const offs = [
      on(el, 'pointerdown', (e) => {
        dragging = true;
        lastX = e.clientX;
        lastT = performance.now();
        vel = 0;
        el.setPointerCapture(e.pointerId);
        setState(el, 'dragging');
        loop.wake();
      }),
      on(el, 'pointermove', (e) => {
        if (!dragging) return;
        const now = performance.now();
        const d = (e.clientX - lastX) * 0.28;
        angle += d;
        vel = d / Math.max(1, now - lastT);
        lastX = e.clientX;
        lastT = now;
      }),
      on(el, 'pointerup', () => {
        dragging = false;
        setState(el, 'dragging', false);
        loop.wake();
      }),
      on(el, 'pointerenter', () => (hover = true)),
      on(el, 'pointerleave', () => {
        hover = false;
        loop.wake();
      }),
      on(el, 'keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const target = Math.round(angle / step) * step + (e.key === 'ArrowLeft' ? step : -step);
        const from = angle;
        const start = performance.now();
        const anim = (now: number) => {
          const p = Math.min(1, (now - start) / 450);
          angle = from + (target - from) * (1 - Math.pow(1 - p, 3));
          apply();
          if (p < 1) requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
      }),
    ];
    const offView = onView(el, (v) => {
      visible = v;
      if (v) loop.wake();
    });
    const ro = new ResizeObserver(() => (layout(), apply()));
    ro.observe(el);
    layout();
    apply();
    setState(el, 'on');

    function restore() {
      while (t.firstChild) el.insertBefore(t.firstChild, t);
      t.remove();
    }
    return () => {
      offs.forEach((f) => f());
      offView();
      ro.disconnect();
      loop.stop();
      items().forEach((it) => {
        it.style.removeProperty('--fx-ring-a');
        it.style.opacity = '';
        it.style.zIndex = '';
        it.removeAttribute('inert');
      });
      t.style.transform = '';
      el.removeAttribute('aria-roledescription');
      setState(el, 'on', false);
      setState(el, 'dragging', false);
      if (created) restore();
    };
  },
};
