import { describe, it, expect, beforeAll, vi } from 'vitest';
import { META } from '../src/meta';
import { start } from '../src/index';
import {
  PRESETS,
  GROUPS,
  fields,
  catalog,
  suggest,
  resolve,
  normalize,
  toAttributes,
  toAttributeString,
  fromAttributes,
  apply,
  add,
  remove,
  read,
  clear,
  replay,
  preview,
  indexAt,
  sortable,
  flip,
  type PanelChange,
} from '../src/editor/index';
import { tick } from './setup';

beforeAll(() => start());

const html = (s: string) => {
  const wrap = document.createElement('div');
  wrap.innerHTML = s.trim();
  document.body.append(wrap);
  return wrap.firstElementChild as HTMLElement;
};

describe('catalogue', () => {
  it('every preset uses real options with valid values', () => {
    for (const p of PRESETS) {
      for (const s of p.fx) {
        const m = META[s.effect];
        expect(m, `${p.id}: ${s.effect}`).toBeDefined();
        for (const [k, v] of Object.entries(s.options ?? {})) {
          const o = m.options[k];
          expect(o, `${p.id}: ${s.effect}.${k}`).toBeDefined();
          if (o.type === 'enum') expect(o.values).toContain(v);
        }
      }
    }
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it('puts every effect in exactly one group', () => {
    const all = GROUPS.flatMap((g) => g.effects);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual(Object.keys(META).sort());
  });

  it('generates form fields from the metadata', () => {
    const f = Object.fromEntries(fields('reveal').map((x) => [x.key, x]));
    expect(f.from.type).toBe('select');
    expect(f.from.options!.map((o) => o.value)).toContain('zoom');
    expect(f.duration).toMatchObject({ type: 'time', unit: 'ms', default: 900 });
    expect(f.once).toMatchObject({ type: 'toggle', default: true });
    expect(fields('tilt').find((x) => x.key === 'max')).toMatchObject({ type: 'range', min: 0, max: 30 });
    expect(fields('aurora').find((x) => x.key === 'duration')!.default).toBe(18000);
    expect(catalog().find((c) => c.name === 'glass')).toMatchObject({ group: 'surface', kind: 'hybrid' });
  });

  it('suggests effects that fit the element', () => {
    const h = html('<h2>Title</h2>');
    expect(suggest(h)).toContain('text-reveal');
    expect(suggest(h)).not.toContain('stagger');
    const sec = html('<section><div></div><div></div></section>');
    expect(suggest(sec)).toContain('stagger');
    expect(suggest(sec)).not.toContain('text-reveal');
    expect(suggest(html('<img alt="">'))).toContain('image-reveal');
    expect(suggest(html('<button>Go</button>'))).toContain('press');
    for (const s of [h, sec]) expect(suggest(s)).not.toContain('preloader');
  });
});

describe('effects as data', () => {
  it('resolves presets and names, merges duplicates and drops unknowns', () => {
    expect(resolve('fade-up')).toEqual([{ effect: 'reveal' }]);
    expect(resolve(['zoom-in', { effect: 'reveal', options: { delay: 200 } }])).toEqual([{ effect: 'reveal', options: { from: 'zoom', delay: '200ms' } }]);
    expect(resolve('card-pop').map((s) => s.effect)).toEqual(['reveal', 'tilt']);
    expect(resolve(['nope', 'tilt'])).toEqual([{ effect: 'tilt' }]);
  });

  it('normalizes values to their option types and leaves defaults out', () => {
    expect(normalize({ effect: 'reveal', options: { from: 'up', duration: '900ms', distance: 40, once: false, bogus: 1 } })).toEqual({
      effect: 'reveal',
      options: { distance: '40px', once: false },
    });
    expect(normalize({ effect: 'reveal', options: { from: 'sideways' } })).toEqual({ effect: 'reveal' });
    expect(normalize({ effect: 'aurora', options: { duration: '18s' } })).toEqual({ effect: 'aurora' });
    expect(normalize({ effect: 'tilt', options: { max: '14', glare: 'false' } })).toEqual({ effect: 'tilt', options: { max: 14, glare: false } });
  });

  it('turns specs into attributes and back', () => {
    const specs = [
      { effect: 'reveal', options: { from: 'zoom', delay: 120, once: false } },
      { effect: 'tilt', options: { max: 6, glare: false } },
      { effect: 'border-beam', options: { glow: true, color: '#ff0' } },
    ];
    const attrs = toAttributes(specs);
    expect(attrs).toEqual({
      'data-fx': 'reveal tilt border-beam',
      'data-fx-from': 'zoom',
      'data-fx-delay': '120ms',
      'data-fx-once': 'false',
      'data-fx-max': '6',
      'data-fx-glare': 'false',
      'data-fx-glow': '',
      'data-fx-color': '#ff0',
    });
    expect(toAttributeString('chars-flip')).toBe('data-fx="text-reveal" data-fx-split="chars" data-fx-style="flip"');
    expect(toAttributeString([{ effect: 'hover-icon', options: { icon: '"→"' } }])).toBe('data-fx="hover-icon" data-fx-icon="&quot;→&quot;"');
    expect(fromAttributes(attrs)).toEqual(resolve(specs));
  });
});

describe('live elements', () => {
  it('applies, reads, adds, removes and clears, leaving other data-fx-* attributes alone', async () => {
    const el = html('<section data-fx-open="#x" data-fx="glass" data-fx-blur="20px"><p>Hi</p></section>');
    await tick();
    expect(read(el)).toEqual([{ effect: 'glass', options: { blur: '20px' } }]);
    apply(el, ['zoom-in', 'tilt']);
    expect(el.getAttribute('data-fx')).toBe('reveal tilt');
    expect(el.hasAttribute('data-fx-blur')).toBe(false);
    expect(el.getAttribute('data-fx-open')).toBe('#x');
    add(el, { effect: 'shadow', options: { lift: true } });
    expect(el.getAttribute('data-fx')).toBe('reveal tilt shadow');
    expect(el.getAttribute('data-fx-lift')).toBe('');
    remove(el, 'tilt');
    expect(read(el).map((s) => s.effect)).toEqual(['reveal', 'shadow']);
    expect(el.getAttribute('data-fx-from')).toBe('zoom');
    clear(el);
    expect(Array.from(el.attributes).map((a) => a.name).filter((n) => n !== 'style')).toEqual(['data-fx-open']);
  });

  it('replays effects and previews without committing', async () => {
    const el = html('<div data-fx="reveal" data-fx-from="left">Hello</div>');
    await tick(10);
    const seen: (string | null)[] = [];
    const mo = new MutationObserver(() => seen.push(el.getAttribute('data-fx')));
    mo.observe(el, { attributes: true, attributeFilter: ['data-fx'] });
    await replay(el);
    await tick();
    expect(seen).toEqual([null, 'reveal']);
    mo.disconnect();

    const restore = preview(el, 'tilt');
    await tick(30);
    expect(el.getAttribute('data-fx')).toBe('tilt');
    expect(el.hasAttribute('data-fx-from')).toBe(false);
    restore();
    expect(el.getAttribute('data-fx')).toBe('reveal');
    expect(el.getAttribute('data-fx-from')).toBe('left');
  });
});

describe('motion', () => {
  const R = (left: number, top: number, w = 100, h = 40) => ({ left, top, width: w, height: h, right: left + w, bottom: top + h }) as DOMRect;

  it('finds the drop slot in lists, rows and grids', () => {
    const list = [R(0, 0), R(0, 50), R(0, 100)];
    expect(indexAt(list, 50, 10)).toBe(0);
    expect(indexAt(list, 50, 30)).toBe(1);
    expect(indexAt(list, 50, 135)).toBe(3);
    const row = [R(0, 0), R(110, 0), R(220, 0)];
    expect(indexAt(row, 170, 20)).toBe(2);
    expect(indexAt(row, 10, 20)).toBe(0);
    const grid = [R(0, 0), R(110, 0), R(0, 50), R(110, 50)];
    expect(indexAt(grid, 150, 60)).toBe(3);
    expect(indexAt(grid, 190, 60)).toBe(4);
    expect(indexAt(grid, 190, 10)).toBe(2);
    expect(indexAt([], 0, 0)).toBe(0);
  });

  it('flip runs the change and resolves', async () => {
    const ul = html('<ul><li>a</li><li>b</li></ul>');
    await flip(ul, () => ul.prepend(ul.lastElementChild!));
    expect(ul.textContent).toBe('ba');
  });

  it('moves a focused item with Alt + arrows and reports the new order', async () => {
    const ul = html('<ul><li tabindex="0">a</li><li tabindex="0">b</li><li tabindex="0">c</li></ul>');
    const onEnd = vi.fn();
    const off = sortable(ul, { onEnd });
    const a = ul.children[0] as HTMLElement;
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
    await tick(10);
    expect(ul.textContent).toBe('bac');
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ oldIndex: 0, newIndex: 1, item: a }));
    expect(ul.hasAttribute('data-fx-sortable')).toBe(true);
    off();
    expect(ul.hasAttribute('data-fx-sortable')).toBe(false);
  });
});

describe('<fx-panel>', () => {
  it('applies a preset to the target, edits its options, and reports changes', async () => {
    const block = html('<section class="hero"><h2>Hello</h2><p>World</p></section>');
    const panel = document.createElement('fx-panel') as HTMLElement & { target: Element | null; value: unknown };
    document.body.append(panel);
    const root = panel.shadowRoot!;
    expect(root.textContent).toContain('Select a block');
    const changes: PanelChange[] = [];
    panel.addEventListener('fx-change', (e) => changes.push((e as CustomEvent<PanelChange>).detail));
    panel.target = block;
    expect(root.querySelector('.who')!.textContent).toContain('section.hero');
    root.querySelector<HTMLButtonElement>('[data-preset="zoom-in"]')!.click();
    expect(block.getAttribute('data-fx')).toBe('reveal');
    expect(block.getAttribute('data-fx-from')).toBe('zoom');
    expect(changes.at(-1)!.html).toBe('data-fx="reveal" data-fx-from="zoom"');
    expect(root.querySelector('[data-preset="zoom-in"]')!.getAttribute('aria-pressed')).toBe('true');

    // A hover preset joins the entrance one; a second entrance preset replaces it.
    root.querySelector<HTMLButtonElement>('[data-tab="hover"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-preset="tilt"]')!.click();
    expect(block.getAttribute('data-fx')).toBe('reveal tilt');
    root.querySelector<HTMLButtonElement>('[data-tab="entrance"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-preset="blur-in"]')!.click();
    expect(block.getAttribute('data-fx')).toBe('tilt reveal');
    expect(block.getAttribute('data-fx-from')).toBe('blur');

    // Settings for the selected effect.
    const sel = root.querySelector<HTMLSelectElement>('select[data-key="from"]')!;
    sel.value = 'left';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    expect(block.getAttribute('data-fx-from')).toBe('left');
    const once = root.querySelector<HTMLInputElement>('input[data-key="once"]')!;
    once.checked = false;
    once.dispatchEvent(new Event('change', { bubbles: true }));
    expect(block.getAttribute('data-fx-once')).toBe('false');
    expect(changes.at(-1)!.fx).toEqual([{ effect: 'tilt' }, { effect: 'reveal', options: { from: 'left', once: false } }]);

    // Remove one effect from its chip.
    root.querySelector<HTMLButtonElement>('[data-act="remove"][data-effect="tilt"]')!.click();
    expect(block.getAttribute('data-fx')).toBe('reveal');
    // Clicking an active preset again turns it off.
    panel.value = [{ effect: 'reveal', options: { from: 'zoom' } }];
    root.querySelector<HTMLButtonElement>('[data-preset="zoom-in"]')!.click();
    expect(block.hasAttribute('data-fx')).toBe(false);
  });

  it('search finds presets across groups', async () => {
    const block = html('<div class="box"><p>a</p><p>b</p></div>');
    const panel = document.createElement('fx-panel') as HTMLElement & { target: Element | null };
    document.body.append(panel);
    panel.target = block;
    const q = panel.shadowRoot!.querySelector<HTMLInputElement>('input[name=q]')!;
    q.value = 'glass';
    q.dispatchEvent(new Event('input', { bubbles: true }));
    const ids = Array.from(panel.shadowRoot!.querySelectorAll('[data-preset]')).map((t) => t.getAttribute('data-preset'));
    expect(ids).toEqual(expect.arrayContaining(['liquid-glass', 'frost']));
  });
});
