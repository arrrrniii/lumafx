/**
 * schema.org structured data from the same blocks the page shows, so search engines and AI
 * assistants read the facts the readers see: events with offers and performers, matches, FAQs,
 * fixtures, listings, videos and the article itself.
 */
import { validate, type Block } from './schema';
import { flatten } from './render';
import { safeUrl } from './html';
import { parseVideo } from './blocks/media';

export interface PageMeta {
  /** Canonical URL of the page; used for @id values. */
  url?: string;
  /** Adds an article node. Default type NewsArticle. */
  headline?: string;
  type?: 'NewsArticle' | 'Article' | 'BlogPosting';
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string | { name: string; url?: string; type?: 'Person' | 'Organization' };
  publisher?: { name: string; logo?: string; url?: string };
  inLanguage?: string;
  breadcrumbs?: { name: string; url: string }[];
}

type Node = Record<string, unknown>;
const S = 'https://schema.org/';
const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const clean = <T extends Node>(o: T): T => {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) delete o[k];
  }
  return o;
};
/** Markdown to plain text for answers and descriptions. */
const plain = (s: unknown) =>
  String(s ?? '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const money = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Number(n.toFixed(2)) : undefined);
const iso4217 = (c: unknown) => (typeof c === 'string' && /^[A-Z]{3}$/.test(c.trim().toUpperCase()) ? c.trim().toUpperCase() : undefined);

const STATUS: Record<string, string> = { cancelled: 'EventCancelled', postponed: 'EventPostponed' };
const eventStatus = (s?: string) => S + (STATUS[s ?? ''] ?? 'EventScheduled');
const availability = (s?: string, remaining?: number) =>
  S + (s === 'sold-out' || remaining === 0 ? 'SoldOut' : s === 'few-left' || (typeof remaining === 'number' && remaining < 50) ? 'LimitedAvailability' : 'InStock');
const MUSIC = /music|muzik|concert|koncert|festival|dj|club|klub|live|rock|jazz|pop|techno|house/i;

function place(v: any, venue?: any): Node | undefined {
  const name = typeof v === 'string' ? v : v?.name ?? venue?.name;
  if (!name) return undefined;
  const city = (typeof v === 'object' && v?.city) || venue?.city;
  const street = (typeof v === 'object' && v?.address) || venue?.address;
  return clean({
    '@type': 'Place',
    name,
    address: city || street ? clean({ '@type': 'PostalAddress', streetAddress: street, addressLocality: city }) : undefined,
    geo: typeof venue?.lat === 'number' && typeof venue?.lng === 'number' ? { '@type': 'GeoCoordinates', latitude: venue.lat, longitude: venue.lng } : undefined,
  });
}

function performers(blocks: Block[]): Node[] {
  return blocks
    .filter((b) => b.type === 'artists')
    .flatMap((b) => arr(b.items))
    .map((a) =>
      clean({
        '@type': 'PerformingGroup',
        name: a.name,
        image: safeUrl(a.image) || undefined,
        url: safeUrl(a.url) || undefined,
        sameAs: [a.spotify, a.youtube, a.instagram].map(safeUrl).filter(Boolean),
      }),
    );
}

function offers(tickets: Block | undefined, fallback: { price?: number; currency?: string; url?: string; status?: string; until?: string }): Node | Node[] | undefined {
  if (tickets) {
    const cur = iso4217(tickets.currency);
    const list = arr(tickets.tiers).map((t) =>
      clean({
        '@type': 'Offer',
        name: t.name,
        price: money(t.price),
        priceCurrency: cur,
        availability: availability(t.status, t.remaining),
        url: safeUrl(tickets.url) || fallback.url || undefined,
        validThrough: tickets.closes ?? fallback.until,
      }),
    );
    if (list.length) return list;
  }
  if (typeof fallback.price === 'number')
    return clean({ '@type': 'Offer', price: money(fallback.price), priceCurrency: iso4217(fallback.currency), url: fallback.url, availability: availability(fallback.status), validThrough: fallback.until });
  return undefined;
}

/** A schema.org @graph for a document (and optionally the article it sits in). */
export function jsonLd(input: unknown, meta: PageMeta = {}): { '@context': string; '@graph': Node[] } {
  const { doc } = validate(input);
  const blocks = flatten(doc.blocks) as Block[];
  const graph: Node[] = [];
  const base = safeUrl(meta.url) || '';
  const id = (k: string) => (base ? `${base}#${k}` : undefined);
  const about: Node[] = [];
  const tickets = blocks.find((b) => b.type === 'tickets');
  const venue = blocks.find((b) => b.type === 'venue') as any;
  const perf = performers(blocks);
  let n = 0;

  for (const b of blocks as any[]) {
    switch (b.type) {
      case 'event': {
        const music = MUSIC.test(`${b.category ?? ''} ${b.name ?? ''}`) || perf.length > 0;
        const node = clean({
          '@type': music ? 'MusicEvent' : 'Event',
          '@id': id(`event-${++n}`),
          name: b.name,
          startDate: b.start,
          endDate: b.end,
          eventStatus: eventStatus(b.status),
          eventAttendanceMode: S + 'OfflineEventAttendanceMode',
          location: place(b.venue, venue),
          image: safeUrl(b.image) || undefined,
          url: safeUrl(b.url) || undefined,
          offers: offers(tickets, { price: b.priceFrom, currency: b.currency, url: safeUrl(b.url) || undefined, status: b.status, until: b.salesEnd }),
          performer: perf.length ? perf : arr<string>(b.artists).map((name) => ({ '@type': 'PerformingGroup', name })),
        });
        graph.push(node);
        if (node['@id']) about.push({ '@id': node['@id'] });
        break;
      }
      case 'match': {
        const home = b.home?.name;
        const away = b.away?.name;
        if (!home || !away) break;
        const team = (t: any) => clean({ '@type': 'SportsTeam', name: t.name, logo: safeUrl(t.logo) || undefined });
        const node = clean({
          '@type': 'SportsEvent',
          '@id': id(`match-${++n}`),
          name: `${home} – ${away}`,
          description: [b.competition, b.round].filter(Boolean).join(' · ') || undefined,
          startDate: b.kickoff,
          eventStatus: eventStatus(b.status),
          eventAttendanceMode: S + 'OfflineEventAttendanceMode',
          sport: !b.sport || /football|soccer|futboll/i.test(b.sport) ? 'Football' : b.sport,
          location: place(b.venue, venue),
          homeTeam: team(b.home),
          awayTeam: team(b.away),
          competitor: [team(b.home), team(b.away)],
          url: safeUrl(b.url) || undefined,
          offers: safeUrl(b.tickets) ? clean({ '@type': 'Offer', url: safeUrl(b.tickets), availability: S + 'InStock' }) : undefined,
        });
        graph.push(node);
        if (node['@id']) about.push({ '@id': node['@id'] });
        break;
      }
      case 'faq': {
        const q = arr(b.items).filter((i) => i.q && i.a);
        if (q.length)
          graph.push({
            '@type': 'FAQPage',
            '@id': id('faq'),
            mainEntity: q.map((i) => ({ '@type': 'Question', name: plain(i.q), acceptedAnswer: { '@type': 'Answer', text: plain(i.a) } })),
          });
        break;
      }
      case 'fixtures': {
        const items = arr(b.items).filter((x) => x.home && x.away);
        if (items.length)
          graph.push(
            clean({
              '@type': 'ItemList',
              name: [b.competition, b.round].filter(Boolean).join(' · ') || undefined,
              itemListElement: items.map((x, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: clean({
                  '@type': 'SportsEvent',
                  name: `${x.home} – ${x.away}`,
                  startDate: x.kickoff,
                  eventStatus: eventStatus(x.status),
                  homeTeam: { '@type': 'SportsTeam', name: x.home },
                  awayTeam: { '@type': 'SportsTeam', name: x.away },
                  location: x.venue ? { '@type': 'Place', name: x.venue } : undefined,
                  url: safeUrl(x.url) || undefined,
                }),
              })),
            }),
          );
        break;
      }
      case 'listing': {
        const items = arr(b.items).filter((x) => x.title && x.start);
        if (items.length)
          graph.push({
            '@type': 'ItemList',
            itemListElement: items.map((x, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: clean({
                '@type': MUSIC.test(`${x.category ?? ''}`) ? 'MusicEvent' : 'Event',
                name: x.title,
                startDate: x.start,
                endDate: x.end,
                eventStatus: eventStatus(x.status),
                eventAttendanceMode: S + 'OfflineEventAttendanceMode',
                location: x.venue ? { '@type': 'Place', name: x.venue } : undefined,
                image: safeUrl(x.image) || undefined,
                url: safeUrl(x.url) || undefined,
                offers: typeof x.price === 'number' ? clean({ '@type': 'Offer', price: money(x.price), priceCurrency: iso4217(x.currency), availability: availability(x.status) }) : undefined,
              }),
            })),
          });
        break;
      }
      case 'video': {
        const items = arr(b.items).length ? arr(b.items) : b.url ? [b] : [];
        for (const v of items) {
          const ref = parseVideo(v.url, v.start);
          if (!ref) continue;
          graph.push(
            clean({
              '@type': 'VideoObject',
              name: v.title ?? b.title,
              description: v.title ?? b.title,
              thumbnailUrl: safeUrl(v.poster) || ref.poster || undefined,
              embedUrl: ref.embed.split('?')[0],
              contentUrl: ref.watch,
              uploadDate: v.date ?? b.date,
            }),
          );
        }
        break;
      }
    }
  }

  // A ticketed event for a match on the page is the same thing: fold it into the SportsEvent.
  for (const ev of graph.filter((x) => x['@type'] === 'Event' || x['@type'] === 'MusicEvent')) {
    const t = Date.parse(String(ev.startDate));
    const m = graph.find((x) => x['@type'] === 'SportsEvent' && Number.isFinite(t) && Date.parse(String(x.startDate)) === t);
    if (!m) continue;
    for (const k of ['offers', 'image', 'url', 'location'] as const) if (ev[k] && !m[k]) m[k] = ev[k];
    graph.splice(graph.indexOf(ev), 1);
    const i = about.findIndex((a) => a['@id'] === ev['@id']);
    if (i >= 0) about.splice(i, 1);
  }

  if (meta.headline) {
    const author = typeof meta.author === 'string' ? { name: meta.author } : meta.author;
    const sources = blocks.filter((b) => b.type === 'sources').flatMap((b) => arr(b.items).map((s) => safeUrl(s.url))).filter(Boolean);
    graph.unshift(
      clean({
        '@type': meta.type ?? 'NewsArticle',
        '@id': id('article'),
        headline: meta.headline,
        description: meta.description,
        image: safeUrl(meta.image) || undefined,
        datePublished: meta.datePublished,
        dateModified: meta.dateModified ?? meta.datePublished,
        inLanguage: meta.inLanguage ?? doc.lang,
        mainEntityOfPage: base || undefined,
        author: author ? clean({ '@type': author.type ?? 'Organization', name: author.name, url: author.url }) : undefined,
        publisher: meta.publisher ? clean({ '@type': 'Organization', name: meta.publisher.name, url: meta.publisher.url, logo: meta.publisher.logo ? { '@type': 'ImageObject', url: meta.publisher.logo } : undefined }) : undefined,
        about: about.length ? about : undefined,
        citation: sources.length ? sources : undefined,
      }),
    );
  }
  if (meta.breadcrumbs?.length)
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: meta.breadcrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: safeUrl(c.url) || undefined })),
    });
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** The same, as a <script type="application/ld+json"> tag for the page head or body. */
export function jsonLdScript(input: unknown, meta: PageMeta = {}): string {
  return `<script type="application/ld+json">${JSON.stringify(jsonLd(input, meta)).replace(/</g, '\\u003c')}</script>`;
}
