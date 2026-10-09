/**
 * React / Next.js bindings. These components only render plain elements with
 * data-fx attributes, so they work in Server Components with zero client JS.
 * Add <FxRuntime /> once (e.g. in app/layout.tsx) to run the JS-powered effects.
 */
import { createElement, type ElementType, type ReactNode } from 'react';
import { META } from '../meta';

type OptionValue = string | number | boolean | null | undefined;

export interface FxProps {
  /** Element or component to render. Default: div. */
  as?: ElementType;
  /** One or more effect names, e.g. "border-beam" or ["tilt", "spotlight"]. */
  effect?: string | string[];
  /** Effect options, e.g. { duration: '4s', color: '#a78bfa' }. */
  options?: Record<string, OptionValue>;
  children?: ReactNode;
  [prop: string]: unknown;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).replace(/([a-z])(\d)/g, '$1-$2');

function optionAttrs(options: Record<string, OptionValue> | undefined, out: Record<string, unknown>) {
  if (!options) return;
  for (const [k, v] of Object.entries(options)) {
    if (v === undefined || v === null) continue;
    out['data-fx-' + kebab(k)] = v === true ? '' : String(v);
  }
}

/** Generic wrapper: <Fx effect="tilt" options={{ max: 8 }}>…</Fx> */
export function Fx({ as = 'div', effect, options, ...rest }: FxProps) {
  const props: Record<string, unknown> = { ...rest };
  if (effect) props['data-fx'] = Array.isArray(effect) ? effect.join(' ') : effect;
  optionAttrs(options, props);
  return createElement(as, props);
}

type Named = { as?: ElementType; children?: ReactNode; className?: string } & Record<string, unknown>;

/** Builds a named component whose effect options are passed as camelCase props. */
function named(name: string, defaultAs: ElementType = 'div', render?: (children: ReactNode) => ReactNode) {
  const keys = new Map(Object.keys(META[name].options).map((k) => [k.replace(/-(\w)/g, (_, c) => c.toUpperCase()), k]));
  const Component = ({ as = defaultAs, children, ...rest }: Named) => {
    const props: Record<string, unknown> = { 'data-fx': name };
    const options: Record<string, OptionValue> = {};
    for (const [k, v] of Object.entries(rest)) {
      const opt = keys.get(k);
      if (opt) options[opt] = v as OptionValue;
      else props[k] = v;
    }
    optionAttrs(options, props);
    return createElement(as, props, render ? render(children) : children);
  };
  Component.displayName = 'Fx(' + name + ')';
  return Component;
}

export const BorderBeam = named('border-beam');
export const Shimmer = named('shimmer', 'span');
export const Shine = named('shine');
export const Aurora = named('aurora', 'section');
export const Squircle = named('squircle');
export const Glass = named('glass');
export const Shadow = named('shadow');
export const Reveal = named('reveal');
export const Stagger = named('stagger');
export const Scramble = named('scramble', 'span');
export const Counter = named('counter', 'span');
export const Spotlight = named('spotlight');
export const Magnetic = named('magnetic');
export const Tilt = named('tilt');
export const CursorImage = named('cursor-image', 'a');
export const Parallax = named('parallax');
export const Stack = named('stack');
export const Carousel = named('carousel');
export const Stories = named('stories');
export const Ripple = named('ripple');
export const Morph = named('morph');

const TextRevealBase = named('text-reveal', 'span');
/** Text effects split the DOM, so the element is re-created whenever the text changes. */
export function TextReveal(props: Named) {
  const key = typeof props.children === 'string' ? props.children : undefined;
  return createElement(TextRevealBase, { ...props, key });
}

/** Renders the track itself so React keeps owning its children. */
export const Marquee = named('marquee', 'div', (children) =>
  createElement('div', { className: 'fx-mq-track' }, children),
);

/** Renders the sticky wrapper and track itself so React keeps owning its children. */
export const HScroll = named('hscroll', 'section', (children) =>
  createElement('div', { className: 'fx-hs-sticky' }, createElement('div', { 'data-fx-track': '' }, children)),
);
