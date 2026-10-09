/**
 * Plain-text version of a UI document: for MCP hosts and models that show no UI, for screen
 * readers, for feeds and for the model's own context after it rendered something.
 */
import type { Block, Doc } from './schema';

const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const s = (v: unknown) => (v === undefined || v === null ? '' : String(v));
const join = (parts: unknown[], sep = ' · ') => parts.map(s).filter(Boolean).join(sep);

const TEXT: Record<string, (b: any) => string> = {
  text: (b) => s(b.md),
  callout: (b) => s(b.text),
  details: (b) => arr(b.items).map((i) => `${i.label}: ${i.value}`).join('\n'),
  faq: (b) => arr(b.items).map((i) => `Q: ${i.q}\nA: ${i.a}`).join('\n'),
  table: (b) => [arr(b.columns).map((c) => c.label).join(' | '), ...arr(b.rows).map((r) => arr(r).join(' | '))].join('\n'),
  stats: (b) => arr(b.items).map((i) => `${i.label}: ${i.value}${i.unit ? ' ' + i.unit : ''}${typeof i.delta === 'number' ? ` (${i.delta > 0 ? '+' : ''}${i.delta}%)` : ''}`).join('\n'),
  chart: (b) => arr(b.series).map((x) => `${x.name}: ${arr(b.labels).map((l, i) => `${l} ${arr(x.values)[i] ?? '—'}`).join(', ')}`).join('\n'),
  steps: (b) => arr(b.items).map((i, k) => `${k + 1}. ${i.title}${i.text ? ' – ' + i.text : ''}`).join('\n'),
  timeline: (b) => arr(b.items).map((i) => `${i.time} ${i.title}`).join('\n'),
  compare: (b) => arr(b.items).map((i) => `${i.name}${i.price ? ` (${i.price})` : ''}: ${Object.entries(i.values ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')}`).join('\n'),
  product: (b) => join([b.name, b.price !== undefined ? `${b.price} ${b.currency ?? ''}`.trim() : '', b.url]),
  quote: (b) => `“${s(b.text)}”${b.author ? ` – ${b.author}` : ''}`,
  progress: (b) => arr(b.items).map((i) => `${i.label}: ${i.value}${i.max ? '/' + i.max : '%'}`).join('\n'),
  weather: (b) => join([b.location, b.now ? `${b.now.temp}°, ${b.now.condition}` : '', ...arr(b.days).map((d) => `${d.day} ${d.lo}–${d.hi}°`)], '; '),
  places: (b) => arr(b.items).map((p) => join([p.name, p.category, p.address, p.rating ? `★${p.rating}` : ''])).join('\n'),
  itinerary: (b) => arr(b.days).map((d) => `${d.label}: ${arr(d.stops).map((x) => join([x.time, x.name], ' ')).join(', ')}`).join('\n'),
  quiz: (b) => arr(b.questions).map((q) => `${q.q} (${arr(q.options).join(' / ')})`).join('\n'),
  actions: (b) => arr(b.buttons).map((x) => `${x.label}: ${x.url}`).join('\n'),
  suggestions: (b) => arr(b.items).map((x) => `→ ${x.text}`).join('\n'),
  sources: (b) => arr(b.items).map((x, i) => `[${i + 1}] ${x.title} – ${x.url}`).join('\n'),
  countdown: (b) => join([b.label, b.to]),
  match: (b) =>
    join([
      `${b.home?.name ?? ''} ${Array.isArray(b.score) && b.score.length === 2 ? `${b.score[0]}–${b.score[1]}` : 'vs'} ${b.away?.name ?? ''}`,
      b.status === 'live' ? `live ${s(b.minute)}` : b.status,
      b.kickoff,
      b.competition,
      b.venue,
    ]),
  lineup: (b) => {
    const p = arr(b.players).map((x) => `${x.name}${x.number !== undefined ? ` (${x.number})` : ''}`);
    return `${b.team?.name ?? ''}${b.formation ? ` ${b.formation}` : ''}: ${p.join(', ')}${b.coach ? `. Coach: ${b.coach}` : ''}`;
  },
  events: (b) => arr(b.items).map((e) => join([e.minute, e.type, e.player ?? e.in, e.score], ' ')).join('\n'),
  'match-stats': (b) => arr(b.items).map((i) => `${i.label}: ${i.home}${i.unit ?? ''} – ${i.away}${i.unit ?? ''}`).join('\n'),
  standings: (b) => arr(b.rows).map((r) => join([`${r.pos}. ${r.team}`, r.played !== undefined ? `P${r.played}` : '', r.points !== undefined ? `${r.points} pts` : ''], ' ')).join('\n'),
  h2h: (b) => arr(b.matches).map((m) => `${m.date} ${m.home} ${m.score} ${m.away}`).join('\n'),
  player: (b) => join([b.name, b.position, b.team, ...arr(b.stats).map((x) => `${x.label} ${x.value}`)]),
  scoreboard: (b) => join([`${b.home?.name ?? ''} ${arr(b.total).join('–')} ${b.away?.name ?? ''}`, b.clock, b.status]),
  tennis: (b) => `${arr(b.players).map((p) => p.name).join(' vs ')}: ${arr(b.sets).map((x) => `${x.a}-${x.b}`).join(', ')}`,
  race: (b) => arr(b.rows).map((r) => join([`${r.pos}. ${r.name}`, r.team, r.time ?? r.gap], ' ')).join('\n'),
  fight: (b) => `${arr(b.fighters).map((f) => f.name).join(' vs ')}${b.result ? ` – ${arr(b.fighters)[b.result.winner]?.name ?? ''} by ${b.result.method}` : ''}`,
  bracket: (b) => arr(b.rounds).map((r) => `${r.name}: ${arr(r.matches).map((m) => `${m.a?.name} ${s(m.a?.score)}–${s(m.b?.score)} ${m.b?.name}`).join('; ')}`).join('\n'),
  event: (b) => join([b.name, b.start, b.venue?.name, b.priceFrom !== undefined ? `from ${b.priceFrom} ${b.currency ?? ''}`.trim() : '', b.url]),
  tickets: (b) => arr(b.tiers).map((t) => `${t.name}: ${t.price} ${b.currency ?? ''}${t.status === 'sold-out' ? ' (sold out)' : ''}`.trim()).join('\n'),
  venue: (b) => join([b.name, b.address, b.city, b.capacity ? `capacity ${b.capacity}` : '']),
  schedule: (b) => arr(b.items).map((x) => join([x.time, x.name, x.stage], ' ')).join('\n'),
  zones: (b) => arr(b.zones).map((z) => `${z.name}${z.price !== undefined ? `: ${z.price} ${b.currency ?? ''}` : ''}${z.status === 'sold-out' ? ' (sold out)' : ''}`.trim()).join('\n'),
};

export function blockToText(b: Block): string {
  const nested = b.type === 'group' ? arr(b.blocks) : b.type === 'tabs' ? arr(b.tabs).flatMap((t) => [{ type: 'text', md: `## ${t.label}` }, ...arr(t.blocks)]) : null;
  const body = nested ? nested.map((x) => blockToText(x as Block)).filter(Boolean).join('\n\n') : (TEXT[b.type]?.(b) ?? '');
  return [b.title ? `## ${b.title}` : '', body, b.note ? s(b.note) : ''].filter(Boolean).join('\n');
}

/** The whole document as readable text. */
export function toText(doc: Doc): string {
  return doc.blocks.map(blockToText).filter(Boolean).join('\n\n');
}
