import { describe, it, expect, beforeAll } from 'vitest';
import { validate, jsonSchema, prompt, anthropicTool, openaiTool, renderToString, parsePartial, placePlayers, formationLines, BLOCKS } from '../src/ui/server';
import { render, stream, update, adapter, hydrate } from '../src/ui/index';
import { tick } from './setup';

const lineup = {
  type: 'lineup',
  formation: '3-4-3',
  team: { name: 'Shqipëria', kit: { shirt: '#e41e2b', sleeves: '#151515' } },
  players: [
    { name: 'Dajsinani', number: 23, pos: 'GK' },
    { name: 'Mitaj', number: 3 },
    { name: 'Ismajli', number: 18 },
    { name: 'Gjimshiti', number: 6 },
    { name: 'Pilo', number: 22 },
    { name: 'Asllani', number: 8 },
    { name: 'Shehu', number: 16 },
    { name: 'Hysaj', number: 4 },
    { name: 'Hoxha', number: 21 },
    { name: 'Manaj', number: 7 },
    { name: 'Muçi', number: 10 },
  ],
};

describe('schema and validation', () => {
  it('accepts a doc, a list or one block, as objects or JSON text (even in a ```json fence)', () => {
    expect(validate({ blocks: [{ type: 'text', md: 'Hi' }] }).doc.blocks).toHaveLength(1);
    expect(validate([{ type: 'text', md: 'Hi' }]).doc.blocks).toHaveLength(1);
    expect(validate({ type: 'text', md: 'Hi' }).doc.blocks).toHaveLength(1);
    expect(validate('Here you go:\n```json\n{"blocks":[{"type":"text","md":"Hi"}]}\n```').doc.blocks[0]).toEqual({ type: 'text', md: 'Hi' });
    expect(validate('not json').ok).toBe(false);
  });

  it('coerces what models write and reports what it fixed', () => {
    const r = validate({
      blocks: [
        { type: 'Match', status: 'LIVE', home: { name: 'A', color: 'red;}body{x' }, away: { name: 'B' }, score: ['2', 1.4], bogus: 1 },
        { type: 'stats', items: [{ label: 'Sold', value: '1200' }] },
        { type: 'kpi', items: [{ label: 'X', value: 3, delta: '12%' }] },
        { type: 'nope' },
        { type: 'actions', buttons: [{ label: 'Bad', url: 'javascript:alert(1)' }, { label: 'Sneaky', url: 'java\nscript:alert(1)' }, { label: 'Ok', url: '/tickets' }] },
      ],
    });
    const [match, stats, kpi, actions] = r.doc.blocks as any[];
    expect(match.type).toBe('match');
    expect(match.status).toBe('live');
    expect(match.score).toEqual([2, 1]);
    expect(match.home.color).toBeUndefined();
    expect(match.bogus).toBeUndefined();
    expect(stats.items[0].value).toBe('1200');
    expect(kpi.type).toBe('stats');
    expect(kpi.items[0].delta).toBe(12);
    expect(actions.buttons.map((b: any) => b.label)).toEqual(['Ok']);
    expect(r.errors.map((e) => e.path)).toEqual(expect.arrayContaining(['blocks[0].home.color', 'blocks[3].type', 'blocks[4].buttons[0].url', 'blocks[4].buttons[1].url']));
    expect(r.ok).toBe(false);
    expect(validate({ blocks: [{ type: 'match', home: { name: 'A' } }] }).errors.map((e) => e.path)).toContain('blocks[0].away');
    expect(validate({ blocks: [{ type: 'match', home: { name: 'A' } }] }, { partial: true }).ok).toBe(true);
  });

  it('describes every block for tools and prompts', () => {
    const s = jsonSchema() as any;
    expect(s.$defs.block.oneOf).toHaveLength(BLOCKS.length);
    const ls = s.$defs.block.oneOf.find((b: any) => b.properties.type.const === 'lineup');
    expect(ls.required).toEqual(expect.arrayContaining(['type', 'team', 'players']));
    expect(ls.properties.players.items.properties.number.type).toBe('integer');
    const small = jsonSchema(['match', 'lineup']) as any;
    expect(small.$defs.block.oneOf).toHaveLength(2);
    const p = prompt();
    expect(p).toContain('lineup:');
    expect(p).toContain('formation?: str');
    expect(p.length).toBeLessThan(16000);
    expect(anthropicTool().input_schema).toBeTruthy();
    expect(openaiTool({ name: 'show', types: ['weather'] }).name).toBe('show');
    // Every example in the catalogue passes its own schema.
    for (const b of BLOCKS) {
      const r = validate({ blocks: [b.example] }, { partial: b.type === 'group' || b.type === 'tabs' });
      expect(r.errors, b.type).toEqual([]);
    }
  });
});

describe('streaming JSON', () => {
  it('parses partial JSON as far as it goes', () => {
    expect(parsePartial('{"blocks":[{"type":"text","md":"Hel')).toEqual({ blocks: [{ type: 'text', md: 'Hel' }] });
    expect(parsePartial('{"blocks":[{"type":"match","score":[2,')).toEqual({ blocks: [{ type: 'match', score: [2] }] });
    expect(parsePartial('{"a":tr')).toEqual({});
    expect(parsePartial('{"a":"x\\')).toEqual({ a: 'x' });
    expect(parsePartial('{"a":"\\u00eb","b":[1,{"c":null}]}')).toEqual({ a: 'ë', b: [1, { c: null }] });
    expect(parsePartial('Sure! ```json\n[{"type":"text"')).toEqual([{ type: 'text' }]);
    expect(parsePartial('nothing here')).toBeUndefined();
  });
});

describe('football geometry', () => {
  it('places a formation on the pitch: goalkeeper at the bottom, lines spread evenly', () => {
    expect(formationLines('3-4-3', lineup.players)).toEqual([3, 4, 3]);
    expect(formationLines(undefined, Array(11).fill({}))).toEqual([4, 4, 2]);
    expect(formationLines('', [{ pos: 'GK' }, ...Array(4).fill({ pos: 'DF' }), ...Array(3).fill({ pos: 'MF' }), ...Array(3).fill({ pos: 'FW' })])).toEqual([4, 3, 3]);
    const at = placePlayers(lineup.players, '3-4-3');
    expect(at[0]).toEqual({ x: 50, y: 90 });
    expect(at.slice(1, 4).map((p) => Math.round(p.x))).toEqual([25, 50, 75]);
    expect(at[8].y).toBeLessThan(at[4].y);
    expect(at[4].y).toBeLessThan(at[1].y);
    const top = placePlayers(lineup.players, '3-4-3', 'top');
    expect(top[0].y).toBeLessThan(10);
  });
});

describe('rendering', () => {
  it('renders HTML on the server with the JSON embedded for hydration, escaping everything', () => {
    const html = renderToString({ lang: 'sq', blocks: [lineup, { type: 'text', md: '<img src=x onerror=alert(1)> **ok**' }] }, { now: 0 });
    expect(html).toContain('class="fxui" lang="sq"');
    expect(html.match(/class="fxui-player"/g)).toHaveLength(11);
    expect(html).toContain('XI zyrtar (11/11)');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; <strong>ok</strong>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('<script type="application/json" class="fxui-data">');
    expect(html).not.toMatch(/<\/script>.*<\/script>.*class="fxui-data"/s);
  });

  it('renders every block type from its example without throwing', () => {
    for (const b of BLOCKS) {
      const html = renderToString({ blocks: [b.example] }, { embed: false });
      expect(html, b.type).toContain(`fxui-b-${b.type}`);
    }
  });

  it('renders into the page and wires tabs, quiz and tickets', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    render(el, {
      blocks: [
        { type: 'tabs', tabs: [{ label: 'A', blocks: [{ type: 'text', md: 'one' }] }, { label: 'B', blocks: [{ type: 'text', md: 'two' }] }] },
        { type: 'quiz', questions: [{ q: 'Q', options: ['x', 'y'], answer: 1 }] },
        { type: 'tickets', currency: 'EUR', url: 'https://example.com/buy', tiers: [{ name: 'VIP', price: 60 }] },
      ],
    });
    const panels = el.querySelectorAll<HTMLElement>('.fxui-tabpanel');
    expect([panels[0].hidden, panels[1].hidden]).toEqual([false, true]);
    el.querySelectorAll<HTMLButtonElement>('[role=tab]')[1].click();
    expect([panels[0].hidden, panels[1].hidden]).toEqual([true, false]);
    const radio = el.querySelectorAll<HTMLInputElement>('.fxui-quiz input')[1];
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    expect(el.querySelector('.fxui-feedback strong')!.textContent).toBe('Correct');
    expect(el.querySelector('.fxui-quizscore')!.textContent).toBe('Score: 1 / 1');
    const tier = el.querySelector<HTMLInputElement>('.fxui-tickets input')!;
    let picked = '';
    el.addEventListener('fxui:select', (e) => (picked = (e as CustomEvent).detail.tier));
    tier.checked = true;
    tier.dispatchEvent(new Event('change', { bubbles: true }));
    expect(picked).toBe('VIP');
    expect(el.querySelector<HTMLAnchorElement>('.fxui-checkout')!.href).toBe('https://example.com/buy?tier=VIP');
  });

  it('streams: blocks appear as JSON arrives, new players pop in, and end() validates', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    const s = stream(el);
    const json = JSON.stringify({ blocks: [{ type: 'match', home: { name: 'A' }, away: { name: 'B' }, score: [1, 0], status: 'live' }, lineup] });
    const cut = json.indexOf('"Pilo"');
    s.write(json.slice(0, cut));
    await tick(30);
    expect(el.querySelectorAll('.fxui-b')).toHaveLength(2);
    expect(el.querySelectorAll('.fxui-player')).toHaveLength(4);
    s.write(json.slice(cut));
    await tick(30);
    const players = el.querySelectorAll('.fxui-player');
    expect(players).toHaveLength(11);
    expect(players[0].classList.contains('fxui-new')).toBe(false);
    expect(players[10].classList.contains('fxui-new')).toBe(true);
    const res = s.end();
    expect(res.errors).toEqual([]);
    expect(el.querySelector('.fxui')!.hasAttribute('aria-busy')).toBe(false);
  });

  it('updates a block by id and keeps it live through an adapter', async () => {
    const el = document.createElement('div');
    document.body.append(el);
    render(el, { blocks: [{ type: 'match', id: 'm1', home: { name: 'A' }, away: { name: 'B' }, status: 'live', score: [0, 0] }] });
    expect(update(el, 'm1', { score: [1, 0] })).toBe(true);
    expect(el.querySelector('.fxui-score [data-k=sh]')!.textContent).toBe('1');
    expect(el.querySelector('.fxui-score [data-k=sh]')!.classList.contains('fxui-changed')).toBe(true);
    let pushed: (p: Record<string, unknown>) => void = () => {};
    adapter.set('test', { subscribe: (_id, _b, push) => ((pushed = push), () => {}) });
    render(el, { blocks: [{ type: 'match', home: { name: 'A' }, away: { name: 'B' }, status: 'live', score: [0, 0], live: { adapter: 'test', id: 'x' } }] });
    pushed({ score: [2, 2], minute: "88'" });
    expect(el.querySelector('.fxui-score')!.textContent).toContain('2–2');
    expect(el.querySelector('.fxui-status')!.textContent).toBe("88'");
  });

  it('hydrates server-rendered HTML without re-rendering it', () => {
    const el = document.createElement('div');
    el.innerHTML = renderToString({ blocks: [{ type: 'faq', items: [{ q: 'Q', a: 'A' }] }, { type: 'tabs', tabs: [{ label: 'A', blocks: [] }, { label: 'B', blocks: [] }] }] });
    document.body.append(el);
    const before = el.querySelector('.fxui-faq');
    hydrate(el);
    expect(el.querySelector('.fxui-faq')).toBe(before);
    el.querySelectorAll<HTMLButtonElement>('[role=tab]')[1].click();
    expect(el.querySelectorAll<HTMLElement>('.fxui-tabpanel')[1].hidden).toBe(false);
  });
});

beforeAll(() => {
  // jsdom has no matchMedia.
  (window as any).matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
});
