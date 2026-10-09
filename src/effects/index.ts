import { META } from '../meta';
import type { Effect } from '../core/types';
import { reveal, stagger } from './reveal';
import { textReveal, scramble, counter } from './text';
import { marquee } from './marquee';
import { spotlight, magnetic, tilt, shadow, cursorImage } from './pointer';
import { parallax, stack, hscroll } from './scroll';
import { carousel, stories } from './carousel';
import { squircle } from './squircle';
import { glass } from './glass';
import { ripple } from './ripple';
import { morph } from './morph';

/** Pure-CSS effects: the runtime only maps options to CSS variables and pauses them off-screen. */
const css = (name: string): Effect => ({ name, meta: META[name] });

export const borderBeam = css('border-beam');
export const shimmer = css('shimmer');
export const shine = css('shine');
export const aurora = css('aurora');

export {
  reveal,
  stagger,
  textReveal,
  scramble,
  counter,
  marquee,
  spotlight,
  magnetic,
  tilt,
  shadow,
  cursorImage,
  parallax,
  stack,
  hscroll,
  carousel,
  stories,
  squircle,
  glass,
  ripple,
  morph,
};

export const allEffects: Effect[] = [
  borderBeam,
  shimmer,
  shine,
  aurora,
  squircle,
  glass,
  shadow,
  reveal,
  stagger,
  textReveal,
  scramble,
  counter,
  marquee,
  spotlight,
  magnetic,
  tilt,
  cursorImage,
  parallax,
  stack,
  hscroll,
  carousel,
  stories,
  ripple,
  morph,
];
