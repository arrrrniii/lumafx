/**
 * Renders lumafx/ui blocks to HTML strings. Isomorphic: the same function renders on the server
 * (for SEO, blogs and emails of the page) and in the browser; interactivity is attached separately
 * by `mount` functions in the browser build.
 */
import { validate, type Block, type Doc } from './schema';
import { labels } from './i18n';
import { esc, md, type Fmt } from './html';
import { content } from './blocks/content';
import { data } from './blocks/data';
import { sport } from './blocks/sport';
import { events } from './blocks/event';

export interface RenderOptions {
  /** Label language: en or sq. Default: the document's lang, else en. */
  lang?: string;
  /** Number and date locale, e.g. "sq-AL". Default: from lang. */
  locale?: string;
  /** Time zone for dates, e.g. "Europe/Tirane". Default: the viewer's. */
  timeZone?: string;
  /** Embed the JSON so the browser can make the HTML interactive (`hydrate`). Default true. */
  embed?: boolean;
  /** Current time, for countdowns and tests. */
  now?: number;
  /** Validate while the JSON is still streaming in. */
  partial?: boolean;
  /** Force a theme. Default: follows the page ([data-theme], .dark) or the system. */
  theme?: 'light' | 'dark';
}

export interface Ctx extends Fmt {
  t: (key: string) => string;
  lang: string;
  now: number;
  uid: (prefix?: string) => string;
  blocks: (list: unknown) => string;
}

export type Renderer = (b: Block & Record<string, any>, c: Ctx) => string;

export const RENDERERS: Record<string, Renderer> = { ...content, ...data, ...sport, ...events };

let docs = 0;

export function makeCtx(o: RenderOptions & { lang: string }): Ctx {
  let n = 0;
  // Ids stay unique when several documents share a page.
  const seed = (++docs).toString(36) + Math.random().toString(36).slice(2, 5);
  const ctx: Ctx = {
    lang: o.lang,
    locale: o.locale ?? (o.lang === 'sq' ? 'sq-AL' : 'en-GB'),
    timeZone: o.timeZone,
    now: o.now ?? Date.now(),
    t: labels(o.lang),
    uid: (p = 'u') => `fxui-${p}-${seed}${(n++).toString(36)}`,
    blocks: (list) => (Array.isArray(list) ? list.map((b) => renderBlock(b as Block, ctx)).join('') : ''),
  };
  return ctx;
}

/** One block, wrapped in its section with the optional title and note. */
export function renderBlock(b: Block, c: Ctx): string {
  const r = RENDERERS[b.type];
  if (!r) return '';
  let body = '';
  try {
    body = r(b as Block & Record<string, any>, c);
  } catch (err) {
    // A half-streamed block may not render yet; it will on the next chunk.
    body = '';
    if (typeof console !== 'undefined') console.debug?.('[lumafx/ui]', b.type, err);
  }
  const title = typeof b.title === 'string' && b.title ? `<h3 class="fxui-title">${esc(b.title)}</h3>` : '';
  const note = typeof b.note === 'string' && b.note ? `<div class="fxui-note">${md(b.note)}</div>` : '';
  const id = typeof b.id === 'string' && b.id ? ` data-id="${esc(b.id)}"` : '';
  return `<section class="fxui-b fxui-b-${esc(b.type)}" data-type="${esc(b.type)}"${id}>${title}${body}${note}</section>`;
}

/** Every block in document order, nested ones included: the order of `.fxui-b` sections in the DOM. */
export function flatten(blocks: Block[]): Block[] {
  const out: Block[] = [];
  const walk = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const b of list as Block[]) {
      if (!b || !RENDERERS[b.type]) continue;
      out.push(b);
      if (b.type === 'group') walk(b.blocks);
      if (b.type === 'tabs' && Array.isArray(b.tabs)) for (const tab of b.tabs as { blocks?: unknown }[]) walk(tab?.blocks);
    }
  };
  walk(blocks);
  return out;
}

/** Renders a document (or blocks, or JSON text) to HTML. */
export function renderToString(input: unknown, o: RenderOptions = {}): string {
  const { doc } = validate(input, { partial: o.partial ?? true });
  const lang = o.lang ?? doc.lang ?? 'en';
  const c = makeCtx({ ...o, lang });
  const embed = o.embed !== false ? `<script type="application/json" class="fxui-data">${JSON.stringify(doc).replace(/</g, '\\u003c')}</script>` : '';
  const theme = o.theme === 'light' || o.theme === 'dark' ? ` data-theme="${o.theme}"` : '';
  return `<div class="fxui" lang="${esc(lang)}"${theme}>${doc.blocks.map((b) => renderBlock(b, c)).join('')}${embed}</div>`;
}

export type { Block, Doc };
