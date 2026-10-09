import type { Renderer, Ctx } from '../render';
import { esc, md, safeUrl, linkAttrs, fmtDate, fmtNum, icon, initials } from '../html';

const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export interface VideoRef {
  provider: 'youtube' | 'vimeo';
  id: string;
  watch: string;
  embed: string;
  poster: string;
}

const YT = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d{6,12})/;

/** Recognises YouTube and Vimeo links. Embed and poster URLs are built here, never taken from input. */
export function parseVideo(url: unknown, start = 0): VideoRef | null {
  const u = safeUrl(url);
  if (!u) return null;
  const s = Math.max(0, Math.floor(Number(start) || 0));
  const yt = YT.exec(u);
  if (yt) {
    const id = yt[1];
    return {
      provider: 'youtube',
      id,
      watch: `https://www.youtube.com/watch?v=${id}${s ? `&t=${s}s` : ''}`,
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1${s ? `&start=${s}` : ''}`,
      poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  const vm = VIMEO.exec(u);
  if (vm) {
    const id = vm[1];
    return { provider: 'vimeo', id, watch: `https://vimeo.com/${id}`, embed: `https://player.vimeo.com/video/${id}?autoplay=1${s ? `#t=${s}s` : ''}`, poster: '' };
  }
  return null;
}

interface VideoItem {
  url: string;
  title?: string;
  channel?: string;
  poster?: string;
  start?: number;
}

function player(v: VideoItem, c: Ctx) {
  const ref = parseVideo(v.url, v.start);
  const poster = safeUrl(v.poster) || ref?.poster || '';
  const href = ref?.watch ?? safeUrl(v.url);
  if (!href) return '';
  const label = `${c.t('play')}: ${v.title ?? ''}`.trim();
  return `<a class="fxui-vplayer" ${linkAttrs(href)}${ref ? ` data-embed="${esc(ref.embed)}" data-provider="${ref.provider}"` : ''} aria-label="${esc(label)}">${
    poster ? `<img src="${esc(poster)}" alt="" loading="lazy">` : ''
  }<span class="fxui-playbtn">${icon('play')}</span><span class="fxui-vmeta">${v.title ? `<strong>${esc(v.title)}</strong>` : ''}${v.channel ? `<small>${esc(v.channel)}</small>` : ''}</span></a>`;
}

const ARTIST_LINKS: [key: string, ico: string, label: string][] = [
  ['spotify', 'spotify', 'Spotify'],
  ['youtube', 'youtube', 'YouTube'],
  ['instagram', 'instagram', 'Instagram'],
];

/** First sentence (or ~160 characters) of a bio, for the card. */
function excerpt(src: string) {
  const text = src.replace(/\s+/g, ' ').replace(/[*_`]/g, '').trim();
  const m = /^(.{40,200}?[.!?])\s/.exec(text + ' ');
  return m ? m[1] : text.length > 170 ? text.slice(0, 160).replace(/\s+\S*$/, '') + '…' : text;
}

export const media: Record<string, Renderer> = {
  video: (b, c) => {
    const items: VideoItem[] = arr<VideoItem>(b.items).length ? arr<VideoItem>(b.items) : b.url ? [{ url: b.url, title: b.title, channel: b.channel, poster: b.poster, start: b.start }] : [];
    if (!items.length) return '';
    const main = player(items[0], c);
    if (items.length === 1) return `<div class="fxui-video" data-k="v0">${main}</div>`;
    return `<div class="fxui-video fxui-playlist"><div class="fxui-stage">${main}</div><ol class="fxui-vlist">${items
      .map((v, i) => {
        const ref = parseVideo(v.url, v.start);
        const poster = safeUrl(v.poster) || ref?.poster || '';
        return `<li data-k="v${i}"><button type="button" data-index="${i}" aria-current="${i === 0}">${poster ? `<img src="${esc(poster)}" alt="" loading="lazy">` : `<span class="fxui-vthumb">${icon('play')}</span>`}<span><strong>${esc(v.title ?? '')}</strong>${v.channel ? `<small>${esc(v.channel)}</small>` : ''}</span></button></li>`;
      })
      .join('')}</ol><script type="application/json" class="fxui-vdata">${JSON.stringify(
      items.map((v) => {
        const ref = parseVideo(v.url, v.start);
        return { href: ref?.watch ?? safeUrl(v.url), embed: ref?.embed ?? '', poster: safeUrl(v.poster) || ref?.poster || '', title: v.title ?? '', channel: v.channel ?? '' };
      }),
    ).replace(/</g, '\\u003c')}</script></div>`;
  },

  artists: (b, c) => {
    const list = arr(b.items);
    const one = list.length === 1;
    return `<ul class="fxui-artists${one ? ' fxui-one' : ''}" role="list">${list
      .map((a, i) => {
        const img = safeUrl(a.image);
        const u = safeUrl(a.url);
        const name = u ? `<a ${linkAttrs(u)}>${esc(a.name)}</a>` : esc(a.name);
        const links = ARTIST_LINKS.map(([k, ico, label]) => {
          const href = safeUrl(a[k]);
          return href ? `<a class="fxui-chip" ${linkAttrs(href)} aria-label="${esc(`${label}: ${a.name}`)}">${icon(ico)}<span>${label}</span></a>` : '';
        }).join('');
        const bio = typeof a.bio === 'string' && a.bio.trim() ? a.bio : '';
        const short = bio ? excerpt(bio) : '';
        return `<li data-k="a${i}"><div class="fxui-aphoto">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span>${esc(initials(a.name))}</span>`}</div><div class="fxui-abody"><strong class="fxui-name">${name}</strong>${
          a.role || arr(a.genres).length ? `<span class="fxui-meta">${[a.role, ...arr<string>(a.genres)].filter(Boolean).map(esc).join(' · ')}</span>` : ''
        }${short ? `<p>${esc(short)}</p>` : ''}${
          bio && short.length < bio.replace(/\s+/g, ' ').length - 5 ? `<details><summary>${esc(c.t('more'))}</summary><div class="fxui-md">${md(bio)}</div></details>` : ''
        }${links ? `<div class="fxui-alinks">${links}</div>` : ''}</div></li>`;
      })
      .join('')}</ul>`;
  },

  poll: (b, c) => {
    const opts = arr(b.options);
    const total = opts.reduce((n, o) => n + (typeof o.votes === 'number' ? o.votes : 0), 0);
    const closes = Date.parse(b.closes);
    const closed = Number.isFinite(closes) && closes <= c.now;
    if (Number.isFinite(closes)) c.expire(closes);
    const name = c.uid('poll');
    const hasVotes = opts.some((o) => typeof o.votes === 'number');
    return `<form class="fxui-poll" data-state="${closed ? 'results' : 'open'}" data-total="${total}"><fieldset${closed ? ' disabled' : ''}><legend>${esc(b.question)}</legend>${opts
      .map((o, i) => {
        const pct = total ? Math.round(((o.votes ?? 0) / total) * 100) : 0;
        return `<label class="fxui-popt" data-k="o${i}" data-votes="${typeof o.votes === 'number' ? o.votes : 0}" style="--p:${pct}%"><input type="radio" name="${name}" value="${i}"><span class="fxui-plabel">${esc(o.label)}</span><span class="fxui-ppct">${hasVotes ? `${pct}%` : ''}</span></label>`;
      })
      .join('')}</fieldset><p class="fxui-pfoot" aria-live="polite"><small>${[
      hasVotes ? `${fmtNum(c, total)} ${esc(c.t('votes'))}` : '',
      closed ? esc(c.t('closed')) : Number.isFinite(closes) ? `${esc(c.t('closes'))} ${fmtDate(c, b.closes)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')}</small></p></form>`;
  },
};
