# lumafx

Premium web effects from one HTML attribute. Border beams, liquid glass, squircles, text reveals, magnetic buttons, stories, WebGL ripples and more.

- **Any stack.** Plain HTML, WordPress, Webflow, Tailwind v4, React and Next.js (Server Components included).
- **CSS first.** Seven effects run with zero JavaScript; the rest use a ~16 KB gzip runtime with no dependencies.
- **Accessible by default.** `prefers-reduced-motion` is respected everywhere, text effects stay readable for screen readers, carousels and stories work from the keyboard.
- **Never hides content.** Hidden "before" states only apply once the runtime is running, with a CSS failsafe if it never boots.
- **Cheap when idle.** Loops pause off-screen, pointer effects sleep until the mouse moves, low-memory and Save-Data devices get a lighter version.
- **AI-ready.** Ships `llms.txt` and `effects.json` so coding agents apply effects correctly.

## Install

### Plain HTML, WordPress, Webflow

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lumafx/dist/lumafx.css">
<script src="https://cdn.jsdelivr.net/npm/lumafx/dist/lumafx.global.js"></script>

<div data-fx="border-beam">…</div>
<h1 data-fx="text-reveal" data-fx-split="chars" data-fx-style="flip">Hello</h1>
<nav data-fx="glass">…</nav>
```

Put the script in `<head>` (no `defer`) so reveal effects never flash. Several effects on one element: `data-fx="tilt spotlight"`.

### npm

```js
import 'lumafx/css';
import 'lumafx/auto'; // registers every effect and starts the runtime
```

Smallest bundle: register only what you use.

```js
import 'lumafx/css';
import { start, register } from 'lumafx/core';
import { tilt, magnetic, textReveal } from 'lumafx';
register(tilt, magnetic, textReveal);
start();
```

### Tailwind CSS v4

```css
@import "tailwindcss";
@import "lumafx/tailwind.css";
```

```html
<div class="fx-border-beam fx-duration-4000 fx-color-amber-400 fx-color2-sky-400 rounded-2xl">…</div>
<h1 class="fx-text-reveal fx-split-chars fx-style-flip">Hello</h1>
```

Effects are real Tailwind utilities, so only the ones you use end up in your CSS. Option utilities: `fx-duration-*`, `fx-delay-*`, `fx-stagger-*`, `fx-color-*`, `fx-color2-*`, `fx-color3-*`, `fx-length-*`, `fx-width-*`, `fx-radius-*`, `fx-blur-*`, `fx-gap-*`, `fx-from-*`, `fx-split-*`, `fx-style-*` and more (see `dist/tailwind.css`). Interactive effects (`fx-magnetic`, `fx-tilt`…) also need the runtime script or `import 'lumafx/auto'`.

### React and Next.js

```tsx
// app/layout.tsx
import 'lumafx/css';
import { FxRuntime } from 'lumafx/react/runtime';

export default function RootLayout({ children }) {
  return <html><body>{children}<FxRuntime /></body></html>;
}
```

```tsx
// any Server Component
import { BorderBeam, TextReveal, Tilt, Marquee } from 'lumafx/react';

<TextReveal as="h1" split="chars" style="flip">Hello</TextReveal>
<BorderBeam className="card" duration="5s" glow>…</BorderBeam>
```

The components render plain elements with `data-fx` attributes: no hooks, no `"use client"`. Only `<FxRuntime />` is a client component.

### Page transitions

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lumafx/dist/transitions.css">
<html data-fx-transition="slide">
```

In a single-page app: `lumafx.transition(() => render(), { preset: 'zoom' })`. Presets: `fade`, `slide`, `slide-back`, `zoom`, `wipe`. Mark shared elements with `data-fx="morph" data-fx-name="hero"`.

## Effects

<!-- effects:start -->
| Effect | Runs on | What it does | Options |
|---|---|---|---|
| `border-beam` | CSS | A comet of light that travels around the element border. Set mode="full" for a continuous gradient circuit. | `duration`, `delay`, `color`, `color-2`, `length`, `width`, `count`, `mode`, `glow` |
| `shimmer` | CSS | A band of light sweeps across text. Keeps the real text selectable and accessible. | `duration`, `color`, `color-2` |
| `shine` | CSS | A glossy highlight sweeps across a surface such as a button or card. | `duration`, `intensity`, `trigger` |
| `aurora` | CSS | Slow, drifting aurora light behind the content of a section. | `duration`, `color`, `color-2`, `color-3`, `opacity` |
| `squircle` | CSS + JS | Smooth, continuous iOS-style corners. Native corner-shape where supported, an SVG clip-path fallback elsewhere. | `radius`, `smoothing`, `fallback` |
| `glass` | CSS + JS | Glass surface with rim light and specular sheen. Adds real edge refraction and chromatic aberration in Chromium; frosted glass everywhere else. | `blur`, `saturate`, `tint`, `refraction`, `aberration`, `mode` |
| `shadow` | CSS + JS | Five-layer soft shadow that looks physical. Optional hover lift, or a light source that follows the cursor. | `elevation`, `color`, `lift`, `light` |
| `reveal` | JS | Animates the element in when it scrolls into view. Never leaves content hidden if JavaScript fails. | `from`, `duration`, `delay`, `distance`, `ease`, `once` |
| `stagger` | JS | Reveals each child one after another when the group scrolls into view. | `from`, `stagger`, `duration`, `delay`, `distance`, `ease`, `once` |
| `text-reveal` | JS | Splits text into words, letters or lines and animates them in. Keeps links and inline markup intact. | `split`, `style`, `stagger`, `duration`, `delay`, `trigger`, `once` |
| `scramble` | JS | Letters decode from random characters into the final text. | `trigger`, `speed`, `chars` |
| `counter` | JS | Counts up to the number in the text when it scrolls into view. Keeps prefixes, suffixes and the original number format. | `from`, `duration` |
| `marquee` | CSS + JS | Seamless infinite scroll of logos or cards with soft edges. Pauses on hover. | `speed`, `gap`, `fade`, `reverse`, `vertical`, `pause` |
| `spotlight` | JS | A soft light and a glowing border follow the cursor across the card. | `color`, `size`, `border` |
| `magnetic` | JS | The element is pulled toward the cursor when it gets close, then springs back. | `strength`, `area` |
| `tilt` | JS | Tilts toward the cursor in 3D with a moving light reflection. Children with data-fx-depth float above the surface. | `max`, `scale`, `perspective`, `glare` |
| `cursor-image` | JS | Hovering shows an image, icon or label that follows the cursor with a little momentum. | `src`, `label`, `size`, `cursor` |
| `parallax` | CSS + JS | Moves at a different speed than the page while scrolling. Runs on the compositor in modern browsers. | `speed` |
| `stack` | CSS + JS | Children stick and stack on top of each other while scrolling; covered cards shrink and dim. | `top`, `offset`, `shrink` |
| `hscroll` | CSS + JS | Vertical scrolling moves a row of panels sideways while the section is pinned. | `gap` |
| `carousel` | CSS + JS | Native scroll-snap carousel with mouse drag and momentum, keyboard support and optional controls. | `slide`, `gap`, `style`, `controls`, `autoplay` |
| `stories` | JS | Instagram-style stories: progress bars, tap left/right, hold to pause, swipe. | `duration`, `loop` |
| `ripple` | WebGL | Liquid ripples, lens magnification and RGB split follow the cursor over an image. | `strength`, `src` |
| `morph` | JS | Names an element for View Transitions so it morphs between states or pages. Pair with lumafx.transition() or transitions.css. | `name` |
<!-- effects:end -->

Options are `data-fx-<option>` attributes. Bare numbers get a unit from the option type: time → ms, length → px, percent → %.

## JavaScript API

| Function | |
|---|---|
| `start(options?)` | Mounts every effect and watches the DOM. Options: `root`, `motion: 'reduce'`, `lite`, `features` (override detection, e.g. `{ sda: false }` to test fallbacks). |
| `stop()` / `refresh()` | Unmount everything / re-detect and remount. |
| `mount(root)` | Mount immediately after injecting HTML (otherwise it happens on the next microtask). |
| `register(effect)` | Add your own effect: `{ name, meta, mount(el, ctx) { …; return cleanup } }`. |
| `transition(update, { preset })` | Run a DOM update inside a View Transition. |
| `stats()` | Which effects are running on how many elements. |

Opt an area out with `data-fx-off`.

## Browser support

Everything works in current Chrome, Edge, Safari and Firefox. Some effects upgrade where the browser can do more:

| Feature | Chrome / Edge | Safari | Firefox | Fallback |
|---|---|---|---|---|
| Glass refraction | ✓ | frosted | frosted | Blur, rim light and sheen |
| Native squircle (`corner-shape`) | 139+ | clip-path | clip-path | Exact SVG clip-path (or plain radius if the element has a border or shadow) |
| Scroll-driven parallax / hscroll | ✓ | 26+ | JS | Same motion driven from JavaScript |
| Page transitions | ✓ | 18+ | same-document only | Instant navigation |

## Performance notes

- Liquid glass re-renders its filter whenever something moves underneath it. Use it on a handful of elements, not on dozens.
- The WebGL ripple creates one WebGL context per image, lazily on first hover. Browsers cap contexts at around 16 per page.
- `tilt` writes `transform` and `magnetic` writes `translate` inline; don't animate those properties yourself on the same element.
- Avoid `overflow: hidden` on a `tilt` element if you use `data-fx-depth` children (it flattens 3D).

## Development

```bash
npm install
npm run build          # dist/, llms.txt, demo/
npm test               # unit tests (Vitest + jsdom)
npm run test:tailwind  # compiles a sample project with the Tailwind v4 CLI
npm run test:browser   # headless Chromium: every effect, fallbacks, reduced motion, phone
```

## License

MIT © Arnold Kajolli
