/**
 * Effects as data. A builder stores `FxSpec[]` in its block JSON and turns it into attributes when
 * it renders, on the server or in the browser. `apply`, `read`, `replay` and `preview` work on live
 * elements in the editor canvas.
 */
import { META } from '../meta';
import { presetById, type FxSpec } from './catalog';

export type { FxSpec };
export type FxInput = string | FxSpec | (string | FxSpec)[];

/** Every option attribute any effect understands (data-fx-from, data-fx-duration…). */
const OPTION_KEYS = new Set(Object.values(META).flatMap((m) => Object.keys(m.options)));

const isTimeNumber = (v: unknown) => typeof v === 'number' || /^-?[\d.]+$/.test(String(v));

/** Turns preset ids, effect names and specs into a clean list of specs. */
export function resolve(input: FxInput): FxSpec[] {
  const list = Array.isArray(input) ? input : [input];
  const out: FxSpec[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      for (const word of item.split(/\s+/).filter(Boolean)) {
        const preset = presetById(word);
        if (preset) out.push(...preset.fx.map((s) => ({ effect: s.effect, options: { ...s.options } })));
        else if (META[word]) out.push({ effect: word });
      }
    } else if (item && META[item.effect]) out.push({ effect: item.effect, options: { ...item.options } });
  }
  // One entry per effect; later options win.
  const merged = new Map<string, FxSpec>();
  for (const s of out) {
    const prev = merged.get(s.effect);
    merged.set(s.effect, { effect: s.effect, options: { ...prev?.options, ...s.options } });
  }
  return [...merged.values()].map(normalize);
}

/** Drops unknown options, coerces values to the option's type and removes defaults. */
export function normalize(spec: FxSpec): FxSpec {
  const m = META[spec.effect];
  if (!m) return { effect: spec.effect };
  const options: Record<string, string | number | boolean> = {};
  for (const [k, raw] of Object.entries(spec.options ?? {})) {
    const o = m.options[k];
    if (!o || raw === undefined || raw === null || raw === '') continue;
    let v: string | number | boolean = raw;
    switch (o.type) {
      case 'boolean':
        v = raw === true || raw === 'true' || raw === '' || raw === 1 || raw === '1';
        break;
      case 'number':
        v = Number(raw);
        if (!Number.isFinite(v)) continue;
        break;
      case 'enum':
        if (!o.values?.includes(String(raw))) continue;
        v = String(raw);
        break;
      case 'time':
        v = isTimeNumber(raw) ? Number(raw) + 'ms' : String(raw).trim();
        break;
      case 'length':
        v = isTimeNumber(raw) ? Number(raw) + 'px' : String(raw).trim();
        break;
      case 'percent':
        v = isTimeNumber(raw) ? Number(raw) + '%' : String(raw).trim();
        break;
      default:
        v = String(raw);
    }
    if (sameAsDefault(v, o.default, o.type)) continue;
    options[k] = v;
  }
  return Object.keys(options).length ? { effect: spec.effect, options } : { effect: spec.effect };
}

function toMs(v: unknown) {
  const m = /^(-?[\d.]+)\s*(ms|s)?$/.exec(String(v ?? '').trim());
  return m ? parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1) : NaN;
}

function sameAsDefault(v: unknown, d: unknown, type: string) {
  if (d === undefined) return type === 'boolean' && v === false;
  if (type === 'time') return toMs(v) === toMs(d);
  if (type === 'boolean') return !!v === !!d;
  return String(v).replace(/\s+/g, '') === String(d).replace(/\s+/g, '');
}

/** The HTML attributes for a set of effects: `{ 'data-fx': 'reveal tilt', 'data-fx-from': 'zoom' }`. */
export function toAttributes(input: FxInput): Record<string, string> {
  const specs = resolve(input);
  if (!specs.length) return {};
  const attrs: Record<string, string> = { 'data-fx': specs.map((s) => s.effect).join(' ') };
  for (const s of specs) {
    for (const [k, v] of Object.entries(s.options ?? {})) {
      if (v === false) {
        // Only written when it turns a default-on option off.
        attrs['data-fx-' + k] = 'false';
      } else attrs['data-fx-' + k] = v === true ? '' : String(v);
    }
  }
  return attrs;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The same as an attribute string for templates: `data-fx="reveal" data-fx-from="zoom"`. */
export function toAttributeString(input: FxInput): string {
  return Object.entries(toAttributes(input))
    .map(([k, v]) => (v === '' ? k : `${k}="${esc(v)}"`))
    .join(' ');
}

/** Reads effects back from attributes (an element's, or a plain record from your own HTML parser). */
export function fromAttributes(attrs: Record<string, string | null | undefined> | NamedNodeMap): FxSpec[] {
  const get = (k: string): string | null | undefined =>
    typeof (attrs as NamedNodeMap).getNamedItem === 'function' ? (attrs as NamedNodeMap).getNamedItem(k)?.value : (attrs as Record<string, string>)[k];
  const names = (get('data-fx') || '').split(/\s+/).filter((n) => META[n]);
  // Options share one attribute namespace on an element (data-fx-delay reaches every effect that
  // has a delay). When reading back, each attribute goes to the first effect that declares it.
  const taken = new Set<string>();
  return names.map((name) => {
    const options: Record<string, string | number | boolean> = {};
    for (const [k, o] of Object.entries(META[name].options)) {
      const raw = get('data-fx-' + k);
      if (raw === undefined || raw === null || taken.has(k)) continue;
      taken.add(k);
      if (o.type === 'boolean') options[k] = raw !== 'false' && raw !== '0';
      else if (o.type === 'number') options[k] = Number(raw);
      else options[k] = raw;
    }
    return normalize({ effect: name, options });
  });
}

/* ---------------- live elements ---------------- */

/** Removes every effect and option attribute lumafx put on `el` (other data-fx-* attributes stay). */
export function clear(el: Element) {
  el.removeAttribute('data-fx');
  for (const a of Array.from(el.attributes)) {
    if (a.name.startsWith('data-fx-') && OPTION_KEYS.has(a.name.slice(8))) el.removeAttribute(a.name);
  }
}

/** Replaces the effects on `el`. Accepts preset ids, effect names or specs. Returns the specs applied. */
export function apply(el: Element, input: FxInput): FxSpec[] {
  const specs = resolve(input);
  const attrs = toAttributes(specs);
  // The runtime batches attribute changes, so the effect mounts once with all options in place.
  clear(el);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return specs;
}

/** Adds one effect (or preset) to what `el` already has. */
export function add(el: Element, input: FxInput): FxSpec[] {
  return apply(el, [...read(el), ...resolve(input)]);
}

/** Removes one effect, keeping the others and their options. */
export function remove(el: Element, effect: string): FxSpec[] {
  return apply(
    el,
    read(el).filter((s) => s.effect !== effect),
  );
}

/** The effects currently on `el`. */
export function read(el: Element): FxSpec[] {
  return fromAttributes(el.attributes);
}

const frame = () => new Promise<void>((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 16)));

/**
 * Plays the effects on `el` again from the start, e.g. after an option changed in the editor.
 * Entrance effects replay even if they already ran.
 */
export async function replay(el: Element) {
  const v = el.getAttribute('data-fx');
  if (!v) return;
  el.removeAttribute('data-fx');
  await frame();
  if (!el.hasAttribute('data-fx')) el.setAttribute('data-fx', v);
}

/**
 * Tries effects on `el` without committing: call the returned function to put the previous
 * effects back. Ideal for hovering over presets in a picker.
 */
export function preview(el: Element, input: FxInput): () => void {
  const before = Array.from(el.attributes)
    .filter((a) => a.name === 'data-fx' || (a.name.startsWith('data-fx-') && OPTION_KEYS.has(a.name.slice(8))))
    .map((a) => [a.name, a.value] as const);
  apply(el, []);
  // Let the runtime unmount first, so entrance effects start from their hidden state.
  let done = false;
  frame().then(() => {
    if (!done) apply(el, input);
  });
  return () => {
    if (done) return;
    done = true;
    clear(el);
    for (const [k, v] of before) if (k !== 'data-fx') el.setAttribute(k, v);
    const fxv = before.find(([k]) => k === 'data-fx');
    if (fxv) el.setAttribute('data-fx', fxv[1]);
  };
}
