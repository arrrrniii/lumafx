/**
 * What a builder needs to offer effects in its own UI: groups, form fields generated from the
 * effect metadata, and curated presets. Pure data and functions; no DOM, safe on the server.
 */
import { META, EFFECT_NAMES, type Opt } from '../meta';

export type GroupId = 'entrance' | 'hover' | 'scroll' | 'surface' | 'motion' | 'components';

export const GROUPS: { id: GroupId; label: string; desc: string; effects: string[] }[] = [
  {
    id: 'entrance',
    label: 'Entrance',
    desc: 'Plays once when the block scrolls into view.',
    effects: ['reveal', 'stagger', 'text-reveal', 'scramble', 'typewriter', 'counter', 'image-reveal', 'svg-draw'],
  },
  {
    id: 'hover',
    label: 'Hover & click',
    desc: 'Reacts to the cursor, taps and clicks.',
    effects: ['tilt', 'magnetic', 'spotlight', 'shadow', 'press', 'hover-icon', 'cursor-image', 'ripple', 'card'],
  },
  {
    id: 'scroll',
    label: 'Scroll',
    desc: 'Moves with the page as people scroll.',
    effects: ['parallax', 'stack', 'hscroll', 'expand', 'video-scrub', 'frames'],
  },
  {
    id: 'surface',
    label: 'Surface',
    desc: 'Materials, light and backgrounds.',
    effects: ['glass', 'squircle', 'border-beam', 'shine', 'shimmer', 'aurora', 'dapple', 'dot-field'],
  },
  {
    id: 'motion',
    label: 'Loops',
    desc: 'Keeps moving on its own.',
    effects: ['marquee', 'carousel', 'rotate-words', 'ring', 'stories', 'image-trail', 'clock', 'morph', 'loader-3d'],
  },
  {
    id: 'components',
    label: 'Page & components',
    desc: 'Whole-page pieces and widgets that need their own markup.',
    effects: ['preloader', 'page-transition', 'smart-header', 'scroll-progress', 'scrollbar', 'modal', 'drawer', 'hovercard', 'lightbox', 'dock', 'chat', 'form'],
  },
];

/** What kind of element an effect is meant for, so a panel can hide ones that do not fit. */
export type Fit = 'any' | 'text' | 'container' | 'image' | 'media' | 'button' | 'link' | 'svg' | 'dialog' | 'form' | 'page';

export const FITS: Record<string, Fit> = {
  reveal: 'any',
  stagger: 'container',
  'text-reveal': 'text',
  scramble: 'text',
  typewriter: 'text',
  counter: 'text',
  'image-reveal': 'image',
  'svg-draw': 'svg',
  tilt: 'any',
  magnetic: 'any',
  spotlight: 'any',
  shadow: 'any',
  press: 'button',
  'hover-icon': 'link',
  'cursor-image': 'any',
  ripple: 'image',
  card: 'container',
  parallax: 'any',
  stack: 'container',
  hscroll: 'container',
  expand: 'media',
  'video-scrub': 'media',
  frames: 'container',
  glass: 'any',
  squircle: 'any',
  'border-beam': 'any',
  shine: 'any',
  shimmer: 'text',
  aurora: 'container',
  dapple: 'container',
  'dot-field': 'container',
  marquee: 'container',
  carousel: 'container',
  'rotate-words': 'text',
  ring: 'container',
  stories: 'container',
  'image-trail': 'container',
  clock: 'text',
  morph: 'any',
  'loader-3d': 'any',
  preloader: 'page',
  'page-transition': 'page',
  'smart-header': 'page',
  'scroll-progress': 'page',
  scrollbar: 'page',
  modal: 'dialog',
  drawer: 'dialog',
  hovercard: 'text',
  lightbox: 'image',
  dock: 'container',
  chat: 'page',
  form: 'form',
};

export function groupOf(effect: string): GroupId {
  return GROUPS.find((g) => g.effects.includes(effect))?.id ?? 'components';
}

/* ---------------- form fields ---------------- */

export interface Field {
  key: string;
  label: string;
  type: 'select' | 'toggle' | 'color' | 'number' | 'range' | 'time' | 'length' | 'percent' | 'text';
  default?: string | number | boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  /** For time/length/percent: the unit the number is in. */
  unit?: string;
  help: string;
}

const LABELS: Record<string, string> = {
  'color-2': 'Second color',
  'color-3': 'Third color',
  max: 'Max angle',
  min: 'Minimum time',
  tz: 'Time zone',
  hour12: '12-hour clock',
  src: 'Image or source',
  ease: 'Easing',
};
export const label = (key: string) => LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');

/** Ranges for numeric options that read better as sliders. */
const RANGES: Record<string, [number, number, number]> = {
  'shine.intensity': [0, 1, 0.05],
  'aurora.opacity': [0, 1, 0.05],
  'dapple.opacity': [0, 1, 0.05],
  'squircle.smoothing': [0, 1, 0.05],
  'glass.saturate': [1, 3, 0.1],
  'glass.refraction': [0, 2, 0.1],
  'glass.aberration': [0, 2, 0.1],
  'shadow.elevation': [0, 4, 0.5],
  'magnetic.strength': [0, 1, 0.05],
  'tilt.max': [0, 30, 1],
  'tilt.scale': [1, 1.2, 0.01],
  'parallax.speed': [-1, 1, 0.05],
  'stack.shrink': [0, 0.3, 0.01],
  'image-reveal.scale': [1, 2, 0.05],
  'dot-field.force': [0, 3, 0.1],
  'ripple.strength': [0, 2, 0.1],
  'dock.magnify': [1, 3, 0.1],
  'ring.speed': [0, 40, 1],
  'ring.tilt': [0, 30, 1],
  'marquee.speed': [10, 300, 5],
  'video-scrub.smooth': [0, 20, 1],
  'border-beam.count': [1, 4, 1],
  'loader-3d.count': [1, 6, 1],
  'svg-draw.pulse': [0, 10, 1],
};

const splitUnit = (v: unknown): [number, string] | null => {
  const m = /^(-?[\d.]+)\s*([a-z%]*)$/i.exec(String(v ?? '').trim());
  return m ? [parseFloat(m[1]), m[2]] : null;
};

function fieldFor(effect: string, key: string, o: Opt): Field {
  const f: Field = { key, label: label(key), type: 'text', help: o.desc };
  if (o.default !== undefined && o.default !== '') f.default = o.default;
  switch (o.type) {
    case 'enum':
      f.type = 'select';
      f.options = (o.values ?? []).map((v) => ({ value: v, label: label(v) }));
      break;
    case 'boolean':
      f.type = 'toggle';
      f.default = !!o.default;
      break;
    case 'color':
      f.type = 'color';
      break;
    case 'number': {
      const r = RANGES[effect + '.' + key];
      if (r) {
        f.type = 'range';
        [f.min, f.max, f.step] = r;
      } else {
        f.type = 'number';
        f.step = typeof o.default === 'number' && Math.abs(o.default) < 2 && !Number.isInteger(o.default) ? 0.05 : 1;
      }
      break;
    }
    case 'time': {
      f.type = 'time';
      f.unit = 'ms';
      const d = splitUnit(o.default);
      if (d) f.default = d[1] === 's' ? d[0] * 1000 : d[0];
      f.min = 0;
      f.step = 50;
      break;
    }
    case 'length':
      f.type = 'length';
      f.unit = splitUnit(o.default)?.[1] || 'px';
      break;
    case 'percent':
      f.type = 'percent';
      f.unit = '%';
      f.min = 0;
      f.max = 100;
      break;
  }
  return f;
}

/** Form fields for an effect's options, ready to render in a settings panel. */
export function fields(effect: string): Field[] {
  const m = META[effect];
  if (!m) return [];
  return Object.entries(m.options).map(([k, o]) => fieldFor(effect, k, o));
}

export interface CatalogEntry {
  name: string;
  title: string;
  desc: string;
  kind: string;
  group: GroupId;
  fit: Fit;
  example: string;
  fields: Field[];
}

/** Every effect with its group, what it fits and its fields. Render a picker straight from this. */
export function catalog(): CatalogEntry[] {
  return EFFECT_NAMES.map((name) => {
    const m = META[name];
    return { name, title: m.title, desc: m.desc, kind: m.kind, group: groupOf(name), fit: FITS[name] ?? 'any', example: m.example, fields: fields(name) };
  });
}

/* ---------------- presets ---------------- */

export interface FxSpec {
  effect: string;
  options?: Record<string, string | number | boolean>;
}

export interface Preset {
  id: string;
  label: string;
  group: GroupId;
  /** One or more effects applied together. */
  fx: FxSpec[];
}

const P = (id: string, label: string, group: GroupId, ...fx: FxSpec[]): Preset => ({ id, label, group, fx });
const fx = (effect: string, options?: FxSpec['options']): FxSpec => (options ? { effect, options } : { effect });

/** Curated starting points. Each one is plain data, so builders can store or extend them. */
export const PRESETS: Preset[] = [
  // Entrance
  P('fade-up', 'Fade up', 'entrance', fx('reveal')),
  P('fade-down', 'Fade down', 'entrance', fx('reveal', { from: 'down' })),
  P('from-left', 'From the left', 'entrance', fx('reveal', { from: 'left' })),
  P('from-right', 'From the right', 'entrance', fx('reveal', { from: 'right' })),
  P('zoom-in', 'Zoom in', 'entrance', fx('reveal', { from: 'zoom' })),
  P('blur-in', 'Blur in', 'entrance', fx('reveal', { from: 'blur' })),
  P('book', 'Open like a book', 'entrance', fx('reveal', { from: 'book' })),
  P('wipe-up', 'Wipe up', 'entrance', fx('reveal', { from: 'clip' })),
  P('cascade', 'Cascade children', 'entrance', fx('stagger')),
  P('cascade-zoom', 'Cascade, zoom', 'entrance', fx('stagger', { from: 'zoom', stagger: 90 })),
  P('words-blur', 'Words from blur', 'entrance', fx('text-reveal')),
  P('chars-flip', 'Letters flip up', 'entrance', fx('text-reveal', { split: 'chars', style: 'flip' })),
  P('lines-rise', 'Lines rise', 'entrance', fx('text-reveal', { split: 'lines', style: 'rise' })),
  P('decode', 'Decode', 'entrance', fx('scramble')),
  P('type-on', 'Type on', 'entrance', fx('typewriter')),
  P('count-up', 'Count up', 'entrance', fx('counter')),
  P('image-curtain', 'Image curtain', 'entrance', fx('image-reveal')),
  P('image-circle', 'Image from a circle', 'entrance', fx('image-reveal', { from: 'circle' })),
  P('draw-lines', 'Draw the lines', 'entrance', fx('svg-draw')),
  // Hover & click
  P('tilt', '3D tilt', 'hover', fx('tilt')),
  P('tilt-soft', 'Soft tilt', 'hover', fx('tilt', { max: 5, glare: false })),
  P('magnetic', 'Magnetic', 'hover', fx('magnetic')),
  P('spotlight', 'Spotlight', 'hover', fx('spotlight')),
  P('lift', 'Lift with shadow', 'hover', fx('shadow', { lift: true, light: 'cursor' })),
  P('ripple-click', 'Ripple on click', 'hover', fx('press')),
  P('burst-click', 'Burst on click', 'hover', fx('press', { style: 'burst' })),
  P('fill-hover', 'Fill on hover', 'hover', fx('press', { style: 'fill' })),
  P('squish', 'Squish', 'hover', fx('press', { style: 'squish' })),
  P('arrow-link', 'Arrow on hover', 'hover', fx('hover-icon')),
  P('card-pop', 'Card: pop in + tilt', 'hover', fx('reveal', { from: 'zoom' }), fx('tilt', { max: 6 })),
  P('cta-glow', 'Button: beam + magnet', 'hover', fx('border-beam', { duration: 4000 }), fx('magnetic'), fx('press', { style: 'burst' })),
  // Scroll
  P('parallax-soft', 'Gentle parallax', 'scroll', fx('parallax', { speed: 0.15 })),
  P('parallax-deep', 'Deep parallax', 'scroll', fx('parallax', { speed: 0.4 })),
  P('stack-cards', 'Stacking cards', 'scroll', fx('stack')),
  P('side-scroll', 'Sideways scroll', 'scroll', fx('hscroll')),
  P('expand', 'Grow to full width', 'scroll', fx('expand')),
  // Surface
  P('liquid-glass', 'Liquid glass', 'surface', fx('glass')),
  P('frost', 'Frosted glass', 'surface', fx('glass', { mode: 'frost' })),
  P('squircle', 'Squircle corners', 'surface', fx('squircle')),
  P('beam', 'Border beam', 'surface', fx('border-beam')),
  P('beam-full', 'Glowing border', 'surface', fx('border-beam', { mode: 'full', glow: true })),
  P('shine', 'Shine sweep', 'surface', fx('shine')),
  P('shine-hover', 'Shine on hover', 'surface', fx('shine', { trigger: 'hover' })),
  P('shimmer', 'Shimmer text', 'surface', fx('shimmer')),
  P('aurora', 'Aurora background', 'surface', fx('aurora')),
  P('leaves', 'Leaf shadows', 'surface', fx('dapple')),
  P('dots', 'Dot field', 'surface', fx('dot-field')),
  // Loops
  P('marquee', 'Marquee', 'motion', fx('marquee')),
  P('marquee-back', 'Marquee, reversed', 'motion', fx('marquee', { reverse: true })),
  P('carousel', 'Carousel', 'motion', fx('carousel')),
  P('rotate-words', 'Rotating words', 'motion', fx('rotate-words')),
  P('ring', '3D ring', 'motion', fx('ring')),
  P('loader', '3D loader', 'motion', fx('loader-3d')),
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id);

/* ---------------- what fits an element ---------------- */

/** The kinds of element `el` counts as, most specific first. */
export function fitsOf(el: Element): Fit[] {
  const tag = el.tagName.toLowerCase();
  const out: Fit[] = [];
  if (tag === 'dialog') out.push('dialog');
  if (tag === 'form') out.push('form');
  if (tag === 'svg' || el.querySelector(':scope > svg')) out.push('svg');
  if (tag === 'button' || el.getAttribute('role') === 'button') out.push('button');
  if (tag === 'a') out.push('link', 'button');
  if (/^(img|picture|figure)$/.test(tag) || el.querySelector(':scope > img, :scope > picture')) out.push('image', 'media');
  if (tag === 'video' || el.querySelector(':scope > video')) out.push('media');
  const text = /^(h[1-6]|p|span|blockquote|li|strong|em|small|label|time)$/.test(tag);
  if (text || (!el.children.length && (el.textContent || '').trim())) out.push('text');
  if (el.children.length > 1 || /^(section|div|ul|ol|main|article|header|footer|nav|aside)$/.test(tag)) out.push('container');
  if (tag === 'body' || tag === 'html') out.push('page');
  out.push('any');
  return out;
}

/** Effects that suit `el`, in group order. Page-level pieces are left out unless `el` is the page. */
export function suggest(el: Element): string[] {
  const f = new Set(fitsOf(el));
  return GROUPS.flatMap((g) => g.effects).filter((n) => f.has(FITS[n] ?? 'any'));
}

/** Presets whose effects all suit `el`. */
export function presetsFor(el: Element): Preset[] {
  const ok = new Set(suggest(el));
  return PRESETS.filter((p) => p.fx.every((s) => ok.has(s.effect)));
}
