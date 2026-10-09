import { describe, it, expect, beforeAll } from 'vitest';
import { start, env } from '../src/index';
import { tick } from './setup';

beforeAll(() => start({ motion: 'reduce' }));

describe('reduced motion', () => {
  it('is reflected on the document for CSS', () => {
    expect(env.reduced).toBe(true);
    expect(document.documentElement.hasAttribute('data-fx-reduced')).toBe(true);
  });
  it('shows text immediately without splitting it', async () => {
    document.body.innerHTML = '<h1 data-fx="text-reveal">Calm text</h1><div data-fx="reveal">x</div>';
    await tick();
    const h = document.querySelector('h1')!;
    expect(h.querySelector('.fx-u')).toBeNull();
    expect(h.getAttribute('data-fx-state')).toBe('in');
    expect(document.querySelector('[data-fx="reveal"]')!.getAttribute('data-fx-state')).toBe('in');
  });
  it('leaves counters and scramble text untouched', async () => {
    document.body.innerHTML = '<b data-fx="counter">1,234</b><i data-fx="scramble" data-fx-trigger="load">Static</i>';
    await tick(50);
    expect(document.querySelector('b')!.textContent).toBe('1,234');
    expect(document.querySelector('i')!.textContent).toBe('Static');
  });
  it('turns stories into manual navigation', async () => {
    document.body.innerHTML = '<div data-fx="stories"><p>1</p><p>2</p></div>';
    await tick();
    expect(document.querySelector('[data-fx="stories"]')!.getAttribute('data-fx-state')).toContain('manual');
  });
});
