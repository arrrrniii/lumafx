import { describe, it, expect, beforeAll, vi } from 'vitest';
import { start, loading } from '../src/index';
import { fanAt, poses, pageState, pageMatrices, stackMatrices } from '../src/effects/loader3d';
import { tick } from './setup';

beforeAll(() => start());

const html = (s: string) => {
  const wrap = document.createElement('div');
  wrap.innerHTML = s.trim();
  document.body.append(wrap);
  return wrap.firstElementChild as HTMLElement;
};
const state = (el: Element) => el.getAttribute('data-fx-state') || '';

describe('card', () => {
  it('flip wraps the front and back faces, flips on tap and keyboard, and restores', async () => {
    const c = html(`<article data-fx="card" data-fx-style="flip"><img alt=""><div><h3>Front</h3></div><div><p>Back</p><button>Book</button></div></article>`);
    await tick(10);
    const front = c.querySelector('.fx-card-flip > .fx-card-front')!;
    const back = c.querySelector('.fx-card-flip > .fx-card-back')!;
    expect(front.querySelector('img')).not.toBeNull();
    expect(front.querySelector('h3')).not.toBeNull();
    expect(back.querySelector('p')!.textContent).toBe('Back');
    // It has a button, which already takes focus (and flips the card through :focus-within).
    expect(c.hasAttribute('tabindex')).toBe(false);
    c.querySelector('h3')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(c.hasAttribute('data-flipped')).toBe(true);
    // Buttons on the back do their own job instead of flipping the card.
    c.querySelector('button')!.click();
    expect(c.hasAttribute('data-flipped')).toBe(true);
    c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(c.hasAttribute('data-flipped')).toBe(false);
    c.removeAttribute('data-fx');
    await tick();
    expect(c.querySelector('.fx-card-flip')).toBeNull();
    expect(Array.from(c.children).map((e) => e.tagName)).toEqual(['IMG', 'DIV', 'DIV']);
  });

  it('a flip card with nothing focusable inside becomes focusable itself', async () => {
    const c = html(`<article data-fx="card" data-fx-style="flip"><div>Front</div><div>Back</div></article>`);
    await tick(10);
    expect(c.getAttribute('tabindex')).toBe('0');
    c.removeAttribute('data-fx');
    await tick();
    expect(c.hasAttribute('tabindex')).toBe(false);
  });
});

describe('press', () => {
  it('ripples inside a clipped layer and swaps to a done label without changing width', async () => {
    const b = html(`<button data-fx="press" data-fx-done="Added ✓">Add <b>to cart</b></button>`);
    await tick(10);
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 5, clientY: 5 }));
    expect(b.querySelector(':scope > .fx-press-fx > .fx-press-ripple')).not.toBeNull();
    b.click();
    expect(b.textContent).toBe('Added ✓');
    expect(state(b)).toContain('done');
    b.removeAttribute('data-fx');
    await tick();
    expect(b.innerHTML).toBe('Add <b>to cart</b>');
    expect(b.querySelector('.fx-press-fx')).toBeNull();
  });

  it('bursts sparks from the centre on keyboard activation', async () => {
    const b = html(`<button data-fx="press" data-fx-style="burst">Go</button>`);
    await tick(10);
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(document.querySelectorAll('body > .fx-spark').length).toBe(12);
    expect(document.querySelector('body > .fx-spark-ring')).not.toBeNull();
  });
});

describe('drawer', () => {
  it('opens on its side, closes on an outside click, and the page makes room with push', async () => {
    const root = html(`<div data-fx-sheet-root><button data-fx-open="#d1">Edit</button></div>`);
    const dlg = html(`<dialog id="d1" data-fx="drawer" data-fx-side="left" data-fx-style="push"><h2>Edit item</h2></dialog>`) as HTMLDialogElement;
    await tick(10);
    expect(dlg.getAttribute('data-fx-side-active')).toBe('left');
    expect(dlg.getAttribute('data-fx-style-active')).toBe('push');
    const panel = dlg.querySelector(':scope > .fx-md-panel')!;
    expect(panel.querySelector('h2')).not.toBeNull();
    const spy = vi.spyOn(root, 'animate');
    const once = (type: string) => new Promise((r) => dlg.addEventListener(type, r, { once: true }));
    let ev = once('fx:open');
    root.querySelector('button')!.click();
    await ev;
    expect(dlg.open).toBe(true);
    expect(spy).toHaveBeenCalled();
    expect(JSON.stringify(spy.mock.calls[0][0])).toContain('translate');
    // A click on the dialog itself (outside the panel) closes it.
    ev = once('fx:close');
    dlg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await ev;
    expect(dlg.open).toBe(false);
    // Clicks inside the panel do not.
    ev = once('fx:open');
    root.querySelector('button')!.click();
    await ev;
    panel.querySelector('h2')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick(10);
    expect(dlg.open).toBe(true);
  });

  it('dock opens without a modal backdrop and Esc still closes it', async () => {
    const dlg = html(`<dialog id="d2" data-fx="drawer" data-fx-style="dock"><p>Notes</p></dialog>`) as HTMLDialogElement;
    await tick(10);
    const show = vi.spyOn(dlg, 'show');
    const modal = vi.spyOn(dlg, 'showModal');
    const opened = new Promise((r) => dlg.addEventListener('fx:open', r, { once: true }));
    document.querySelector<HTMLElement>('[data-fx-open="#d1"]')!.setAttribute('data-fx-open', '#d2');
    document.querySelector<HTMLElement>('[data-fx-open="#d2"]')!.click();
    await opened;
    expect(show).toHaveBeenCalled();
    expect(modal).not.toHaveBeenCalled();
    const closed = new Promise((r) => dlg.addEventListener('fx:close', r, { once: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await closed;
    expect(dlg.open).toBe(false);
  });
});

describe('loader-3d', () => {
  it('fans open and closes again over one cycle, and tall stacks stay inside the frame', () => {
    expect(fanAt(0)).toBe(0);
    expect(fanAt(0.5)).toBe(1);
    expect(fanAt(0.97)).toBe(0);
    expect(fanAt(1.5)).toBe(1);
    for (const n of [1, 3, 4, 5, 6]) {
      const p = poses(n, 0.5 * 2800, 2800);
      const top = p[(n - 1) * 4];
      expect(top).toBeLessThan(0.72);
      for (let i = 0; i < n; i++) expect(Math.hypot(p[i * 4 + 1], p[i * 4 + 2])).toBeCloseTo(1, 5);
    }
    // At rest the slabs sit on top of each other, not inside each other.
    const rest = poses(4, 0, 2800);
    expect(rest[4] - rest[0]).toBeGreaterThanOrEqual(0.125);
  });

  it('pages go deck → fan → ring → deck, and every panel is placed with a rigid transform', () => {
    const n = 5;
    expect(pageState(n, 0).open).toBe(0);
    expect(pageState(n, 0).angles.every((a) => a === 0)).toBe(true);
    const fan = pageState(n, 0.33).angles;
    expect(fan[1]).toBeGreaterThan(0.3);
    expect(fan[4]).toBeGreaterThan(fan[3]);
    const ring = pageState(n, 0.6).angles;
    for (let i = 1; i < n; i++) expect(ring[i] - ring[i - 1]).toBeCloseTo((Math.PI * 2) / n, 5);
    expect(pageState(n, 0.97).angles.every((a) => Math.abs(a) < 1e-9)).toBe(true);
    for (const m of [pageMatrices(n, 1300, 3600), stackMatrices(4, 1000, 2800)]) {
      for (let i = 0; i < 4; i++) {
        const r = [0, 1, 2].map((k) => [m[i * 12 + k * 4], m[i * 12 + k * 4 + 1], m[i * 12 + k * 4 + 2]]);
        for (const row of r) expect(Math.hypot(...row)).toBeCloseTo(1, 5);
        expect(r[0][0] * r[1][0] + r[0][1] * r[1][1] + r[0][2] * r[1][2]).toBeCloseTo(0, 5);
      }
    }
    // The group stays centred over the plate in every phase: panel centres average to the origin.
    for (const t of [0, 1200, 2200]) {
      const m = pageMatrices(n, t, 3600);
      let x = 0;
      let z = 0;
      for (let i = 0; i < n; i++) {
        // Panel centre in world = Rᵀ(-t): solve from rows (rotation about y only).
        const [a, , c, tx] = [m[i * 12], m[i * 12 + 1], m[i * 12 + 2], m[i * 12 + 3]];
        const [a2, , c2, tz] = [m[i * 12 + 8], m[i * 12 + 9], m[i * 12 + 10], m[i * 12 + 11]];
        x += -(a * tx + a2 * tz);
        z += -(c * tx + c2 * tz);
      }
      expect(Math.abs(x / n)).toBeLessThan(1e-6);
      expect(Math.abs(z / n)).toBeLessThan(1e-6);
    }
  });

  it('falls back to CSS 3D without WebGL, with one slab per colour', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = html(`<div data-fx="loader-3d" data-fx-colors="#ff0000, rgb(0, 0, 255), #0f0"></div>`);
    await tick(10);
    expect(state(el)).toContain('css');
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-label')).toBe('Loading');
    const slabs = el.querySelectorAll('.fx-l3d-css > .fx-l3d-slab');
    expect(slabs.length).toBe(3);
    expect((slabs[1] as HTMLElement).style.getPropertyValue('--c')).toBe('rgb(0 0 255)');
    el.removeAttribute('data-fx');
    await tick();
    expect(el.querySelector('.fx-l3d-css')).toBeNull();
    expect(el.hasAttribute('role')).toBe(false);
    warn.mockRestore();
  });

  it('hides itself from screen readers inside a preloader, which already reports progress', async () => {
    const pre = html(`<div data-fx-done data-fx="preloader"><div data-fx="loader-3d" data-fx-count="5"></div></div>`);
    await tick(10);
    const l = pre.querySelector<HTMLElement>('[data-fx~=loader-3d]')!;
    expect(l.getAttribute('aria-hidden')).toBe('true');
    expect(l.hasAttribute('role')).toBe(false);
    expect(l.querySelectorAll('.fx-l3d-slab').length).toBe(5);
  });

  it('loading() shows a loader while work runs and hands back the result', async () => {
    const list = html(`<div id="posts"><article>One</article></div>`);
    let resolve!: (v: string[]) => void;
    const work = new Promise<string[]>((r) => (resolve = r));
    const p = loading('#posts', work, { min: 0, size: '120px' });
    expect(list.getAttribute('aria-busy')).toBe('true');
    const box = list.querySelector<HTMLElement>(':scope > .fx-loading-box')!;
    expect(box.querySelector<HTMLElement>('[data-fx~=loader-3d]')!.style.getPropertyValue('--fx-size')).toBe('120px');
    resolve(['Two', 'Three']);
    expect(await p).toEqual(['Two', 'Three']);
    expect(list.hasAttribute('aria-busy')).toBe(false);
    expect(list.querySelector('.fx-loading-box')).toBeNull();
    // Errors still clean up and reach the caller.
    await expect(loading(list, () => Promise.reject(new Error('offline')), { min: 0 })).rejects.toThrow('offline');
    expect(list.querySelector('.fx-loading-box')).toBeNull();
  });
});
