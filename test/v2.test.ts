import { describe, it, expect, beforeAll } from 'vitest';
import { start, modals, page } from '../src/index';
import { placeCard } from '../src/effects/components';
import { pinnedProgress, framePath } from '../src/effects/media';
import { makeClockFormatter } from '../src/effects/live';
import type { ChatApi } from '../src/effects/chat';
import { tick } from './setup';

const html = (s: string) => {
  const wrap = document.createElement('div');
  wrap.innerHTML = s.trim();
  document.body.append(wrap);
  return wrap.firstElementChild as HTMLElement;
};
const state = (el: Element) => el.getAttribute('data-fx-state') || '';

describe('pure helpers', () => {
  const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
  it('places the hover card on a side with room and inside the viewport', () => {
    const card = { width: 200, height: 120 };
    expect(placeCard(rect(100, 40, 80, 20), card, 1000, 800).side).toBe('bottom');
    expect(placeCard(rect(100, 740, 80, 20), card, 1000, 800).side).toBe('top');
    expect(placeCard(rect(300, 300, 80, 20), card, 1000, 800, 'right').side).toBe('right');
    // Too little room on the right: falls back.
    expect(placeCard(rect(900, 300, 80, 20), card, 1000, 800, 'right').side).not.toBe('right');
    const edge = placeCard(rect(2, 40, 20, 20), card, 1000, 800);
    expect(edge.x).toBeGreaterThanOrEqual(8);
    const right = placeCard(rect(985, 40, 10, 20), card, 1000, 800);
    expect(right.x + card.width).toBeLessThanOrEqual(992);
  });
  it('maps a pinned section to 0–1 scroll progress', () => {
    expect(pinnedProgress(0, 3000, 1000)).toBe(0);
    expect(pinnedProgress(200, 3000, 1000)).toBe(0);
    expect(pinnedProgress(-1000, 3000, 1000)).toBe(0.5);
    expect(pinnedProgress(-9000, 3000, 1000)).toBe(1);
    expect(pinnedProgress(-50, 900, 1000)).toBe(0);
  });
  it('builds frame URLs from a ### pattern', () => {
    expect(framePath('/seq/f-###.jpg', 7)).toBe('/seq/f-007.jpg');
    expect(framePath('/seq/f-#.webp', 12)).toBe('/seq/f-12.webp');
  });
  it('formats clocks in a time zone and survives unknown zones', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(makeClockFormatter('Asia/Dubai', false, false).format(d)).toMatch(/04.00/);
    const orig = console.warn;
    console.warn = () => {};
    expect(() => makeClockFormatter('Mars/Olympus', true).format(d)).not.toThrow();
    console.warn = orig;
  });
});

beforeAll(() => start());

describe('chat', () => {
  it('builds an accessible widget, sends, replies and cleans up', async () => {
    const el = html('<div data-fx="chat" data-fx-title="Sphere" data-fx-greeting="Hi!" data-fx-quick="Tickets, Venues"></div>');
    await tick(10);
    const launch = el.querySelector<HTMLButtonElement>('.fx-chat-launch')!;
    expect(launch.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.fx-chat-titles b')!.textContent).toBe('Sphere');
    expect(el.querySelector('.fx-chat-log')!.getAttribute('role')).toBe('log');
    expect(el.querySelectorAll('.fx-msg[data-from="them"]').length).toBe(1);
    launch.click();
    expect(el.hasAttribute('data-open')).toBe(true);
    expect(launch.getAttribute('aria-expanded')).toBe('true');

    let sent = '';
    el.addEventListener('fx:chat-send', (e) => (sent = (e as CustomEvent).detail.text));
    el.querySelector<HTMLButtonElement>('.fx-chat-quick button')!.click();
    expect(sent).toBe('Tickets');
    expect(el.querySelector('.fx-msg[data-from="me"]')!.textContent).toBe('Tickets');
    expect(el.querySelectorAll('.fx-chat-quick button').length).toBe(0);

    const api = (el as HTMLElement & { fxChat: ChatApi }).fxChat;
    await api.reply('We have 3 events tonight.', { typing: 0 });
    expect(el.querySelectorAll('.fx-msg[data-from="them"]').length).toBe(2);
    api.typing(true);
    expect(el.querySelector('.fx-typing')).not.toBeNull();
    api.typing(false);
    expect(el.querySelector('.fx-typing')).toBeNull();

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    el.querySelector('.fx-chat-ui')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(el.hasAttribute('data-open')).toBe(false);

    el.removeAttribute('data-fx');
    await tick();
    expect(el.children.length).toBe(0);
  });
});

describe('modal', () => {
  it('wraps content, opens from a trigger, closes with data-fx-close, and restores', async () => {
    const trigger = html('<button data-fx-open="#m1">Open</button>');
    const dlg = html('<dialog id="m1" data-fx="modal"><h2>Join</h2><button data-fx-close>Close</button></dialog>') as HTMLDialogElement;
    await tick(10);
    expect(dlg.querySelector(':scope > .fx-md-panel > h2')).not.toBeNull();
    expect(dlg.querySelector(':scope > .fx-md-goo > .fx-md-drop')).not.toBeNull();
    trigger.click();
    await tick(10);
    expect(dlg.open).toBe(true);
    expect(state(dlg)).toContain('shown');
    let closed = false;
    dlg.addEventListener('fx:close', () => (closed = true));
    dlg.querySelector<HTMLButtonElement>('[data-fx-close]')!.click();
    await tick(10);
    expect(dlg.open).toBe(false);
    expect(closed).toBe(true);
    modals.open('#m1');
    await tick(10);
    expect(dlg.open).toBe(true);
    modals.close(dlg);
    await tick(10);
    expect(dlg.open).toBe(false);
    dlg.removeAttribute('data-fx');
    await tick();
    expect(dlg.querySelector('.fx-md-panel, .fx-md-goo')).toBeNull();
    expect(dlg.querySelector(':scope > h2')).not.toBeNull();
  });
  it('warns instead of failing on a non-dialog element', async () => {
    const orig = console.warn;
    let msg = '';
    console.warn = (m: string) => (msg = m);
    html('<div data-fx="modal"></div>');
    await tick(10);
    console.warn = orig;
    expect(msg).toMatch(/dialog/);
  });
});

describe('hovercard', () => {
  it('opens on focus with content from a <template> and links it for screen readers', async () => {
    html('<template id="tip1"><b>Sphere</b> events in Tirana</template>');
    const a = html('<a href="#" data-fx="hovercard" data-fx-for="#tip1">Sphere</a>');
    await tick(10);
    a.dispatchEvent(new FocusEvent('focusin'));
    const card = document.getElementById('fx-hovercard')!;
    expect(card.getAttribute('role')).toBe('tooltip');
    expect(card.getAttribute('data-state')).toBe('open');
    expect(card.querySelector('b')!.textContent).toBe('Sphere');
    expect(a.getAttribute('aria-describedby')).toBe('fx-hovercard');
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(card.hasAttribute('data-state')).toBe(false);
    expect(a.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('typewriter', () => {
  it('reserves the full text, types it, and keeps it readable for screen readers', async () => {
    const el = html('<p data-fx="typewriter" data-fx-speed="1">npm i lumafx</p>');
    await tick(10);
    expect(el.querySelector('.fx-sr')!.textContent).toBe('npm i lumafx');
    expect(el.querySelector('.fx-tw-ghost')!.textContent).toBe('npm i lumafx');
    expect(el.querySelector('.fx-tw-box')!.getAttribute('aria-hidden')).toBe('true');
    await tick(250);
    expect(el.querySelector('.fx-tw')!.textContent).toBe('npm i lumafx');
    expect(state(el)).toContain('typed');
    el.removeAttribute('data-fx');
    await tick();
    expect(el.innerHTML).toBe('npm i lumafx');
  });
});

describe('rotate-words, clock', () => {
  it('rotate-words exposes the whole list once and restores', async () => {
    const el = html('<span data-fx="rotate-words" data-fx-words="apps, events">sites</span>');
    await tick(10);
    expect(el.querySelector('.fx-sr')!.textContent).toBe('sites, apps, events');
    expect(el.querySelector('.fx-rw-word')!.textContent).toBe('sites');
    el.removeAttribute('data-fx');
    await tick();
    expect(el.textContent).toBe('sites');
  });
  it('clock ticks in hh:mm:ss and restores', async () => {
    const el = html('<time data-fx="clock" data-fx-tz="Europe/Tirane">--:--</time>');
    await tick(10);
    expect(el.textContent).toMatch(/^\d\d.\d\d.\d\d$/);
    expect(el.getAttribute('datetime')).toMatch(/Z$/);
    el.removeAttribute('data-fx');
    await tick();
    expect(el.textContent).toBe('--:--');
  });
});

describe('ring', () => {
  it('builds a 3D track, places items around it and restores', async () => {
    const el = html('<div data-fx="ring"><figure>a</figure><figure>b</figure><figure>c</figure><figure>d</figure></div>');
    await tick(10);
    const track = el.querySelector(':scope > .fx-ring-track')!;
    expect(track.children.length).toBe(4);
    expect((track.children[1] as HTMLElement).style.getPropertyValue('--fx-ring-a')).toBe('90deg');
    expect(state(el)).toContain('on');
    expect(el.getAttribute('aria-roledescription')).toBe('carousel');
    el.removeAttribute('data-fx');
    await tick();
    expect(el.querySelector('.fx-ring-track')).toBeNull();
    expect(el.children.length).toBe(4);
  });
});

describe('video-scrub', () => {
  it('pins the video and restores the markup', async () => {
    const el = html('<section data-fx="video-scrub"><video src="x.mp4"></video><h2>Fly over</h2></section>');
    await tick(10);
    expect(el.querySelector(':scope > .fx-pin > video')).not.toBeNull();
    expect(el.querySelector(':scope > .fx-pin > h2')).not.toBeNull();
    expect(state(el)).toContain('pinned');
    el.removeAttribute('data-fx');
    await tick();
    expect(el.querySelector('.fx-pin')).toBeNull();
    expect(el.querySelector(':scope > video')).not.toBeNull();
  });
});

describe('page-transition', () => {
  it('creates one cover, ignores modified clicks and same-page hashes, and reveals on arrival', async () => {
    sessionStorage.setItem('fx-pt', JSON.stringify({ style: 'curtain', color: '#000', t: Date.now() }));
    document.documentElement.classList.add('fx-pt-arriving');
    const el = html('<div data-fx="page-transition" data-fx-style="curtain" data-fx-label="Sphere"></div>');
    await tick(10);
    const layer = document.querySelector('.fx-pt')!;
    expect(layer.querySelectorAll('i').length).toBe(5);
    expect(layer.querySelector('.fx-pt-label')!.textContent).toBe('Sphere');
    expect(document.documentElement.classList.contains('fx-pt-arriving')).toBe(false);
    expect(sessionStorage.getItem('fx-pt')).toBeNull();
    await tick(50);

    const link = html('<a href="/other">Other</a>') as HTMLAnchorElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    const hash = html('<a href="#top">Top</a>');
    const ev2 = new MouseEvent('click', { bubbles: true, cancelable: true });
    hash.dispatchEvent(ev2);
    expect(ev2.defaultPrevented).toBe(false);
    expect(sessionStorage.getItem('fx-pt')).toBeNull();

    await page.cover();
    expect(layer.hasAttribute('data-covered')).toBe(true);
    await page.reveal();
    expect(layer.hasAttribute('data-covered')).toBe(false);

    el.remove();
    await tick();
    expect(document.querySelector('.fx-pt')).toBeNull();
  });
});

describe('preloader', () => {
  it('counts to 100, then reports done', async () => {
    let loaded = false;
    document.addEventListener('fx:loaded', () => (loaded = true), { once: true });
    const el = html('<div data-fx="preloader" data-fx-min="0"><span>Sphere</span></div>');
    await tick(10);
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.querySelector('[data-fx-count]')).not.toBeNull();
    for (let i = 0; i < 60 && !loaded; i++) await tick(50);
    expect(loaded).toBe(true);
    expect(el.hasAttribute('data-fx-done')).toBe(true);
    expect(el.getAttribute('aria-valuenow')).toBe('100');
    expect(document.documentElement.classList.contains('fx-loading')).toBe(false);
  });
});
