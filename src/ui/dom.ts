/**
 * lumafx/ui in the browser: render documents into the page, stream them in while a model is still
 * writing, make server-rendered HTML interactive, keep blocks live through data adapters, and the
 * <fx-ui> element for blogs and CMSs.
 */
import { validate, type Block, type Doc, type ValidateOptions } from './schema';
import { parsePartial } from './partial';
import { makeCtx, renderBlock, flatten, type Ctx, type RenderOptions } from './render';
import { fmtNum } from './html';

type Cleanup = () => void;
type Mount = (el: HTMLElement, b: Block & Record<string, any>, c: Ctx) => Cleanup | void;

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const emit = (el: Element, name: string, detail: unknown) => el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));

/* ------------------------------------------------------------------ interactivity per block */

const MOUNTS: Record<string, Mount> = {
  tabs(el) {
    const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>(':scope > .fxui-tabs > .fxui-tablist > [role=tab]'));
    const select = (i: number, focus = false) => {
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
        const p = el.querySelector<HTMLElement>('#' + t.getAttribute('aria-controls'));
        if (p) p.hidden = k !== i;
      });
      if (focus) tabs[i].focus();
    };
    const onClick = (e: Event) => {
      const i = tabs.indexOf((e.target as Element).closest('[role=tab]') as HTMLButtonElement);
      if (i >= 0) select(i);
    };
    const onKey = (e: KeyboardEvent) => {
      const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        select((i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true);
      }
    };
    const list = el.querySelector('.fxui-tablist')!;
    list.addEventListener('click', onClick);
    list.addEventListener('keydown', onKey as EventListener);
    return () => {
      list.removeEventListener('click', onClick);
      list.removeEventListener('keydown', onKey as EventListener);
    };
  },

  quiz(el, _b, c) {
    const sets = Array.from(el.querySelectorAll<HTMLFieldSetElement>('fieldset'));
    const score = el.querySelector<HTMLElement>('.fxui-quizscore')!;
    let right = 0;
    let done = 0;
    const onChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const fs = input.closest('fieldset')!;
      if (fs.dataset.done) return;
      fs.dataset.done = '1';
      const ok = Number(input.value) === Number(fs.dataset.answer);
      if (ok) right++;
      done++;
      fs.querySelectorAll<HTMLLabelElement>('label').forEach((l, k) => {
        if (k === Number(fs.dataset.answer)) l.dataset.state = 'right';
        else if (l.contains(input)) l.dataset.state = 'wrong';
        l.querySelector('input')!.disabled = true;
      });
      const fb = fs.querySelector<HTMLElement>('.fxui-feedback')!;
      fb.hidden = false;
      fb.dataset.ok = String(ok);
      fb.querySelector('strong')!.textContent = c.t(ok ? 'correct' : 'wrong');
      if (done === sets.length) score.textContent = `${c.t('score')}: ${right} / ${sets.length}`;
      emit(el, 'fxui:answer', { question: sets.indexOf(fs), correct: ok });
    };
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  },

  chart(el) {
    const offs: Cleanup[] = [];
    const btn = el.querySelector<HTMLButtonElement>('.fxui-tabletoggle');
    const table = el.querySelector<HTMLElement>('.fxui-charttable');
    const plot = el.querySelector<HTMLElement>('.fxui-plot, .fxui-hbars, .fxui-donut');
    if (btn && table && plot) {
      const toggle = () => {
        const showTable = table.hidden;
        table.hidden = !showTable;
        plot.hidden = showTable;
        btn.querySelector('span')!.textContent = (showTable ? btn.dataset.b : btn.dataset.a) ?? '';
      };
      btn.addEventListener('click', toggle);
      offs.push(() => btn.removeEventListener('click', toggle));
    }
    // Line charts: a crosshair snaps to the nearest label and lists every series there.
    const area = el.querySelector<HTMLElement>('.fxui-plot[data-kind=line] .fxui-area');
    if (area && table) {
      const cross = area.querySelector<HTMLElement>('.fxui-cross')!;
      const tip = cross.querySelector<HTMLElement>('.fxui-tip')!;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const names = Array.from(table.querySelectorAll('thead th')).slice(1).map((th) => th.textContent ?? '');
      const n = Number(el.querySelector<HTMLElement>('.fxui-plot')!.dataset.n) || rows.length;
      const show = (x: number) => {
        const r = area.getBoundingClientRect();
        const i = Math.max(0, Math.min(n - 1, Math.round(((x - r.left) / r.width) * (n - 1))));
        const row = rows[i];
        if (!row) return;
        cross.hidden = false;
        cross.style.left = `${(i / Math.max(1, n - 1)) * 100}%`;
        tip.replaceChildren();
        const head = document.createElement('small');
        head.textContent = row.querySelector('th')?.textContent ?? '';
        tip.append(head);
        Array.from(row.querySelectorAll('td')).forEach((td, k) => {
          const line = document.createElement('div');
          const key = document.createElement('i');
          key.style.setProperty('--c', `var(--fxui-s${k + 1})`);
          const v = document.createElement('b');
          v.textContent = td.textContent ?? '';
          const name = document.createElement('span');
          name.textContent = names[k] ?? '';
          line.append(key, v, name);
          tip.append(line);
        });
        tip.dataset.side = i > n / 2 ? 'left' : 'right';
      };
      const move = (e: PointerEvent) => show(e.clientX);
      const leave = () => (cross.hidden = true);
      area.addEventListener('pointermove', move);
      area.addEventListener('pointerleave', leave);
      offs.push(() => {
        area.removeEventListener('pointermove', move);
        area.removeEventListener('pointerleave', leave);
      });
    }
    // Columns: each bar shows its value on hover and focus.
    const ctip = el.querySelector<HTMLElement>('.fxui-plot[data-kind=column] .fxui-tip');
    if (ctip) {
      const plotArea = ctip.parentElement!;
      const over = (e: Event) => {
        const bar = (e.target as Element).closest<HTMLElement>('[data-tip]');
        if (!bar) return void (ctip.hidden = true);
        const r = bar.getBoundingClientRect();
        const pr = plotArea.getBoundingClientRect();
        ctip.textContent = `${bar.closest('.fxui-col')?.getAttribute('aria-label') ?? ''} · ${bar.dataset.tip}`;
        ctip.hidden = false;
        ctip.style.left = `${r.left - pr.left + r.width / 2}px`;
        ctip.style.top = `${r.top - pr.top}px`;
      };
      const out = () => (ctip.hidden = true);
      plotArea.addEventListener('pointerover', over);
      plotArea.addEventListener('focusin', over);
      plotArea.addEventListener('pointerleave', out);
      plotArea.addEventListener('focusout', out);
      offs.push(() => {
        plotArea.removeEventListener('pointerover', over);
        plotArea.removeEventListener('focusin', over);
        plotArea.removeEventListener('pointerleave', out);
        plotArea.removeEventListener('focusout', out);
      });
    }
    return () => offs.forEach((f) => f());
  },

  stats(el, _b, c) {
    if (reduced()) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-count]:not([data-counted])'));
    let raf = 0;
    const t0 = performance.now();
    const targets = nodes.map((n) => {
      n.dataset.counted = '1';
      return Number(n.dataset.count);
    });
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      const e = 1 - Math.pow(1 - k, 3);
      nodes.forEach((n, i) => {
        const v = targets[i] * e;
        n.textContent = Math.abs(targets[i]) >= 10000 ? fmtNum(c, v, { notation: 'compact', maximumFractionDigits: 1 }) : fmtNum(c, Number.isInteger(targets[i]) ? Math.round(v) : v, { maximumFractionDigits: 2 });
      });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  },

  countdown(el) {
    const box = el.querySelector<HTMLElement>('.fxui-countdown');
    const to = Number(box?.dataset.to);
    if (!box || !to) return;
    const parts = Array.from(box.querySelectorAll<HTMLElement>('[data-part]'));
    const tick = () => {
      const left = Math.max(0, to - Date.now());
      const v = [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
      parts.forEach((p, i) => {
        const s = String(v[i]).padStart(2, '0');
        if (p.textContent !== s) p.textContent = s;
      });
      if (!left) {
        box.dataset.done = '';
        clearInterval(id);
      }
    };
    const id = window.setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  },

  tickets(el, b) {
    const box = el.querySelector<HTMLElement>('.fxui-tickets')!;
    const cta = box.querySelector<HTMLAnchorElement>('.fxui-checkout');
    const onChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.type !== 'radio') return;
      if (cta) {
        const u = new URL(cta.getAttribute('href')!, location.href);
        u.searchParams.set('tier', input.value);
        cta.href = u.toString();
        cta.removeAttribute('aria-disabled');
      }
      emit(el, 'fxui:select', { block: b.id ?? b.type, tier: input.value });
    };
    const onClick = (e: Event) => {
      if ((e.target as Element).closest('.fxui-checkout[aria-disabled]')) e.preventDefault();
    };
    box.addEventListener('change', onChange);
    box.addEventListener('click', onClick);
    return () => {
      box.removeEventListener('change', onChange);
      box.removeEventListener('click', onClick);
    };
  },

  zones(el, b, c) {
    const box = el.querySelector<HTMLElement>('.fxui-zones')!;
    const cta = box.querySelector<HTMLAnchorElement>('.fxui-zonecta a');
    const sel = box.querySelector<HTMLElement>('.fxui-zonesel');
    const zones: any[] = Array.isArray(b.zones) ? b.zones : [];
    const choose = (id: string) => {
      const z = zones.find((x) => x.id === id);
      if (!z || z.status === 'sold-out') return;
      box.querySelectorAll('[data-zone]').forEach((n) => n.toggleAttribute('data-selected', n.getAttribute('data-zone') === id));
      if (sel) sel.textContent = `${c.t('selected')}: ${z.name}${typeof z.price === 'number' ? ` · ${new Intl.NumberFormat(c.locale, { style: 'currency', currency: b.currency || 'EUR', maximumFractionDigits: 0 }).format(z.price)}` : ''}`;
      if (cta) {
        const u = new URL(cta.getAttribute('href')!, location.href);
        u.searchParams.set('zone', id);
        cta.href = u.toString();
        cta.removeAttribute('aria-disabled');
      }
      emit(el, 'fxui:select', { block: b.id ?? b.type, zone: id });
    };
    const onClick = (e: Event) => {
      const t = (e.target as Element).closest('[data-zone]');
      if (t) choose(t.getAttribute('data-zone')!);
      if ((e.target as Element).closest('.fxui-zonecta a[aria-disabled]')) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      const t = (e.target as Element).closest('path[data-zone]');
      if (t && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        choose(t.getAttribute('data-zone')!);
      }
    };
    box.addEventListener('click', onClick);
    box.addEventListener('keydown', onKey as EventListener);
    return () => {
      box.removeEventListener('click', onClick);
      box.removeEventListener('keydown', onKey as EventListener);
    };
  },
};

/** Add interactivity for your own block type, or replace a built-in one. */
export function addMount(type: string, fn: Mount) {
  MOUNTS[type] = fn;
}

/* ------------------------------------------------------------------ live data */

export interface Adapter {
  /** Fetch fresh props for a block. Called every `live.every` seconds (default 30). */
  fetch?(id: string, block: Block): Promise<Record<string, unknown>>;
  /** Or push updates yourself (WebSocket, SSE…). Return an unsubscribe function. */
  subscribe?(id: string, block: Block, push: (props: Record<string, unknown>) => void): () => void;
}

const adapters = new Map<string, Adapter>();
export const adapter = {
  set(name: string, a: Adapter) {
    adapters.set(name, a);
  },
  get(name: string) {
    return adapters.get(name);
  },
  delete(name: string) {
    adapters.delete(name);
  },
};

/* ------------------------------------------------------------------ rendering into the page */

interface Live {
  doc: Doc;
  opts: RenderOptions;
  ctx: Ctx;
  /** Per-section cleanups (listeners, timers), run when the section is replaced. */
  cleanups: Map<HTMLElement, Cleanup[]>;
  /** Live data subscriptions, run on destroy. */
  live: Cleanup[];
  sigs: string[];
  root: HTMLElement;
}

const topSections = (state: Live) => Array.from(state.root.children).filter((n) => n.classList.contains('fxui-b')) as HTMLElement[];

function cleanupSection(state: Live, sec: HTMLElement) {
  for (const s of [sec, ...Array.from(sec.querySelectorAll<HTMLElement>('.fxui-b'))]) {
    state.cleanups.get(s)?.forEach((f) => f());
    state.cleanups.delete(s);
  }
}

function destroyState(state: Live) {
  state.cleanups.forEach((list) => list.forEach((f) => f()));
  state.cleanups.clear();
  state.live.forEach((f) => f());
  state.live = [];
}

const roots = new WeakMap<HTMLElement, Live>();

function rootFor(el: HTMLElement) {
  if (el.classList.contains('fxui')) return el;
  let r = el.querySelector<HTMLElement>(':scope > .fxui');
  if (!r) {
    r = document.createElement('div');
    r.className = 'fxui';
    el.replaceChildren(r);
  }
  return r;
}

function mountAll(state: Live, scope: HTMLElement, blocks: Block[], withLive = true) {
  const sections = Array.from(scope.querySelectorAll<HTMLElement>('.fxui-b'));
  if (scope.classList.contains('fxui-b')) sections.unshift(scope);
  const list = flatten(blocks);
  sections.forEach((sec, i) => {
    const b = list[i] as Block & Record<string, any>;
    if (!b) return;
    const m = MOUNTS[b.type];
    if (m) {
      try {
        const off = m(sec, b, state.ctx);
        if (off) state.cleanups.set(sec, [...(state.cleanups.get(sec) ?? []), off]);
      } catch (err) {
        console.warn('[lumafx/ui] mount failed', b.type, err);
      }
    }
    const live = b.live as { adapter?: string; id?: string; every?: number } | undefined;
    if (withLive && live?.adapter && live.id && state.doc.blocks.includes(b)) startLive(state, b, live as { adapter: string; id: string; every?: number });
  });
}

function startLive(state: Live, b: Block, live: { adapter: string; id: string; every?: number }) {
  const a = adapters.get(live.adapter);
  if (!a) return;
  const apply = (props: Record<string, unknown>) => {
    // Find the block again: streaming may have replaced the object since.
    const idx = state.doc.blocks.findIndex((x) => x === b || (x.live as { id?: string } | undefined)?.id === live.id);
    if (idx < 0) return;
    b = state.doc.blocks[idx];
    const merged = validate([{ ...b, ...props, type: b.type }]).doc.blocks[0];
    if (!merged) return;
    state.doc.blocks[idx] = merged;
    state.sigs[idx] = JSON.stringify(merged);
    const sec = topSections(state)[idx];
    if (sec) replaceSection(state, sec, merged, true, false);
    b = merged;
  };
  if (a.subscribe) state.live.push(a.subscribe(live.id, b, apply));
  else if (a.fetch) {
    let stopped = false;
    let timer = 0;
    const loop = async () => {
      try {
        apply(await a.fetch!(live.id, b));
      } catch (err) {
        console.warn('[lumafx/ui] live update failed', err);
      }
      if (!stopped) timer = window.setTimeout(loop, Math.max(5, live.every ?? 30) * 1000);
    };
    timer = window.setTimeout(loop, Math.max(5, live.every ?? 30) * 1000);
    state.live.push(() => {
      stopped = true;
      clearTimeout(timer);
    });
  }
}

/** Swaps one block's section for a fresh render. Keys already on screen don't animate again. */
function replaceSection(state: Live, sec: HTMLElement, b: Block, flash = false, withLive = true) {
  const tpl = document.createElement('template');
  tpl.innerHTML = renderBlock(b, state.ctx);
  const fresh = tpl.content.firstElementChild as HTMLElement | null;
  if (!fresh) return null;
  const seen = new Map<string, string>();
  sec.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => seen.set(n.dataset.k!, n.textContent ?? ''));
  fresh.classList.add('fxui-seen');
  fresh.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => {
    const k = n.dataset.k!;
    if (!seen.has(k)) n.classList.add('fxui-new');
    else if (flash && seen.get(k) !== n.textContent) n.classList.add('fxui-changed');
  });
  cleanupSection(state, sec);
  sec.replaceWith(fresh);
  mountAll(state, fresh, [b], withLive);
  return fresh;
}

function setup(el: HTMLElement, opts: RenderOptions): Live {
  const prev = roots.get(el);
  if (prev) destroyState(prev);
  const root = rootFor(el);
  const lang = opts.lang ?? el.closest('[lang]')?.getAttribute('lang')?.slice(0, 2) ?? 'en';
  const state: Live = { doc: { blocks: [] }, opts, ctx: makeCtx({ ...opts, lang }), cleanups: new Map(), live: [], sigs: [], root };
  root.lang = lang;
  roots.set(el, state);
  return state;
}

/** Renders a document (object, blocks, one block or JSON text) into `el`. */
export function render(el: HTMLElement, input: unknown, opts: RenderOptions & ValidateOptions = {}) {
  const { doc, errors } = validate(input, { partial: opts.partial ?? true, keepUnknown: false });
  const state = setup(el, { ...opts, lang: opts.lang ?? doc.lang });
  state.doc = doc;
  state.root.innerHTML = doc.blocks.map((b) => renderBlock(b, state.ctx)).join('');
  state.sigs = doc.blocks.map((b) => JSON.stringify(b));
  mountAll(state, state.root, doc.blocks);
  return { doc, errors };
}

/** Makes server-rendered HTML (`renderToString`) interactive without re-rendering it. */
export function hydrate(el: HTMLElement, opts: RenderOptions = {}) {
  const root = rootFor(el);
  const json = root.querySelector<HTMLScriptElement>(':scope > script.fxui-data');
  if (!json) return;
  const { doc } = validate(JSON.parse(json.textContent || '{}'));
  const state = setup(el, { ...opts, lang: opts.lang ?? doc.lang ?? root.lang });
  state.doc = doc;
  state.sigs = doc.blocks.map((b) => JSON.stringify(b));
  root.classList.add('fxui-seen');
  mountAll(state, root, doc.blocks);
}

export interface Stream {
  /** Add the next chunk of JSON text as it arrives from the model. */
  write(chunk: string): void;
  /** Replace everything received so far (e.g. partial tool input that is resent whole). */
  set(textOrDoc: string | unknown): void;
  /** The model finished: validate strictly and settle. Returns validation errors, if any. */
  end(): { doc: Doc; errors: { path: string; message: string }[] };
  readonly text: string;
}

/**
 * Renders JSON while it streams in. Finished blocks stay put; the one being written updates in
 * place, and its new items (players, rows, events) pop in as they arrive.
 */
export function stream(el: HTMLElement, opts: RenderOptions = {}): Stream {
  const state = setup(el, opts);
  state.root.innerHTML = '';
  state.root.setAttribute('aria-busy', 'true');
  let text = '';
  let value: unknown;
  let raf = 0;
  const flush = (final = false) => {
    raf = 0;
    const parsed = value !== undefined ? value : parsePartial(text);
    const { doc } = validate(parsed ?? { blocks: [] }, { partial: !final });
    if (doc.lang && doc.lang !== state.ctx.lang) state.ctx = makeCtx({ ...state.opts, lang: doc.lang });
    state.doc = doc;
    const secs = topSections(state);
    doc.blocks.forEach((b, i) => {
      const sig = JSON.stringify(b);
      if (state.sigs[i] === sig && secs[i]) return;
      state.sigs[i] = sig;
      if (secs[i]) secs[i] = replaceSection(state, secs[i], b, false, false) ?? secs[i];
      else {
        const tpl = document.createElement('template');
        tpl.innerHTML = renderBlock(b, state.ctx);
        const sec = tpl.content.firstElementChild as HTMLElement | null;
        if (!sec) return;
        state.root.append(sec);
        secs[i] = sec;
        mountAll(state, sec, [b], false);
      }
    });
    // A block that disappeared (rare: the model rewrote earlier output).
    for (let i = doc.blocks.length; i < secs.length; i++) {
      cleanupSection(state, secs[i]);
      secs[i].remove();
    }
    state.sigs.length = doc.blocks.length;
    // Live data starts once a block is complete: when the next one begins, or at the end.
    doc.blocks.forEach((b, i) => {
      const live = b.live as { adapter: string; id: string; every?: number } | undefined;
      if (!live?.adapter || !live.id || started.has(live.id) || (!final && i === doc.blocks.length - 1)) return;
      started.add(live.id);
      startLive(state, b, live);
    });
  };
  const started = new Set<string>();
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(() => flush());
  };
  return {
    write(chunk) {
      text += chunk;
      value = undefined;
      schedule();
    },
    set(x) {
      if (typeof x === 'string') {
        text = x;
        value = undefined;
      } else value = x;
      schedule();
    },
    end() {
      cancelAnimationFrame(raf);
      flush(true);
      state.root.removeAttribute('aria-busy');
      const res = validate(value !== undefined ? value : parsePartial(text) ?? { blocks: [] });
      emit(state.root, 'fxui:done', res);
      return { doc: res.doc, errors: res.errors };
    },
    get text() {
      return text;
    },
  };
}

/** Updates one block (found by its `id`) with new props, e.g. a live score. */
export function update(el: HTMLElement, id: string, props: Record<string, unknown>) {
  const state = roots.get(el);
  if (!state) return false;
  const i = state.doc.blocks.findIndex((b) => b.id === id);
  if (i < 0) return false;
  const merged = validate([{ ...state.doc.blocks[i], ...props, type: state.doc.blocks[i].type }]).doc.blocks[0];
  if (!merged) return false;
  state.doc.blocks[i] = merged;
  const sec = topSections(state)[i];
  if (sec) replaceSection(state, sec, merged, true, false);
  state.sigs[i] = JSON.stringify(merged);
  return true;
}

/** Removes listeners, timers and live subscriptions. */
export function destroy(el: HTMLElement) {
  const s = roots.get(el);
  if (s) destroyState(s);
  roots.delete(el);
}

/* ------------------------------------------------------------------ <fx-ui> */

/**
 * <fx-ui> renders the JSON inside it (or from `src`), for blogs and CMSs:
 *
 *   <fx-ui lang="sq"><script type="application/json">{"blocks":[…]}</script></fx-ui>
 *   <fx-ui src="/api/match/123/ui.json"></fx-ui>
 */
export function defineElement(tag = 'fx-ui') {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  class FxUI extends HTMLElement {
    static observedAttributes = ['src', 'lang', 'theme', 'time-zone'];
    connectedCallback() {
      this.load();
    }
    disconnectedCallback() {
      destroy(this);
    }
    attributeChangedCallback(name: string, a: string | null, b: string | null) {
      if (a !== b && this.isConnected && name !== 'theme') this.load();
    }
    private opts(): RenderOptions {
      return { lang: this.getAttribute('lang') ?? undefined, timeZone: this.getAttribute('time-zone') ?? undefined };
    }
    async load() {
      const src = this.getAttribute('src');
      const existing = this.querySelector<HTMLElement>(':scope > .fxui > script.fxui-data');
      if (existing) return hydrate(this, this.opts());
      const inline = this.querySelector<HTMLScriptElement>(':scope > script[type="application/json"]');
      if (inline) return void this.render(inline.textContent ?? '');
      if (src) {
        this.setAttribute('aria-busy', 'true');
        try {
          const res = await fetch(src, { headers: { Accept: 'application/json' } });
          this.render(await res.text());
        } finally {
          this.removeAttribute('aria-busy');
        }
      }
    }
    /** Render a document now. */
    render(input: unknown) {
      return render(this, input, this.opts());
    }
    /** Start streaming into this element. */
    stream() {
      return stream(this, this.opts());
    }
    update(id: string, props: Record<string, unknown>) {
      return update(this, id, props);
    }
  }
  customElements.define(tag, FxUI);
}
