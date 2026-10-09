import { describe, it, expect, beforeAll } from 'vitest';
import { renderToString, jsonLd, jsonLdScript, parseVideo, toText, validate } from '../src/ui/server';
import { render, hydrate, update } from '../src/ui/index';
import { tick } from './setup';

const NOW = Date.parse('2026-10-09T15:00:00+02:00');
const H = 36e5;
const at = (h: number) => new Date(NOW + h * H).toISOString();
const mount = () => {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
};

beforeAll(() => {
  (window as any).matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
});

describe('time-aware blocks', () => {
  it('an event sells before it starts, says so while it runs, and offers the recap after', () => {
    const ev = { type: 'event', name: 'T’Rocks', url: 'https://sphere.al/events/t', recap: 'https://sphere.al/orbit/recap', priceFrom: 1500, currency: 'ALL', seller: 'Kookooli' };
    const before = renderToString([{ ...ev, start: at(2) }], { now: NOW, embed: false });
    expect(before).toContain('data-phase="before"');
    expect(before).toContain('Buy tickets');
    expect(before).toContain('Tickets at Kookooli');
    expect(before).toMatch(/data-expires="\d+"/);
    const during = renderToString([{ ...ev, start: at(-1) }], { now: NOW, embed: false });
    expect(during).toContain('Happening now');
    const after = renderToString([{ ...ev, start: at(-30) }], { now: NOW, embed: false, lang: 'sq' });
    expect(after).toContain('Ka përfunduar');
    expect(after).not.toContain('Bli bilet');
    expect(after).toContain('Lexo kronikën');
    expect(after).not.toContain('data-expires');
    // A snapshot article: after the event the card points to the page that holds the result.
    const snap = renderToString([{ ...ev, start: at(-30), recap: 'https://sphere.al/sport/matches/x', recapLabel: 'Shiko rezultatin' }], { now: NOW, embed: false, lang: 'sq' });
    expect(snap).toContain('Shiko rezultatin');
    expect(snap).toContain('https://sphere.al/sport/matches/x');
    expect(snap).not.toContain('Lexo kronikën');
    expect(validate([{ ...ev, start: at(1), recapLabel: 'x' }]).ok).toBe(true);
    // A match stops selling at kickoff even though it is still on.
    const live = renderToString([{ ...ev, start: at(-1), salesEnd: at(-1) }], { now: NOW, embed: false });
    expect(live).toContain('Happening now');
    expect(live).not.toContain('Buy tickets');
    const soon = renderToString([{ ...ev, start: at(3), salesEnd: at(2) }], { now: NOW, embed: false });
    expect(soon).toContain('Buy tickets');
    expect(soon).toContain(`data-expires="${NOW + 2 * H}"`);
  });

  it('the date box shows the day number and the month in the page language, whatever the locale order', () => {
    const ev = { type: 'event', name: 'X', image: 'https://x.y/a.jpg', start: '2026-10-06T18:45:00Z' };
    const box = (o: object) => /fxui-datebox"><b>([^<]*)<\/b><small>([^<]*)</.exec(renderToString([ev], { now: NOW, embed: false, timeZone: 'Europe/Tirane', ...o }))!.slice(1);
    expect(box({ lang: 'sq' })).toEqual(['6', 'tet']);
    expect(box({ lang: 'en', locale: 'en-US' })).toEqual(['6', 'Oct']);
  });

  it('tickets close, and a match past kickoff stops selling and waits for the result', () => {
    const t = renderToString([{ type: 'tickets', currency: 'EUR', url: 'https://x.y/buy', closes: at(-1), tiers: [{ name: 'VIP', price: 60 }] }], { now: NOW, embed: false });
    expect(t).toContain('Sales closed');
    expect(t).toContain('fieldset disabled');
    expect(t).not.toContain('fxui-checkout');
    const m = renderToString([{ type: 'match', kickoff: at(-3), home: { name: 'Shqipëria' }, away: { name: 'San Marino' }, tickets: 'https://x.y', url: 'https://sphere.al/sport/matches/x' }], { now: NOW, embed: false, lang: 'sq' });
    expect(m).toContain('Rezultati së shpejti');
    expect(m).not.toContain('Bli bilet');
    expect(m).toContain('https://sphere.al/sport/matches/x');
  });

  it('server HTML rendered before an event ends is brought up to date when it hydrates', async () => {
    const el = mount();
    el.innerHTML = renderToString([{ type: 'event', name: 'Show', start: at(-3), end: at(-1), url: 'https://x.y' }], { now: NOW - 4 * H });
    expect(el.querySelector('.fxui-eventcard')!.getAttribute('data-phase')).toBe('before');
    hydrate(el);
    await tick();
    expect(el.querySelector('.fxui-eventcard')!.getAttribute('data-phase')).toBe('after');
    expect(el.textContent).toContain('Ended');
  });
});

describe('new blocks', () => {
  it('recognises YouTube and Vimeo links and builds the embed itself', () => {
    expect(parseVideo('https://youtu.be/eUMPf41AcM4?t=3')!.id).toBe('eUMPf41AcM4');
    expect(parseVideo('https://www.youtube.com/watch?v=PML8cpzx0ZQ&list=x')!.embed).toBe('https://www.youtube-nocookie.com/embed/PML8cpzx0ZQ?autoplay=1&rel=0&playsinline=1');
    expect(parseVideo('https://www.youtube.com/shorts/YLs2YJ3QMIM', 30)!.watch).toContain('t=30s');
    expect(parseVideo('https://vimeo.com/123456789')!.provider).toBe('vimeo');
    expect(parseVideo('javascript:alert(1)//youtu.be/eUMPf41AcM4')).toBeNull();
    expect(parseVideo('https://example.com/video.mp4')).toBeNull();
  });

  it('plays a video inline only after a click, and a playlist switches videos', () => {
    const el = mount();
    render(el, {
      blocks: [
        {
          type: 'video',
          items: [
            { url: 'https://www.youtube.com/watch?v=eUMPf41AcM4', title: 'Ditë Dimri', channel: '3 Musketjeret' },
            { url: 'https://www.youtube.com/watch?v=PML8cpzx0ZQ', title: 'Sot', channel: 'ArkivaShqip' },
          ],
        },
      ],
    });
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.querySelector<HTMLImageElement>('.fxui-vplayer img')!.src).toBe('https://i.ytimg.com/vi/eUMPf41AcM4/hqdefault.jpg');
    el.querySelectorAll<HTMLButtonElement>('.fxui-vlist button')[1].click();
    const f = el.querySelector<HTMLIFrameElement>('iframe')!;
    expect(f.src).toContain('youtube-nocookie.com/embed/PML8cpzx0ZQ');
    expect(el.querySelectorAll('.fxui-vlist button')[1].getAttribute('aria-current')).toBe('true');
  });

  it('inside hosts that block frames, a video stays a link', () => {
    const host = mount();
    host.dataset.video = 'link';
    const el = document.createElement('div');
    host.append(el);
    render(el, [{ type: 'video', url: 'https://youtu.be/eUMPf41AcM4', title: 'x' }]);
    const a = el.querySelector<HTMLAnchorElement>('a.fxui-vplayer')!;
    a.addEventListener('click', (e) => e.preventDefault());
    a.click();
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('artists show genres, a short bio with the rest folded, and listening links', () => {
    const html = renderToString(
      [
        {
          type: 'artists',
          items: [
            { name: 'Morgu Band', genres: ['Post-Metal'], url: 'https://sphere.al/artists/morgu-band', spotify: 'https://open.spotify.com/artist/0cno', bio: 'Morgu është grup post-metal nga Tirana, i formuar më 20 korrik 2020. Sipas faqes zyrtare, kolektivi me gjashtë anëtarë u krijua për të eksploruar humbjen.' },
            { name: 'Nomad Band', instagram: 'javascript:alert(1)' },
          ],
        },
      ],
      { embed: false },
    );
    expect(html).toContain('Post-Metal');
    expect(html).toContain('href="https://open.spotify.com/artist/0cno"');
    expect(html).toContain('<details>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('>NB<');
  });

  it('a poll shows results after the vote and reports it', () => {
    const el = mount();
    render(el, [{ type: 'poll', id: 'pred', question: 'Kush fiton?', options: [{ label: 'Shqipëria', votes: 30 }, { label: 'Barazim', votes: 10 }] }], { lang: 'sq' });
    let got: any;
    el.addEventListener('fxui:vote', (e) => (got = (e as CustomEvent).detail));
    const r = el.querySelectorAll<HTMLInputElement>('.fxui-popt input')[1];
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
    expect(got).toEqual({ block: 'pred', option: 1, label: 'Barazim' });
    expect(el.querySelector('.fxui-poll')!.getAttribute('data-state')).toBe('results');
    expect(el.querySelectorAll('.fxui-ppct')[0].textContent).toBe('73%');
    expect(el.querySelector('.fxui-pfoot')!.textContent).toContain('Faleminderit');
    const closed = renderToString([{ type: 'poll', question: 'q', closes: at(-1), options: [{ label: 'a', votes: 1 }] }], { now: NOW, embed: false });
    expect(closed).toContain('data-state="results"');
    expect(closed).toContain('Voting closed');
  });

  it('a listing groups by day (Today, Tomorrow), filters by category and dims what is over', () => {
    const el = mount();
    render(
      el,
      {
        lang: 'sq',
        blocks: [
          {
            type: 'listing',
            filters: true,
            items: [
              { title: 'Ego 2', start: at(-5), category: 'Kinema', venue: 'Cineplexx', seller: 'Cineplexx' },
              { title: 'T’Rocks', start: at(28), category: 'Koncert', price: 1500, currency: 'ALL' },
              { title: 'Hope', start: at(4), category: 'Kinema' },
            ],
          },
        ],
      },
      { now: NOW, timeZone: 'Europe/Tirane' },
    );
    const days = Array.from(el.querySelectorAll('.fxui-day h4')).map((h) => h.textContent);
    expect(days).toEqual(['Sot', 'Nesër']);
    expect(el.querySelector('li[data-phase="after"]')!.textContent).toContain('Ego 2');
    el.querySelector<HTMLButtonElement>('.fxui-filters button[data-cat="Koncert"]')!.click();
    const visible = Array.from(el.querySelectorAll<HTMLElement>('.fxui-day li')).filter((li) => !li.hidden);
    expect(visible.map((li) => li.querySelector('strong')!.textContent)).toEqual(['T’Rocks']);
  });

  it('fixtures mark the winner and wait for results after kickoff', () => {
    const html = renderToString(
      [
        {
          type: 'fixtures',
          competition: 'Kategoria e Parë',
          items: [
            { home: 'Sopoti', away: 'Besa', score: [0, 4], status: 'finished', kickoff: at(-48) },
            { home: 'Flamurtari', away: 'Burreli', kickoff: at(-2) },
            { home: 'Iliria', away: 'Kukësi', kickoff: at(20) },
          ],
        },
      ],
      { now: NOW, embed: false },
    );
    expect(html).toMatch(/data-win="true">\s*<span>Besa<\/span>/);
    expect(html).toContain('Result soon');
    expect(html).toMatch(/data-time>\d\d:\d\d/);
  });

  it('an evidence line says how sure a block is and who confirms it', () => {
    const doc = { blocks: [{ type: 'text', md: 'XI', evidence: { status: 'verified', source: 'FSHF', url: 'https://fshf.org', asOf: '2026-10-07T10:06:00Z' } }] };
    const html = renderToString(doc, { lang: 'sq', embed: false, timeZone: 'UTC' });
    expect(html).toContain('fxui-evidence');
    expect(html).toContain('Verifikuar');
    expect(html).toContain('href="https://fshf.org"');
    expect(toText(validate(doc).doc)).toContain('(verified, FSHF');
  });
});

describe('structured data', () => {
  const doc = {
    lang: 'sq',
    blocks: [
      { type: 'event', name: 'T’Rocks Festival', category: 'Festival', start: '2026-10-10T19:00:00+02:00', venue: { name: 'Parku Olimpik “Feti Borova”', city: 'Tiranë' }, url: 'https://sphere.al/events/t' },
      { type: 'tickets', currency: 'ALL', url: 'https://kookooli.com/event/t', tiers: [{ name: 'Hyrje', price: 1500 }, { name: 'VIP', price: 3000, status: 'sold-out' }] },
      { type: 'artists', items: [{ name: 'Morgu Band', spotify: 'https://open.spotify.com/artist/0cno' }] },
      { type: 'match', kickoff: '2026-10-06T20:45:00+02:00', home: { name: 'Shqipëria' }, away: { name: 'San Marino' }, venue: 'Air Albania', status: 'finished', score: [2, 1] },
      { type: 'faq', items: [{ q: 'A ka **parking**?', a: 'Po, [te stadiumi](https://x.y).' }] },
      { type: 'video', url: 'https://youtu.be/eUMPf41AcM4', title: 'Ditë Dimri' },
      { type: 'sources', items: [{ title: 'FSHF', url: 'https://fshf.org/r' }] },
    ],
  };

  it('describes events with offers and performers, matches, FAQs, videos and the article', () => {
    const g = jsonLd(doc, { url: 'https://sphere.al/orbit/x', headline: 'T’Rocks 2026', datePublished: '2026-09-22', author: 'Sphere Editorial', publisher: { name: 'Sphere', url: 'https://sphere.al' } })['@graph'] as any[];
    const types = g.map((n) => n['@type']);
    expect(types).toEqual(['NewsArticle', 'MusicEvent', 'SportsEvent', 'FAQPage', 'VideoObject']);
    const ev = g[1];
    expect(ev.offers).toHaveLength(2);
    expect(ev.offers[0]).toMatchObject({ price: 1500, priceCurrency: 'ALL', availability: 'https://schema.org/InStock', url: 'https://kookooli.com/event/t' });
    expect(ev.offers[1].availability).toBe('https://schema.org/SoldOut');
    expect(ev.performer[0]).toMatchObject({ '@type': 'PerformingGroup', name: 'Morgu Band', sameAs: ['https://open.spotify.com/artist/0cno'] });
    expect(ev.location.address.addressLocality).toBe('Tiranë');
    expect(g[2]).toMatchObject({ name: 'Shqipëria – San Marino', homeTeam: { name: 'Shqipëria' }, sport: 'Football' });
    expect(g[3].mainEntity[0]).toEqual({ '@type': 'Question', name: 'A ka parking?', acceptedAnswer: { '@type': 'Answer', text: 'Po, te stadiumi.' } });
    expect(g[4].embedUrl).toBe('https://www.youtube-nocookie.com/embed/eUMPf41AcM4');
    expect(g[0]).toMatchObject({ inLanguage: 'sq', about: [{ '@id': 'https://sphere.al/orbit/x#event-1' }, { '@id': 'https://sphere.al/orbit/x#match-2' }], citation: ['https://fshf.org/r'] });
  });

  it('escapes the script tag', () => {
    const s = jsonLdScript({ blocks: [{ type: 'faq', items: [{ q: '</script><script>alert(1)</script>', a: 'x' }] }] });
    expect(s.match(/<\/script>/g)).toHaveLength(1);
    expect(s).toContain('\\u003c/script');
  });
});

describe('tables readers can work with', () => {
  const doc = {
    lang: 'sq',
    blocks: [
      {
        type: 'table',
        columns: [{ label: 'Ndeshja' }, { label: 'Data', format: 'date' }, { label: 'Gola', bar: true }],
        rows: [
          ['Shqipëri–Bjellorusi', '2026-09-26', 2],
          ['San Marino–Shqipëri', '2026-09-29', 3],
          ['Finlandë–Shqipëri', '2026-10-03', 1],
          ['Shqipëri–San Marino', '2026-10-06', 2],
        ],
      },
    ],
  };

  it('keeps empty cells in their column', () => {
    const t = validate({ blocks: [{ type: 'table', columns: [{ label: 'a' }, { label: 'b' }, { label: 'c' }], rows: [['x', '', 'z'], ['x', null, 'z']] }] }).doc.blocks[0] as any;
    expect(t.rows).toEqual([['x', '', 'z'], ['x', '', 'z']]);
  });

  it('draws number columns as bars against the column maximum, server side', () => {
    const html = renderToString(doc, { embed: false });
    expect(html).toContain('aria-sort="none"');
    expect(html).toContain('Rendit sipas Gola');
    expect(html).toMatch(/--w:100\.0"[\s\S]*?>3</);
    expect(html).toMatch(/--w:33\.3"/);
    expect(html).not.toContain('fxui-tfilter'); // short tables have no search box
  });

  it('sorts by a column (numbers largest first, then reversed) and searches the rows', () => {
    const el = mount();
    render(el, { ...doc, blocks: [{ ...doc.blocks[0], filter: true }] });
    const names = () => Array.from(el.querySelectorAll('tbody tr')).map((r) => r.querySelector('td')!.textContent);
    const btn = (i: number) => el.querySelectorAll<HTMLButtonElement>('.fxui-sort')[i];
    btn(2).click();
    expect(names()[0]).toBe('San Marino–Shqipëri');
    expect(names()[3]).toBe('Finlandë–Shqipëri');
    expect(el.querySelectorAll('thead th')[2].getAttribute('aria-sort')).toBe('descending');
    btn(2).click();
    expect(names()[0]).toBe('Finlandë–Shqipëri');
    btn(1).click(); // dates: newest first
    expect(names()).toEqual(['Shqipëri–San Marino', 'Finlandë–Shqipëri', 'San Marino–Shqipëri', 'Shqipëri–Bjellorusi']);
    btn(0).click();
    expect(names()[0]).toBe('Finlandë–Shqipëri');
    const input = el.querySelector<HTMLInputElement>('.fxui-tfilter input')!;
    input.value = 'san marino';
    input.dispatchEvent(new Event('input'));
    expect(Array.from(el.querySelectorAll<HTMLElement>('tbody tr')).filter((r) => !r.hidden)).toHaveLength(2);
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    expect(el.querySelector<HTMLElement>('.fxui-tempty')!.hidden).toBe(false);
  });

  it('keeps the reader’s sort and search when a live table gets fresh rows', () => {
    const el = mount();
    const live = { ...doc.blocks[0], id: 'alb', filter: true };
    render(el, { lang: 'sq', blocks: [live] });
    el.querySelectorAll<HTMLButtonElement>('.fxui-sort')[2].click();
    const input = el.querySelector<HTMLInputElement>('.fxui-tfilter input')!;
    input.value = 'shqipëri';
    input.dispatchEvent(new Event('input'));
    update(el, 'alb', { rows: [...live.rows, ['Shqipëri–Finlandë', '2026-11-12', 4]] });
    const first = el.querySelector('tbody tr')!.querySelector('td')!.textContent;
    expect(first).toBe('Shqipëri–Finlandë');
    expect(el.querySelectorAll('thead th')[2].getAttribute('aria-sort')).toBe('descending');
    expect(el.querySelector<HTMLInputElement>('.fxui-tfilter input')!.value).toBe('shqipëri');
  });
});
