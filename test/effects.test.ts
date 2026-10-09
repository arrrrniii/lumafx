import { describe, it, expect, beforeAll } from 'vitest';
import { start } from '../src/index';
import { tick } from './setup';

const html = (s: string) => {
  const wrap = document.createElement('div');
  wrap.innerHTML = s.trim();
  document.body.append(wrap);
  return wrap.firstElementChild as HTMLElement;
};

beforeAll(() => start());

describe('reveal + stagger', () => {
  it('reveals when visible and indexes children', async () => {
    const r = html('<div data-fx="reveal" data-fx-from="left">Hi</div>');
    const s = html('<ul data-fx="stagger"><li>a</li><li>b</li><li>c</li></ul>');
    await tick(20);
    expect(r.getAttribute('data-fx-state')).toContain('in');
    expect(s.getAttribute('data-fx-state')).toContain('in');
    expect((s.children[2] as HTMLElement).style.getPropertyValue('--fx-i')).toBe('2');
  });
});

describe('text-reveal', () => {
  it('splits, labels letters for screen readers and fully restores', async () => {
    const el = html('<h1 data-fx="text-reveal" data-fx-split="chars">Make it <b>move</b></h1>');
    await tick(20);
    expect(el.querySelectorAll('.fx-u').length).toBe('Makeitmove'.length);
    expect(el.getAttribute('aria-label')).toBe('Make it move');
    expect(el.querySelector('.fx-word')!.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('data-fx-state')).toMatch(/split/);
    el.removeAttribute('data-fx');
    await tick();
    expect(el.innerHTML).toBe('Make it <b>move</b>');
    expect(el.hasAttribute('aria-label')).toBe(false);
  });
  it('does not hide links from assistive tech when splitting letters', async () => {
    const el = html('<p data-fx="text-reveal" data-fx-split="chars">Read <a href="#">more</a></p>');
    await tick(20);
    expect(el.hasAttribute('aria-label')).toBe(false);
  });
});

describe('counter', () => {
  it('counts up and lands exactly on the original text', async () => {
    const el = html('<strong data-fx="counter" data-fx-duration="60">$12,500+</strong>');
    await tick(5);
    expect(el.textContent).not.toBe('');
    await tick(250);
    expect(el.textContent).toBe('$12,500+');
  });
});

describe('scramble', () => {
  it('ends on the original text', async () => {
    const el = html('<span data-fx="scramble" data-fx-speed="1">Decode</span>');
    await tick(600);
    expect(el.textContent).toBe('Decode');
  });
});

describe('marquee', () => {
  it('wraps items in a track, clones it inertly and restores', async () => {
    const proto = HTMLElement.prototype;
    const ow = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
    const cw = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');
    Object.defineProperty(proto, 'offsetWidth', { configurable: true, get() { return this.classList.contains('fx-mq-track') ? 300 : 0; } });
    Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get() { return 1000; } });
    try {
      const el = html('<div data-fx="marquee" data-fx-speed="100"><span>A</span><span>B</span></div>');
      await tick(50);
      const tracks = el.querySelectorAll('.fx-mq-track');
      expect(tracks.length).toBeGreaterThanOrEqual(4);
      expect(tracks[1].getAttribute('aria-hidden')).toBe('true');
      expect(tracks[1].hasAttribute('inert')).toBe(true);
      expect(el.style.getPropertyValue('--fx-mq-dur')).toBe('3.000s');
      el.removeAttribute('data-fx');
      await tick();
      expect(el.innerHTML).toBe('<span>A</span><span>B</span>');
    } finally {
      if (ow) Object.defineProperty(proto, 'offsetWidth', ow);
      if (cw) Object.defineProperty(Element.prototype, 'clientWidth', cw);
    }
  });
});

describe('carousel', () => {
  it('adds carousel semantics and controls, and removes them again', async () => {
    const el = html('<div data-fx="carousel" data-fx-controls><div>1</div><div>2</div><div>3</div></div>');
    await tick();
    expect(el.getAttribute('aria-roledescription')).toBe('carousel');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.children[1].getAttribute('aria-label')).toBe('2 of 3');
    const nav = el.nextElementSibling!;
    expect(nav.classList.contains('fx-carousel-nav')).toBe(true);
    expect(nav.querySelectorAll('.fx-dot').length).toBe(3);
    el.removeAttribute('data-fx');
    await tick();
    expect(el.hasAttribute('aria-roledescription')).toBe(false);
    expect(el.children[1].hasAttribute('aria-label')).toBe(false);
    expect(el.nextElementSibling).toBeNull();
  });
});

describe('stories', () => {
  it('builds progress bars and advances on tap', async () => {
    const el = html('<div data-fx="stories"><div>1</div><div>2</div><div>3</div></div>');
    await tick();
    const bars = el.querySelectorAll('.fx-st-bar');
    expect(bars.length).toBe(3);
    expect(bars[0].getAttribute('data-s')).toBe('active');
    const slides = Array.from(el.children).filter((c) => !c.classList.contains('fx-st-bars'));
    expect(slides[0].getAttribute('data-fx-state')).toContain('active');
    el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10 }));
    el.dispatchEvent(new MouseEvent('pointerup', { clientX: 10 }));
    expect(slides[1].getAttribute('data-fx-state')).toContain('active');
    expect(bars[0].getAttribute('data-s')).toBe('done');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(slides[0].getAttribute('data-fx-state')).toContain('active');
    el.removeAttribute('data-fx');
    await tick();
    expect(el.querySelector('.fx-st-bars')).toBeNull();
  });
});

describe('hscroll', () => {
  it('builds sticky structure and restores the original markup', async () => {
    const el = html('<section data-fx="hscroll"><div class="row"><article>1</article><article>2</article></div></section>');
    await tick();
    expect(el.querySelector(':scope > .fx-hs-sticky > .row[data-fx-track]')).not.toBeNull();
    el.removeAttribute('data-fx');
    await tick();
    expect(el.innerHTML).toBe('<div class="row"><article>1</article><article>2</article></div>');
  });
});

describe('morph', () => {
  it('names the element for view transitions', async () => {
    const el = html('<img data-fx="morph" data-fx-name="hero">');
    await tick();
    expect(el.style.getPropertyValue('view-transition-name')).toBe('hero');
  });
});
