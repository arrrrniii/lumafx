import { describe, it, expect } from 'vitest';
import { cssValue, parseTime, parsePx } from '../src/core/options';
import { parseNumber, formatNumber } from '../src/effects/text';
import { splitText } from '../src/effects/split';
import { squirclePath } from '../src/effects/squircle';
import { displacementMap } from '../src/effects/glass';
import { META, EFFECT_NAMES, cssOptionKeys } from '../src/meta';
import { allEffects } from '../src/effects/index';
import fs from 'node:fs';
import path from 'node:path';

describe('option parsing', () => {
  it('adds units to bare numbers by type', () => {
    expect(cssValue('time', '400')).toBe('400ms');
    expect(cssValue('time', '1.2s')).toBe('1.2s');
    expect(cssValue('length', '24')).toBe('24px');
    expect(cssValue('length', '2rem')).toBe('2rem');
    expect(cssValue('percent', '30')).toBe('30%');
    expect(cssValue('color', '#fff')).toBe('#fff');
  });
  it('parses times to milliseconds', () => {
    expect(parseTime('1.5s', 0)).toBe(1500);
    expect(parseTime('250ms', 0)).toBe(250);
    expect(parseTime('80', 0)).toBe(80);
    expect(parseTime('', 7)).toBe(7);
    expect(parseTime(undefined, 7)).toBe(7);
  });
  it('parses lengths to pixels', () => {
    expect(parsePx('40px', 0)).toBe(40);
    expect(parsePx('12', 0)).toBe(12);
    expect(parsePx('nope', 5)).toBe(5);
  });
});

describe('counter number format', () => {
  const round = (s: string) => {
    const p = parseNumber(s)!;
    return p.prefix + formatNumber(p.value, p) + p.suffix;
  };
  it.each([
    ['$12,500+', 12500, 0],
    ['3.14', 3.14, 2],
    ['1.000.000 users', 1000000, 0],
    ['-42', -42, 0],
    ['98%', 98, 0],
    ['€1.234,56', 1234.56, 2],
    ['1,5 km', 1.5, 1],
    ['7 days', 7, 0],
  ])('%s', (text, value, decimals) => {
    const p = parseNumber(text)!;
    expect(p.value).toBeCloseTo(value);
    expect(p.decimals).toBe(decimals);
    expect(round(text)).toBe(text);
  });
  it('returns null when there is no number', () => {
    expect(parseNumber('none')).toBeNull();
  });
  it('formats intermediate values in the original style', () => {
    const p = parseNumber('$12,500+')!;
    expect(p.prefix + formatNumber(6250.4, p) + p.suffix).toBe('$6,250+');
  });
});

describe('text splitting', () => {
  it('splits words, keeps inline markup and restores the exact nodes', () => {
    const el = document.createElement('h1');
    el.innerHTML = 'Hello <em>brave new</em> world';
    const originals = Array.from(el.querySelectorAll('*')).concat([el]);
    const firstText = el.firstChild;
    const s = splitText(el, 'words');
    expect(s.units.map((u) => u.textContent)).toEqual(['Hello', 'brave', 'new', 'world']);
    expect(el.querySelector('em')!.querySelectorAll('.fx-u').length).toBe(2);
    expect(el.textContent).toBe('Hello brave new world');
    expect(s.units[3].style.getPropertyValue('--fx-i')).toBe('3');
    s.restore();
    expect(el.innerHTML).toBe('Hello <em>brave new</em> world');
    expect(el.firstChild).toBe(firstText);
    expect(Array.from(el.querySelectorAll('*')).concat([el])).toEqual(originals);
  });
  it('splits characters by grapheme so emoji stay whole', () => {
    const el = document.createElement('p');
    el.textContent = 'Hi 👋🏽!';
    const s = splitText(el, 'chars');
    expect(s.units.map((u) => u.textContent)).toEqual(['H', 'i', '👋🏽', '!']);
    expect(s.words.length).toBe(2);
    s.restore();
    expect(el.innerHTML).toBe('Hi 👋🏽!');
  });
});

describe('squircle path', () => {
  it('produces a closed path without NaN', () => {
    const d = squirclePath(320, 200, 28, 0.6);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).not.toMatch(/NaN|Infinity/);
    expect((d.match(/a/g) || []).length).toBe(4);
  });
  it('clamps radius to half the shortest side', () => {
    const d = squirclePath(100, 40, 500, 0.6);
    expect(d).not.toMatch(/NaN/);
    expect(d).toMatch(/a20 20/);
  });
  it('falls back to a rectangle with no radius', () => {
    expect(squirclePath(10, 10, 0)).toBe('M0 0H10V10H0Z');
  });
});

describe('liquid glass displacement map', () => {
  const at = (m: ReturnType<typeof displacementMap>, x: number, y: number) => {
    const i = (y * m.width + x) * 4;
    return [m.data[i], m.data[i + 1]];
  };
  it('is neutral in the middle and points inward at the edges', () => {
    const m = displacementMap(200, 100, 20, 20);
    expect(at(m, 100, 50)).toEqual([128, 128]);
    const [lx] = at(m, 0, 50); // left edge → sample to the right
    const [rx] = at(m, 199, 50); // right edge → sample to the left
    const [, ty] = at(m, 100, 0); // top edge → sample downward
    expect(lx).toBeGreaterThan(200);
    expect(rx).toBeLessThan(60);
    expect(ty).toBeGreaterThan(200);
  });
});

describe('metadata consistency', () => {
  it('has an effect implementation and CSS file for every documented effect', () => {
    expect(allEffects.map((e) => e.name).sort()).toEqual([...EFFECT_NAMES].sort());
    for (const n of EFFECT_NAMES) expect(fs.existsSync(path.join('src/css/effects', n + '.css'))).toBe(true);
  });
  it('only reads documented options in CSS', () => {
    const known = new Set(cssOptionKeys());
    // Variables written by the runtime itself (pointer positions, indices…)
    const runtime = new Set(['i', 'mx', 'my', 'gx', 'gy', 'go', 'shx', 'shy', 's', 'br', 'k', 'mq-dur', 'hs-dist', 'hs-p', 'elev', 'angle', 'float-size', 'vt-x', 'vt-y', 'p', 'ring-a', 'ring-r', 'pt-early']);
    // Documented theming hooks people set in their own CSS.
    const theme = new Set(['icon', 'chat-bg', 'chat-fg', 'chat-ink', 'header-bg', 'dock-half', 'hc-bg', 'hc-fg']);
    for (const n of EFFECT_NAMES) {
      const css = fs.readFileSync(path.join('src/css/effects', n + '.css'), 'utf8');
      for (const [, key] of css.matchAll(/var\(--fx-([\w-]+)/g)) {
        const ok = known.has(key) || runtime.has(key) || theme.has(key);
        expect(ok, `${n}.css reads --fx-${key}`).toBe(true);
        if (known.has(key) && !runtime.has(key)) {
          expect(META[n].options[key]?.css, `${n} should declare css option "${key}"`).toBe(true);
        }
      }
    }
  });
});
