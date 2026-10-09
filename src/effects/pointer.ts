import { META } from '../meta';
import type { Effect } from '../core/types';
import { pointer, onPointer } from '../core/pointer';
import { sleeper } from '../core/ticker';
import { onView } from '../core/view';
import { clamp, damp, on, rafThrottle, setState } from '../core/util';

const NO_CHILDREN = new Set(['IMG', 'INPUT', 'TEXTAREA', 'SELECT', 'VIDEO', 'CANVAS', 'IFRAME', 'svg']);

/** Adds an absolutely positioned overlay child (used instead of ::before/::after so effects can be combined). */
function overlay(el: HTMLElement, cls: string) {
  if (NO_CHILDREN.has(el.tagName)) return null;
  const o = document.createElement('span');
  o.className = cls;
  o.setAttribute('aria-hidden', 'true');
  el.append(o);
  return o;
}

export const spotlight: Effect = {
  name: 'spotlight',
  meta: META.spotlight,
  mount(el, ctx) {
    if (!ctx.env.finePointer) return;
    const layer = overlay(el, 'fx-spot');
    if (!layer) return;
    let x = 0;
    let y = 0;
    const apply = rafThrottle(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--fx-mx', (x - r.left).toFixed(1) + 'px');
      el.style.setProperty('--fx-my', (y - r.top).toFixed(1) + 'px');
    });
    const offMove = on(el, 'pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      x = e.clientX;
      y = e.clientY;
      apply();
    });
    return () => {
      offMove();
      apply.cancel();
      layer.remove();
      el.style.removeProperty('--fx-mx');
      el.style.removeProperty('--fx-my');
    };
  },
};

export const magnetic: Effect = {
  name: 'magnetic',
  meta: META.magnetic,
  mount(el, ctx) {
    if (!ctx.env.finePointer || ctx.env.reduced) return;
    const strength = clamp(ctx.num('strength', 0.35), 0, 1.5);
    const area = ctx.px('area', 40);
    const inner = el.querySelector<HTMLElement>('[data-fx-inner]');
    let x = 0;
    let y = 0;
    const loop = sleeper((_now, dt) => {
      const r = el.getBoundingClientRect();
      // The rect includes our own translate, so subtract it to get the resting position.
      const cx = r.left - x + r.width / 2;
      const cy = r.top - y + r.height / 2;
      const dx = pointer.x - cx;
      const dy = pointer.y - cy;
      const inside = Math.abs(dx) < r.width / 2 + area && Math.abs(dy) < r.height / 2 + area;
      const tx = inside ? dx * strength : 0;
      const ty = inside ? dy * strength : 0;
      x = damp(x, tx, 10, dt);
      y = damp(y, ty, 10, dt);
      const settled = Math.abs(x - tx) < 0.05 && Math.abs(y - ty) < 0.05;
      if (settled && !inside) {
        x = 0;
        y = 0;
      }
      el.style.translate = x || y ? `${x.toFixed(2)}px ${y.toFixed(2)}px` : '';
      if (inner) inner.style.translate = x || y ? `${(x * 0.45).toFixed(2)}px ${(y * 0.45).toFixed(2)}px` : '';
      setState(el, 'pulled', inside);
      return !settled || performance.now() - pointer.t < 120;
    });
    let offPointer: (() => void) | null = null;
    const offView = onView(
      el,
      (visible) => {
        if (visible && !offPointer) offPointer = onPointer(loop.wake);
        else if (!visible && offPointer) {
          offPointer();
          offPointer = null;
        }
      },
      { margin: '100px' },
    );
    return () => {
      offView();
      offPointer?.();
      loop.stop();
      el.style.translate = '';
      if (inner) inner.style.translate = '';
      setState(el, 'pulled', false);
    };
  },
};

export const tilt: Effect = {
  name: 'tilt',
  meta: META.tilt,
  mount(el, ctx) {
    if (!ctx.env.finePointer || ctx.env.reduced) return;
    const max = ctx.num('max', 10);
    const scaleTo = ctx.num('scale', 1.03);
    const persp = ctx.px('perspective', 900);
    const glare = ctx.bool('glare', true) ? overlay(el, 'fx-glare') : null;

    const depth = Array.from(el.querySelectorAll<HTMLElement>('[data-fx-depth]'));
    depth.forEach((d) => (d.style.transform = `translateZ(${parseFloat(d.getAttribute('data-fx-depth') || '30') || 30}px)`));

    const cur = { rx: 0, ry: 0, s: 1, gx: 50, gy: 50, go: 0 };
    const tgt = { ...cur };
    let rect = el.getBoundingClientRect();
    let hover = false;

    const loop = sleeper((_now, dt) => {
      let moving = false;
      for (const k of Object.keys(cur) as (keyof typeof cur)[]) {
        cur[k] = damp(cur[k], tgt[k], 9, dt);
        if (Math.abs(cur[k] - tgt[k]) > 0.01) moving = true;
      }
      if (!moving && !hover) {
        el.style.transform = '';
        el.style.removeProperty('--fx-go');
        return false;
      }
      el.style.transform = `perspective(${persp}px) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg) scale(${cur.s.toFixed(4)})`;
      el.style.setProperty('--fx-gx', cur.gx.toFixed(1) + '%');
      el.style.setProperty('--fx-gy', cur.gy.toFixed(1) + '%');
      el.style.setProperty('--fx-go', cur.go.toFixed(3));
      return true;
    });

    const offs = [
      on(el, 'pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        hover = true;
        el.style.transform = '';
        rect = el.getBoundingClientRect();
        tgt.s = scaleTo;
        tgt.go = 1;
        setState(el, 'tilting');
        loop.wake();
      }),
      on(el, 'pointermove', (e) => {
        if (!hover) return;
        const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const ny = clamp((e.clientY - rect.top) / rect.height, 0, 1);
        tgt.ry = (nx - 0.5) * 2 * max;
        tgt.rx = -(ny - 0.5) * 2 * max;
        tgt.gx = nx * 100;
        tgt.gy = ny * 100;
        loop.wake();
      }),
      on(el, 'pointerleave', () => {
        hover = false;
        Object.assign(tgt, { rx: 0, ry: 0, s: 1, go: 0 });
        setState(el, 'tilting', false);
        loop.wake();
      }),
    ];

    return () => {
      offs.forEach((f) => f());
      loop.stop();
      glare?.remove();
      depth.forEach((d) => (d.style.transform = ''));
      el.style.transform = '';
      ['--fx-gx', '--fx-gy', '--fx-go'].forEach((p) => el.style.removeProperty(p));
      setState(el, 'tilting', false);
    };
  },
};

export const shadow: Effect = {
  name: 'shadow',
  meta: META.shadow,
  mount(el, ctx) {
    if (ctx.str('light', 'top') !== 'cursor' || !ctx.env.finePointer || ctx.env.reduced) return;
    let lx = 0;
    let ly = 1;
    const loop = sleeper((_now, dt) => {
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - pointer.x;
      const dy = r.top + r.height / 2 - pointer.y;
      // Shadow falls away from the light; normalised by the viewport so it stays subtle.
      const tx = clamp((dx / window.innerWidth) * 4, -1.6, 1.6);
      const ty = clamp((dy / window.innerHeight) * 4, -1.6, 1.6);
      lx = damp(lx, tx, 6, dt);
      ly = damp(ly, ty, 6, dt);
      el.style.setProperty('--fx-shx', lx.toFixed(3));
      el.style.setProperty('--fx-shy', ly.toFixed(3));
      return Math.abs(lx - tx) > 0.002 || Math.abs(ly - ty) > 0.002;
    });
    let offPointer: (() => void) | null = null;
    const offView = onView(el, (v) => {
      if (v && !offPointer) offPointer = onPointer(loop.wake);
      else if (!v && offPointer) {
        offPointer();
        offPointer = null;
      }
    });
    return () => {
      offView();
      offPointer?.();
      loop.stop();
      el.style.removeProperty('--fx-shx');
      el.style.removeProperty('--fx-shy');
    };
  },
};

/* ---------- cursor-image: one shared floating element for the whole page ---------- */

let float: HTMLElement | null = null;
let floatImg: HTMLImageElement;
let floatLabel: HTMLElement;
let users = 0;
let active: HTMLElement | null = null;
const fpos = { x: -1e4, y: -1e4, r: 0 };
let floatLoop: ReturnType<typeof sleeper> | null = null;
let offFloatPointer: (() => void) | null = null;

function ensureFloat() {
  if (float) return;
  float = document.createElement('div');
  float.className = 'fx-float';
  float.setAttribute('aria-hidden', 'true');
  const inner = document.createElement('div');
  inner.className = 'fx-float-inner';
  floatImg = document.createElement('img');
  floatImg.alt = '';
  floatImg.decoding = 'async';
  floatLabel = document.createElement('span');
  floatLabel.className = 'fx-float-label';
  inner.append(floatImg, floatLabel);
  float.append(inner);
  document.body.append(float);
  floatLoop = sleeper((_now, dt) => {
    const f = float!;
    const tx = pointer.x;
    const ty = pointer.y;
    if (fpos.x < -9e3) {
      fpos.x = tx;
      fpos.y = ty;
    }
    const px = fpos.x;
    fpos.x = damp(fpos.x, tx, 11, dt);
    fpos.y = damp(fpos.y, ty, 11, dt);
    // Lean into the direction of travel.
    const vx = (fpos.x - px) / Math.max(dt, 1);
    fpos.r = damp(fpos.r, clamp(vx * 6, -12, 12), 8, dt);
    f.style.translate = `${fpos.x.toFixed(1)}px ${fpos.y.toFixed(1)}px`;
    f.style.rotate = fpos.r.toFixed(2) + 'deg';
    const settled = Math.abs(fpos.x - tx) < 0.2 && Math.abs(fpos.y - ty) < 0.2 && Math.abs(fpos.r) < 0.05;
    return !settled || !!active;
  });
  offFloatPointer = onPointer(() => active && floatLoop!.wake());
}

function releaseFloat() {
  if (--users > 0 || !float) return;
  offFloatPointer?.();
  floatLoop?.stop();
  float.remove();
  float = null;
  active = null;
}

export const cursorImage: Effect = {
  name: 'cursor-image',
  meta: META['cursor-image'],
  mount(el, ctx) {
    if (!ctx.env.finePointer) return;
    const src = ctx.str('src');
    const label = ctx.str('label');
    if (!src && !label) return;
    users++;
    ensureFloat();
    const size = ctx.px('size', 280);
    const hideCursor = ctx.str('cursor', 'auto') === 'none';

    // Preload when the trigger comes near the viewport so the first hover is instant.
    let offPre: (() => void) | null = src
      ? onView(
          el,
          (v) => {
            if (!v) return;
            new Image().src = src;
            offPre?.();
            offPre = null;
          },
          { margin: '300px' },
        )
      : null;

    const enter = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !float) return;
      active = el;
      if (src) {
        floatImg.src = src;
        floatImg.style.display = '';
        floatLabel.style.display = 'none';
      } else {
        floatLabel.textContent = label || '';
        floatLabel.style.display = '';
        floatImg.style.display = 'none';
      }
      float.style.setProperty('--fx-float-size', size + 'px');
      if (fpos.x < -9e3) {
        fpos.x = e.clientX;
        fpos.y = e.clientY;
      }
      float.setAttribute('data-state', 'in');
      if (hideCursor) el.style.cursor = 'none';
      floatLoop!.wake();
    };
    const leave = () => {
      if (active !== el || !float) return;
      active = null;
      float.removeAttribute('data-state');
      floatLoop!.wake();
    };
    const offs = [on(el, 'pointerenter', enter), on(el, 'pointerleave', leave)];
    return () => {
      offs.forEach((f) => f());
      offPre?.();
      leave();
      if (hideCursor) el.style.cursor = '';
      releaseFloat();
    };
  },
};
