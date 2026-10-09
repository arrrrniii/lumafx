import type { Renderer } from '../render';
import { esc, md, safeUrl, linkAttrs, fmtDate, money, fmtNum, icon, initials } from '../html';

const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const TONE_ICON: Record<string, string> = { info: 'info', success: 'check', warning: 'warn', danger: 'warn', tip: 'bulb' };

export const content: Record<string, Renderer> = {
  text: (b) => `<div class="fxui-md">${md(b.md)}</div>`,

  callout: (b) => {
    const tone = b.tone ?? 'info';
    return `<div class="fxui-callout" data-tone="${esc(tone)}" role="note">${icon(TONE_ICON[tone] ?? 'info')}<div class="fxui-md">${md(b.text)}</div></div>`;
  },

  group: (b, c) => {
    const layout = b.layout ?? 'stack';
    const cols = Math.max(1, Math.min(4, b.columns ?? (layout === 'row' ? arr(b.blocks).length || 2 : 2)));
    return `<div class="fxui-group" data-layout="${esc(layout)}" style="--cols:${cols}">${c.blocks(b.blocks)}</div>`;
  },

  tabs: (b, c) => {
    const id = c.uid('tab');
    const tabs = arr(b.tabs);
    return `<div class="fxui-tabs"><div class="fxui-tablist" role="tablist">${tabs
      .map((t, i) => `<button type="button" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-k="t${i}">${esc(t.label)}</button>`)
      .join('')}</div>${tabs.map((t, i) => `<div class="fxui-tabpanel" role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}"${i ? ' hidden' : ''}>${c.blocks(t.blocks)}</div>`).join('')}</div>`;
  },

  faq: (b) =>
    `<div class="fxui-faq">${arr(b.items)
      .map((it, i) => `<details data-k="q${i}"><summary><span>${esc(it.q)}</span><i class="fxui-plus" aria-hidden="true"></i></summary><div class="fxui-md">${md(it.a)}</div></details>`)
      .join('')}</div>`,

  details: (b) =>
    `<dl class="fxui-details">${arr(b.items)
      .map((it, i) => {
        const u = safeUrl(it.url);
        const v = u ? `<a ${linkAttrs(u)}>${esc(it.value)}</a>` : esc(it.value);
        return `<div data-k="d${i}"><dt>${it.icon ? `<span class="fxui-emoji" aria-hidden="true">${esc(it.icon)}</span>` : ''}${esc(it.label)}</dt><dd>${v}</dd></div>`;
      })
      .join('')}</dl>`,

  steps: (b) =>
    `<ol class="fxui-steps">${arr(b.items)
      .map((it, i) => `<li data-k="s${i}"><span class="fxui-stepn" aria-hidden="true">${i + 1}</span><div><strong>${esc(it.title)}</strong>${it.text ? `<div class="fxui-md">${md(it.text)}</div>` : ''}</div></li>`)
      .join('')}</ol>`,

  timeline: (b) =>
    `<ol class="fxui-timeline">${arr(b.items)
      .map((it, i) => `<li data-k="e${i}"><time>${esc(it.time)}</time><span class="fxui-dot" aria-hidden="true">${it.icon ? esc(it.icon) : ''}</span><div><strong>${esc(it.title)}</strong>${it.text ? `<div class="fxui-md">${md(it.text)}</div>` : ''}</div></li>`)
      .join('')}</ol>`,

  product: (b, c) => {
    const img = safeUrl(b.image);
    const u = safeUrl(b.url);
    const stars = typeof b.rating === 'number' ? `<span class="fxui-rating" aria-label="${b.rating} / 5">${icon('star')}${fmtNum(c, b.rating, { maximumFractionDigits: 1 })}${b.reviews ? ` <small>(${fmtNum(c, b.reviews)} ${esc(c.t('reviews'))})</small>` : ''}</span>` : '';
    const price = typeof b.price === 'number' ? `<div class="fxui-price"><strong>${money(c, b.price, b.currency)}</strong>${typeof b.oldPrice === 'number' ? `<s>${money(c, b.oldPrice, b.currency)}</s>` : ''}</div>` : '';
    return `<article class="fxui-product${img ? '' : ' fxui-noimg'}">${img ? `<div class="fxui-media"><img src="${esc(img)}" alt="" loading="lazy">${b.badge ? `<mark>${esc(b.badge)}</mark>` : ''}</div>` : ''}<div class="fxui-body"><strong class="fxui-name">${esc(b.name)}</strong>${stars}${b.text ? `<div class="fxui-md">${md(b.text)}</div>` : ''}<div class="fxui-row">${price}${u ? `<a class="fxui-btn" data-variant="primary" ${linkAttrs(u)}>${esc(b.cta ?? c.t('open'))}</a>` : ''}</div></div></article>`;
  },

  gallery: (b) =>
    `<div class="fxui-gallery">${arr(b.images)
      .map((im, i) => {
        const s = safeUrl(im.src);
        return s ? `<figure data-k="g${i}"><img src="${esc(s)}" alt="${esc(im.alt)}" loading="lazy">${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure>` : '';
      })
      .join('')}</div>`,

  image: (b) => {
    const s = safeUrl(b.src);
    return s ? `<figure class="fxui-figure"><img src="${esc(s)}" alt="${esc(b.alt)}" loading="lazy">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>` : '';
  },

  quote: (b) => {
    const img = safeUrl(b.image);
    return `<figure class="fxui-quote"><blockquote>${esc(b.text)}</blockquote>${b.author ? `<figcaption>${img ? `<img src="${esc(img)}" alt="">` : `<span class="fxui-avatar">${esc(initials(b.author))}</span>`}<span><strong>${esc(b.author)}</strong>${b.role ? `<small>${esc(b.role)}</small>` : ''}</span></figcaption>` : ''}</figure>`;
  },

  places: (b, c) =>
    `<ul class="fxui-places">${arr(b.items)
      .map((p, i) => {
        const img = safeUrl(p.image);
        const u = safeUrl(p.url);
        const q = typeof p.lat === 'number' && typeof p.lng === 'number' ? `${p.lat},${p.lng}` : [p.name, p.address].filter(Boolean).join(', ');
        const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
        return `<li data-k="p${i}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="fxui-pin">${icon('pin')}</span>`}<div class="fxui-body"><strong>${u ? `<a ${linkAttrs(u)}>${esc(p.name)}</a>` : esc(p.name)}</strong><span class="fxui-meta">${[p.category, p.price].filter(Boolean).map(esc).join(' · ')}${typeof p.rating === 'number' ? ` <span class="fxui-rating">${icon('star')}${fmtNum(c, p.rating, { maximumFractionDigits: 1 })}</span>` : ''}</span>${p.address ? `<small>${esc(p.address)}</small>` : ''}${p.note ? `<p>${esc(p.note)}</p>` : ''}</div><a class="fxui-btn" data-variant="ghost" ${linkAttrs(maps)} aria-label="${esc(c.t('directions'))}: ${esc(p.name)}">${icon('pin')}<span>${esc(c.t('map'))}</span></a></li>`;
      })
      .join('')}</ul>`,

  itinerary: (b) =>
    `<div class="fxui-itinerary">${arr(b.days)
      .map(
        (d, i) =>
          `<section data-k="day${i}"><h4>${esc(d.label)}</h4><ol>${arr(d.stops)
            .map((s, j) => {
              const u = safeUrl(s.url);
              return `<li data-k="day${i}s${j}">${s.time ? `<time>${esc(s.time)}</time>` : '<time></time>'}<span class="fxui-dot" aria-hidden="true"></span><div><strong>${u ? `<a ${linkAttrs(u)}>${esc(s.name)}</a>` : esc(s.name)}</strong>${s.note ? `<p>${esc(s.note)}</p>` : ''}</div></li>`;
            })
            .join('')}</ol></section>`,
      )
      .join('')}</div>`,

  quiz: (b, c) => {
    const id = c.uid('quiz');
    return `<div class="fxui-quiz">${arr(b.questions)
      .map(
        (q, i) =>
          `<fieldset data-k="q${i}" data-answer="${Number(q.answer)}"><legend>${esc(q.q)}</legend>${arr<string>(q.options)
            .map((o, j) => `<label><input type="radio" name="${id}-${i}" value="${j}"><span>${esc(o)}</span></label>`)
            .join('')}<div class="fxui-feedback" aria-live="polite" hidden><strong></strong>${q.explain ? `<div class="fxui-md">${md(q.explain)}</div>` : ''}</div></fieldset>`,
      )
      .join('')}<p class="fxui-quizscore" aria-live="polite"></p></div>`;
  },

  actions: (b) =>
    `<div class="fxui-actions">${arr(b.buttons)
      .map((x, i) => {
        const u = safeUrl(x.url);
        return u ? `<a class="fxui-btn" data-variant="${esc(x.style ?? (i ? 'secondary' : 'primary'))}" ${linkAttrs(u)} data-k="a${i}">${esc(x.label)}${icon('arrow')}</a>` : '';
      })
      .join('')}</div>`,

  suggestions: (b) =>
    `<ul class="fxui-suggest" role="list">${arr(b.items)
      .map((x, i) => {
        const u = x.url ? safeUrl(x.url) : '';
        const inner = `${icon('arrow')}<span>${esc(x.text)}</span>`;
        return `<li data-k="q${i}">${u ? `<a class="fxui-chip" ${linkAttrs(u)}>${inner}</a>` : `<button type="button" class="fxui-chip" data-ask="${esc(x.text)}">${inner}</button>`}</li>`;
      })
      .join('')}</ul>`,

  sources: (b, c) =>
    `<div class="fxui-sources"><div class="fxui-srchead"><strong>${esc(c.t('sources'))} (${arr(b.items).length})</strong>${b.verified ? `<span class="fxui-badge" data-tone="good">${icon('shield')}${esc(c.t('verified'))}</span>` : ''}${b.checked ? `<small>${esc(c.t('checked'))} ${fmtDate(c, b.checked)}</small>` : ''}</div><ol>${arr(b.items)
      .map((s, i) => {
        const u = safeUrl(s.url);
        const host = u && /^https?:\/\//.test(u) ? u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';
        return `<li data-k="s${i}"><a ${u ? linkAttrs(u) : ''}>${esc(s.title)}</a><small>${[s.publisher ?? host, s.date ? fmtDate(c, s.date, 'date') : ''].filter(Boolean).map((x) => (x === s.publisher || x === host ? esc(x) : x)).join(' · ')}</small></li>`;
      })
      .join('')}</ol></div>`,

  countdown: (b, c) => {
    const target = Date.parse(b.to);
    const left = Math.max(0, (target || 0) - c.now);
    const parts = [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
    const keys = ['days', 'hours', 'minutes', 'seconds'];
    return `<div class="fxui-countdown" data-to="${Number.isFinite(target) ? target : ''}" role="timer"${b.label ? ` aria-label="${esc(b.label)}"` : ''}>${b.label ? `<span class="fxui-cdlabel">${esc(b.label)}</span>` : ''}<div class="fxui-cdparts">${parts
      .map((p, i) => `<span><b data-part="${i}">${String(p).padStart(2, '0')}</b><small>${esc(c.t(keys[i]))}</small></span>`)
      .join('')}</div>${b.to ? `<small class="fxui-cdwhen">${fmtDate(c, b.to)}</small>` : ''}</div>`;
  },
};
