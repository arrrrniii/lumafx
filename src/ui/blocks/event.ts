import type { Renderer, Ctx } from '../render';
import { esc, safeUrl, linkAttrs, fmtDate, fmtNum, money, icon } from '../html';

const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const STATUS_LABEL: Record<string, string> = { 'on-sale': 'onSale', 'few-left': 'fewLeft', 'sold-out': 'soldOut', free: 'free', cancelled: 'cancelled', postponed: 'postponed', available: 'onSale' };
const statusBadge = (c: Ctx, s?: string) => (s ? `<span class="fxui-badge" data-tone="${s === 'sold-out' || s === 'cancelled' ? 'critical' : s === 'few-left' || s === 'postponed' ? 'warning' : 'good'}">${esc(c.t(STATUS_LABEL[s] ?? s))}</span>` : '');

/** Venue shapes per layout: zone id → SVG shape in a 200×140 box. */
const SHAPES: Record<string, Record<string, string>> = {
  stadium: {
    north: 'M40 8h120a14 14 0 0 1 14 14v6H26v-6A14 14 0 0 1 40 8z',
    south: 'M26 112h148v6a14 14 0 0 1-14 14H40a14 14 0 0 1-14-14z',
    west: 'M8 36a10 10 0 0 1 10-10h4v88h-4a10 10 0 0 1-10-10z',
    east: 'M178 26h4a10 10 0 0 1 10 10v68a10 10 0 0 1-10 10h-4z',
    vip: 'M8 58h14v24H8z',
  },
  arena: {
    stage: 'M60 6h80v18H60z',
    floor: 'M50 32h100v56H50z',
    west: 'M10 30h32v80H10z',
    east: 'M158 30h32v80h-32z',
    south: 'M50 96h100v34H50z',
    vip: 'M10 114h32v18H10z',
  },
  theatre: {
    stage: 'M50 6h100v20H50z',
    floor: 'M36 34h128v48H36z',
    balcony: 'M20 92h160l-10 38H30z',
    'stage-left': 'M12 34h18v48H12z',
    'stage-right': 'M170 34h18v48h-18z',
  },
  club: {
    stage: 'M70 6h60v18H70z',
    floor: 'M30 32h140v64H30z',
    vip: 'M30 104h60v28H30z',
    bar: 'M110 104h60v28h-60z',
  },
};

export const events: Record<string, Renderer> = {
  event: (b, c) => {
    const img = safeUrl(b.image);
    const u = safeUrl(b.url);
    const v = b.venue ?? {};
    const when = b.start ? `${fmtDate(c, b.start)}${b.end ? ` – ${fmtDate(c, b.end, String(b.end).slice(0, 10) === String(b.start).slice(0, 10) ? 'time' : 'datetime')}` : ''}` : '';
    const start = b.start ? new Date(b.start) : null;
    const day = start && !Number.isNaN(start.getTime()) ? `<span class="fxui-datebox"><b>${fmtDate(c, b.start, 'short').replace(/\s.*$/, '')}</b><small>${esc(new Intl.DateTimeFormat(c.locale, { month: 'short', timeZone: c.timeZone }).format(start))}</small></span>` : '';
    return `<article class="fxui-eventcard${img ? '' : ' fxui-noimg'}">${img ? `<div class="fxui-media"><img src="${esc(img)}" alt="" loading="lazy">${day}</div>` : ''}<div class="fxui-body"><div class="fxui-row">${b.category ? `<span class="fxui-chip">${esc(b.category)}</span>` : '<span></span>'}${statusBadge(c, b.status)}</div><strong class="fxui-name">${esc(b.name)}</strong>${
      arr(b.artists).length ? `<span class="fxui-meta">${arr(b.artists).map(esc).join(' · ')}</span>` : ''
    }<ul class="fxui-facts">${when ? `<li>${icon('calendar')}<span>${when}</span></li>` : ''}${v.name ? `<li>${icon('pin')}<span>${esc([v.name, v.city].filter(Boolean).join(', '))}</span></li>` : ''}</ul><div class="fxui-row">${typeof b.priceFrom === 'number' ? `<span class="fxui-price"><small>${esc(c.t('from'))}</small> <strong>${money(c, b.priceFrom, b.currency)}</strong></span>` : '<span></span>'}${
      u && b.status !== 'sold-out' && b.status !== 'cancelled' ? `<a class="fxui-btn" data-variant="primary" ${linkAttrs(u)}>${icon('ticket')}${esc(b.cta ?? c.t('buy'))}</a>` : ''
    }</div></div></article>`;
  },

  tickets: (b, c) => {
    const u = safeUrl(b.url);
    const id = c.uid('tier');
    return `<div class="fxui-tickets" data-url="${esc(u)}"><fieldset><div class="fxui-tiers">${arr(b.tiers)
      .map((t, i) => {
        const sold = t.status === 'sold-out' || t.remaining === 0;
        return `<label data-k="t${i}"${sold ? ' data-sold' : ''}><input type="radio" name="${id}" value="${esc(t.name)}"${sold ? ' disabled' : ''}><span class="fxui-tier"><span class="fxui-row"><strong>${esc(t.name)}</strong><b>${money(c, t.price, b.currency)}</b></span>${
          arr(t.perks).length ? `<ul>${arr(t.perks).map((p) => `<li>${icon('check')}${esc(p)}</li>`).join('')}</ul>` : ''
        }${sold ? statusBadge(c, 'sold-out') : t.status === 'few-left' || (typeof t.remaining === 'number' && t.remaining < 50) ? `<span class="fxui-badge" data-tone="warning">${typeof t.remaining === 'number' ? `${fmtNum(c, t.remaining)} ${esc(c.t('left'))}` : esc(c.t('fewLeft'))}</span>` : ''}</span></label>`;
      })
      .join('')}</div></fieldset>${u ? `<a class="fxui-btn fxui-checkout" data-variant="primary" ${linkAttrs(u)} aria-disabled="true">${icon('ticket')}<span>${esc(c.t('buy'))}</span></a>` : ''}</div>`;
  },

  venue: (b, c) => {
    const img = safeUrl(b.image);
    const u = safeUrl(b.url);
    const q = typeof b.lat === 'number' && typeof b.lng === 'number' ? `${b.lat},${b.lng}` : [b.name, b.address, b.city].filter(Boolean).join(', ');
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    return `<article class="fxui-venue${img ? '' : ' fxui-noimg'}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<div class="fxui-body"><strong class="fxui-name">${u ? `<a ${linkAttrs(u)}>${esc(b.name)}</a>` : esc(b.name)}</strong><ul class="fxui-facts">${b.address || b.city ? `<li>${icon('pin')}<span>${esc([b.address, b.city].filter(Boolean).join(', '))}</span></li>` : ''}${typeof b.capacity === 'number' ? `<li>${icon('users')}<span>${esc(c.t('capacity'))} ${fmtNum(c, b.capacity)}</span></li>` : ''}${arr(b.transport)
      .map((tr) => `<li>${icon('train')}<span>${esc(tr)}</span></li>`)
      .join('')}</ul><a class="fxui-btn" data-variant="secondary" ${linkAttrs(maps)}>${icon('pin')}${esc(c.t('directions'))}</a></div></article>`;
  },

  schedule: (b) =>
    `<ol class="fxui-schedule">${arr(b.items)
      .map((s, i) => {
        const img = safeUrl(s.image);
        return `<li data-k="s${i}"><time>${esc(s.time)}</time>${img ? `<img src="${esc(img)}" alt="">` : '<span class="fxui-dot" aria-hidden="true"></span>'}<div><strong>${esc(s.name)}</strong>${s.stage || s.note ? `<small>${esc([s.stage, s.note].filter(Boolean).join(' · '))}</small>` : ''}</div></li>`;
      })
      .join('')}</ol>`,

  zones: (b, c) => {
    const layout = SHAPES[b.layout ?? 'stadium'] ? (b.layout ?? 'stadium') : 'stadium';
    const shapes = SHAPES[layout];
    const zones = arr(b.zones);
    const known = zones.filter((z) => shapes[z.id]);
    const u = safeUrl(b.url);
    const field =
      layout === 'stadium'
        ? '<rect class="fxui-field" x="30" y="32" width="140" height="76" rx="4"/><path class="fxui-fieldline" d="M100 32v76M30 54h16v32H30M170 54h-16v32h16"/><circle class="fxui-fieldline" cx="100" cy="70" r="11"/>'
        : '';
    return `<div class="fxui-zones" data-url="${esc(u)}"><svg viewBox="0 0 200 140" class="fxui-venuemap" role="group" aria-label="${esc(b.title ?? 'Venue map')}">${field}${Object.entries(shapes)
      .map(([id, d]) => {
        const z = known.find((x) => x.id === id);
        if (!z) return `<path class="fxui-zone" d="${d}" data-off/>`;
        const sold = z.status === 'sold-out';
        return `<path class="fxui-zone" d="${d}" data-zone="${esc(id)}" data-status="${esc(z.status ?? 'available')}" role="button" tabindex="${sold ? -1 : 0}" aria-label="${esc(z.name)}${typeof z.price === 'number' ? `, ${money(c, z.price, b.currency)}` : ''}${sold ? `, ${esc(c.t('soldOut'))}` : ''}"${sold ? ' aria-disabled="true"' : ''}><title>${esc(z.name)}</title></path>`;
      })
      .join('')}</svg><ul class="fxui-zonelist">${zones
      .map(
        (z, i) =>
          `<li data-k="z${i}"><button type="button" data-zone="${esc(z.id)}" data-status="${esc(z.status ?? 'available')}"${z.status === 'sold-out' ? ' disabled' : ''}><i></i><span>${esc(z.name)}</span><b>${typeof z.price === 'number' ? money(c, z.price, b.currency) : ''}</b>${z.status && z.status !== 'available' ? statusBadge(c, z.status) : ''}</button></li>`,
      )
      .join('')}</ul>${u ? `<div class="fxui-zonecta"><span class="fxui-zonesel" aria-live="polite">${esc(c.t('choose'))}</span><a class="fxui-btn" data-variant="primary" ${linkAttrs(u)} aria-disabled="true">${icon('ticket')}<span>${esc(c.t('continue'))}</span></a></div>` : ''}</div>`;
  },
};
