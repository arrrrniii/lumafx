import { describe, it, expect } from 'vitest';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { Fx, BorderBeam, TextReveal, Marquee, HScroll, Glass, CursorImage } from '../src/react/index';

describe('React components (server rendering)', () => {
  it('renders effect options as data attributes', () => {
    const out = renderToString(h(BorderBeam, { duration: '4s', color2: '#0ff', glow: true, className: 'card' }, 'Hi'));
    expect(out).toBe('<div data-fx="border-beam" class="card" data-fx-duration="4s" data-fx-color-2="#0ff" data-fx-glow="">Hi</div>');
  });
  it('supports a custom element and several effects', () => {
    const out = renderToString(h(Fx, { as: 'section', effect: ['tilt', 'spotlight'], options: { max: 8, once: false } }));
    expect(out).toBe('<section data-fx="tilt spotlight" data-fx-max="8" data-fx-once="false"></section>');
  });
  it('passes non-option props through to the DOM', () => {
    const out = renderToString(h(Glass, { as: 'nav', 'aria-label': 'Main', id: 'n' }));
    expect(out).toBe('<nav data-fx="glass" aria-label="Main" id="n"></nav>');
  });
  it('maps src to the effect option on cursor-image', () => {
    const out = renderToString(h(CursorImage, { href: '/w', src: '/a.jpg' }, 'Work'));
    expect(out).toBe('<a data-fx="cursor-image" href="/w" data-fx-src="/a.jpg">Work</a>');
  });
  it('renders the marquee track and the hscroll structure so React owns the children', () => {
    expect(renderToString(h(Marquee, null, h('img', { alt: 'a' })))).toBe(
      '<div data-fx="marquee"><div class="fx-mq-track"><img alt="a"/></div></div>',
    );
    expect(renderToString(h(HScroll, null, h('article', null, '1')))).toBe(
      '<section data-fx="hscroll"><div class="fx-hs-sticky"><div data-fx-track=""><article>1</article></div></div></section>',
    );
  });
  it('renders TextReveal as plain text on the server', () => {
    expect(renderToString(h(TextReveal, { as: 'h1', split: 'chars' }, 'Hello'))).toBe('<h1 data-fx="text-reveal" data-fx-split="chars">Hello</h1>');
  });
});
