/** String helpers for lumafx/ui renderers. Everything a model wrote passes through `esc` or `md`. */

export const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const SAFE_URL = /^(https?:|mailto:|tel:|(?![a-z][a-z0-9+.-]*:)[^\s])/i;
export const safeUrl = (u: unknown) => {
  // Browsers drop tabs and newlines inside URLs ("java\nscript:"), so remove them before checking.
  const s = String(u ?? '').replace(/[\u0000-\u0020\u007f]+/g, '');
  return SAFE_URL.test(s) || /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(s) ? s : '';
};
export const isExternal = (u: string) => /^https?:\/\//i.test(u);

/** `<a>` attributes for a link that may leave the page. */
export const linkAttrs = (u: string) => `href="${esc(u)}"${isExternal(u) ? ' target="_blank" rel="noopener"' : ''}`;

const COLOR = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([\d\s.,%/+-]+\)|[a-z]{3,24})$/i;
export const safeColor = (c: unknown, fallback = '') => (typeof c === 'string' && COLOR.test(c.trim()) ? c.trim() : fallback);

/** Inline markdown: **bold**, *italic*, `code`, [text](url). Input is escaped first. */
function inline(s: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
      const u = safeUrl(url.replace(/&amp;/g, '&'));
      return u ? `<a ${linkAttrs(u)}>${text}</a>` : text;
    });
}

/** Small, safe markdown: paragraphs, "- " and "1. " lists, line breaks, inline styles. */
export function md(src: unknown) {
  const text = String(src ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  const out: string[] = [];
  for (const chunk of text.split(/\n{2,}/)) {
    const lines = chunk.split('\n');
    if (lines.every((l) => /^\s*>\s?/.test(l))) out.push(`<blockquote>${lines.map((l) => inline(l.replace(/^\s*>\s?/, ''))).join('<br>')}</blockquote>`);
    else if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`);
    else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`);
    else if (/^#{1,4}\s/.test(lines[0])) out.push(`<h4>${inline(lines[0].replace(/^#+\s/, ''))}</h4>${lines.length > 1 ? `<p>${lines.slice(1).map(inline).join('<br>')}</p>` : ''}`);
    else out.push(`<p>${lines.map(inline).join('<br>')}</p>`);
  }
  return out.join('');
}

/* ------------------------------------------------------------------ formatting */

export interface Fmt {
  locale: string;
  timeZone?: string;
}

export function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* Some browsers and runtimes ship without Albanian date data (trimmed ICU): format it ourselves. */
const NAMES: Record<string, { days: string[]; months: string[] }> = {
  sq: { days: ['die', 'hën', 'mar', 'mër', 'enj', 'pre', 'sht'], months: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'korr', 'gush', 'sht', 'tet', 'nën', 'dhj'] },
};
const supported = new Map<string, boolean>();
function hasLocale(locale: string) {
  if (!supported.has(locale)) {
    let ok = true;
    try {
      ok = Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
    } catch {
      ok = false;
    }
    supported.set(locale, ok);
  }
  return supported.get(locale)!;
}
const EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function ownFormat(names: { days: string[]; months: string[] }, f: Fmt, d: Date, kind: string, hasTime: boolean) {
  const parts: Record<string, string> = {};
  try {
    for (const p of new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: f.timeZone }).formatToParts(d)) parts[p.type] = p.value;
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
  const day = names.days[EN_DAYS.indexOf(parts.weekday)] ?? '';
  const month = names.months[Number(parts.month) - 1] ?? '';
  parts.day = String(Number(parts.day));
  const time = `${parts.hour}:${parts.minute}`;
  if (kind === 'time') return time;
  if (kind === 'date') return `${parts.day} ${month} ${parts.year}`;
  if (kind === 'day') return `${day}, ${parts.day} ${month}`;
  if (kind === 'short') return `${parts.day} ${month}`;
  if (kind === 'dom') return parts.day;
  if (kind === 'month') return month;
  return hasTime ? `${day}, ${parts.day} ${month}, ${time}` : `${day}, ${parts.day} ${month} ${parts.year}`;
}

export function fmtDate(f: Fmt, v: unknown, kind: 'date' | 'time' | 'datetime' | 'day' | 'short' | 'dom' | 'month' = 'datetime') {
  const d = parseDate(v);
  if (!d) return esc(v);
  const hasTime = typeof v === 'string' && /T\d\d:\d\d/.test(v);
  const own = NAMES[f.locale.slice(0, 2).toLowerCase()];
  if (own && !hasLocale(f.locale)) return esc(ownFormat(own, f, d, kind, hasTime));
  const o: Intl.DateTimeFormatOptions =
    kind === 'time'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : kind === 'date'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : kind === 'day'
          ? { weekday: 'short', day: 'numeric', month: 'short' }
          : kind === 'short'
            ? { day: 'numeric', month: 'short' }
            : kind === 'dom'
              ? { day: 'numeric' }
              : kind === 'month'
                ? { month: 'short' }
                : hasTime
              ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }
              : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  try {
    return esc(new Intl.DateTimeFormat(f.locale, { ...o, timeZone: f.timeZone }).format(d));
  } catch {
    return esc(d.toISOString().slice(0, 16).replace('T', ' '));
  }
}

export function fmtNum(f: Fmt, n: unknown, o: Intl.NumberFormatOptions = {}) {
  if (typeof n !== 'number') return esc(n);
  try {
    return new Intl.NumberFormat(f.locale, o).format(n);
  } catch {
    return String(n);
  }
}

export function money(f: Fmt, n: unknown, currency = 'EUR') {
  if (typeof n !== 'number') return esc(n);
  try {
    return new Intl.NumberFormat(f.locale, { style: 'currency', currency, maximumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
  } catch {
    return `${n} ${esc(currency)}`;
  }
}

export const initials = (name: unknown) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/* ------------------------------------------------------------------ icons (stroke, currentColor) */

const svg = (body: string, cls = '') => `<svg class="fxui-i ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS: Record<string, string> = {
  sun: svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"/>', 'sun'),
  night: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  partly: svg('<circle cx="8.5" cy="8.5" r="3.2"/><path d="M8.5 2.6v1.4M2.6 8.5H4M4.3 4.3l1 1M12.7 4.3l-1 1"/><path d="M8 19h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.4 1.5A2.8 2.8 0 0 0 8 19z"/>', 'partly'),
  cloud: svg('<path d="M7 19h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 19z"/>'),
  rain: svg('<path d="M7 15h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>', 'rain'),
  storm: svg('<path d="M7 14h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14z"/><path d="M12.5 14.5l-2 3.5h3l-2 3.5"/>'),
  snow: svg('<path d="M7 14h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 14z"/><path d="M8.5 18v.01M12 19.5v.01M15.5 18v.01M10 21.5v.01M14 21.5v.01"/>'),
  fog: svg('<path d="M4 9h16M3 13h18M5 17h14M8 21h8"/>'),
  wind: svg('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  calendar: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  ticket: svg('<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2.2a2.3 2.3 0 0 0 0 4.6v2.2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2.2a2.3 2.3 0 0 0 0-4.6z"/><path d="M14 6v12" stroke-dasharray="1.5 2"/>'),
  check: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  up: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  star: '<svg class="fxui-i star" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z"/></svg>',
  shield: svg('<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>'),
  ball: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.6l3.3 2.4-1.3 3.9H10l-1.3-3.9zM12 3.4v4.2M15.3 10l4-1.3M14 13.9l2.5 3.4M10 13.9l-2.5 3.4M8.7 10l-4-1.3"/>'),
  swap: svg('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
  monitor: svg('<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>'),
  users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 4.8a3.2 3.2 0 0 1 0 6.4M20.5 19.5a5.5 5.5 0 0 0-3.5-5.1"/>'),
  train: svg('<rect x="5" y="3.5" width="14" height="13" rx="3"/><path d="M5 11h14M8.5 20l1.5-3.5M15.5 20L14 16.5M8.5 14h.01M15.5 14h.01"/>'),
  info: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.5M12 7.8v.01"/>'),
  warn: svg('<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5M12 17.5v.01"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  play: svg('<path d="M8 5.5v13l10.5-6.5z"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  table: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>'),
  spotify: svg('<circle cx="12" cy="12" r="8.6"/><path d="M7.6 9.6c3-.9 6.4-.6 9 .9M8.2 12.6c2.4-.7 5-.4 7.2.8M8.8 15.4c1.9-.5 3.8-.3 5.5.6"/>'),
  youtube: svg('<rect x="2.8" y="5.5" width="18.4" height="13" rx="3.6"/><path d="M10.2 9.4v5.2l4.4-2.6z" fill="currentColor"/>'),
  instagram: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><path d="M16.9 7.1v.01"/>'),
};

export const icon = (name: string) => ICONS[name] ?? '';
