import type { Renderer, Ctx } from '../render';
import { esc, safeUrl, linkAttrs, fmtDate, fmtNum, money, icon } from '../html';

const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const nums = (v: unknown) => arr(v).map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : NaN));

/** Round axis ticks: 0 / 250 / 500… */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) max = min + 1;
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e9) / 1e9);
  return out;
}

const compact = (c: Ctx, n: number, unit?: string) => {
  const s = Math.abs(n) >= 10000 ? fmtNum(c, n, { notation: 'compact', maximumFractionDigits: 1 }) : fmtNum(c, n, { maximumFractionDigits: 2 });
  return unit === '%' ? `${s}%` : unit ? `${s} ${esc(unit)}` : s;
};

function cellText(c: Ctx, v: unknown, format?: string, currency?: string) {
  if (typeof v === 'number') {
    if (format === 'percent') return `${fmtNum(c, v, { maximumFractionDigits: 1 })}%`;
    if (format === 'money') return money(c, v, currency);
    return fmtNum(c, v, { maximumFractionDigits: 2 });
  }
  if (format === 'date') return fmtDate(c, v, 'date');
  return esc(v);
}

/** The data behind a chart as a plain table (the accessible twin of every chart). */
function chartTable(b: any, c: Ctx, hidden = true) {
  const labels = arr<string>(b.labels);
  const series = arr(b.series);
  return `<table class="fxui-table fxui-charttable"${hidden ? ' hidden' : ''}><thead><tr><th></th>${series.map((s) => `<th scope="col">${esc(s.name)}</th>`).join('')}</tr></thead><tbody>${labels
    .map((l, i) => `<tr><th scope="row">${esc(l)}</th>${series.map((s) => `<td>${Number.isFinite(nums(s.values)[i]) ? compact(c, nums(s.values)[i], b.unit) : '—'}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

const legend = (series: any[], shape: 'line' | 'rect') =>
  series.length > 1 ? `<ul class="fxui-legend">${series.map((s, i) => `<li><i data-shape="${shape}" style="--c:var(--fxui-s${(i % 8) + 1})"></i>${esc(s.name)}</li>`).join('')}</ul>` : '';

function lineChart(b: any, c: Ctx) {
  const labels = arr<string>(b.labels);
  const series = arr(b.series).slice(0, 8);
  const all = series.flatMap((s) => nums(s.values)).filter(Number.isFinite);
  const area = b.kind === 'area';
  const ticks = niceTicks(Math.min(b.min ?? (area ? 0 : Math.min(...all)), ...(area ? [0] : [])), Math.max(b.max ?? -Infinity, ...all));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const n = Math.max(labels.length, ...series.map((s) => arr(s.values).length), 2);
  const X = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const Y = (v: number) => 100 - ((v - lo) / (hi - lo || 1)) * 100;
  const paths = series
    .map((s, si) => {
      const vs = nums(s.values);
      const pts = vs.map((v, i) => (Number.isFinite(v) ? `${X(i).toFixed(2)},${Y(v).toFixed(2)}` : '')).filter(Boolean);
      if (!pts.length) return '';
      const col = `var(--fxui-s${si + 1})`;
      const d = `M${pts.join('L')}`;
      const fill = area ? `<path d="${d}L${X(vs.length - 1).toFixed(2)},100L${X(0).toFixed(2)},100Z" fill="${col}" fill-opacity=".1" stroke="none"/>` : '';
      return `${fill}<path class="fxui-line" d="${d}" stroke="${col}" pathLength="1" vector-effect="non-scaling-stroke"/>`;
    })
    .join('');
  // End dots and (for up to four series) direct labels at the last point.
  const ends = series
    .map((s, si) => {
      const vs = nums(s.values);
      let i = vs.length - 1;
      while (i >= 0 && !Number.isFinite(vs[i])) i--;
      if (i < 0) return '';
      return `<span class="fxui-end" style="left:${X(i)}%;top:${Y(vs[i])}%;--c:var(--fxui-s${si + 1})"><i></i>${series.length <= 4 ? `<b>${compact(c, vs[i], b.unit)}</b>` : ''}</span>`;
    })
    .join('');
  const step = Math.ceil(labels.length / 6);
  return `<div class="fxui-plot" data-kind="line" data-n="${n}"${series.length <= 4 ? ' data-labels' : ''}>
<div class="fxui-yaxis">${ticks.map((t) => `<span style="top:${Y(t)}%">${compact(c, t, b.unit)}</span>`).join('')}</div>
<div class="fxui-area"><div class="fxui-grid">${ticks.map((t) => `<i style="top:${Y(t)}%"></i>`).join('')}</div>
<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>${ends}
<div class="fxui-cross" hidden><i></i><div class="fxui-tip" role="status"></div></div></div>
<div class="fxui-xaxis">${labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? `<span style="left:${X(i)}%">${esc(l)}</span>` : '')).join('')}</div></div>`;
}

function columnChart(b: any, c: Ctx) {
  const labels = arr<string>(b.labels);
  const series = arr(b.series).slice(0, 8);
  const stacked = b.kind === 'stacked';
  const sums = labels.map((_, i) => series.reduce((a, s) => a + (Number.isFinite(nums(s.values)[i]) ? Math.max(0, nums(s.values)[i]) : 0), 0));
  const all = stacked ? sums : series.flatMap((s) => nums(s.values)).filter(Number.isFinite);
  const ticks = niceTicks(Math.min(0, b.min ?? 0), Math.max(b.max ?? -Infinity, ...all, 0));
  const hi = ticks[ticks.length - 1];
  const lo = ticks[0];
  const H = (v: number) => ((v - Math.max(lo, 0)) / (hi - lo || 1)) * 100;
  const labelTips = !stacked && series.length === 1 && labels.length <= 10;
  const cols = labels
    .map((l, i) => {
      const bars = stacked
        ? `<div class="fxui-stack" style="height:${H(sums[i])}%">${series
            .map((s, si) => {
              const v = nums(s.values)[i];
              return Number.isFinite(v) && v > 0 ? `<i data-tip="${esc(s.name)}: ${compact(c, v, b.unit)}" style="flex:${v};--c:var(--fxui-s${si + 1})"></i>` : '';
            })
            .reverse()
            .join('')}</div>`
        : series
            .map((s, si) => {
              const v = nums(s.values)[i];
              return Number.isFinite(v) ? `<i class="fxui-bar" tabindex="0" data-tip="${series.length > 1 ? esc(s.name) + ': ' : ''}${compact(c, v, b.unit)}" style="height:${H(v)}%;--c:var(--fxui-s${si + 1})">${labelTips ? `<b>${compact(c, v, b.unit)}</b>` : ''}</i>` : '<i class="fxui-bar" style="height:0"></i>';
            })
            .join('');
      return `<div class="fxui-col" data-k="c${i}" aria-label="${esc(l)}">${bars}</div>`;
    })
    .join('');
  return `<div class="fxui-plot" data-kind="column">
<div class="fxui-yaxis">${ticks.map((t) => `<span style="top:${100 - H(t)}%">${compact(c, t, b.unit)}</span>`).join('')}</div>
<div class="fxui-area"><div class="fxui-grid">${ticks.map((t) => `<i style="top:${100 - H(t)}%"></i>`).join('')}</div><div class="fxui-cols">${cols}</div><div class="fxui-tip" role="status" hidden></div></div>
<div class="fxui-xaxis fxui-xcats">${labels.map((l) => `<span>${esc(l)}</span>`).join('')}</div></div>`;
}

function barChart(b: any, c: Ctx) {
  const labels = arr<string>(b.labels);
  const s = arr(b.series)[0] ?? { values: [] };
  const vs = nums(s.values);
  const max = Math.max(b.max ?? -Infinity, ...vs.filter(Number.isFinite), 0) || 1;
  return `<div class="fxui-hbars">${labels
    .map((l, i) => {
      const v = vs[i];
      return `<div class="fxui-hbar" data-k="h${i}"><span>${esc(l)}</span><div><i style="width:${Number.isFinite(v) ? (Math.max(0, v) / max) * 100 : 0}%"></i></div><b>${Number.isFinite(v) ? compact(c, v, b.unit) : '—'}</b></div>`;
    })
    .join('')}</div>`;
}

function donutChart(b: any, c: Ctx) {
  const labels = arr<string>(b.labels).slice(0, 6);
  const vs = nums(arr(b.series)[0]?.values).slice(0, 6);
  const total = vs.filter(Number.isFinite).reduce((a, v) => a + Math.max(0, v), 0) || 1;
  const R = 15.915; // circumference 100
  // Shares that add up to 100 are percentages: the centre shows the largest one instead of "100".
  const isShare = Math.abs(total - 100) < 0.5;
  const top = vs.reduce((m, v, i) => (Number.isFinite(v) && v > (vs[m] ?? -Infinity) ? i : m), 0);
  const centerLabel = isShare
    ? `<text x="21" y="21.6">${fmtNum(c, vs[top], { maximumFractionDigits: 0 })}%</text><text x="21" y="26" class="fxui-sub">${esc(String(labels[top] ?? '').slice(0, 14))}</text>`
    : `<text x="21" y="22.4">${compact(c, total, b.unit)}</text>`;
  let acc = 0;
  const segs = vs
    .map((v, i) => {
      if (!Number.isFinite(v) || v <= 0) return '';
      const len = (v / total) * 100;
      const seg = `<circle r="${R}" cx="21" cy="21" stroke="var(--fxui-s${i + 1})" stroke-dasharray="${Math.max(0, len - 0.8).toFixed(3)} ${(100 - Math.max(0, len - 0.8)).toFixed(3)}" stroke-dashoffset="${(25 - acc).toFixed(3)}" pathLength="100"><title>${esc(labels[i])}: ${compact(c, v, b.unit)}</title></circle>`;
      acc += len;
      return seg;
    })
    .join('');
  return `<div class="fxui-donut"><svg viewBox="0 0 42 42" role="img" aria-label="${esc(b.title ?? 'Donut chart')}"><circle class="fxui-track" r="${R}" cx="21" cy="21"/>${segs}${centerLabel}</svg><ul class="fxui-legend" data-values>${labels
    .map((l, i) => (Number.isFinite(vs[i]) ? `<li><i data-shape="rect" style="--c:var(--fxui-s${i + 1})"></i>${esc(l)}<b>${fmtNum(c, (vs[i] / total) * 100, { maximumFractionDigits: 0 })}%</b></li>` : ''))
    .join('')}</ul></div>`;
}

const WIND_ICON = (s: string) => (s && icon(s)) || icon('cloud');

export const data: Record<string, Renderer> = {
  table: (b, c) => {
    const cols = arr(b.columns);
    const rows = arr(b.rows);
    return `<div class="fxui-scroll"><table class="fxui-table"><thead><tr>${cols.map((col) => `<th scope="col" data-align="${esc(col.align ?? (col.format && col.format !== 'text' ? 'right' : 'left'))}">${esc(col.label)}</th>`).join('')}</tr></thead><tbody>${rows
      .map((r, i) => `<tr data-k="r${i}"${b.highlight === i ? ' aria-current="true"' : ''}>${arr(r).map((cell, j) => `<td data-align="${esc(cols[j]?.align ?? (typeof cell === 'number' || (cols[j]?.format && cols[j]?.format !== 'text') ? 'right' : 'left'))}">${cellText(c, cell, cols[j]?.format, b.currency)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  },

  stats: (b, c) =>
    `<div class="fxui-stats">${arr(b.items)
      .map((s, i) => {
        const up = typeof s.delta === 'number' && s.delta > 0;
        const good = typeof s.delta === 'number' ? (s.good === 'down' ? !up : up) : null;
        const tr = nums(s.trend).filter(Number.isFinite);
        let spark = '';
        if (tr.length > 1) {
          const mn = Math.min(...tr);
          const mx = Math.max(...tr);
          const pts = tr.map((v, k) => `${((k / (tr.length - 1)) * 100).toFixed(1)},${(28 - ((v - mn) / (mx - mn || 1)) * 24).toFixed(1)}`);
          spark = `<svg class="fxui-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.join(' ')}" vector-effect="non-scaling-stroke"/></svg>`;
        }
        const val = typeof s.value === 'number' ? `<span data-count="${s.value}">${compact(c, s.value)}</span>` : esc(s.value);
        return `<div class="fxui-stat" data-k="s${i}"><span class="fxui-statlabel">${esc(s.label)}</span><strong>${val}${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</strong>${
          typeof s.delta === 'number' ? `<span class="fxui-delta" data-good="${good}">${icon(up ? 'up' : 'down')}${up ? '+' : ''}${fmtNum(c, s.delta, { maximumFractionDigits: 1 })}%${s.period ? ` <small>${esc(s.period)}</small>` : ''}</span>` : ''
        }${spark}</div>`;
      })
      .join('')}</div>`,

  chart: (b, c) => {
    const kind = b.kind ?? 'line';
    const plot = kind === 'donut' ? donutChart(b, c) : kind === 'bar' ? barChart(b, c) : kind === 'column' || kind === 'stacked' ? columnChart(b, c) : lineChart(b, c);
    const shape = kind === 'line' ? 'line' : 'rect';
    return `<div class="fxui-chart" data-kind="${esc(kind)}">${kind === 'donut' || kind === 'bar' ? '' : legend(arr(b.series), shape)}${plot}${chartTable(b, c)}<button type="button" class="fxui-link fxui-tabletoggle" data-a="${esc(c.t('showTable'))}" data-b="${esc(c.t('showChart'))}">${icon('table')}<span>${esc(c.t('showTable'))}</span></button></div>`;
  },

  progress: (b, c) =>
    `<div class="fxui-progress">${arr(b.items)
      .map((p, i) => {
        const max = typeof p.max === 'number' && p.max > 0 ? p.max : 100;
        const pct = Math.max(0, Math.min(100, (Number(p.value) / max) * 100));
        return `<div data-k="p${i}"><div class="fxui-row"><span>${esc(p.label)}</span><b>${max === 100 ? `${fmtNum(c, p.value, { maximumFractionDigits: 1 })}%` : `${fmtNum(c, p.value)} / ${fmtNum(c, max)}`}</b></div><div class="fxui-meter" data-tone="${esc(p.tone ?? 'accent')}" role="progressbar" aria-valuenow="${Number(p.value)}" aria-valuemin="0" aria-valuemax="${max}" aria-label="${esc(p.label)}"><i style="width:${pct}%"></i></div></div>`;
      })
      .join('')}</div>`,

  compare: (b) => {
    const items = arr(b.items);
    const attrs: string[] = arr<string>(b.attributes).length ? arr<string>(b.attributes) : [...new Set(items.flatMap((it) => Object.keys(it.values ?? {})))];
    return `<div class="fxui-scroll"><table class="fxui-compare"><thead><tr><th></th>${items
      .map((it, i) => {
        const img = safeUrl(it.image);
        return `<th scope="col" data-k="c${i}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}${it.badge ? `<mark>${esc(it.badge)}</mark>` : ''}<strong>${esc(it.name)}</strong>${it.price ? `<span class="fxui-price">${esc(it.price)}</span>` : ''}</th>`;
      })
      .join('')}</tr></thead><tbody>${attrs
      .map((a) => `<tr><th scope="row">${esc(a)}</th>${items.map((it) => `<td>${esc(it.values?.[a] ?? '—')}</td>`).join('')}</tr>`)
      .join('')}${items.some((it) => safeUrl(it.url)) ? `<tr><th></th>${items.map((it) => (safeUrl(it.url) ? `<td><a class="fxui-btn" data-variant="secondary" ${linkAttrs(safeUrl(it.url))}>${icon('arrow')}</a></td>` : '<td></td>')).join('')}</tr>` : ''}</tbody></table></div>`;
  },

  weather: (b, c) => {
    const u = b.units === 'f' ? '°F' : '°';
    const now = b.now ?? {};
    const days = arr(b.days);
    const lo = Math.min(...days.map((d) => d.lo).filter((x: unknown) => typeof x === 'number'));
    const hi = Math.max(...days.map((d) => d.hi).filter((x: unknown) => typeof x === 'number'));
    return `<div class="fxui-weather" data-sky="${esc(now.icon ?? 'cloud')}"><div class="fxui-now"><div><span class="fxui-loc">${icon('pin')}${esc(b.location)}</span><strong>${typeof now.temp === 'number' ? Math.round(now.temp) + u : '—'}</strong><span>${esc(now.condition)}</span></div><span class="fxui-sky">${WIND_ICON(now.icon)}</span></div><div class="fxui-wmeta">${
      typeof now.feels === 'number' ? `<span>${esc(c.t('feels'))} <b>${Math.round(now.feels)}${u}</b></span>` : ''
    }${typeof now.humidity === 'number' ? `<span>${esc(c.t('humidity'))} <b>${Math.round(now.humidity)}%</b></span>` : ''}${now.wind ? `<span>${esc(c.t('wind'))} <b>${esc(now.wind)}</b></span>` : ''}</div>${
      arr(b.hours).length
        ? `<ol class="fxui-hours">${arr(b.hours)
            .map((h, i) => `<li data-k="h${i}"><small>${esc(h.time)}</small>${WIND_ICON(h.icon)}<b>${typeof h.temp === 'number' ? Math.round(h.temp) + u : ''}</b>${typeof h.rain === 'number' && h.rain > 0 ? `<small class="fxui-rain">${Math.round(h.rain)}%</small>` : ''}</li>`)
            .join('')}</ol>`
        : ''
    }${
      days.length
        ? `<ol class="fxui-days">${days
            .map((d, i) => {
              const l = ((d.lo - lo) / (hi - lo || 1)) * 100;
              const r = ((d.hi - lo) / (hi - lo || 1)) * 100;
              return `<li data-k="d${i}"><span>${esc(d.day)}</span>${WIND_ICON(d.icon)}<small class="fxui-rain">${typeof d.rain === 'number' && d.rain > 0 ? Math.round(d.rain) + '%' : ''}</small><span class="fxui-lo">${Math.round(d.lo)}${u}</span><span class="fxui-range"><i style="left:${l}%;right:${100 - r}%"></i></span><span class="fxui-hi">${Math.round(d.hi)}${u}</span></li>`;
            })
            .join('')}</ol>`
        : ''
    }</div>`;
  },
};
