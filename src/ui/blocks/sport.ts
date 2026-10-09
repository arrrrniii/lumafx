import type { Renderer, Ctx } from '../render';
import { esc, md, safeUrl, safeColor, linkAttrs, fmtDate, fmtNum, icon, initials } from '../html';

const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** ISO 3166 alpha-2 code → flag emoji. */
export const flag = (cc: unknown) => (typeof cc === 'string' && /^[a-z]{2}$/i.test(cc) ? String.fromCodePoint(...[...cc.toUpperCase()].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : '');

function crest(team: any, size = 'm') {
  const logo = safeUrl(team?.logo);
  const col = safeColor(team?.color, 'var(--fxui-line)');
  return logo
    ? `<span class="fxui-crest" data-size="${size}"><img src="${esc(logo)}" alt="" loading="lazy"></span>`
    : `<span class="fxui-crest" data-size="${size}" style="--c:${col}"><b>${esc((team?.short ?? initials(team?.name)).slice(0, 3))}</b></span>`;
}

function statusBadge(c: Ctx, status: string | undefined, minute?: string, kickoff?: string, football = false) {
  if (status === 'live') return `<span class="fxui-status" data-s="live"><i></i>${esc(minute || c.t('live'))}</span>`;
  if (status === 'halftime') return `<span class="fxui-status" data-s="ht">${esc(c.t('halftime'))}</span>`;
  if (status === 'finished') return `<span class="fxui-status" data-s="ft">${esc(c.t(football ? 'finished' : 'final'))}</span>`;
  if (status === 'postponed' || status === 'cancelled' || status === 'retired') return `<span class="fxui-status" data-s="off">${esc(c.t(status))}</span>`;
  return kickoff ? `<span class="fxui-status" data-s="pre">${fmtDate(c, kickoff, 'day')}</span>` : `<span class="fxui-status" data-s="pre">${esc(c.t('scheduled'))}</span>`;
}

const FORM: Record<string, string> = { W: 'win', D: 'draw', L: 'loss', F: 'win', B: 'draw', H: 'loss' };
function form(c: Ctx, s: unknown) {
  const letters = String(s ?? '')
    .toUpperCase()
    .replace(/[^WDLFBH]/g, '')
    .slice(-5)
    .split('');
  if (!letters.length) return '';
  return `<span class="fxui-form">${letters.map((l) => `<i data-r="${FORM[l]}" title="${esc(c.t(FORM[l]))}">${esc(l)}</i>`).join('')}</span>`;
}

/* ------------------------------------------------------------------ lineup geometry */

const POS_LINE: Record<string, number> = { GK: 0, G: 0, DF: 1, D: 1, CB: 1, LB: 1, RB: 1, LWB: 1, RWB: 1, MF: 2, M: 2, CM: 2, DM: 2, CDM: 2, AM: 2, CAM: 2, LM: 2, RM: 2, FW: 3, F: 3, ST: 3, CF: 3, LW: 3, RW: 3, A: 3 };

/** Lines (outfield player counts, defence first) from a formation string or the players' positions. */
export function formationLines(formation: unknown, players: any[]): number[] {
  const out = 0 + Math.max(0, players.length - 1);
  const f = String(formation ?? '')
    .split(/[^0-9]+/)
    .map(Number)
    .filter((n) => n > 0);
  if (f.length && f.reduce((a, b) => a + b, 0) === out) return f;
  const counts = [0, 0, 0];
  players.slice(1).forEach((p) => {
    const l = POS_LINE[String(p.pos ?? '').toUpperCase()];
    if (l) counts[l - 1]++;
  });
  if (counts.reduce((a, b) => a + b, 0) === out && out > 0) return counts.filter((n) => n > 0);
  if (f.length) return f; // streaming: a formation with fewer players so far
  if (out === 10) return [4, 4, 2];
  return out > 0 ? [out] : [];
}

/** x/y (0–100, own goal at the bottom) for each player. Explicit x/y wins. */
export function placePlayers(players: any[], formation: unknown, half: 'full' | 'bottom' | 'top' = 'full', expected = 11) {
  const lines = formationLines(formation, players.length >= expected ? players : [...players, ...Array(Math.max(0, expected - players.length)).fill({})]);
  const pos: { x: number; y: number }[] = [];
  const yRange = half === 'full' ? [90, 17] : [92, 58];
  pos.push({ x: 50, y: yRange[0] });
  const L = lines.length;
  lines.forEach((m, k) => {
    const y = L === 1 ? (yRange[0] + yRange[1]) / 2 : yRange[0] - 16 + ((yRange[1] - (yRange[0] - 16)) * k) / (L - 1);
    for (let j = 0; j < m; j++) pos.push({ x: ((j + 1) * 100) / (m + 1), y });
  });
  return players.map((p, i) => {
    let { x, y } = pos[i] ?? { x: 50, y: 50 };
    if (typeof p.x === 'number') x = p.x;
    if (typeof p.y === 'number') y = p.y;
    if (half === 'top') {
      x = 100 - x;
      y = 100 - y;
    }
    return { x, y };
  });
}

function shirt(kit: any, color: string) {
  const body = safeColor(kit?.shirt, color);
  const sleeves = safeColor(kit?.sleeves, body);
  return `<svg class="fxui-shirt" viewBox="0 0 40 36" aria-hidden="true"><path d="M13 2l-9 4-4 9 7 3 2-4v20h22V14l2 4 7-3-4-9-9-4c-1 3-4 5-7 5s-6-2-7-5z" fill="${body}"/><path d="M13 2l-9 4-4 9 7 3 2-4V8.5C11 7 12 4.6 13 2zM27 2l9 4 4 9-7 3-2-4V8.5C29 7 28 4.6 27 2z" fill="${sleeves}"/><path d="M13 2c1 3 4 5 7 5s6-2 7-5" fill="none" stroke="rgb(0 0 0/.25)" stroke-width="1.2"/></svg>`;
}

function players(list: any[], team: any, formation: unknown, half: 'full' | 'bottom' | 'top', c: Ctx, side: string) {
  const color = safeColor(team?.color, safeColor(team?.kit?.shirt, 'var(--fxui-s1)'));
  const numCol = safeColor(team?.kit?.number, '#fff');
  const at = placePlayers(list, formation, half);
  return list
    .map((p, i) => {
      const { x, y } = at[i];
      const gk = i === 0 && (!p.pos || /^G/i.test(p.pos));
      const kit = gk ? { shirt: team?.kit?.gk ?? '#2f3542', sleeves: team?.kit?.gk ?? '#2f3542' } : team?.kit;
      return `<div class="fxui-player" data-k="${side}${i}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--i:${i}" title="${esc([p.name, p.pos].filter(Boolean).join(' · '))}"><span class="fxui-kit">${shirt(kit, color)}<b style="color:${gk ? '#fff' : numCol}">${esc(p.number ?? '')}</b>${p.captain ? `<em title="${esc(c.t('captain'))}">C</em>` : ''}${typeof p.rating === 'number' ? `<u data-good="${p.rating >= 7}">${fmtNum(c, p.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</u>` : ''}</span><span class="fxui-pname">${esc(String(p.name ?? '').split(' ').slice(-1)[0])}</span></div>`;
    })
    .join('');
}

const PITCH = `<svg class="fxui-lines" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="64" height="101"/><path d="M2 52.5h64"/><circle cx="34" cy="52.5" r="9.15"/><circle cx="34" cy="52.5" r=".5" class="fxui-spot"/><rect x="13.85" y="2" width="40.3" height="16.5"/><rect x="24.85" y="2" width="18.3" height="5.5"/><rect x="13.85" y="86.5" width="40.3" height="16.5"/><rect x="24.85" y="97.5" width="18.3" height="5.5"/><path d="M26.7 18.5a9.15 9.15 0 0 0 14.6 0M26.7 86.5a9.15 9.15 0 0 1 14.6 0"/></svg>`;

/* ------------------------------------------------------------------ event icons */

function eventIcon(type: string) {
  if (type === 'goal' || type === 'penalty' || type === 'own-goal') return `<span class="fxui-ev" data-t="goal">${icon('ball')}</span>`;
  if (type === 'missed-penalty') return `<span class="fxui-ev" data-t="miss">${icon('x')}</span>`;
  if (type === 'yellow') return '<span class="fxui-ev" data-t="card"><i class="fxui-card" data-c="yellow"></i></span>';
  if (type === 'second-yellow') return '<span class="fxui-ev" data-t="card"><i class="fxui-card" data-c="yellow"></i><i class="fxui-card" data-c="red"></i></span>';
  if (type === 'red') return '<span class="fxui-ev" data-t="card"><i class="fxui-card" data-c="red"></i></span>';
  if (type === 'sub') return `<span class="fxui-ev" data-t="sub">${icon('swap')}</span>`;
  if (type === 'var') return `<span class="fxui-ev" data-t="var">${icon('monitor')}</span>`;
  return `<span class="fxui-ev">${icon('info')}</span>`;
}

const STATUS_SCORE = (s?: string) => s === 'live' || s === 'halftime' || s === 'finished';

export const sport: Record<string, Renderer> = {
  match: (b, c) => {
    const home = b.home ?? {};
    const away = b.away ?? {};
    const score = arr<number>(b.score);
    const showScore = score.length === 2 && (STATUS_SCORE(b.status) || !b.kickoff);
    const center = showScore
      ? `<div class="fxui-score" aria-label="${esc(c.t('score'))}"><b data-k="sh">${score[0]}</b><span>–</span><b data-k="sa">${score[1]}</b>${arr(b.penalties).length === 2 ? `<small>(${b.penalties[0]}–${b.penalties[1]} ${esc(c.t('pens'))})</small>` : ''}</div>`
      : `<div class="fxui-kick">${b.kickoff ? `<b>${fmtDate(c, b.kickoff, 'time')}</b><small>${fmtDate(c, b.kickoff, 'day')}</small>` : `<b>${esc(c.t('vs'))}</b>`}</div>`;
    const sc = (side: string) =>
      arr(b.scorers)
        .filter((s) => s.team === side)
        .map((s) => `<li>${esc(s.player)} <span>${esc(s.minute)}${s.type === 'penalty' ? ' (P)' : s.type === 'own-goal' ? ' (OG)' : ''}</span></li>`)
        .join('');
    // A scheduled match whose kickoff has passed: say so instead of selling tickets for it.
    const ko = Date.parse(b.kickoff);
    const waiting = (!b.status || b.status === 'scheduled') && Number.isFinite(ko);
    if (waiting) c.expire(ko);
    const started = waiting && ko <= c.now;
    const page = safeUrl(b.url);
    const tickets = started ? '' : safeUrl(b.tickets);
    const meta = [b.venue ? `${icon('pin')}${esc(b.venue)}` : '', b.kickoff && showScore ? `${icon('calendar')}${fmtDate(c, b.kickoff)}` : '', b.tv ? `${icon('monitor')}${esc(b.tv)}` : ''].filter(Boolean);
    const badge = started ? `<span class="fxui-status" data-s="pre">${esc(c.t('resultPending'))}</span>` : statusBadge(c, b.status, b.minute, b.kickoff, !b.sport || /football|soccer|futboll/i.test(b.sport));
    const link = page && (started || STATUS_SCORE(b.status)) ? `<a class="fxui-btn" data-variant="secondary" ${linkAttrs(page)}>${esc(c.t('open'))}${icon('arrow')}</a>` : '';
    return `<div class="fxui-match" data-status="${esc(started ? 'pending' : (b.status ?? 'scheduled'))}"><div class="fxui-matchhead"><span>${esc([b.competition, b.round].filter(Boolean).join(' · '))}</span>${badge}</div><div class="fxui-teams"><div class="fxui-team">${crest(home, 'l')}<strong>${esc(home.name)}</strong>${form(c, home.form)}</div>${center}<div class="fxui-team">${crest(away, 'l')}<strong>${esc(away.name)}</strong>${form(c, away.form)}</div></div>${
      arr(b.scorers).length ? `<div class="fxui-scorers"><ul>${sc('home')}</ul>${icon('ball')}<ul>${sc('away')}</ul></div>` : ''
    }${meta.length || tickets || link ? `<div class="fxui-matchfoot"><span class="fxui-meta">${meta.map((m) => `<span>${m}</span>`).join('')}</span>${tickets ? `<a class="fxui-btn" data-variant="primary" ${linkAttrs(tickets)}>${icon('ticket')}${esc(c.t('buy'))}</a>` : link}</div>` : ''}</div>`;
  },

  fixtures: (b, c) => {
    const items = arr(b.items);
    const timed = items.some((x) => Number.isFinite(Date.parse(x.kickoff)));
    const groups = new Map<string, any[]>();
    for (const x of items) {
      const k = timed && Number.isFinite(Date.parse(x.kickoff)) ? String(x.kickoff).slice(0, 10) : '';
      groups.set(k, [...(groups.get(k) ?? []), x]);
    }
    let n = 0;
    const head = [b.competition, b.round].filter(Boolean).map(esc).join(' · ');
    return `<div class="fxui-fixtures">${head ? `<div class="fxui-matchhead"><span>${head}</span></div>` : ''}${Array.from(groups.entries())
      .map(
        ([k, list]) =>
          `<section>${k ? `<h4>${fmtDate(c, list[0].kickoff, 'day')}</h4>` : ''}<ul role="list">${list
            .map((x) => {
              const ko = Date.parse(x.kickoff);
              const waiting = (!x.status || x.status === 'scheduled') && Number.isFinite(ko);
              if (waiting) c.expire(ko);
              const pending = waiting && ko <= c.now;
              const sc = arr<number>(x.score);
              const has = sc.length === 2 && (STATUS_SCORE(x.status) || !waiting);
              const hw = has && sc[0] > sc[1];
              const aw = has && sc[1] > sc[0];
              const mid = has
                ? `<b class="fxui-fscore"><span data-k="h${n}">${sc[0]}</span>–<span data-k="a${n}">${sc[1]}</span></b>`
                : pending
                  ? `<b class="fxui-fscore" data-pending>${esc(c.t('resultPending'))}</b>`
                  : `<b class="fxui-fscore" data-time>${Number.isFinite(ko) ? fmtDate(c, x.kickoff, 'time') : esc(c.t('vs'))}</b>`;
              const u = safeUrl(x.url);
              const live = x.status === 'live' || x.status === 'halftime' ? `<span class="fxui-badge" data-tone="live"><i class="fxui-pulse"></i>${esc(x.status === 'halftime' ? c.t('halftime') : x.minute ? `${x.minute}` : c.t('live'))}</span>` : '';
              const logo = (l: unknown, name: string) => (safeUrl(l) ? crest({ name, logo: l }, 's') : '');
              const row = `<span class="fxui-fteam" data-win="${hw}">${logo(x.homeLogo, x.home)}<span>${esc(x.home)}</span></span>${mid}<span class="fxui-fteam" data-win="${aw}"><span>${esc(x.away)}</span>${logo(x.awayLogo, x.away)}</span>`;
              return `<li data-k="f${n++}" data-status="${esc(pending ? 'pending' : (x.status ?? 'scheduled'))}">${u ? `<a class="fxui-frow" ${linkAttrs(u)}>${row}</a>` : `<div class="fxui-frow">${row}</div>`}${live}</li>`;
            })
            .join('')}</ul></section>`,
      )
      .join('')}</div>`;
  },

  lineup: (b, c) => {
    const list = arr(b.players);
    const opp = b.opponent;
    const both = opp && arr(opp.players).length > 0;
    const src = b.source && safeUrl(b.source.url);
    const head = `<div class="fxui-lineuphead"><span><strong>${esc(b.team?.name ?? '')}</strong>${b.formation ? ` <span class="fxui-chip">${esc(b.formation)}</span>` : ''}</span><span class="fxui-meta">${b.confirmed === false ? esc(c.t('predicted')) : `${esc(c.t('confirmed'))} (${Math.min(list.length, 11)}/11)`}${src ? ` · <a ${linkAttrs(src)}>${esc(b.source.label)}</a>` : ''}</span></div>`;
    const pitch = `<div class="fxui-pitch${both ? ' fxui-both' : ''}">${PITCH}${players(list, b.team, b.formation, both ? 'bottom' : 'full', c, 'h')}${both ? players(arr(opp.players), opp.team, opp.formation, 'top', c, 'a') : ''}</div>`;
    const bench = arr(b.bench);
    const foot =
      b.coach || bench.length
        ? `<div class="fxui-lineupfoot">${b.coach ? `<div><small>${esc(c.t('coach'))}</small><strong>${esc(b.coach)}</strong></div>` : ''}${bench.length ? `<div><small>${esc(c.t('bench'))}</small><ul>${bench.map((p, i) => `<li data-k="b${i}">${p.number !== undefined ? `<b>${esc(p.number)}</b>` : ''}${esc(p.name)}${p.pos ? ` <span>${esc(p.pos)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}</div>`
        : '';
    return `<div class="fxui-lineup">${head}${both ? `<div class="fxui-oppname"><strong>${esc(opp.team?.name ?? '')}</strong>${opp.formation ? ` <span class="fxui-chip">${esc(opp.formation)}</span>` : ''}</div>` : ''}${pitch}${foot}</div>`;
  },

  events: (b, c) =>
    `<ol class="fxui-events">${b.home || b.away ? `<li class="fxui-evhead"><strong>${esc(b.home ?? '')}</strong><span></span><strong>${esc(b.away ?? '')}</strong></li>` : ''}${arr(b.items)
      .map((e, i) => {
        if (e.type === 'period') return `<li class="fxui-period" data-k="e${i}"><span>${esc(e.note ?? e.minute)}${e.score ? ` · ${esc(e.score)}` : ''}</span></li>`;
        const who =
          e.type === 'sub'
            ? `<span class="fxui-in">${icon('up')}${esc(e.in ?? e.player ?? '')}</span><span class="fxui-out">${icon('down')}${esc(e.out ?? '')}</span>`
            : `<strong>${esc(e.player ?? '')}</strong>${e.assist ? `<small>${esc(e.assist)}</small>` : ''}${e.note ? `<small>${esc(e.note)}</small>` : ''}`;
        const body = `<div class="fxui-evbody" title="${esc(c.t(e.type))}">${eventIcon(e.type)}<span>${who}</span>${e.score ? `<b class="fxui-evscore">${esc(e.score)}</b>` : ''}</div>`;
        return `<li data-k="e${i}" data-side="${esc(e.team ?? 'home')}" data-t="${esc(e.type)}">${e.team === 'away' ? '<div></div>' : body}<time>${esc(e.minute)}</time>${e.team === 'away' ? body : '<div></div>'}</li>`;
      })
      .join('')}</ol>`,

  'match-stats': (b, c) => {
    const hc = safeColor(b.homeColor, 'var(--fxui-s1)');
    const ac = safeColor(b.awayColor, 'var(--fxui-s2)');
    return `<div class="fxui-mstats" style="--h:${hc};--a:${ac}"><div class="fxui-mshead"><strong>${esc(b.home)}</strong><strong>${esc(b.away)}</strong></div>${arr(b.items)
      .map((s, i) => {
        const h = Number(s.home) || 0;
        const a = Number(s.away) || 0;
        const tot = h + a || 1;
        const u = s.unit ? esc(s.unit) : '';
        return `<div class="fxui-msrow" data-k="m${i}"><div class="fxui-row"><b data-win="${h > a}">${fmtNum(c, h)}${u}</b><span>${esc(s.label)}</span><b data-win="${a > h}">${fmtNum(c, a)}${u}</b></div><div class="fxui-msbars"><i style="width:${(h / tot) * 100}%"></i><i style="width:${(a / tot) * 100}%"></i></div></div>`;
      })
      .join('')}</div>`;
  },

  standings: (b, c) => {
    const rows = arr(b.rows);
    const COLS: [string, string][] = [
      ['played', 'played'],
      ['won', 'won'],
      ['drawn', 'drawn'],
      ['lost', 'lost'],
      ['gf', 'gf'],
      ['ga', 'ga'],
      ['gd', 'gd'],
      ['pct', 'pct'],
      ['points', 'points'],
    ];
    const cols = COLS.filter(([k]) => rows.some((r) => r[k] !== undefined));
    const zones = [...new Set(rows.map((r) => r.zone).filter(Boolean))] as string[];
    const hl = String(b.highlight ?? '').toLowerCase();
    return `<div class="fxui-scroll">${b.group ? `<div class="fxui-chip">${esc(b.group)}</div>` : ''}<table class="fxui-table fxui-standings"><thead><tr><th scope="col">#</th><th scope="col" data-align="left"></th>${cols
      .map(([k, l]) => `<th scope="col" data-align="right"${k === 'points' ? ' data-strong' : ''}>${esc(c.t(l))}</th>`)
      .join('')}${rows.some((r) => r.form) ? `<th scope="col">${esc(c.t('form'))}</th>` : ''}</tr></thead><tbody>${rows
      .map((r, i) => {
        const logo = safeUrl(r.logo);
        return `<tr data-k="r${i}"${r.zone ? ` data-zone="${esc(r.zone)}"` : ''}${hl && String(r.team).toLowerCase() === hl ? ' aria-current="true"' : ''}><td class="fxui-pos">${esc(r.pos)}</td><td data-align="left"><span class="fxui-teamcell">${logo ? `<img src="${esc(logo)}" alt="">` : ''}${esc(r.team)}</span></td>${cols
          .map(([k]) => `<td data-align="right"${k === 'points' ? ' data-strong' : ''}>${r[k] === undefined ? '' : k === 'pct' ? fmtNum(c, r[k], { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(/^0/, '') : k === 'gd' && r[k] > 0 ? `+${r[k]}` : fmtNum(c, r[k])}</td>`)
          .join('')}${rows.some((x) => x.form) ? `<td>${form(c, r.form)}</td>` : ''}</tr>`;
      })
      .join('')}</tbody></table>${zones.length ? `<ul class="fxui-zones">${zones.map((z) => `<li data-zone="${esc(z)}"><i></i>${esc(z.charAt(0).toUpperCase() + z.slice(1))}</li>`).join('')}</ul>` : ''}</div>`;
  },

  h2h: (b, c) => {
    const s = b.summary;
    const tot = s ? s.home + s.draw + s.away || 1 : 1;
    return `<div class="fxui-h2h">${
      s
        ? `<div class="fxui-h2hsum"><div class="fxui-row"><span><b>${s.home}</b> ${esc(b.home)}</span><span><b>${s.draw}</b> ${esc(c.t('draws'))}</span><span>${esc(b.away)} <b>${s.away}</b></span></div><div class="fxui-split"><i style="flex:${s.home / tot}" data-c="h"></i><i style="flex:${s.draw / tot}" data-c="d"></i><i style="flex:${s.away / tot}" data-c="a"></i></div></div>`
        : ''
    }<ol>${arr(b.matches)
      .map((m, i) => {
        const [x, y] = String(m.score ?? '')
          .split(/[-–:]/)
          .map((n) => parseInt(n, 10));
        return `<li data-k="m${i}"><time>${fmtDate(c, m.date, 'date')}</time><span${x > y ? ' data-win' : ''}>${esc(m.home)}</span><b>${esc(m.score)}</b><span${y > x ? ' data-win' : ''}>${esc(m.away)}</span>${m.competition ? `<small>${esc(m.competition)}</small>` : ''}</li>`;
      })
      .join('')}</ol></div>`;
  },

  player: (b, c) => {
    const img = safeUrl(b.image);
    return `<article class="fxui-playercard"><div class="fxui-photo">${img ? `<img src="${esc(img)}" alt="">` : `<span>${esc(initials(b.name))}</span>`}${b.number !== undefined ? `<b>${esc(b.number)}</b>` : ''}</div><div class="fxui-body"><strong class="fxui-name">${esc(b.name)}</strong><span class="fxui-meta">${[b.position, b.team, b.nationality, b.age ? `${b.age}` : ''].filter(Boolean).map(esc).join(' · ')}</span>${
      arr(b.stats).length ? `<dl class="fxui-pstats">${arr(b.stats).map((s, i) => `<div data-k="s${i}"><dd>${typeof s.value === 'number' ? fmtNum(c, s.value, { maximumFractionDigits: 2 }) : esc(s.value)}</dd><dt>${esc(s.label)}</dt></div>`).join('')}</dl>` : ''
    }${b.bio ? `<div class="fxui-md fxui-bio">${md(b.bio)}</div>` : ''}</div></article>`;
  },

  scoreboard: (b, c) => {
    const tot = arr(b.total);
    const per = arr(b.periods);
    const leaders = arr(b.leaders);
    return `<div class="fxui-scoreboard" data-status="${esc(b.status ?? 'scheduled')}"><div class="fxui-matchhead"><span>${esc([b.competition, b.sport].filter(Boolean).join(' · '))}</span>${statusBadge(c, b.status, b.clock)}</div><table class="fxui-table fxui-sbt"><thead><tr><th></th>${per.map((p) => `<th scope="col" data-align="center">${esc(p.label)}</th>`).join('')}<th scope="col" data-align="center" data-strong>${esc(c.t('total'))}</th></tr></thead><tbody>${(['home', 'away'] as const)
      .map((side, k) => {
        const t = b[side] ?? {};
        const win = tot.length === 2 && b.status === 'finished' && Number(tot[k]) > Number(tot[1 - k]);
        return `<tr${win ? ' data-win' : ''}><th scope="row"><span class="fxui-teamcell">${crest(t, 's')}${esc(t.name)}</span></th>${per.map((p) => `<td data-align="center">${esc(p[side] ?? '')}</td>`).join('')}<td data-align="center" data-strong>${esc(tot[k] ?? '')}</td></tr>`;
      })
      .join('')}</tbody></table>${leaders.length ? `<ul class="fxui-leaders">${leaders.map((l, i) => `<li data-k="l${i}"><span>${esc((b[l.team] ?? {}).short ?? (b[l.team] ?? {}).name ?? '')}</span><strong>${esc(l.player)}</strong><small>${esc(l.stat)}</small></li>`).join('')}</ul>` : ''}</div>`;
  },

  tennis: (b, c) => {
    const ps = arr(b.players);
    const sets = arr(b.sets);
    const pts = arr(b.points);
    const setsWon = [0, 0];
    sets.forEach((s, i) => {
      if (b.status === 'live' && i === sets.length - 1) return;
      if (s.a > s.b) setsWon[0]++;
      else if (s.b > s.a) setsWon[1]++;
    });
    return `<div class="fxui-tennis" data-status="${esc(b.status ?? 'scheduled')}"><div class="fxui-matchhead"><span>${esc([b.tournament, b.round, b.surface].filter(Boolean).join(' · '))}</span>${statusBadge(c, b.status)}</div><table class="fxui-tennist"><tbody>${ps
      .map((p, k) => {
        const won = b.status === 'finished' && setsWon[k] > setsWon[1 - k];
        return `<tr${won ? ' data-win' : ''}><th scope="row"><span class="fxui-flag">${flag(p.country)}</span>${esc(p.name)}${p.seed ? ` <small>(${esc(p.seed)})</small>` : ''}${p.serving ? `<i class="fxui-serve" title="${esc(c.t('serving'))}"></i>` : ''}${won ? icon('check') : ''}</th>${sets
          .map((s, i) => {
            const mine = k ? s.b : s.a;
            const theirs = k ? s.a : s.b;
            const tb = s.tiebreak ? String(s.tiebreak).split(/[-–]/)[k] : '';
            return `<td data-k="s${i}${k}"${mine > theirs ? ' data-set' : ''}>${esc(mine)}${tb ? `<sup>${esc(tb)}</sup>` : ''}</td>`;
          })
          .join('')}${pts.length === 2 ? `<td class="fxui-pts">${esc(pts[k])}</td>` : ''}</tr>`;
      })
      .join('')}</tbody></table></div>`;
  },

  race: (b, c) =>
    `<div class="fxui-race"><div class="fxui-matchhead"><span>${esc([b.series, b.event, b.session].filter(Boolean).join(' · '))}</span>${b.status ? statusBadge(c, b.status) : ''}</div><div class="fxui-scroll"><table class="fxui-table fxui-plain"><tbody>${arr(b.rows)
      .map(
        (r, i) =>
          `<tr data-k="r${i}"${r.pos <= 3 ? ` data-podium="${r.pos}"` : ''}><td class="fxui-pos">${esc(r.pos)}</td><td data-align="left"><span class="fxui-driver" style="--c:${safeColor(r.color, 'var(--fxui-line)')}"><i></i><span><strong>${esc(r.name)}</strong>${r.team ? `<small>${esc(r.team)}</small>` : ''}</span></span></td><td data-align="right" class="fxui-mono">${esc(r.status ?? (r.pos === 1 ? r.time ?? '' : r.gap ?? r.time ?? ''))}${r.fastest ? ` <span class="fxui-fast" title="${esc(c.t('fastest'))}">${icon('clock')}</span>` : ''}</td>${arr(b.rows).some((x) => x.points !== undefined) ? `<td data-align="right" data-strong>${r.points !== undefined ? `+${fmtNum(c, r.points)}` : ''}</td>` : ''}</tr>`,
      )
      .join('')}</tbody></table></div></div>`,

  fight: (b, c) => {
    const f = arr(b.fighters);
    const res = b.result;
    const card = (x: any, k: number) => {
      const img = safeUrl(x?.image);
      const won = res && res.winner === k;
      return `<div class="fxui-fighter"${won ? ' data-win' : ''}><span class="fxui-photo">${img ? `<img src="${esc(img)}" alt="">` : `<span>${esc(initials(x?.name))}</span>`}</span><strong>${esc(x?.name ?? '')}</strong>${x?.nickname ? `<small>“${esc(x.nickname)}”</small>` : ''}<span class="fxui-meta">${[flag(x?.country) || esc(x?.country ?? ''), x?.record ? esc(x.record) : ''].filter(Boolean).join(' · ')}</span>${won ? `<span class="fxui-badge" data-tone="good">${icon('check')}${esc(c.t('winner'))}</span>` : ''}</div>`;
    };
    return `<div class="fxui-fight"><div class="fxui-matchhead"><span>${esc([b.event, b.division, b.rounds ? `${b.rounds} ${c.t('rounds')}` : ''].filter(Boolean).join(' · '))}</span>${b.status ? statusBadge(c, b.status) : ''}</div><div class="fxui-fighters">${card(f[0], 0)}<span class="fxui-vs">${esc(c.t('vs'))}</span>${card(f[1], 1)}</div>${
      res ? `<div class="fxui-result">${esc(res.method)}${res.round ? ` · ${esc(c.t('round'))} ${esc(res.round)}` : ''}${res.time ? ` · ${esc(res.time)}` : ''}</div>` : ''
    }</div>`;
  },

  bracket: (b) =>
    `<div class="fxui-scroll"><div class="fxui-bracket">${arr(b.rounds)
      .map(
        (r, i) =>
          `<div class="fxui-round" data-k="r${i}"><h4>${esc(r.name)}</h4><div class="fxui-rmatches">${arr(r.matches)
            .map(
              (m, j) =>
                `<div class="fxui-bm" data-k="r${i}m${j}">${(['a', 'b'] as const)
                  .map((s) => `<div${m.winner === s ? ' data-win' : ''}><span>${esc(m[s]?.name ?? '')}</span><b>${esc(m[s]?.score ?? '')}</b></div>`)
                  .join('')}</div>`,
            )
            .join('')}</div></div>`,
      )
      .join('')}</div></div>`,
};
