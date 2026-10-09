import {
  BLOCKS,
  BLOCK_MAP,
  COMMON,
  RENDERERS,
  S,
  addLabels,
  anthropicTool,
  blockSchema,
  blockToText,
  flatten,
  fmtNum,
  formationLines,
  icon,
  jsonLd,
  jsonLdScript,
  jsonSchema,
  labels,
  makeCtx,
  openaiTool,
  opt,
  parsePartial,
  parseVideo,
  placePlayers,
  prompt,
  renderBlock,
  renderToString,
  toText,
  validate
} from "./chunks/chunk-3JVTEHHX.mjs";

// src/ui/dom.ts
var reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
var emit = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, cancelable: true }));
var tableState = /* @__PURE__ */ new Map();
var MOUNTS = {
  // Sort by a column (numbers largest first, text A to Z; again to reverse) and search the rows.
  // A live table keeps the reader's sort and search when fresh rows arrive.
  table(el, b, c) {
    const wrap = el.querySelector(".fxui-tablewrap");
    const tbody = el.querySelector("tbody");
    if (!wrap || !tbody) return;
    const offs = [];
    const key = b.live?.id ?? (typeof b.id === "string" ? b.id : void 0);
    const saved = key ? tableState.get(key) ?? {} : {};
    const heads = Array.from(el.querySelectorAll("thead th"));
    const sortBy = (col, dir) => {
      const th = heads[col];
      if (!th) return;
      const rows = Array.from(tbody.rows);
      const vals = rows.map((r) => r.cells[col]?.dataset.v ?? "");
      const numeric = vals.every((v) => v === "" || Number.isFinite(Number(v)));
      const sign = dir === "ascending" ? 1 : -1;
      const collator = new Intl.Collator(c.locale, { numeric: true, sensitivity: "base" });
      const order = rows.map((r, i) => ({ r, v: vals[i] })).sort((x, y) => {
        if (x.v === "" || y.v === "") return x.v === y.v ? 0 : x.v === "" ? 1 : -1;
        return sign * (numeric ? Number(x.v) - Number(y.v) : collator.compare(x.v, y.v));
      });
      tbody.append(...order.map((o) => o.r));
      heads.forEach((h) => h.hasAttribute("aria-sort") && h.setAttribute("aria-sort", h === th ? dir : "none"));
      saved.col = col;
      saved.dir = dir;
    };
    const onSort = (e) => {
      const btn = e.target.closest(".fxui-sort");
      if (!btn) return;
      const col = Number(btn.dataset.col);
      const was = heads[col]?.getAttribute("aria-sort");
      const numeric = Array.from(tbody.rows).every((r) => {
        const v = r.cells[col]?.dataset.v ?? "";
        return v === "" || Number.isFinite(Number(v));
      });
      const dir = was === "none" || !was ? numeric ? "descending" : "ascending" : was === "ascending" ? "descending" : "ascending";
      sortBy(col, dir);
      if (key) tableState.set(key, saved);
      emit(el, "fxui:sort", { block: b.id ?? b.type, column: col, direction: dir });
    };
    wrap.addEventListener("click", onSort);
    offs.push(() => wrap.removeEventListener("click", onSort));
    const sc = wrap.querySelector(".fxui-scroll");
    if (sc) {
      const edges = () => {
        const more = (sc.scrollLeft > 2 ? "l" : "") + (sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2 ? "r" : "");
        if (more) wrap.dataset.more = more;
        else delete wrap.dataset.more;
      };
      edges();
      sc.addEventListener("scroll", edges, { passive: true });
      offs.push(() => sc.removeEventListener("scroll", edges));
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(edges);
        ro.observe(sc);
        offs.push(() => ro.disconnect());
      }
    }
    const input = wrap.querySelector(".fxui-tfilter input");
    const empty = wrap.querySelector(".fxui-tempty");
    const applyFilter = () => {
      if (!input) return;
      const q = input.value.trim().toLocaleLowerCase(c.locale);
      let shown = 0;
      for (const r of Array.from(tbody.rows)) {
        const hit = !q || (r.textContent ?? "").toLocaleLowerCase(c.locale).includes(q);
        r.hidden = !hit;
        if (hit) shown++;
      }
      if (empty) empty.hidden = shown > 0;
      saved.q = input.value;
      if (key) tableState.set(key, saved);
    };
    if (input) {
      input.addEventListener("input", applyFilter);
      offs.push(() => input.removeEventListener("input", applyFilter));
    }
    if (saved.col !== void 0 && saved.dir) sortBy(saved.col, saved.dir);
    if (input && saved.q) {
      input.value = saved.q;
      applyFilter();
    }
    return () => offs.forEach((f) => f());
  },
  tabs(el) {
    const tabs = Array.from(el.querySelectorAll(":scope > .fxui-tabs > .fxui-tablist > [role=tab]"));
    const select = (i, focus = false) => {
      tabs.forEach((t, k) => {
        t.setAttribute("aria-selected", String(k === i));
        t.tabIndex = k === i ? 0 : -1;
        const p = el.querySelector("#" + t.getAttribute("aria-controls"));
        if (p) p.hidden = k !== i;
      });
      if (focus) tabs[i].focus();
    };
    const onClick = (e) => {
      const i = tabs.indexOf(e.target.closest("[role=tab]"));
      if (i >= 0) select(i);
    };
    const onKey = (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        select((i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length, true);
      }
    };
    const list = el.querySelector(".fxui-tablist");
    list.addEventListener("click", onClick);
    list.addEventListener("keydown", onKey);
    return () => {
      list.removeEventListener("click", onClick);
      list.removeEventListener("keydown", onKey);
    };
  },
  quiz(el, _b, c) {
    const sets = Array.from(el.querySelectorAll("fieldset"));
    const score = el.querySelector(".fxui-quizscore");
    let right = 0;
    let done = 0;
    const onChange = (e) => {
      const input = e.target;
      const fs = input.closest("fieldset");
      if (fs.dataset.done) return;
      fs.dataset.done = "1";
      const ok = Number(input.value) === Number(fs.dataset.answer);
      if (ok) right++;
      done++;
      fs.querySelectorAll("label").forEach((l, k) => {
        if (k === Number(fs.dataset.answer)) l.dataset.state = "right";
        else if (l.contains(input)) l.dataset.state = "wrong";
        l.querySelector("input").disabled = true;
      });
      const fb = fs.querySelector(".fxui-feedback");
      fb.hidden = false;
      fb.dataset.ok = String(ok);
      fb.querySelector("strong").textContent = c.t(ok ? "correct" : "wrong");
      if (done === sets.length) score.textContent = `${c.t("score")}: ${right} / ${sets.length}`;
      emit(el, "fxui:answer", { question: sets.indexOf(fs), correct: ok });
    };
    el.addEventListener("change", onChange);
    return () => el.removeEventListener("change", onChange);
  },
  chart(el) {
    const offs = [];
    const btn = el.querySelector(".fxui-tabletoggle");
    const table = el.querySelector(".fxui-charttable");
    const plot = el.querySelector(".fxui-plot, .fxui-hbars, .fxui-donut");
    if (btn && table && plot) {
      const toggle = () => {
        const showTable = table.hidden;
        table.hidden = !showTable;
        plot.hidden = showTable;
        btn.querySelector("span").textContent = (showTable ? btn.dataset.b : btn.dataset.a) ?? "";
      };
      btn.addEventListener("click", toggle);
      offs.push(() => btn.removeEventListener("click", toggle));
    }
    const area = el.querySelector(".fxui-plot[data-kind=line] .fxui-area");
    if (area && table) {
      const cross = area.querySelector(".fxui-cross");
      const tip = cross.querySelector(".fxui-tip");
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      const names = Array.from(table.querySelectorAll("thead th")).slice(1).map((th) => th.textContent ?? "");
      const n = Number(el.querySelector(".fxui-plot").dataset.n) || rows.length;
      const show = (x) => {
        const r = area.getBoundingClientRect();
        const i = Math.max(0, Math.min(n - 1, Math.round((x - r.left) / r.width * (n - 1))));
        const row = rows[i];
        if (!row) return;
        cross.hidden = false;
        cross.style.left = `${i / Math.max(1, n - 1) * 100}%`;
        tip.replaceChildren();
        const head = document.createElement("small");
        head.textContent = row.querySelector("th")?.textContent ?? "";
        tip.append(head);
        Array.from(row.querySelectorAll("td")).forEach((td, k) => {
          const line = document.createElement("div");
          const key = document.createElement("i");
          key.style.setProperty("--c", `var(--fxui-s${k + 1})`);
          const v = document.createElement("b");
          v.textContent = td.textContent ?? "";
          const name = document.createElement("span");
          name.textContent = names[k] ?? "";
          line.append(key, v, name);
          tip.append(line);
        });
        tip.dataset.side = i > n / 2 ? "left" : "right";
      };
      const move = (e) => show(e.clientX);
      const leave = () => cross.hidden = true;
      area.addEventListener("pointermove", move);
      area.addEventListener("pointerleave", leave);
      offs.push(() => {
        area.removeEventListener("pointermove", move);
        area.removeEventListener("pointerleave", leave);
      });
    }
    const ctip = el.querySelector(".fxui-plot[data-kind=column] .fxui-tip");
    if (ctip) {
      const plotArea = ctip.parentElement;
      const over = (e) => {
        const bar = e.target.closest("[data-tip]");
        if (!bar) return void (ctip.hidden = true);
        const r = bar.getBoundingClientRect();
        const pr = plotArea.getBoundingClientRect();
        ctip.textContent = `${bar.closest(".fxui-col")?.getAttribute("aria-label") ?? ""} \xB7 ${bar.dataset.tip}`;
        ctip.hidden = false;
        ctip.style.left = `${r.left - pr.left + r.width / 2}px`;
        ctip.style.top = `${r.top - pr.top}px`;
      };
      const out = () => ctip.hidden = true;
      plotArea.addEventListener("pointerover", over);
      plotArea.addEventListener("focusin", over);
      plotArea.addEventListener("pointerleave", out);
      plotArea.addEventListener("focusout", out);
      offs.push(() => {
        plotArea.removeEventListener("pointerover", over);
        plotArea.removeEventListener("focusin", over);
        plotArea.removeEventListener("pointerleave", out);
        plotArea.removeEventListener("focusout", out);
      });
    }
    return () => offs.forEach((f) => f());
  },
  stats(el, _b, c) {
    if (reduced()) return;
    const nodes = Array.from(el.querySelectorAll("[data-count]:not([data-counted])"));
    let raf = 0;
    const t0 = performance.now();
    const targets = nodes.map((n) => {
      n.dataset.counted = "1";
      return Number(n.dataset.count);
    });
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1100);
      const e = 1 - Math.pow(1 - k, 3);
      nodes.forEach((n, i) => {
        const v = targets[i] * e;
        n.textContent = Math.abs(targets[i]) >= 1e4 ? fmtNum(c, v, { notation: "compact", maximumFractionDigits: 1 }) : fmtNum(c, Number.isInteger(targets[i]) ? Math.round(v) : v, { maximumFractionDigits: 2 });
      });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  },
  countdown(el) {
    const box = el.querySelector(".fxui-countdown");
    const to = Number(box?.dataset.to);
    if (!box || !to) return;
    const parts = Array.from(box.querySelectorAll("[data-part]"));
    const tick = () => {
      const left = Math.max(0, to - Date.now());
      const v = [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
      parts.forEach((p, i) => {
        const s = String(v[i]).padStart(2, "0");
        if (p.textContent !== s) p.textContent = s;
      });
      if (!left) {
        box.dataset.done = "";
        clearInterval(id);
      }
    };
    const id = window.setInterval(tick, 1e3);
    tick();
    return () => clearInterval(id);
  },
  video(el) {
    const stage = el.querySelector(".fxui-stage") ?? el.querySelector(".fxui-video");
    const data = el.querySelector("script.fxui-vdata");
    const list = data ? JSON.parse(data.textContent || "[]") : [];
    const inline = () => !el.closest('[data-video="link"]');
    const play = (a) => {
      const src = a.dataset.embed;
      if (!src) return false;
      const f = document.createElement("iframe");
      f.src = src;
      f.title = a.querySelector("strong")?.textContent ?? "Video";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      f.referrerPolicy = "strict-origin-when-cross-origin";
      f.className = "fxui-frame";
      a.replaceWith(f);
      return true;
    };
    const onClick = (e) => {
      const a = e.target.closest("a.fxui-vplayer");
      if (a && inline() && play(a)) {
        e.preventDefault();
        return;
      }
      const btn = e.target.closest(".fxui-vlist button[data-index]");
      if (!btn || !stage) return;
      const v = list[Number(btn.dataset.index)];
      if (!v) return;
      el.querySelectorAll(".fxui-vlist button").forEach((x) => x.setAttribute("aria-current", String(x === btn)));
      const a2 = document.createElement("a");
      a2.className = "fxui-vplayer";
      a2.href = v.href;
      a2.target = "_blank";
      a2.rel = "noopener";
      if (v.embed) a2.dataset.embed = v.embed;
      a2.setAttribute("aria-label", v.title);
      a2.innerHTML = `${v.poster ? `<img src="${v.poster.replace(/"/g, "&quot;")}" alt="">` : ""}<span class="fxui-playbtn"></span><span class="fxui-vmeta"><strong></strong><small></small></span>`;
      a2.querySelector(".fxui-playbtn").innerHTML = el.querySelector(".fxui-playbtn")?.innerHTML ?? "\u25B6";
      a2.querySelector("strong").textContent = v.title;
      a2.querySelector("small").textContent = v.channel;
      stage.replaceChildren(a2);
      if (inline()) play(a2);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  },
  poll(el, b, c) {
    const form = el.querySelector(".fxui-poll");
    const onSubmit = (e) => e.preventDefault();
    const onChange = (e) => {
      const input = e.target;
      if (input.type !== "radio" || form.dataset.state !== "open") return;
      const opts = Array.from(form.querySelectorAll(".fxui-popt"));
      const votes = opts.map((o, i) => Number(o.dataset.votes || 0) + (i === Number(input.value) ? 1 : 0));
      const total = votes.reduce((a, v) => a + v, 0) || 1;
      opts.forEach((o, i) => {
        const p = Math.round(votes[i] / total * 100);
        o.style.setProperty("--p", p + "%");
        const pct = o.querySelector(".fxui-ppct");
        if (pct) pct.textContent = p + "%";
        if (i === Number(input.value)) o.dataset.mine = "";
      });
      form.dataset.state = "results";
      form.querySelector("fieldset").disabled = true;
      const foot = form.querySelector(".fxui-pfoot small");
      if (foot) foot.textContent = c.t("voted");
      emit(el, "fxui:vote", { block: b.id ?? b.type, option: Number(input.value), label: b.options?.[Number(input.value)]?.label });
    };
    form.addEventListener("submit", onSubmit);
    form.addEventListener("change", onChange);
    return () => {
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("change", onChange);
    };
  },
  listing(el) {
    const bar = el.querySelector(".fxui-filters");
    if (!bar) return;
    const onClick = (e) => {
      const btn = e.target.closest("button[data-cat]");
      if (!btn) return;
      const cat = btn.dataset.cat ?? "";
      bar.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
      el.querySelectorAll(".fxui-day li").forEach((li) => li.hidden = !!cat && li.dataset.cat !== cat);
      el.querySelectorAll(".fxui-day").forEach((d) => d.hidden = !d.querySelector("li:not([hidden])"));
    };
    bar.addEventListener("click", onClick);
    return () => bar.removeEventListener("click", onClick);
  },
  suggestions(el) {
    const onClick = (e) => {
      const btn = e.target.closest("button[data-ask]");
      if (btn) emit(el, "fxui:ask", { text: btn.dataset.ask });
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  },
  tickets(el, b) {
    const box = el.querySelector(".fxui-tickets");
    const cta = box.querySelector(".fxui-checkout");
    const onChange = (e) => {
      const input = e.target;
      if (input.type !== "radio") return;
      if (cta) {
        try {
          const u = new URL(cta.getAttribute("href"), location.href);
          u.searchParams.set("tier", input.value);
          cta.href = u.toString();
        } catch {
        }
        cta.removeAttribute("aria-disabled");
      }
      emit(el, "fxui:select", { block: b.id ?? b.type, tier: input.value });
    };
    const onClick = (e) => {
      if (e.target.closest(".fxui-checkout[aria-disabled]")) e.preventDefault();
    };
    box.addEventListener("change", onChange);
    box.addEventListener("click", onClick);
    return () => {
      box.removeEventListener("change", onChange);
      box.removeEventListener("click", onClick);
    };
  },
  zones(el, b, c) {
    const box = el.querySelector(".fxui-zones");
    const cta = box.querySelector(".fxui-zonecta a");
    const sel = box.querySelector(".fxui-zonesel");
    const zones = Array.isArray(b.zones) ? b.zones : [];
    const choose = (id) => {
      const z = zones.find((x) => x.id === id);
      if (!z || z.status === "sold-out") return;
      box.querySelectorAll("[data-zone]").forEach((n) => n.toggleAttribute("data-selected", n.getAttribute("data-zone") === id));
      if (sel) sel.textContent = `${c.t("selected")}: ${z.name}${typeof z.price === "number" ? ` \xB7 ${new Intl.NumberFormat(c.locale, { style: "currency", currency: b.currency || "EUR", maximumFractionDigits: 0 }).format(z.price)}` : ""}`;
      if (cta) {
        const u = new URL(cta.getAttribute("href"), location.href);
        u.searchParams.set("zone", id);
        cta.href = u.toString();
        cta.removeAttribute("aria-disabled");
      }
      emit(el, "fxui:select", { block: b.id ?? b.type, zone: id });
    };
    const onClick = (e) => {
      const t = e.target.closest("[data-zone]");
      if (t) choose(t.getAttribute("data-zone"));
      if (e.target.closest(".fxui-zonecta a[aria-disabled]")) e.preventDefault();
    };
    const onKey = (e) => {
      const t = e.target.closest("path[data-zone]");
      if (t && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        choose(t.getAttribute("data-zone"));
      }
    };
    box.addEventListener("click", onClick);
    box.addEventListener("keydown", onKey);
    return () => {
      box.removeEventListener("click", onClick);
      box.removeEventListener("keydown", onKey);
    };
  }
};
function addMount(type, fn) {
  MOUNTS[type] = fn;
}
var adapters = /* @__PURE__ */ new Map();
var adapter = {
  set(name, a) {
    adapters.set(name, a);
  },
  get(name) {
    return adapters.get(name);
  },
  delete(name) {
    adapters.delete(name);
  }
};
var topSections = (state) => Array.from(state.root.children).filter((n) => n.classList.contains("fxui-b"));
function cleanupSection(state, sec) {
  for (const s of [sec, ...Array.from(sec.querySelectorAll(".fxui-b"))]) {
    state.cleanups.get(s)?.forEach((f) => f());
    state.cleanups.delete(s);
  }
}
function destroyState(state) {
  state.cleanups.forEach((list) => list.forEach((f) => f()));
  state.cleanups.clear();
  state.live.forEach((f) => f());
  state.live = [];
}
var roots = /* @__PURE__ */ new WeakMap();
function rootFor(el) {
  if (el.classList.contains("fxui")) return el;
  let r = el.querySelector(":scope > .fxui");
  if (!r) {
    r = document.createElement("div");
    r.className = "fxui";
    el.replaceChildren(r);
  }
  return r;
}
function mountAll(state, scope, blocks, withLive = true) {
  const sections = Array.from(scope.querySelectorAll(".fxui-b"));
  if (scope.classList.contains("fxui-b")) sections.unshift(scope);
  const list = flatten(blocks);
  sections.forEach((sec, i) => {
    const b = list[i];
    if (!b) return;
    const m = MOUNTS[b.type];
    if (m) {
      try {
        const off = m(sec, b, state.ctx);
        if (off) state.cleanups.set(sec, [...state.cleanups.get(sec) ?? [], off]);
      } catch (err) {
        console.warn("[lumafx/ui] mount failed", b.type, err);
      }
    }
    const live = b.live;
    if (withLive && live?.adapter && live.id && state.doc.blocks.includes(b)) startLive(state, b, live);
    if (sec.dataset.expires && state.doc.blocks.includes(b)) scheduleExpiry(state, sec, b);
  });
}
function scheduleExpiry(state, sec, b) {
  const at = Number(sec.dataset.expires);
  if (!Number.isFinite(at) || state.opts.now !== void 0) return;
  const rerender = () => {
    state.ctx.now = Date.now();
    const i = state.doc.blocks.indexOf(b);
    if (i < 0 || !sec.isConnected) return;
    const fresh = replaceSection(state, sec, b, true);
    if (fresh) state.sigs[i] = JSON.stringify(b);
  };
  const wait = at - Date.now();
  if (wait <= 0) {
    queueMicrotask(rerender);
    return;
  }
  if (wait > 2 ** 31 - 1) return;
  const timer = setTimeout(rerender, wait + 50);
  state.cleanups.set(sec, [...state.cleanups.get(sec) ?? [], () => clearTimeout(timer)]);
}
function startLive(state, b, live) {
  const a = adapters.get(live.adapter);
  if (!a) return;
  const apply = (props) => {
    const idx = state.doc.blocks.findIndex((x) => x === b || x.live?.id === live.id);
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
        apply(await a.fetch(live.id, b));
      } catch (err) {
        console.warn("[lumafx/ui] live update failed", err);
      }
      if (!stopped) timer = window.setTimeout(loop, Math.max(5, live.every ?? 30) * 1e3);
    };
    timer = window.setTimeout(loop, Math.max(5, live.every ?? 30) * 1e3);
    state.live.push(() => {
      stopped = true;
      clearTimeout(timer);
    });
  }
}
function replaceSection(state, sec, b, flash = false, withLive = true) {
  const tpl = document.createElement("template");
  tpl.innerHTML = renderBlock(b, state.ctx);
  const fresh = tpl.content.firstElementChild;
  if (!fresh) return null;
  const seen = /* @__PURE__ */ new Map();
  sec.querySelectorAll("[data-k]").forEach((n) => seen.set(n.dataset.k, n.textContent ?? ""));
  fresh.classList.add("fxui-seen");
  fresh.querySelectorAll("[data-k]").forEach((n) => {
    const k = n.dataset.k;
    if (!seen.has(k)) n.classList.add("fxui-new");
    else if (flash && seen.get(k) !== n.textContent) n.classList.add("fxui-changed");
  });
  cleanupSection(state, sec);
  sec.replaceWith(fresh);
  mountAll(state, fresh, [b], withLive);
  return fresh;
}
var themed = /* @__PURE__ */ new WeakSet();
function applyTheme(root, theme) {
  if (theme === "light" || theme === "dark") {
    root.dataset.theme = theme;
    themed.add(root);
  } else if (themed.has(root)) {
    delete root.dataset.theme;
    themed.delete(root);
  }
}
function onImageError(e) {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  img.dataset.broken = "";
  const parent = img.parentElement;
  const card = parent?.matches(".fxui-venue, .fxui-product") ? parent : parent?.matches(".fxui-product > .fxui-media") ? parent.parentElement : null;
  if (card) {
    card.classList.add("fxui-noimg");
    (parent.classList.contains("fxui-media") ? parent : img).remove();
    return;
  }
  const fig = img.closest(".fxui-gallery figure, figure.fxui-figure");
  if (fig) {
    fig.hidden = true;
    return;
  }
  if (parent?.classList.contains("fxui-aphoto")) {
    const name = img.closest("li")?.querySelector(".fxui-name")?.textContent ?? "";
    const span = document.createElement("span");
    span.textContent = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
    img.replaceWith(span);
    return;
  }
  if (img.closest(".fxui-day li, .fxui-vlist button")) {
    const span = document.createElement("span");
    const video = !!img.closest(".fxui-vlist");
    span.className = video ? "fxui-vthumb" : "fxui-lthumb";
    span.innerHTML = icon(video ? "play" : "ticket");
    img.replaceWith(span);
  }
}
var watched = /* @__PURE__ */ new WeakSet();
function setup(el, opts) {
  const prev = roots.get(el);
  if (prev) destroyState(prev);
  const root = rootFor(el);
  if (!watched.has(root)) {
    watched.add(root);
    root.addEventListener("error", onImageError, true);
  }
  const lang = opts.lang ?? el.closest("[lang]")?.getAttribute("lang")?.slice(0, 2) ?? "en";
  const state = { doc: { blocks: [] }, opts, ctx: makeCtx({ ...opts, lang }), cleanups: /* @__PURE__ */ new Map(), live: [], sigs: [], root };
  root.lang = lang;
  applyTheme(root, opts.theme ?? el.getAttribute("theme"));
  roots.set(el, state);
  return state;
}
function render(el, input, opts = {}) {
  const { doc, errors } = validate(input, { partial: opts.partial ?? true, keepUnknown: false });
  const state = setup(el, { ...opts, lang: opts.lang ?? doc.lang });
  state.doc = doc;
  state.root.innerHTML = doc.blocks.map((b) => renderBlock(b, state.ctx)).join("");
  state.sigs = doc.blocks.map((b) => JSON.stringify(b));
  mountAll(state, state.root, doc.blocks);
  return { doc, errors };
}
function hydrate(el, opts = {}) {
  const root = rootFor(el);
  const json = root.querySelector(":scope > script.fxui-data");
  if (!json) return;
  const { doc } = validate(JSON.parse(json.textContent || "{}"));
  const state = setup(el, { ...opts, lang: opts.lang ?? doc.lang ?? root.lang });
  state.doc = doc;
  state.sigs = doc.blocks.map((b) => JSON.stringify(b));
  root.classList.add("fxui-seen");
  root.querySelectorAll("img").forEach((img) => {
    if (img.complete && !img.naturalWidth && img.getAttribute("src")) onImageError({ target: img });
  });
  mountAll(state, root, doc.blocks);
}
function stream(el, opts = {}) {
  const state = setup(el, opts);
  state.root.innerHTML = "";
  state.root.setAttribute("aria-busy", "true");
  let text = "";
  let value;
  let raf = 0;
  const flush = (final = false) => {
    raf = 0;
    const parsed = value !== void 0 ? value : parsePartial(text);
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
        const tpl = document.createElement("template");
        tpl.innerHTML = renderBlock(b, state.ctx);
        const sec = tpl.content.firstElementChild;
        if (!sec) return;
        state.root.append(sec);
        secs[i] = sec;
        mountAll(state, sec, [b], false);
      }
    });
    for (let i = doc.blocks.length; i < secs.length; i++) {
      cleanupSection(state, secs[i]);
      secs[i].remove();
    }
    state.sigs.length = doc.blocks.length;
    doc.blocks.forEach((b, i) => {
      const live = b.live;
      if (!live?.adapter || !live.id || started.has(live.id) || !final && i === doc.blocks.length - 1) return;
      started.add(live.id);
      startLive(state, b, live);
    });
  };
  const started = /* @__PURE__ */ new Set();
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(() => flush());
  };
  return {
    write(chunk) {
      text += chunk;
      value = void 0;
      schedule();
    },
    set(x) {
      if (typeof x === "string") {
        text = x;
        value = void 0;
      } else value = x;
      schedule();
    },
    end() {
      cancelAnimationFrame(raf);
      flush(true);
      state.root.removeAttribute("aria-busy");
      const res = validate(value !== void 0 ? value : parsePartial(text) ?? { blocks: [] });
      emit(state.root, "fxui:done", res);
      return { doc: res.doc, errors: res.errors };
    },
    get text() {
      return text;
    }
  };
}
function update(el, id, props) {
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
function destroy(el) {
  const s = roots.get(el);
  if (s) destroyState(s);
  roots.delete(el);
}
function defineElement(tag = "fx-ui") {
  if (typeof customElements === "undefined" || customElements.get(tag)) return;
  class FxUI extends HTMLElement {
    constructor() {
      super(...arguments);
      this.onAsk = (e) => {
        const base = this.getAttribute("ask-url");
        const text = e.detail?.text;
        if (!base || !text || e.defaultPrevented) return;
        location.href = base + encodeURIComponent(text);
      };
    }
    connectedCallback() {
      this.addEventListener("fxui:ask", this.onAsk);
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => this.isConnected && this.load(), { once: true });
      else this.load();
    }
    disconnectedCallback() {
      this.removeEventListener("fxui:ask", this.onAsk);
      destroy(this);
    }
    attributeChangedCallback(name, a, b) {
      if (a === b || !this.isConnected) return;
      if (name === "theme") {
        const root = this.querySelector(":scope > .fxui");
        if (root) applyTheme(root, b);
      } else this.load();
    }
    opts() {
      return { lang: this.getAttribute("lang") ?? void 0, timeZone: this.getAttribute("time-zone") ?? void 0 };
    }
    async load() {
      const src = this.getAttribute("src");
      const existing = this.querySelector(":scope > .fxui > script.fxui-data");
      if (existing) return hydrate(this, this.opts());
      const inline = this.querySelector(':scope > script[type="application/json"]');
      if (inline) return void this.render(inline.textContent ?? "");
      if (src) {
        this.setAttribute("aria-busy", "true");
        try {
          const res = await fetch(src, { headers: { Accept: "application/json" } });
          this.render(await res.text());
        } finally {
          this.removeAttribute("aria-busy");
        }
      }
    }
    /** Render a document now. */
    render(input) {
      return render(this, input, this.opts());
    }
    /** Start streaming into this element. */
    stream() {
      return stream(this, this.opts());
    }
    update(id, props) {
      return update(this, id, props);
    }
  }
  FxUI.observedAttributes = ["src", "lang", "theme", "time-zone"];
  customElements.define(tag, FxUI);
}

// src/ui/index.ts
function addBlock(type, renderer) {
  RENDERERS[type] = renderer;
}
defineElement();
export {
  BLOCKS,
  BLOCK_MAP,
  COMMON,
  RENDERERS,
  S,
  adapter,
  addBlock,
  addLabels,
  addMount,
  anthropicTool,
  blockSchema,
  blockToText,
  defineElement,
  destroy,
  formationLines,
  hydrate,
  jsonLd,
  jsonLdScript,
  jsonSchema,
  labels,
  openaiTool,
  opt,
  parsePartial,
  parseVideo,
  placePlayers,
  prompt,
  render,
  renderBlock,
  renderToString,
  stream,
  toText,
  update,
  validate
};
