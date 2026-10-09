/**
 * Effect metadata — the single source of truth for the public API.
 *
 * Used by the runtime (option parsing, CSS-variable mapping, off-screen pausing),
 * by the React wrappers (which props are effect options), and by the build to
 * generate `effects.json` and `llms.txt` for AI coding agents.
 */

export type OptType =
  | 'time' // bare numbers are milliseconds: "400" -> 400ms
  | 'length' // bare numbers are pixels: "24" -> 24px
  | 'percent' // bare numbers are percent: "30" -> 30%
  | 'number'
  | 'color'
  | 'string'
  | 'boolean'
  | 'enum';

export interface Opt {
  type: OptType;
  default?: string | number | boolean;
  values?: readonly string[];
  /** Mapped to the `--fx-<key>` custom property so CSS can read it. */
  css?: boolean;
  desc: string;
}

export interface Meta {
  name: string;
  title: string;
  /** css = works with zero JS · js = needs the runtime · hybrid = CSS with JS upgrade · webgl = GPU shader */
  kind: 'css' | 'js' | 'hybrid' | 'webgl';
  desc: string;
  /** Infinite CSS animation: the runtime pauses it while off-screen. */
  loop?: boolean;
  options: Record<string, Opt>;
  example: string;
}

const time = (d: string, desc: string, css = true): Opt => ({ type: 'time', default: d, css, desc });
const len = (d: string, desc: string, css = true): Opt => ({ type: 'length', default: d, css, desc });
const num = (d: number, desc: string, css = false): Opt => ({ type: 'number', default: d, css, desc });
const color = (d: string, desc: string): Opt => ({ type: 'color', default: d, css: true, desc });
const flag = (desc: string, d = false): Opt => ({ type: 'boolean', default: d, desc });
const choice = (values: readonly string[], d: string, desc: string): Opt => ({ type: 'enum', values, default: d, desc });

const revealFrom = ['up', 'down', 'left', 'right', 'zoom', 'blur', 'book', 'clip'] as const;

const defs: Meta[] = [
  {
    name: 'border-beam',
    title: 'Border beam',
    kind: 'css',
    loop: true,
    desc: 'A comet of light that travels around the element border. Set mode="full" for a continuous gradient circuit.',
    options: {
      duration: time('6s', 'Time for one lap.'),
      delay: time('0s', 'Start offset. Use negative values to desync several beams.'),
      color: color('#a78bfa', 'Head color of the beam.'),
      'color-2': color('#22d3ee', 'Tail color of the beam.'),
      length: { type: 'percent', default: '22%', css: true, desc: 'Beam length as a share of the full lap.' },
      width: len('1.5px', 'Border thickness.'),
      count: num(1, 'Number of beams chasing each other.', true),
      mode: choice(['beam', 'full'], 'beam', 'beam = travelling comet, full = rotating gradient border.'),
      glow: flag('Adds a soft two-tone halo around the element (uses box-shadow).'),
    },
    example: '<div class="card" data-fx="border-beam" data-fx-duration="5s"></div>',
  },
  {
    name: 'shimmer',
    title: 'Shimmer text',
    kind: 'css',
    loop: true,
    desc: 'A band of light sweeps across text. Keeps the real text selectable and accessible.',
    options: {
      duration: time('2.8s', 'Time between sweeps.'),
      color: color('currentColor', 'Base text color (defaults to the current color, dimmed).'),
      'color-2': color('#ffffff', 'Highlight color.'),
    },
    example: '<h2 data-fx="shimmer">Introducing Luma</h2>',
  },
  {
    name: 'shine',
    title: 'Shine sweep',
    kind: 'css',
    loop: true,
    desc: 'A glossy highlight sweeps across a surface such as a button or card.',
    options: {
      duration: time('3.2s', 'Time between sweeps.'),
      intensity: num(0.35, 'Opacity of the highlight, 0–1.', true),
      trigger: choice(['loop', 'hover'], 'loop', 'loop = repeats forever, hover = sweeps once on hover.'),
    },
    example: '<button data-fx="shine">Get started</button>',
  },
  {
    name: 'aurora',
    title: 'Aurora background',
    kind: 'css',
    loop: true,
    desc: 'Slow, drifting aurora light behind the content of a section.',
    options: {
      duration: time('18s', 'Length of one drift cycle.'),
      color: color('#7c3aed', 'First light.'),
      'color-2': color('#06b6d4', 'Second light.'),
      'color-3': color('#ec4899', 'Third light.'),
      opacity: num(0.55, 'Overall strength, 0–1.', true),
    },
    example: '<section data-fx="aurora">…</section>',
  },
  {
    name: 'squircle',
    title: 'Squircle corners',
    kind: 'hybrid',
    desc: 'Smooth, continuous iOS-style corners. Native corner-shape where supported, an SVG clip-path fallback elsewhere.',
    options: {
      radius: len('28px', 'Corner size.'),
      smoothing: num(0.6, 'Fallback corner smoothing, 0–1 (0.6 matches iOS).'),
      fallback: choice(['auto', 'clip', 'radius'], 'auto', 'Where corner-shape is missing: clip = SVG clip-path, radius = plain rounded corners, auto = clip unless the element has a border or shadow.'),
    },
    example: '<div data-fx="squircle" data-fx-radius="32">…</div>',
  },
  {
    name: 'glass',
    title: 'Liquid glass',
    kind: 'hybrid',
    desc: 'Glass surface with rim light and specular sheen. Adds real edge refraction and chromatic aberration in Chromium; frosted glass everywhere else.',
    options: {
      blur: len('14px', 'Backdrop blur (frost mode, and fallback browsers).'),
      saturate: num(1.6, 'Backdrop saturation.', true),
      tint: color('rgb(255 255 255 / 0.08)', 'Surface tint.'),
      refraction: num(1, 'Edge refraction strength (Chromium).'),
      aberration: num(1, 'Chromatic aberration strength, 0 to disable (Chromium).'),
      mode: choice(['liquid', 'frost'], 'liquid', 'liquid = refraction where supported, frost = blur only.'),
    },
    example: '<nav data-fx="glass">…</nav>',
  },
  {
    name: 'shadow',
    title: 'Realistic shadow',
    kind: 'hybrid',
    desc: 'Five-layer soft shadow that looks physical. Optional hover lift, or a light source that follows the cursor.',
    options: {
      elevation: num(1, 'Shadow depth multiplier.', true),
      color: color('rgb(15 17 35)', 'Shadow color.'),
      lift: flag('Lifts the element on hover.'),
      light: choice(['top', 'cursor'], 'top', 'top = fixed light above, cursor = shadow moves away from the cursor.'),
    },
    example: '<div data-fx="shadow" data-fx-lift>…</div>',
  },
  {
    name: 'reveal',
    title: 'Scroll reveal',
    kind: 'js',
    desc: 'Animates the element in when it scrolls into view. Never leaves content hidden if JavaScript fails.',
    options: {
      from: choice(revealFrom, 'up', 'Entrance style.'),
      duration: time('900ms', 'Animation length.'),
      delay: time('0ms', 'Delay before it starts.'),
      distance: len('28px', 'Travel distance for up/down/left/right.'),
      ease: { type: 'string', default: 'cubic-bezier(.16,1,.3,1)', css: true, desc: 'CSS easing.' },
      once: flag('Animate only the first time it enters the viewport.', true),
    },
    example: '<div data-fx="reveal" data-fx-from="blur">…</div>',
  },
  {
    name: 'stagger',
    title: 'Stagger children',
    kind: 'js',
    desc: 'Reveals each child one after another when the group scrolls into view.',
    options: {
      from: choice(revealFrom, 'up', 'Entrance style of each child.'),
      stagger: time('70ms', 'Delay between children.'),
      duration: time('800ms', 'Animation length per child.'),
      delay: time('0ms', 'Delay before the first child.'),
      distance: len('24px', 'Travel distance.'),
      ease: { type: 'string', default: 'cubic-bezier(.16,1,.3,1)', css: true, desc: 'CSS easing.' },
      once: flag('Animate only the first time.', true),
    },
    example: '<ul data-fx="stagger"><li>…</li><li>…</li></ul>',
  },
  {
    name: 'text-reveal',
    title: 'Text reveal',
    kind: 'js',
    desc: 'Splits text into words, letters or lines and animates them in. Keeps links and inline markup intact.',
    options: {
      split: choice(['words', 'chars', 'lines'], 'words', 'How the text is split.'),
      style: choice(['blur', 'rise', 'flip', 'fade'], 'blur', 'blur = focus in, rise = slides up from a mask, flip = letters unfold like pages, fade = opacity only.'),
      stagger: time('', 'Delay between pieces (default 60ms words, 22ms letters, 120ms lines).'),
      duration: time('800ms', 'Animation length per piece.'),
      delay: time('0ms', 'Delay before it starts.'),
      trigger: choice(['view', 'load'], 'view', 'Start when visible, or immediately.', ),
      once: flag('Animate only the first time.', true),
    },
    example: '<h1 data-fx="text-reveal" data-fx-split="chars" data-fx-style="flip">Hello</h1>',
  },
  {
    name: 'scramble',
    title: 'Text scramble',
    kind: 'js',
    desc: 'Letters decode from random characters into the final text.',
    options: {
      trigger: choice(['view', 'hover', 'load'], 'view', 'When to play.'),
      speed: time('28ms', 'Time per letter.', false),
      chars: { type: 'string', default: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?/<>', desc: 'Characters used while scrambling.' },
    },
    example: '<span data-fx="scramble" data-fx-trigger="hover">Decode me</span>',
  },
  {
    name: 'counter',
    title: 'Number counter',
    kind: 'js',
    desc: 'Counts up to the number in the text when it scrolls into view. Keeps prefixes, suffixes and the original number format.',
    options: {
      from: num(0, 'Start value.'),
      duration: time('1800ms', 'Count duration.', false),
    },
    example: '<strong data-fx="counter">$12,500+</strong>',
  },
  {
    name: 'marquee',
    title: 'Marquee',
    kind: 'hybrid',
    loop: true,
    desc: 'Seamless infinite scroll of logos or cards with soft edges. Pauses on hover.',
    options: {
      speed: num(60, 'Speed in pixels per second.'),
      gap: len('2rem', 'Space between items.'),
      fade: { type: 'percent', default: '8%', css: true, desc: 'Edge fade width.' },
      reverse: flag('Scroll the other way.'),
      vertical: flag('Scroll vertically.'),
      pause: flag('Pause on hover.', true),
    },
    example: '<div data-fx="marquee"><img …><img …></div>',
  },
  {
    name: 'spotlight',
    title: 'Spotlight card',
    kind: 'js',
    desc: 'A soft light and a glowing border follow the cursor across the card.',
    options: {
      color: color('#a78bfa', 'Light color.'),
      size: len('360px', 'Light radius.'),
      border: flag('Light up the border too.', true),
    },
    example: '<div data-fx="spotlight">…</div>',
  },
  {
    name: 'magnetic',
    title: 'Magnetic',
    kind: 'js',
    desc: 'The element is pulled toward the cursor when it gets close, then springs back.',
    options: {
      strength: num(0.35, 'Pull strength, 0–1.'),
      area: len('40px', 'Extra reach around the element.', false),
    },
    example: '<a data-fx="magnetic" href="#">Let\'s talk</a>',
  },
  {
    name: 'tilt',
    title: '3D tilt + glare',
    kind: 'js',
    desc: 'Tilts toward the cursor in 3D with a moving light reflection. Children with data-fx-depth float above the surface.',
    options: {
      max: num(10, 'Maximum tilt in degrees.'),
      scale: num(1.03, 'Scale while hovered.'),
      perspective: len('900px', 'Perspective distance.', false),
      glare: flag('Show the light reflection.', true),
    },
    example: '<div data-fx="tilt"><h3 data-fx-depth="40">Floating</h3></div>',
  },
  {
    name: 'cursor-image',
    title: 'Cursor image / label',
    kind: 'js',
    desc: 'Hovering shows an image, icon or label that follows the cursor with a little momentum.',
    options: {
      src: { type: 'string', desc: 'Image to show.' },
      label: { type: 'string', desc: 'Text or emoji to show instead of an image.' },
      size: len('280px', 'Image width.', false),
      cursor: choice(['auto', 'none'], 'auto', 'none hides the native cursor while hovering.'),
    },
    example: '<a data-fx="cursor-image" data-fx-src="/work/1.jpg">Project one</a>',
  },
  {
    name: 'parallax',
    title: 'Parallax',
    kind: 'hybrid',
    desc: 'Moves at a different speed than the page while scrolling. Runs on the compositor in modern browsers.',
    options: {
      speed: num(0.25, 'Positive = moves faster (closer), negative = slower (farther).', true),
    },
    example: '<img data-fx="parallax" data-fx-speed="-0.2" …>',
  },
  {
    name: 'stack',
    title: 'Sticky stacking cards',
    kind: 'hybrid',
    desc: 'Children stick and stack on top of each other while scrolling; covered cards shrink and dim.',
    options: {
      top: len('12vh', 'Distance from the top where cards stick.'),
      offset: len('16px', 'Visible edge of each covered card.'),
      shrink: num(0.05, 'How much each covered card shrinks.'),
    },
    example: '<div data-fx="stack"><article>…</article><article>…</article></div>',
  },
  {
    name: 'hscroll',
    title: 'Horizontal scroll section',
    kind: 'hybrid',
    desc: 'Vertical scrolling moves a row of panels sideways while the section is pinned.',
    options: {
      gap: len('2rem', 'Space between panels.'),
    },
    example: '<section data-fx="hscroll"><div>…panels…</div></section>',
  },
  {
    name: 'carousel',
    title: 'Drag carousel',
    kind: 'hybrid',
    desc: 'Native scroll-snap carousel with mouse drag and momentum, keyboard support and optional controls.',
    options: {
      slide: len('80%', 'Slide width.'),
      gap: len('16px', 'Space between slides.'),
      style: choice(['default', 'scale'], 'default', 'scale = slides grow toward the center (coverflow).'),
      controls: flag('Add previous/next buttons and dots.'),
      autoplay: time('0', 'Advance every N ms (0 = off). Pauses on hover and focus.', false),
    },
    example: '<div data-fx="carousel" data-fx-controls><img …><img …></div>',
  },
  {
    name: 'stories',
    title: 'Stories',
    kind: 'js',
    desc: 'Instagram-style stories: progress bars, tap left/right, hold to pause, swipe.',
    options: {
      duration: time('5000ms', 'Time per slide.'),
      loop: flag('Start over after the last slide.', true),
    },
    example: '<div data-fx="stories"><img …><img …><img …></div>',
  },
  {
    name: 'ripple',
    title: 'Liquid image (WebGL)',
    kind: 'webgl',
    desc: 'Liquid ripples, lens magnification and RGB split follow the cursor over an image.',
    options: {
      strength: num(1, 'Distortion strength.'),
      src: { type: 'string', desc: 'Image URL when the host has no <img> child.' },
    },
    example: '<div data-fx="ripple"><img src="/hero.jpg" alt=""></div>',
  },
  {
    name: 'morph',
    title: 'Shared-element morph',
    kind: 'js',
    desc: 'Names an element for View Transitions so it morphs between states or pages. Pair with lumafx.transition() or transitions.css.',
    options: {
      name: { type: 'string', desc: 'Unique transition name.' },
    },
    example: '<img data-fx="morph" data-fx-name="hero-1" …>',
  },
];

export const META: Record<string, Meta> = Object.fromEntries(defs.map((d) => [d.name, d as Meta]));
export const EFFECT_NAMES = defs.map((d) => d.name);

/** Every `data-fx-*` option attribute, for the MutationObserver filter. */
export function optionAttributes(): string[] {
  const s = new Set<string>();
  for (const m of Object.values(META)) for (const k of Object.keys(m.options)) s.add('data-fx-' + k);
  return [...s];
}

/** Option keys that are exposed to CSS as `--fx-<key>`. */
export function cssOptionKeys(): string[] {
  const s = new Set<string>();
  for (const m of Object.values(META)) for (const [k, o] of Object.entries(m.options)) if (o.css) s.add(k);
  return [...s].sort();
}
