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

  /* ---------------- v0.2 · navigation ---------------- */
  {
    name: 'page-transition',
    title: 'SVG page transitions',
    kind: 'js',
    desc: 'Animated SVG cover between pages of any site (WordPress and Webflow included). Covers on leave, reveals on arrival. Place one element anywhere in <body>.',
    options: {
      style: choice(['wave', 'curtain', 'circle', 'slide'], 'wave', 'Shape of the transition.'),
      color: color('#0b0c12', 'Cover color.'),
      'color-2': color('#ffb547', 'Accent layer color.'),
      duration: time('750ms', 'Length of each half (cover or reveal).', false),
      label: { type: 'string', desc: 'Text shown on the cover, e.g. your brand.' },
      links: { type: 'string', default: 'a[href]', desc: 'Which links trigger a transition.' },
    },
    example: '<div data-fx="page-transition" data-fx-style="wave" data-fx-label="Sphere"></div>',
  },
  {
    name: 'preloader',
    title: 'Preloader',
    kind: 'js',
    desc: 'Full-screen intro with a 000→100 counter that follows real page loading, then lifts away. Hides itself after a few seconds even if JavaScript fails.',
    options: {
      style: choice(['slide', 'wave', 'fade'], 'slide', 'How it exits.'),
      color: color('#0b0c12', 'Background color.'),
      min: time('900ms', 'Minimum time on screen.', false),
    },
    example: '<div data-fx="preloader"><span>Sphere</span></div>',
  },

  /* ---------------- v0.2 · components ---------------- */
  {
    name: 'modal',
    title: 'Liquid modal',
    kind: 'js',
    desc: 'Accessible <dialog> that pulls out of the button, dock icon or link that opened it like a drop of liquid, detaches, and blooms into the panel; closing flows back into the trigger. Without a trigger it rises from the bottom edge. Open it with data-fx-open="#id", any link to href="#id", or modals.open().',
    options: {
      style: choice(['liquid', 'glass', 'scale', 'slide'], 'liquid', 'liquid = a gooey drop that pulls out of the trigger, glass = liquid-glass sheet with a jelly overshoot, scale = the page shrinks back behind it, slide = a clean spring.'),
      from: choice(['auto', 'trigger', 'bottom'], 'auto', 'Where the liquid comes from: the button, icon or link that opened it (auto), or always the bottom edge.'),
      side: choice(['center', 'right', 'left', 'bottom', 'top'], 'center', 'Dock the panel to an edge (a drawer or sheet) instead of the centre.'),
      size: len('560px', 'Panel width (height for top and bottom).'),
      root: { type: 'string', desc: 'Page wrapper that shrinks back with style "scale" (default: [data-fx-sheet-root], #__next, #root, #app).' },
      color: color('#20232e', 'Panel color.'),
    },
    example: '<button data-fx-open="#join">Join</button>\n<dialog id="join" data-fx="modal">…<button data-fx-close>Close</button></dialog>',
  },
  {
    name: 'drawer',
    title: 'Drawer',
    kind: 'js',
    desc: 'A side panel or bottom sheet on a <dialog>: slides in with a spring, as stretchy liquid glass, with the page shrinking back behind it, pushing the page aside to make room, docked next to a page that stays usable, or as liquid out of the button that opened it. Click outside, Esc or data-fx-close closes it with the reverse animation.',
    options: {
      side: choice(['right', 'left', 'bottom', 'top'], 'right', 'Edge it comes from.'),
      style: choice(['slide', 'glass', 'scale', 'push', 'dock', 'liquid'], 'slide', 'slide = spring, glass = liquid glass, scale = the page shrinks back, push = the page slides over to make room, dock = the page reflows next to the panel and stays usable, liquid = pours out of the button.'),
      size: len('560px', 'Width (height for top and bottom).'),
      color: color('#20232e', 'Panel color.'),
      from: choice(['auto', 'trigger', 'bottom'], 'auto', 'For style liquid: where the liquid comes from.'),
      root: { type: 'string', desc: 'Page wrapper that shrinks back with style "scale".' },
    },
    example: '<button data-fx-open="#edit">Edit</button>\n<dialog id="edit" data-fx="drawer" data-fx-style="glass">…<button data-fx-close>Close</button></dialog>',
  },
  {
    name: 'hovercard',
    title: 'Hover card',
    kind: 'js',
    desc: 'A small card that springs open right next to the hovered or focused element and stays inside the viewport.',
    options: {
      for: { type: 'string', desc: 'Selector of the card content (hidden in the page).' },
      text: { type: 'string', desc: 'Plain text content instead of a selector.' },
      placement: choice(['auto', 'top', 'bottom', 'left', 'right'], 'auto', 'Preferred side.'),
      delay: time('90ms', 'Hover delay before opening.', false),
    },
    example: '<a data-fx="hovercard" data-fx-for="#tip-sphere">Sphere</a>',
  },
  {
    name: 'chat',
    title: 'Chat widget',
    kind: 'js',
    desc: 'Animated chat launcher and panel: the button morphs into the window, messages slide in, a typing indicator bounces. Emits fx:chat-send so you can connect any backend.',
    options: {
      title: { type: 'string', default: 'Chat', desc: 'Panel title.' },
      subtitle: { type: 'string', desc: 'Line under the title.' },
      greeting: { type: 'string', desc: 'First message from you to the visitor.' },
      placeholder: { type: 'string', default: 'Write a message…', desc: 'Input placeholder.' },
      quick: { type: 'string', desc: 'Comma-separated quick replies shown as chips.' },
      color: color('#ffb547', 'Accent color.'),
      position: choice(['right', 'left'], 'right', 'Corner of the screen.'),
    },
    example: '<div data-fx="chat" data-fx-title="Support" data-fx-greeting="Hi! How can we help?"></div>',
  },
  {
    name: 'smart-header',
    title: 'Smart header',
    kind: 'hybrid',
    desc: 'Hides while you scroll down, slides back as glass when you scroll up, and can dock an oversized hero logo into the bar as you scroll.',
    options: {
      threshold: len('80px', 'Scroll distance before it reacts.', false),
      hide: flag('Hide while scrolling down.', true),
    },
    example: '<header data-fx="smart-header"><a data-fx-logo>mejuma</a><nav>…</nav></header>',
  },
  {
    name: 'scrollbar',
    title: 'Animated scrollbar',
    kind: 'js',
    desc: 'Custom page scrollbar with a springy thumb, section marks, and a label that pops up next to the cursor showing which section is at that point.',
    options: {
      sections: { type: 'string', default: 'h2, [data-fx-section]', desc: 'Elements that become section marks.' },
      color: color('#ffb547', 'Thumb color.'),
    },
    example: '<div data-fx="scrollbar"></div>',
  },
  {
    name: 'scroll-progress',
    title: 'Scroll progress',
    kind: 'hybrid',
    desc: 'A reading-progress bar that fills as the page scrolls. Runs on the compositor in modern browsers.',
    options: {
      color: color('#ffb547', 'Bar color.'),
      height: len('3px', 'Bar thickness.'),
    },
    example: '<div data-fx="scroll-progress"></div>',
  },
  {
    name: 'dock',
    title: 'Magnifying dock',
    kind: 'js',
    desc: 'Icons grow as the cursor passes over them, like the macOS dock. Labels appear above the hovered icon.',
    options: {
      magnify: num(1.8, 'Maximum scale of the closest icon.'),
      range: len('150px', 'How far the magnification reaches.', false),
    },
    example: '<nav data-fx="dock"><a data-fx-label="Home">🏠</a>…</nav>',
  },
  {
    name: 'hover-icon',
    title: 'Hover icon',
    kind: 'css',
    desc: 'Menu links slide an icon in on hover while the text makes room. Uses the data-fx-icon text, or a child marked data-fx-icon-el.',
    options: {
      icon: { type: 'string', default: '→', desc: 'Icon character or emoji.' },
      side: choice(['left', 'right'], 'left', 'Where the icon appears.'),
    },
    example: '<a data-fx="hover-icon" data-fx-icon="✦">Work</a>',
  },
  {
    name: 'lightbox',
    title: 'Lightbox',
    kind: 'js',
    desc: 'Click a thumbnail and it grows into a full-screen viewer (View Transitions), with keyboard, swipe, zoom and a counter. Put it on a link to a large image, or on a gallery to page through every linked image inside.',
    options: {
      group: { type: 'string', desc: 'Links with the same group page through together.' },
    },
    example: '<a data-fx="lightbox" data-fx-group="villa" href="big.jpg"><img src="small.jpg" alt="…"></a>',
  },

  /* ---------------- v0.2 · images & video ---------------- */
  {
    name: 'image-reveal',
    title: 'Image reveal',
    kind: 'js',
    desc: 'The image is uncovered by a moving mask while it settles from a slight zoom. Seven mask shapes.',
    options: {
      from: choice(['up', 'down', 'left', 'right', 'center', 'circle', 'diagonal'], 'up', 'Direction or shape of the mask.'),
      duration: time('1200ms', 'Reveal length.'),
      delay: time('0ms', 'Delay before it starts.'),
      scale: num(1.25, 'Starting zoom of the image.', true),
    },
    example: '<figure data-fx="image-reveal" data-fx-from="circle"><img …></figure>',
  },
  {
    name: 'expand',
    title: 'Expand on scroll',
    kind: 'hybrid',
    desc: 'An inset, rounded image or video grows to full width as it scrolls into the middle of the screen.',
    options: {
      inset: len('8vw', 'Starting inset on each side.'),
      radius: len('32px', 'Starting corner radius.'),
    },
    example: '<div data-fx="expand"><video autoplay muted loop playsinline …></video></div>',
  },
  {
    name: 'image-trail',
    title: 'Image trail',
    kind: 'js',
    desc: 'Moving the cursor leaves a trail of images that pop in and fade away.',
    options: {
      images: { type: 'string', desc: 'Comma-separated image URLs (or put <img> children inside).' },
      size: len('190px', 'Image width.', false),
      spacing: len('90px', 'Cursor travel between images.', false),
    },
    example: '<section data-fx="image-trail" data-fx-images="a.jpg, b.jpg, c.jpg">…</section>',
  },
  {
    name: 'video-scrub',
    title: 'Scroll-scrubbed video',
    kind: 'js',
    desc: 'The video plays forward as you scroll down and backward as you scroll up, pinned while its section passes.',
    options: {
      length: len('300vh', 'Scroll distance for the whole video.'),
      smooth: num(8, 'Smoothing (higher follows the scroll more tightly).'),
    },
    example: '<section data-fx="video-scrub"><video src="flyover.mp4" muted playsinline preload="auto"></video></section>',
  },
  {
    name: 'frames',
    title: 'Image sequence',
    kind: 'js',
    desc: 'Apple-style scroll animation from numbered images drawn on a canvas. Sharper and smoother to scrub than video.',
    options: {
      src: { type: 'string', desc: 'URL pattern, ### is replaced by the frame number: /seq/frame-###.jpg' },
      count: num(60, 'Number of frames.'),
      start: num(1, 'First frame number.'),
      length: len('300vh', 'Scroll distance for the whole sequence.'),
    },
    example: '<section data-fx="frames" data-fx-src="/seq/f-###.jpg" data-fx-count="90"></section>',
  },

  /* ---------------- v0.2 · SVG & live ---------------- */
  {
    name: 'svg-draw',
    title: 'SVG draw + flow',
    kind: 'js',
    desc: 'Draws the strokes of an SVG when it scrolls into view (or with the scroll), and can send glowing pulses travelling along the paths.',
    options: {
      mode: choice(['view', 'scroll'], 'view', 'view = draws once, scroll = drawing follows the scroll.'),
      duration: time('1800ms', 'Drawing time per path.'),
      stagger: time('140ms', 'Delay between paths.'),
      pulse: num(0, 'Glowing pulses travelling along each path (0 = none).'),
      color: color('#ffb547', 'Pulse color.'),
    },
    example: '<svg data-fx="svg-draw" data-fx-pulse="2" …><path …/></svg>',
  },
  {
    name: 'dot-field',
    title: 'Dot field',
    kind: 'js',
    desc: 'A grid of dots that ripples away from the cursor and breathes when idle.',
    options: {
      color: color('#ffb547', 'Dot color.'),
      gap: len('22px', 'Distance between dots.', false),
      force: num(1, 'How strongly dots react.'),
    },
    example: '<section data-fx="dot-field">…</section>',
  },
  {
    name: 'typewriter',
    title: 'Typewriter',
    kind: 'js',
    desc: 'Types the text letter by letter with a blinking caret. Child lines type one after another, like a terminal.',
    options: {
      speed: time('34ms', 'Time per letter.', false),
      delay: time('0ms', 'Delay before typing starts.', false),
      loop: flag('Erase and start again.'),
    },
    example: '<p data-fx="typewriter">npm i lumafx</p>',
  },
  {
    name: 'rotate-words',
    title: 'Rotating words',
    kind: 'js',
    desc: 'Cycles through a list of words in place, with the width easing between them.',
    options: {
      words: { type: 'string', desc: 'Comma-separated words. The element text is the first.' },
      interval: time('2200ms', 'Time each word stays.', false),
      style: choice(['flip', 'slide', 'blur'], 'flip', 'Transition style.'),
    },
    example: 'We build <span data-fx="rotate-words" data-fx-words="sites, apps, events">brands</span>',
  },
  {
    name: 'clock',
    title: 'Live clock',
    kind: 'js',
    desc: 'Shows the live time in any time zone, ticking every second.',
    options: {
      tz: { type: 'string', desc: 'IANA time zone, e.g. Europe/Tirane. Default: the visitor’s.' },
      seconds: flag('Show seconds.', true),
      hour12: flag('12-hour clock with AM/PM.'),
    },
    example: '<time data-fx="clock" data-fx-tz="Asia/Dubai"></time>',
  },
  {
    name: 'dapple',
    title: 'Leaf shadows',
    kind: 'css',
    loop: true,
    desc: 'Soft, slowly swaying shadows of leaves over a section, like sunlight through a tree.',
    options: {
      opacity: num(0.4, 'Shadow strength, 0–1.', true),
      duration: time('16s', 'Length of one sway.'),
    },
    example: '<section data-fx="dapple">…</section>',
  },
  {
    name: 'ring',
    title: '3D ring carousel',
    kind: 'js',
    desc: 'Items stand on a 3D ring you can drag and fling; it turns slowly on its own when idle.',
    options: {
      speed: num(6, 'Idle rotation in degrees per second (0 = still).'),
      tilt: num(8, 'Viewing angle in degrees.'),
    },
    example: '<div data-fx="ring"><figure>…</figure><figure>…</figure></div>',
  },

  /* ---------------- v0.3 · cards & buttons ---------------- */
  {
    name: 'card',
    title: 'Cards',
    kind: 'hybrid',
    desc: 'Five ready card designs for an image, a title, text and buttons: glow (border lights up around the cursor), product (lifts, image zooms), flip (3D flip to a back side), cover (full-bleed image, details slide up), ticket (event ticket with a perforated stub).',
    options: {
      style: choice(['glow', 'product', 'flip', 'cover', 'ticket'], 'glow', 'Card design.'),
      color: color('#ffb547', 'Accent color.'),
      radius: len('22px', 'Corner radius.'),
    },
    example: '<article data-fx="card" data-fx-style="product"><img src="…" alt="…"><div><h3>Title</h3><p>Text</p><button data-fx="press">Buy</button></div></article>',
  },
  {
    name: 'press',
    title: 'Button press',
    kind: 'js',
    desc: 'Click feedback for buttons and links: a ripple from the click point, a burst of sparks, a fill that follows the cursor in and out, or a squish. Can swap the label to a done state ("Added ✓").',
    options: {
      style: choice(['ripple', 'burst', 'fill', 'squish'], 'ripple', 'Feedback style.'),
      color: color('', 'Effect color (defaults to the current text color).'),
      done: { type: 'string', desc: 'Label shown for a moment after a click, e.g. "Added ✓".' },
    },
    example: '<button data-fx="press" data-fx-style="burst" data-fx-done="Added ✓">Add to cart</button>',
  },
  {
    name: 'form',
    title: 'Smart form',
    kind: 'js',
    desc: 'Validation that feels alive, with the same rules on your server: messages slide in under the field, email typos get a "Did you mean…?" fix, phone numbers settle into international format, passwords get a strength meter, and AJAX submits show server errors on the right fields. Rules come from native attributes (required, type="email", minlength…) or data-rules="required email phone:AL".',
    options: {
      locale: { type: 'string', desc: 'Message language: en or sq (Albanian). Default: the page language.' },
      country: { type: 'string', default: 'AL', desc: 'Default country for phone numbers typed without +.' },
      ajax: flag('Submit with fetch and show the result in place (server errors appear on their fields).'),
      spam: flag('Add a honeypot field and a time trap that schema().validate(…, { spam: true }) checks.', true),
      reset: flag('Clear the form after a successful AJAX submit.'),
      success: { type: 'string', desc: 'Selector of a message to reveal after a successful AJAX submit (or put data-fx-success on an element inside the form).' },
      color: color('#ffb547', 'Accent for focus, the strength meter and the sending spinner.'),
    },
    example: '<form data-fx="form" data-fx-ajax action="/api/contact" method="post"><input name="email" type="email" required>…</form>',
  },
  {
    name: 'loader-3d',
    title: '3D loader',
    kind: 'webgl',
    desc: 'Glossy 3D panels over a floating glass plate, rendered live on the GPU with soft shadows and studio reflections. pages: upright panels open like a book, spread into a ring and fold back. stack: flat tiles fan apart. For page preloaders, loading blog posts and any wait. Falls back to CSS 3D without WebGL; one shared GPU context serves every loader on the page.',
    options: {
      style: choice(['pages', 'stack'], 'pages', 'Scene.'),
      colors: { type: 'string', desc: 'Panel colors, comma-separated. The number of colors sets the number of panels (up to 6). Default: indigo to violet for pages, blue to violet for stack.' },
      count: num(5, 'Number of panels (1–6) when you give fewer colors; colors are blended to fill. Default 5 for pages, 4 for stack.'),
      base: color('#a6d8ea', 'Color of the floating plate.'),
      duration: time('3.6s', 'Length of one cycle (stack: 2.8s).'),
      size: len('160px', 'Width and height of the loader.'),
    },
    example: '<div data-fx="loader-3d"></div>',
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
