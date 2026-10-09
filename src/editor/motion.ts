/**
 * Motion for builder canvases: blocks that glide into place when the layout changes (FLIP),
 * enter and leave softly, and drag-to-reorder with a lifted, tilting ghost, between lists and
 * from a block palette. Works with any framework: it only needs the DOM elements.
 */

import { EFFECT_NAMES } from '../meta';

const reduced = () =>
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) ||
  (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-fx-reduced'));

/** A damped spring as a CSS linear() easing, with a cubic-bezier fallback for older browsers. */
export function spring(bounce = 0.18, points = 32): string {
  if (typeof CSS === 'undefined' || !CSS.supports?.('animation-timing-function', 'linear(0, 1)')) return 'cubic-bezier(.2, .9, .25, 1.05)';
  const zeta = Math.max(0.05, 1 - bounce); // damping ratio
  const w = 9; // natural frequency over the unit time
  const wd = w * Math.sqrt(Math.max(1e-4, 1 - zeta * zeta));
  const out: string[] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const v = i === points ? 1 : 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
    out.push(v.toFixed(4));
  }
  return `linear(${out.join(', ')})`;
}

let SPRING: string | null = null;
const ease = () => (SPRING ??= spring());

export interface FlipOptions {
  duration?: number;
  easing?: string;
  /** Also animate size changes (fine for boxes, can blur text mid-flight). */
  scale?: boolean;
}

const flying = new WeakMap<Element, Animation>();

/**
 * Records where elements are, runs `mutate` (reorder, insert, remove, change classes…), then
 * animates every element from its old place to its new one. Pass a container to track its children.
 */
export function flip(targets: Element | Iterable<Element>, mutate: () => unknown, opts: FlipOptions = {}): Promise<void> {
  const container = targets instanceof Element ? targets : null;
  const list = () => (container ? Array.from(container.children) : Array.from(targets as Iterable<Element>));
  if (reduced()) {
    const r = mutate();
    return r instanceof Promise ? r.then(() => {}) : Promise.resolve();
  }
  const before = new Map(list().map((e) => [e, e.getBoundingClientRect()]));
  const play = () => {
    const runs: Promise<unknown>[] = [];
    for (const el of new Set([...before.keys(), ...list()])) {
      if (!el.isConnected || !(el instanceof HTMLElement || el instanceof SVGElement)) continue;
      const a = before.get(el);
      if (!a) continue;
      flying.get(el)?.cancel();
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      const sx = opts.scale && b.width ? a.width / b.width : 1;
      const sy = opts.scale && b.height ? a.height / b.height : 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.005 && Math.abs(sy - 1) < 0.005) continue;
      const anim = el.animate(
        [
          { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        { duration: opts.duration ?? 460, easing: opts.easing ?? ease() },
      );
      flying.set(el, anim);
      runs.push(anim.finished.catch(() => {}));
    }
    return Promise.all(runs).then(() => {});
  };
  const r = mutate();
  return r instanceof Promise ? r.then(play) : play();
}

/** Fades and springs a new element in. */
export function enter(el: Element, opts: { duration?: number; from?: 'up' | 'down' | 'scale' } = {}): Promise<void> {
  if (reduced() || !(el instanceof HTMLElement || el instanceof SVGElement)) return Promise.resolve();
  const from = opts.from ?? 'up';
  const start = from === 'scale' ? 'scale(.94)' : `translateY(${from === 'up' ? 16 : -16}px) scale(.98)`;
  return el
    .animate([{ opacity: 0, transform: start }, { opacity: 1, transform: 'none' }], { duration: opts.duration ?? 520, easing: ease() })
    .finished.then(() => {})
    .catch(() => {});
}

/** Shrinks and fades an element out (it stays in the DOM; see `discard`). */
export function leave(el: Element, opts: { duration?: number } = {}): Promise<void> {
  if (reduced() || !(el instanceof HTMLElement || el instanceof SVGElement)) return Promise.resolve();
  return el
    .animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: opts.duration ?? 200, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })
    .finished.then(() => {})
    .catch(() => {});
}

/** Inserts or moves `node` into `parent` (before `before`), and everything around makes room smoothly. */
export function place(node: Element, parent: Element, before: Node | null = null, opts: FlipOptions = {}): Promise<void> {
  const fresh = !node.isConnected;
  const old = node.parentElement;
  const scope = new Set<Element>([...Array.from(parent.children), ...(old && old !== parent ? Array.from(old.children) : [])]);
  const done = flip(scope, () => parent.insertBefore(node, before), opts);
  return fresh ? Promise.all([done, enter(node)]).then(() => {}) : done;
}

/** Animates `node` out, removes it, and lets its neighbours close the gap. */
export async function discard(node: Element, opts: FlipOptions = {}): Promise<void> {
  const parent = node.parentElement;
  await leave(node);
  if (!parent) return node.remove();
  await flip(parent, () => node.remove(), opts);
}

/* ======================================================================
   sortable
   ====================================================================== */

export interface SortEvent {
  item: HTMLElement;
  from: HTMLElement;
  to: HTMLElement;
  oldIndex: number;
  newIndex: number;
  /** True when the item was created from a palette (`clone`). */
  clone: boolean;
}

export interface SortableOptions {
  /** Which children can be dragged. Default: every direct child. */
  items?: string;
  /** Drag only from this part of an item (needed for touch scrolling on long items). */
  handle?: string;
  /** Lists with the same group exchange items. */
  group?: string;
  /** Palette mode: dragging makes a new element with this function instead of moving the item. */
  clone?: (item: HTMLElement) => HTMLElement;
  /** Allow reordering inside this list. Default true (false for palettes). */
  sort?: boolean;
  /** Allow dropping into this list. Default true (false for palettes). */
  accept?: boolean;
  onStart?(e: SortEvent): void;
  onEnd?(e: SortEvent): void;
}

interface Entry {
  el: HTMLElement;
  opts: SortableOptions;
}

const lists = new Map<HTMLElement, Entry>();
let cssDone = false;

export const EDITOR_CSS = `
.fx-sort-ghost{position:fixed!important;margin:0!important;pointer-events:none!important;z-index:2147483000!important;box-sizing:border-box;will-change:transform;transition:none!important;animation:none!important;filter:drop-shadow(0 22px 28px rgb(8 10 30/.32)) drop-shadow(0 2px 6px rgb(8 10 30/.2));}
.fx-sort-origin{opacity:.22!important;filter:saturate(0);}
[data-fx-sort-over]{outline:2px dashed color-mix(in oklab,currentColor 30%,transparent);outline-offset:6px;}
html[data-fx-sorting],html[data-fx-sorting] *{cursor:grabbing!important;-webkit-user-select:none!important;user-select:none!important;}
[data-fx-sortable]>*,[data-fx-sortable] [data-fx-handle]{cursor:grab;}
[data-fx-sortable][data-fx-sort-handle]>*{cursor:auto;}
.fx-sort-live{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
`;

function injectCSS() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'fx-editor-css';
  s.textContent = EDITOR_CSS;
  document.head.append(s);
}

let live: HTMLElement | null = null;
function announce(msg: string) {
  if (!live || !live.isConnected) {
    live = document.createElement('div');
    live.className = 'fx-sort-live';
    live.setAttribute('aria-live', 'assertive');
    document.body.append(live);
  }
  live.textContent = '';
  requestAnimationFrame(() => live && (live.textContent = msg));
}

const itemsOf = (e: Entry, except?: Element | null) =>
  Array.from(e.el.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement && c !== except && !c.classList.contains('fx-sort-ghost') && (!e.opts.items || c.matches(e.opts.items)),
  );

/** Where in `items` a pointer at (x, y) should insert: list, row or grid, decided from the layout. */
export function indexAt(rects: DOMRect[], x: number, y: number): number {
  if (!rects.length) return 0;
  const shareRow = (a: DOMRect, b: DOMRect) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > Math.min(a.height, b.height) * 0.5;
  const rowsShared = rects.some((r, i) => i > 0 && shareRow(r, rects[i - 1]));
  if (!rowsShared) {
    // A vertical list: compare with each item's middle.
    const i = rects.findIndex((r) => y < r.top + r.height / 2);
    return i === -1 ? rects.length : i;
  }
  // Rows (and grids): find the row under the pointer, then the slot within it.
  const rows: number[][] = [];
  rects.forEach((r, i) => {
    const row = rows.find((ix) => shareRow(rects[ix[0]], r));
    if (row) row.push(i);
    else rows.push([i]);
  });
  const row = rows.find((ix) => y < Math.max(...ix.map((i) => rects[i].bottom)));
  if (!row) return rects.length;
  const slot = row.find((i) => x < rects[i].left + rects[i].width / 2);
  return slot === undefined ? row[row.length - 1] + 1 : slot;
}

interface Drag {
  entry: Entry;
  item: HTMLElement;
  origin: HTMLElement | null; // the element that holds the slot in a list
  ghost: HTMLElement;
  from: HTMLElement;
  oldIndex: number;
  clone: boolean;
  over: Entry | null;
  x: number;
  y: number;
  dx: number;
  dy: number;
  tilt: number;
  vx: number;
  lastX: number;
  raf: number;
  w: number;
  h: number;
  offX: number;
  offY: number;
  homeRect: DOMRect;
  home: { parent: HTMLElement; next: Node | null } | null;
}

let drag: Drag | null = null;
const META_NAMES = new Set(EFFECT_NAMES);

function containerAt(x: number, y: number, group: string | undefined, self: Entry): Entry | null {
  for (const el of document.elementsFromPoint(x, y)) {
    for (let n: Element | null = el; n; n = n.parentElement) {
      const e = lists.get(n as HTMLElement);
      if (!e) continue;
      if (e === self && e.opts.sort !== false && !e.opts.clone) return e;
      if (e !== self && e.opts.accept !== false && !e.opts.clone && e.opts.group && e.opts.group === group) return e;
      if (e === self) return null;
    }
  }
  return null;
}

function moveGhost(d: Drag) {
  d.ghost.style.transform = `translate(${d.x - d.dx - d.offX}px, ${d.y - d.dy - d.offY}px) rotate(${d.tilt.toFixed(2)}deg) scale(1.025)`;
}

function startDrag(entry: Entry, item: HTMLElement, x: number, y: number) {
  injectCSS();
  const r = item.getBoundingClientRect();
  const clone = !!entry.opts.clone;
  const ghost = item.cloneNode(true) as HTMLElement;
  // The ghost is a picture of the item: no ids, and no effects (a reveal would hide it).
  for (const n of [ghost, ...Array.from(ghost.querySelectorAll('*'))]) {
    n.removeAttribute('id');
    n.removeAttribute('data-fx');
    for (const c of Array.from(n.classList)) if (c.startsWith('fx-') && META_NAMES.has(c.slice(3))) n.classList.remove(c);
  }
  ghost.classList.remove('fx-sort-origin');
  ghost.classList.add('fx-sort-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', left: '0px', top: '0px', translate: 'none', rotate: 'none', scale: 'none' });
  // Inside its own list so the list's styles still apply to it.
  item.parentElement!.append(ghost);
  // Fixed positioning is relative to a transformed ancestor, if there is one: measure that offset.
  ghost.style.transform = 'none';
  const g = ghost.getBoundingClientRect();
  const d: Drag = {
    entry,
    item,
    origin: clone ? null : item,
    ghost,
    from: entry.el,
    oldIndex: itemsOf(entry).indexOf(item),
    clone,
    over: clone ? null : entry,
    x,
    y,
    dx: x - r.left,
    dy: y - r.top,
    tilt: 0,
    vx: 0,
    lastX: x,
    raf: 0,
    w: r.width,
    h: r.height,
    offX: g.left,
    offY: g.top,
    homeRect: r,
    home: clone ? null : { parent: item.parentElement as HTMLElement, next: item.nextSibling },
  };
  if (!clone) item.classList.add('fx-sort-origin');
  document.documentElement.setAttribute('data-fx-sorting', '');
  if (d.over) d.over.el.setAttribute('data-fx-sort-over', '');
  moveGhost(d);
  // Lift: a quick scale-up from the item's own size.
  ghost.animate([{ scale: '0.975' }, { scale: '1' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
  const loop = () => {
    // Tilt follows horizontal speed and settles back when the pointer rests.
    d.vx = d.vx * 0.7 + (d.x - d.lastX) * 0.3;
    d.lastX = d.x;
    const target = Math.max(-9, Math.min(9, d.vx * 0.9));
    d.tilt += (target - d.tilt) * 0.2;
    moveGhost(d);
    autoScroll(d);
    d.raf = requestAnimationFrame(loop);
  };
  d.raf = requestAnimationFrame(loop);
  drag = d;
  entry.opts.onStart?.(event(d));
}

function event(d: Drag): SortEvent {
  const to = (d.origin?.parentElement as HTMLElement | null) ?? d.from;
  const list = lists.get(to);
  return {
    item: d.origin ?? d.item,
    from: d.from,
    to,
    oldIndex: d.clone ? -1 : d.oldIndex,
    newIndex: d.origin && list ? itemsOf(list).indexOf(d.origin) : -1,
    clone: d.clone,
  };
}

function autoScroll(d: Drag) {
  const edge = 70;
  const h = innerHeight;
  let v = 0;
  if (d.y < edge) v = -((edge - d.y) / edge) * 18;
  else if (d.y > h - edge) v = ((d.y - (h - edge)) / edge) * 18;
  if (v) {
    scrollBy(0, v);
    reposition(d);
  }
}

function reposition(d: Drag) {
  const target = containerAt(d.x, d.y, d.entry.opts.group, d.entry);
  if (target !== d.over) {
    d.over?.el.removeAttribute('data-fx-sort-over');
    target?.el.setAttribute('data-fx-sort-over', '');
    // A palette block leaves every list: its placeholder goes away.
    if (!target && d.clone && d.origin) {
      const o = d.origin;
      d.origin = null;
      if (d.over) flip(d.over.el, () => o.remove());
    }
    d.over = target;
  }
  if (!target) return;
  if (!d.origin) {
    d.origin = d.entry.opts.clone!(d.item);
    d.origin.classList.add('fx-sort-origin');
  }
  const origin = d.origin;
  const items = itemsOf(target, origin);
  const at = indexAt(
    items.map((i) => i.getBoundingClientRect()),
    d.x,
    d.y,
  );
  const ref = items[at] ?? null;
  if (origin.parentElement === target.el && (ref ? origin.nextElementSibling === ref : itemsOf(target).at(-1) === origin)) return;
  const old = origin.parentElement;
  flip(new Set([...Array.from(target.el.children), ...(old && old !== target.el ? Array.from(old.children) : [])].filter((c) => c !== d.ghost)), () => {
    if (ref) target.el.insertBefore(origin, ref);
    else {
      const last = itemsOf(target, origin).at(-1);
      target.el.insertBefore(origin, last ? last.nextSibling : null);
    }
  });
}

function endDrag(cancel = false) {
  const d = drag;
  if (!d) return;
  drag = null;
  cancelAnimationFrame(d.raf);
  document.documentElement.removeAttribute('data-fx-sorting');
  d.over?.el.removeAttribute('data-fx-sort-over');
  if (cancel && d.origin) {
    if (d.clone) {
      const o = d.origin;
      const p = o.parentElement;
      d.origin = null;
      if (p) flip(p, () => o.remove());
    } else if (d.home) {
      const { parent, next } = d.home;
      const o = d.origin;
      flip(new Set([...Array.from(parent.children), ...Array.from(o.parentElement?.children ?? [])].filter((c) => c !== d.ghost)), () =>
        parent.insertBefore(o, next && next.parentElement === parent ? next : null),
      );
    }
  }
  const landing = d.origin;
  // The slot may still be gliding into place: measure where it ends up.
  if (landing) flying.get(landing)?.finish();
  const rect = landing ? landing.getBoundingClientRect() : d.homeRect;
  const ev = event(d);
  const finish = () => {
    d.ghost.remove();
    if (landing) {
      landing.classList.remove('fx-sort-origin');
      if (d.clone) enter(landing, { from: 'scale', duration: 360 });
    }
    if (landing && !cancel && (d.clone || ev.to !== ev.from || ev.newIndex !== ev.oldIndex)) {
      d.entry.opts.onEnd?.(ev);
      const target = lists.get(ev.to);
      if (target && target !== d.entry) target.opts.onEnd?.(ev);
      ev.to.dispatchEvent(new CustomEvent('fx:sort', { detail: ev, bubbles: true }));
      announce(`Moved to position ${ev.newIndex + 1} of ${target ? itemsOf(target).length : ev.newIndex + 1}.`);
    }
  };
  if (reduced()) return finish();
  // The ghost flies into the slot, straightens and takes the slot's size.
  const sx = rect.width / d.w;
  const sy = rect.height / d.h;
  const tx = rect.left - d.offX - (d.w - sx * d.w) / 2;
  const ty = rect.top - d.offY - (d.h - sy * d.h) / 2;
  const a = d.ghost.animate(
    [{ transform: d.ghost.style.transform }, { transform: `translate(${tx}px, ${ty}px) rotate(0deg) scale(${sx}, ${sy})`, opacity: landing ? 1 : 0 }],
    { duration: 380, easing: ease(), fill: 'forwards' },
  );
  a.finished.then(finish, finish);
}

function keyMove(entry: Entry, item: HTMLElement, dir: -1 | 1) {
  const items = itemsOf(entry);
  const i = items.indexOf(item);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return;
  const ref = dir < 0 ? items[j] : items[j].nextSibling;
  place(item, entry.el, ref).then(() => item.focus({ preventScroll: true }));
  item.focus({ preventScroll: true });
  const ev: SortEvent = { item, from: entry.el, to: entry.el, oldIndex: i, newIndex: j, clone: false };
  entry.opts.onEnd?.(ev);
  entry.el.dispatchEvent(new CustomEvent('fx:sort', { detail: ev, bubbles: true }));
  announce(`Moved to position ${j + 1} of ${items.length}.`);
}

/**
 * Drag-to-reorder for a list, a row or a grid. Items lift into a tilting ghost, the others glide
 * out of the way, and the ghost settles into its slot. Alt + arrow keys move a focused item.
 * Returns a function that turns it off.
 */
export function sortable(el: HTMLElement, opts: SortableOptions = {}): () => void {
  injectCSS();
  const palette = !!opts.clone;
  const entry: Entry = { el, opts: { sort: !palette, accept: !palette, ...opts } };
  lists.set(el, entry);
  el.setAttribute('data-fx-sortable', '');
  if (opts.handle) el.setAttribute('data-fx-sort-handle', '');

  let pending: { item: HTMLElement; x: number; y: number; id: number; touch: boolean; timer: number } | null = null;

  const onDown = (e: PointerEvent) => {
    if (drag || e.button !== 0 || !e.isPrimary) return;
    const t = e.target as Element;
    const item = itemsOf(entry).find((i) => i.contains(t));
    if (!item) return;
    if (opts.handle ? !t.closest(opts.handle) : t.closest('input, textarea, select, [contenteditable], [contenteditable] *, button, a[href]')) return;
    const touch = e.pointerType === 'touch';
    pending = { item, x: e.clientX, y: e.clientY, id: e.pointerId, touch, timer: 0 };
    // Touch: hold still briefly to pick up, so normal swipes still scroll the page.
    if (touch) {
      const p = pending;
      p.timer = window.setTimeout(() => {
        if (pending !== p) return;
        pending = null;
        startDrag(entry, p.item, p.x, p.y);
        navigator.vibrate?.(8);
      }, 240);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
  };
  const onMove = (e: PointerEvent) => {
    if (pending && e.pointerId === pending.id) {
      const dist = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
      if (pending.touch) {
        if (dist > 8) cancelPending();
        return;
      }
      if (dist < 5) return;
      const p = pending;
      pending = null;
      startDrag(entry, p.item, p.x, p.y);
    }
    if (!drag || drag.entry !== entry) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    reposition(drag);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (drag && drag.entry === entry) e.preventDefault();
  };
  const cancelPending = () => {
    if (pending) clearTimeout(pending.timer);
    pending = null;
    detach();
  };
  const detach = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('touchmove', onTouchMove);
  };
  const onUp = () => {
    cancelPending();
    if (drag && drag.entry === entry) endDrag();
  };
  const onCancel = () => {
    cancelPending();
    if (drag && drag.entry === entry) endDrag(true);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && drag && drag.entry === entry) {
      e.preventDefault();
      detach();
      endDrag(true);
      return;
    }
    if (!e.altKey || palette || entry.opts.sort === false) return;
    const item = itemsOf(entry).find((i) => i === e.target);
    if (!item) return;
    const back = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    if (!back && !fwd) return;
    e.preventDefault();
    keyMove(entry, item, back ? -1 : 1);
  };
  // Stop the click that follows a drag from selecting or following links.
  const onClick = (e: MouseEvent) => {
    if (document.documentElement.hasAttribute('data-fx-sorting')) e.preventDefault();
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey);
  return () => {
    cancelPending();
    if (drag?.entry === entry) endDrag(true);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey);
    el.removeAttribute('data-fx-sortable');
    el.removeAttribute('data-fx-sort-handle');
    lists.delete(el);
  };
}
