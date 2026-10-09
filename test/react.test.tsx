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

describe('React: intelligent UI', () => {
  it('server-renders <FxUI> into an <fx-ui> element the browser can hydrate', async () => {
    const { FxUI } = await import('../src/react/ui');
    const out = renderToString(
      h(FxUI, { doc: { lang: 'sq', blocks: [{ type: 'match', home: { name: 'Shqipëria' }, away: { name: 'San Marino' }, score: [2, 0], status: 'finished' }] }, timeZone: 'Europe/Tirane', askUrl: '/kerko?q=', className: 'orbit' }),
    );
    expect(out).toMatch(/^<fx-ui class="orbit" lang="sq" time-zone="Europe\/Tirane" ask-url="\/kerko\?q=">/);
    expect(out).toContain('fxui-b-match');
    expect(out).toContain('<script type="application/json" class="fxui-data">');
    expect(out).toContain('Përfundoi');
  });

  it('<FxUIStream> renders as the value grows and reports follow-up clicks', async () => {
    const { createRoot } = await import('react-dom/client');
    const { act } = await import('react');
    const { FxUIStream } = await import('../src/react/runtime');
    const el = document.createElement('div');
    document.body.append(el);
    const root = createRoot(el);
    const asked: string[] = [];
    const full = JSON.stringify({ blocks: [{ type: 'text', md: 'Hello' }, { type: 'suggestions', items: [{ text: 'More?' }] }] });
    await act(async () => root.render(h(FxUIStream, { value: full.slice(0, 30), onAsk: (t: string) => asked.push(t) })));
    await act(async () => new Promise((r) => setTimeout(r, 300)));
    expect(el.querySelectorAll('.fxui-b').length).toBe(1);
    await act(async () => root.render(h(FxUIStream, { value: full, done: true, onAsk: (t: string) => asked.push(t) })));
    await act(async () => new Promise((r) => setTimeout(r, 120)));
    expect(el.querySelectorAll('.fxui-b').length).toBe(2);
    el.querySelector<HTMLButtonElement>('.fxui-ask')!.click();
    expect(asked).toEqual(['More?']);
    await act(async () => root.unmount());
  });
});
