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
import { pageTransition, preloader } from './navigation';
import { modal, drawer } from './modal';
import { hovercard, smartHeader, scrollbar, scrollProgress, dock, lightbox } from './components';
import { chat } from './chat';
import { imageReveal, expand, imageTrail, videoScrub, frames } from './media';
import { svgDraw, dotField, typewriter, rotateWords, clock, ring } from './live';
import { card, press } from './cards';

/** Pure-CSS effects: the runtime only maps options to CSS variables and pauses them off-screen. */
const css = (name: string): Effect => ({ name, meta: META[name] });

export const borderBeam = css('border-beam');
export const shimmer = css('shimmer');
export const shine = css('shine');
export const aurora = css('aurora');
export const hoverIcon = css('hover-icon');
export const dapple = css('dapple');

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
  pageTransition,
  preloader,
  modal,
  drawer,
  hovercard,
  chat,
  smartHeader,
  scrollbar,
  scrollProgress,
  dock,
  lightbox,
  imageReveal,
  expand,
  imageTrail,
  videoScrub,
  frames,
  svgDraw,
  dotField,
  typewriter,
  rotateWords,
  clock,
  ring,
  card,
  press,
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
  // v0.2
  pageTransition,
  preloader,
  modal,
  drawer,
  hovercard,
  chat,
  smartHeader,
  scrollbar,
  scrollProgress,
  dock,
  hoverIcon,
  lightbox,
  imageReveal,
  expand,
  imageTrail,
  videoScrub,
  frames,
  svgDraw,
  dotField,
  typewriter,
  rotateWords,
  clock,
  dapple,
  ring,
  // v0.3
  card,
  press,
];
