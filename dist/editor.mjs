// src/meta.ts
var time = (d, desc, css = true) => ({ type: "time", default: d, css, desc });
var len = (d, desc, css = true) => ({ type: "length", default: d, css, desc });
var num = (d, desc, css = false) => ({ type: "number", default: d, css, desc });
var color = (d, desc) => ({ type: "color", default: d, css: true, desc });
var flag = (desc, d = false) => ({ type: "boolean", default: d, desc });
var choice = (values, d, desc) => ({ type: "enum", values, default: d, desc });
var revealFrom = ["up", "down", "left", "right", "zoom", "blur", "book", "clip"];
var defs = [
  {
    name: "border-beam",
    title: "Border beam",
    kind: "css",
    loop: true,
    desc: 'A comet of light that travels around the element border. Set mode="full" for a continuous gradient circuit.',
    options: {
      duration: time("6s", "Time for one lap."),
      delay: time("0s", "Start offset. Use negative values to desync several beams."),
      color: color("#a78bfa", "Head color of the beam."),
      "color-2": color("#22d3ee", "Tail color of the beam."),
      length: { type: "percent", default: "22%", css: true, desc: "Beam length as a share of the full lap." },
      width: len("1.5px", "Border thickness."),
      count: num(1, "Number of beams chasing each other.", true),
      mode: choice(["beam", "full"], "beam", "beam = travelling comet, full = rotating gradient border."),
      glow: flag("Adds a soft two-tone halo around the element (uses box-shadow).")
    },
    example: '<div class="card" data-fx="border-beam" data-fx-duration="5s"></div>'
  },
  {
    name: "shimmer",
    title: "Shimmer text",
    kind: "css",
    loop: true,
    desc: "A band of light sweeps across text. Keeps the real text selectable and accessible.",
    options: {
      duration: time("2.8s", "Time between sweeps."),
      color: color("currentColor", "Base text color (defaults to the current color, dimmed)."),
      "color-2": color("#ffffff", "Highlight color.")
    },
    example: '<h2 data-fx="shimmer">Introducing Luma</h2>'
  },
  {
    name: "shine",
    title: "Shine sweep",
    kind: "css",
    loop: true,
    desc: "A glossy highlight sweeps across a surface such as a button or card.",
    options: {
      duration: time("3.2s", "Time between sweeps."),
      intensity: num(0.35, "Opacity of the highlight, 0\u20131.", true),
      trigger: choice(["loop", "hover"], "loop", "loop = repeats forever, hover = sweeps once on hover.")
    },
    example: '<button data-fx="shine">Get started</button>'
  },
  {
    name: "aurora",
    title: "Aurora background",
    kind: "css",
    loop: true,
    desc: "Slow, drifting aurora light behind the content of a section.",
    options: {
      duration: time("18s", "Length of one drift cycle."),
      color: color("#7c3aed", "First light."),
      "color-2": color("#06b6d4", "Second light."),
      "color-3": color("#ec4899", "Third light."),
      opacity: num(0.55, "Overall strength, 0\u20131.", true)
    },
    example: '<section data-fx="aurora">\u2026</section>'
  },
  {
    name: "squircle",
    title: "Squircle corners",
    kind: "hybrid",
    desc: "Smooth, continuous iOS-style corners. Native corner-shape where supported, an SVG clip-path fallback elsewhere.",
    options: {
      radius: len("28px", "Corner size."),
      smoothing: num(0.6, "Fallback corner smoothing, 0\u20131 (0.6 matches iOS)."),
      fallback: choice(["auto", "clip", "radius"], "auto", "Where corner-shape is missing: clip = SVG clip-path, radius = plain rounded corners, auto = clip unless the element has a border or shadow.")
    },
    example: '<div data-fx="squircle" data-fx-radius="32">\u2026</div>'
  },
  {
    name: "glass",
    title: "Liquid glass",
    kind: "hybrid",
    desc: "Glass surface with rim light and specular sheen. Adds real edge refraction and chromatic aberration in Chromium; frosted glass everywhere else.",
    options: {
      blur: len("14px", "Backdrop blur (frost mode, and fallback browsers)."),
      saturate: num(1.6, "Backdrop saturation.", true),
      tint: color("rgb(255 255 255 / 0.08)", "Surface tint."),
      refraction: num(1, "Edge refraction strength (Chromium)."),
      aberration: num(1, "Chromatic aberration strength, 0 to disable (Chromium)."),
      mode: choice(["liquid", "frost"], "liquid", "liquid = refraction where supported, frost = blur only.")
    },
    example: '<nav data-fx="glass">\u2026</nav>'
  },
  {
    name: "shadow",
    title: "Realistic shadow",
    kind: "hybrid",
    desc: "Five-layer soft shadow that looks physical. Optional hover lift, or a light source that follows the cursor.",
    options: {
      elevation: num(1, "Shadow depth multiplier.", true),
      color: color("rgb(15 17 35)", "Shadow color."),
      lift: flag("Lifts the element on hover."),
      light: choice(["top", "cursor"], "top", "top = fixed light above, cursor = shadow moves away from the cursor.")
    },
    example: '<div data-fx="shadow" data-fx-lift>\u2026</div>'
  },
  {
    name: "reveal",
    title: "Scroll reveal",
    kind: "js",
    desc: "Animates the element in when it scrolls into view. Never leaves content hidden if JavaScript fails.",
    options: {
      from: choice(revealFrom, "up", "Entrance style."),
      duration: time("900ms", "Animation length."),
      delay: time("0ms", "Delay before it starts."),
      distance: len("28px", "Travel distance for up/down/left/right."),
      ease: { type: "string", default: "cubic-bezier(.16,1,.3,1)", css: true, desc: "CSS easing." },
      once: flag("Animate only the first time it enters the viewport.", true)
    },
    example: '<div data-fx="reveal" data-fx-from="blur">\u2026</div>'
  },
  {
    name: "stagger",
    title: "Stagger children",
    kind: "js",
    desc: "Reveals each child one after another when the group scrolls into view.",
    options: {
      from: choice(revealFrom, "up", "Entrance style of each child."),
      stagger: time("70ms", "Delay between children."),
      duration: time("800ms", "Animation length per child."),
      delay: time("0ms", "Delay before the first child."),
      distance: len("24px", "Travel distance."),
      ease: { type: "string", default: "cubic-bezier(.16,1,.3,1)", css: true, desc: "CSS easing." },
      once: flag("Animate only the first time.", true)
    },
    example: '<ul data-fx="stagger"><li>\u2026</li><li>\u2026</li></ul>'
  },
  {
    name: "text-reveal",
    title: "Text reveal",
    kind: "js",
    desc: "Splits text into words, letters or lines and animates them in. Keeps links and inline markup intact.",
    options: {
      split: choice(["words", "chars", "lines"], "words", "How the text is split."),
      style: choice(["blur", "rise", "flip", "fade"], "blur", "blur = focus in, rise = slides up from a mask, flip = letters unfold like pages, fade = opacity only."),
      stagger: time("", "Delay between pieces (default 60ms words, 22ms letters, 120ms lines)."),
      duration: time("800ms", "Animation length per piece."),
      delay: time("0ms", "Delay before it starts."),
      trigger: choice(["view", "load"], "view", "Start when visible, or immediately."),
      once: flag("Animate only the first time.", true)
    },
    example: '<h1 data-fx="text-reveal" data-fx-split="chars" data-fx-style="flip">Hello</h1>'
  },
  {
    name: "scramble",
    title: "Text scramble",
    kind: "js",
    desc: "Letters decode from random characters into the final text.",
    options: {
      trigger: choice(["view", "hover", "load"], "view", "When to play."),
      speed: time("28ms", "Time per letter.", false),
      chars: { type: "string", default: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?/<>", desc: "Characters used while scrambling." }
    },
    example: '<span data-fx="scramble" data-fx-trigger="hover">Decode me</span>'
  },
  {
    name: "counter",
    title: "Number counter",
    kind: "js",
    desc: "Counts up to the number in the text when it scrolls into view. Keeps prefixes, suffixes and the original number format.",
    options: {
      from: num(0, "Start value."),
      duration: time("1800ms", "Count duration.", false)
    },
    example: '<strong data-fx="counter">$12,500+</strong>'
  },
  {
    name: "marquee",
    title: "Marquee",
    kind: "hybrid",
    loop: true,
    desc: "Seamless infinite scroll of logos or cards with soft edges. Pauses on hover.",
    options: {
      speed: num(60, "Speed in pixels per second."),
      gap: len("2rem", "Space between items."),
      fade: { type: "percent", default: "8%", css: true, desc: "Edge fade width." },
      reverse: flag("Scroll the other way."),
      vertical: flag("Scroll vertically."),
      pause: flag("Pause on hover.", true)
    },
    example: '<div data-fx="marquee"><img \u2026><img \u2026></div>'
  },
  {
    name: "spotlight",
    title: "Spotlight card",
    kind: "js",
    desc: "A soft light and a glowing border follow the cursor across the card.",
    options: {
      color: color("#a78bfa", "Light color."),
      size: len("360px", "Light radius."),
      border: flag("Light up the border too.", true)
    },
    example: '<div data-fx="spotlight">\u2026</div>'
  },
  {
    name: "magnetic",
    title: "Magnetic",
    kind: "js",
    desc: "The element is pulled toward the cursor when it gets close, then springs back.",
    options: {
      strength: num(0.35, "Pull strength, 0\u20131."),
      area: len("40px", "Extra reach around the element.", false)
    },
    example: `<a data-fx="magnetic" href="#">Let's talk</a>`
  },
  {
    name: "tilt",
    title: "3D tilt + glare",
    kind: "js",
    desc: "Tilts toward the cursor in 3D with a moving light reflection. Children with data-fx-depth float above the surface.",
    options: {
      max: num(10, "Maximum tilt in degrees."),
      scale: num(1.03, "Scale while hovered."),
      perspective: len("900px", "Perspective distance.", false),
      glare: flag("Show the light reflection.", true)
    },
    example: '<div data-fx="tilt"><h3 data-fx-depth="40">Floating</h3></div>'
  },
  {
    name: "cursor-image",
    title: "Cursor image / label",
    kind: "js",
    desc: "Hovering shows an image, icon or label that follows the cursor with a little momentum.",
    options: {
      src: { type: "string", desc: "Image to show." },
      label: { type: "string", desc: "Text or emoji to show instead of an image." },
      size: len("280px", "Image width.", false),
      cursor: choice(["auto", "none"], "auto", "none hides the native cursor while hovering.")
    },
    example: '<a data-fx="cursor-image" data-fx-src="/work/1.jpg">Project one</a>'
  },
  {
    name: "parallax",
    title: "Parallax",
    kind: "hybrid",
    desc: "Moves at a different speed than the page while scrolling. Runs on the compositor in modern browsers.",
    options: {
      speed: num(0.25, "Positive = moves faster (closer), negative = slower (farther).", true)
    },
    example: '<img data-fx="parallax" data-fx-speed="-0.2" \u2026>'
  },
  {
    name: "stack",
    title: "Sticky stacking cards",
    kind: "hybrid",
    desc: "Children stick and stack on top of each other while scrolling; covered cards shrink and dim.",
    options: {
      top: len("12vh", "Distance from the top where cards stick."),
      offset: len("16px", "Visible edge of each covered card."),
      shrink: num(0.05, "How much each covered card shrinks.")
    },
    example: '<div data-fx="stack"><article>\u2026</article><article>\u2026</article></div>'
  },
  {
    name: "hscroll",
    title: "Horizontal scroll section",
    kind: "hybrid",
    desc: "Vertical scrolling moves a row of panels sideways while the section is pinned.",
    options: {
      gap: len("2rem", "Space between panels.")
    },
    example: '<section data-fx="hscroll"><div>\u2026panels\u2026</div></section>'
  },
  {
    name: "carousel",
    title: "Drag carousel",
    kind: "hybrid",
    desc: "Native scroll-snap carousel with mouse drag and momentum, keyboard support and optional controls.",
    options: {
      slide: len("80%", "Slide width."),
      gap: len("16px", "Space between slides."),
      style: choice(["default", "scale"], "default", "scale = slides grow toward the center (coverflow)."),
      controls: flag("Add previous/next buttons and dots."),
      autoplay: time("0", "Advance every N ms (0 = off). Pauses on hover and focus.", false)
    },
    example: '<div data-fx="carousel" data-fx-controls><img \u2026><img \u2026></div>'
  },
  {
    name: "stories",
    title: "Stories",
    kind: "js",
    desc: "Instagram-style stories: progress bars, tap left/right, hold to pause, swipe.",
    options: {
      duration: time("5000ms", "Time per slide."),
      loop: flag("Start over after the last slide.", true)
    },
    example: '<div data-fx="stories"><img \u2026><img \u2026><img \u2026></div>'
  },
  {
    name: "ripple",
    title: "Liquid image (WebGL)",
    kind: "webgl",
    desc: "Liquid ripples, lens magnification and RGB split follow the cursor over an image.",
    options: {
      strength: num(1, "Distortion strength."),
      src: { type: "string", desc: "Image URL when the host has no <img> child." }
    },
    example: '<div data-fx="ripple"><img src="/hero.jpg" alt=""></div>'
  },
  {
    name: "morph",
    title: "Shared-element morph",
    kind: "js",
    desc: "Names an element for View Transitions so it morphs between states or pages. Pair with lumafx.transition() or transitions.css.",
    options: {
      name: { type: "string", desc: "Unique transition name." }
    },
    example: '<img data-fx="morph" data-fx-name="hero-1" \u2026>'
  },
  /* ---------------- v0.2 · navigation ---------------- */
  {
    name: "page-transition",
    title: "SVG page transitions",
    kind: "js",
    desc: "Animated SVG cover between pages of any site (WordPress and Webflow included). Covers on leave, reveals on arrival. Place one element anywhere in <body>.",
    options: {
      style: choice(["wave", "curtain", "circle", "slide"], "wave", "Shape of the transition."),
      color: color("#0b0c12", "Cover color."),
      "color-2": color("#ffb547", "Accent layer color."),
      duration: time("750ms", "Length of each half (cover or reveal).", false),
      label: { type: "string", desc: "Text shown on the cover, e.g. your brand." },
      links: { type: "string", default: "a[href]", desc: "Which links trigger a transition." }
    },
    example: '<div data-fx="page-transition" data-fx-style="wave" data-fx-label="Sphere"></div>'
  },
  {
    name: "preloader",
    title: "Preloader",
    kind: "js",
    desc: "Full-screen intro with a 000\u2192100 counter that follows real page loading, then lifts away. Hides itself after a few seconds even if JavaScript fails.",
    options: {
      style: choice(["slide", "wave", "fade"], "slide", "How it exits."),
      color: color("#0b0c12", "Background color."),
      min: time("900ms", "Minimum time on screen.", false)
    },
    example: '<div data-fx="preloader"><span>Sphere</span></div>'
  },
  /* ---------------- v0.2 · components ---------------- */
  {
    name: "modal",
    title: "Liquid modal",
    kind: "js",
    desc: 'Accessible <dialog> that pulls out of the button, dock icon or link that opened it like a drop of liquid, detaches, and blooms into the panel; closing flows back into the trigger. Without a trigger it rises from the bottom edge. Open it with data-fx-open="#id", any link to href="#id", or modals.open().',
    options: {
      style: choice(["liquid", "glass", "scale", "slide"], "liquid", "liquid = a gooey drop that pulls out of the trigger, glass = liquid-glass sheet with a jelly overshoot, scale = the page shrinks back behind it, slide = a clean spring."),
      from: choice(["auto", "trigger", "bottom"], "auto", "Where the liquid comes from: the button, icon or link that opened it (auto), or always the bottom edge."),
      side: choice(["center", "right", "left", "bottom", "top"], "center", "Dock the panel to an edge (a drawer or sheet) instead of the centre."),
      size: len("560px", "Panel width (height for top and bottom)."),
      root: { type: "string", desc: 'Page wrapper that shrinks back with style "scale" (default: [data-fx-sheet-root], #__next, #root, #app).' },
      color: color("#20232e", "Panel color.")
    },
    example: '<button data-fx-open="#join">Join</button>\n<dialog id="join" data-fx="modal">\u2026<button data-fx-close>Close</button></dialog>'
  },
  {
    name: "drawer",
    title: "Drawer",
    kind: "js",
    desc: "A side panel or bottom sheet on a <dialog>: slides in with a spring, as stretchy liquid glass, with the page shrinking back behind it, pushing the page aside to make room, docked next to a page that stays usable, or as liquid out of the button that opened it. Click outside, Esc or data-fx-close closes it with the reverse animation.",
    options: {
      side: choice(["right", "left", "bottom", "top"], "right", "Edge it comes from."),
      style: choice(["slide", "glass", "scale", "push", "dock", "liquid"], "slide", "slide = spring, glass = liquid glass, scale = the page shrinks back, push = the page slides over to make room, dock = the page reflows next to the panel and stays usable, liquid = pours out of the button."),
      size: len("560px", "Width (height for top and bottom)."),
      color: color("#20232e", "Panel color."),
      from: choice(["auto", "trigger", "bottom"], "auto", "For style liquid: where the liquid comes from."),
      root: { type: "string", desc: 'Page wrapper that shrinks back with style "scale".' }
    },
    example: '<button data-fx-open="#edit">Edit</button>\n<dialog id="edit" data-fx="drawer" data-fx-style="glass">\u2026<button data-fx-close>Close</button></dialog>'
  },
  {
    name: "hovercard",
    title: "Hover card",
    kind: "js",
    desc: "A small card that springs open right next to the hovered or focused element and stays inside the viewport.",
    options: {
      for: { type: "string", desc: "Selector of the card content (hidden in the page)." },
      text: { type: "string", desc: "Plain text content instead of a selector." },
      placement: choice(["auto", "top", "bottom", "left", "right"], "auto", "Preferred side."),
      delay: time("90ms", "Hover delay before opening.", false)
    },
    example: '<a data-fx="hovercard" data-fx-for="#tip-sphere">Sphere</a>'
  },
  {
    name: "chat",
    title: "Chat widget",
    kind: "js",
    desc: "Animated chat launcher and panel: the button morphs into the window, messages slide in, a typing indicator bounces. Emits fx:chat-send so you can connect any backend.",
    options: {
      title: { type: "string", default: "Chat", desc: "Panel title." },
      subtitle: { type: "string", desc: "Line under the title." },
      greeting: { type: "string", desc: "First message from you to the visitor." },
      placeholder: { type: "string", default: "Write a message\u2026", desc: "Input placeholder." },
      quick: { type: "string", desc: "Comma-separated quick replies shown as chips." },
      color: color("#ffb547", "Accent color."),
      position: choice(["right", "left"], "right", "Corner of the screen.")
    },
    example: '<div data-fx="chat" data-fx-title="Support" data-fx-greeting="Hi! How can we help?"></div>'
  },
  {
    name: "smart-header",
    title: "Smart header",
    kind: "hybrid",
    desc: "Hides while you scroll down, slides back as glass when you scroll up, and can dock an oversized hero logo into the bar as you scroll.",
    options: {
      threshold: len("80px", "Scroll distance before it reacts.", false),
      hide: flag("Hide while scrolling down.", true)
    },
    example: '<header data-fx="smart-header"><a data-fx-logo>mejuma</a><nav>\u2026</nav></header>'
  },
  {
    name: "scrollbar",
    title: "Animated scrollbar",
    kind: "js",
    desc: "Custom page scrollbar with a springy thumb, section marks, and a label that pops up next to the cursor showing which section is at that point.",
    options: {
      sections: { type: "string", default: "h2, [data-fx-section]", desc: "Elements that become section marks." },
      color: color("#ffb547", "Thumb color.")
    },
    example: '<div data-fx="scrollbar"></div>'
  },
  {
    name: "scroll-progress",
    title: "Scroll progress",
    kind: "hybrid",
    desc: "A reading-progress bar that fills as the page scrolls. Runs on the compositor in modern browsers.",
    options: {
      color: color("#ffb547", "Bar color."),
      height: len("3px", "Bar thickness.")
    },
    example: '<div data-fx="scroll-progress"></div>'
  },
  {
    name: "dock",
    title: "Magnifying dock",
    kind: "js",
    desc: "Icons grow as the cursor passes over them, like the macOS dock. Labels appear above the hovered icon.",
    options: {
      magnify: num(1.8, "Maximum scale of the closest icon."),
      range: len("150px", "How far the magnification reaches.", false)
    },
    example: '<nav data-fx="dock"><a data-fx-label="Home">\u{1F3E0}</a>\u2026</nav>'
  },
  {
    name: "hover-icon",
    title: "Hover icon",
    kind: "css",
    desc: "Menu links slide an icon in on hover while the text makes room. Uses the data-fx-icon text, or a child marked data-fx-icon-el.",
    options: {
      icon: { type: "string", default: "\u2192", desc: "Icon character or emoji." },
      side: choice(["left", "right"], "left", "Where the icon appears.")
    },
    example: '<a data-fx="hover-icon" data-fx-icon="\u2726">Work</a>'
  },
  {
    name: "lightbox",
    title: "Lightbox",
    kind: "js",
    desc: "Click a thumbnail and it grows into a full-screen viewer (View Transitions), with keyboard, swipe, zoom and a counter. Put it on a link to a large image, or on a gallery to page through every linked image inside.",
    options: {
      group: { type: "string", desc: "Links with the same group page through together." }
    },
    example: '<a data-fx="lightbox" data-fx-group="villa" href="big.jpg"><img src="small.jpg" alt="\u2026"></a>'
  },
  /* ---------------- v0.2 · images & video ---------------- */
  {
    name: "image-reveal",
    title: "Image reveal",
    kind: "js",
    desc: "The image is uncovered by a moving mask while it settles from a slight zoom. Seven mask shapes.",
    options: {
      from: choice(["up", "down", "left", "right", "center", "circle", "diagonal"], "up", "Direction or shape of the mask."),
      duration: time("1200ms", "Reveal length."),
      delay: time("0ms", "Delay before it starts."),
      scale: num(1.25, "Starting zoom of the image.", true)
    },
    example: '<figure data-fx="image-reveal" data-fx-from="circle"><img \u2026></figure>'
  },
  {
    name: "expand",
    title: "Expand on scroll",
    kind: "hybrid",
    desc: "An inset, rounded image or video grows to full width as it scrolls into the middle of the screen.",
    options: {
      inset: len("8vw", "Starting inset on each side."),
      radius: len("32px", "Starting corner radius.")
    },
    example: '<div data-fx="expand"><video autoplay muted loop playsinline \u2026></video></div>'
  },
  {
    name: "image-trail",
    title: "Image trail",
    kind: "js",
    desc: "Moving the cursor leaves a trail of images that pop in and fade away.",
    options: {
      images: { type: "string", desc: "Comma-separated image URLs (or put <img> children inside)." },
      size: len("190px", "Image width.", false),
      spacing: len("90px", "Cursor travel between images.", false)
    },
    example: '<section data-fx="image-trail" data-fx-images="a.jpg, b.jpg, c.jpg">\u2026</section>'
  },
  {
    name: "video-scrub",
    title: "Scroll-scrubbed video",
    kind: "js",
    desc: "The video plays forward as you scroll down and backward as you scroll up, pinned while its section passes.",
    options: {
      length: len("300vh", "Scroll distance for the whole video."),
      smooth: num(8, "Smoothing (higher follows the scroll more tightly).")
    },
    example: '<section data-fx="video-scrub"><video src="flyover.mp4" muted playsinline preload="auto"></video></section>'
  },
  {
    name: "frames",
    title: "Image sequence",
    kind: "js",
    desc: "Apple-style scroll animation from numbered images drawn on a canvas. Sharper and smoother to scrub than video.",
    options: {
      src: { type: "string", desc: "URL pattern, ### is replaced by the frame number: /seq/frame-###.jpg" },
      count: num(60, "Number of frames."),
      start: num(1, "First frame number."),
      length: len("300vh", "Scroll distance for the whole sequence.")
    },
    example: '<section data-fx="frames" data-fx-src="/seq/f-###.jpg" data-fx-count="90"></section>'
  },
  /* ---------------- v0.2 · SVG & live ---------------- */
  {
    name: "svg-draw",
    title: "SVG draw + flow",
    kind: "js",
    desc: "Draws the strokes of an SVG when it scrolls into view (or with the scroll), and can send glowing pulses travelling along the paths.",
    options: {
      mode: choice(["view", "scroll"], "view", "view = draws once, scroll = drawing follows the scroll."),
      duration: time("1800ms", "Drawing time per path."),
      stagger: time("140ms", "Delay between paths."),
      pulse: num(0, "Glowing pulses travelling along each path (0 = none)."),
      color: color("#ffb547", "Pulse color.")
    },
    example: '<svg data-fx="svg-draw" data-fx-pulse="2" \u2026><path \u2026/></svg>'
  },
  {
    name: "dot-field",
    title: "Dot field",
    kind: "js",
    desc: "A grid of dots that ripples away from the cursor and breathes when idle.",
    options: {
      color: color("#ffb547", "Dot color."),
      gap: len("22px", "Distance between dots.", false),
      force: num(1, "How strongly dots react.")
    },
    example: '<section data-fx="dot-field">\u2026</section>'
  },
  {
    name: "typewriter",
    title: "Typewriter",
    kind: "js",
    desc: "Types the text letter by letter with a blinking caret. Child lines type one after another, like a terminal.",
    options: {
      speed: time("34ms", "Time per letter.", false),
      delay: time("0ms", "Delay before typing starts.", false),
      loop: flag("Erase and start again.")
    },
    example: '<p data-fx="typewriter">npm i lumafx</p>'
  },
  {
    name: "rotate-words",
    title: "Rotating words",
    kind: "js",
    desc: "Cycles through a list of words in place, with the width easing between them.",
    options: {
      words: { type: "string", desc: "Comma-separated words. The element text is the first." },
      interval: time("2200ms", "Time each word stays.", false),
      style: choice(["flip", "slide", "blur"], "flip", "Transition style.")
    },
    example: 'We build <span data-fx="rotate-words" data-fx-words="sites, apps, events">brands</span>'
  },
  {
    name: "clock",
    title: "Live clock",
    kind: "js",
    desc: "Shows the live time in any time zone, ticking every second.",
    options: {
      tz: { type: "string", desc: "IANA time zone, e.g. Europe/Tirane. Default: the visitor\u2019s." },
      seconds: flag("Show seconds.", true),
      hour12: flag("12-hour clock with AM/PM.")
    },
    example: '<time data-fx="clock" data-fx-tz="Asia/Dubai"></time>'
  },
  {
    name: "dapple",
    title: "Leaf shadows",
    kind: "css",
    loop: true,
    desc: "Soft, slowly swaying shadows of leaves over a section, like sunlight through a tree.",
    options: {
      opacity: num(0.4, "Shadow strength, 0\u20131.", true),
      duration: time("16s", "Length of one sway.")
    },
    example: '<section data-fx="dapple">\u2026</section>'
  },
  {
    name: "ring",
    title: "3D ring carousel",
    kind: "js",
    desc: "Items stand on a 3D ring you can drag and fling; it turns slowly on its own when idle.",
    options: {
      speed: num(6, "Idle rotation in degrees per second (0 = still)."),
      tilt: num(8, "Viewing angle in degrees.")
    },
    example: '<div data-fx="ring"><figure>\u2026</figure><figure>\u2026</figure></div>'
  },
  /* ---------------- v0.3 · cards & buttons ---------------- */
  {
    name: "card",
    title: "Cards",
    kind: "hybrid",
    desc: "Five ready card designs for an image, a title, text and buttons: glow (border lights up around the cursor), product (lifts, image zooms), flip (3D flip to a back side), cover (full-bleed image, details slide up), ticket (event ticket with a perforated stub).",
    options: {
      style: choice(["glow", "product", "flip", "cover", "ticket"], "glow", "Card design."),
      color: color("#ffb547", "Accent color."),
      radius: len("22px", "Corner radius.")
    },
    example: '<article data-fx="card" data-fx-style="product"><img src="\u2026" alt="\u2026"><div><h3>Title</h3><p>Text</p><button data-fx="press">Buy</button></div></article>'
  },
  {
    name: "press",
    title: "Button press",
    kind: "js",
    desc: 'Click feedback for buttons and links: a ripple from the click point, a burst of sparks, a fill that follows the cursor in and out, or a squish. Can swap the label to a done state ("Added \u2713").',
    options: {
      style: choice(["ripple", "burst", "fill", "squish"], "ripple", "Feedback style."),
      color: color("", "Effect color (defaults to the current text color)."),
      done: { type: "string", desc: 'Label shown for a moment after a click, e.g. "Added \u2713".' }
    },
    example: '<button data-fx="press" data-fx-style="burst" data-fx-done="Added \u2713">Add to cart</button>'
  },
  {
    name: "form",
    title: "Smart form",
    kind: "js",
    desc: 'Validation that feels alive, with the same rules on your server: messages slide in under the field, email typos get a "Did you mean\u2026?" fix, phone numbers settle into international format, passwords get a strength meter, and AJAX submits show server errors on the right fields. Rules come from native attributes (required, type="email", minlength\u2026) or data-rules="required email phone:AL".',
    options: {
      locale: { type: "string", desc: "Message language: en or sq (Albanian). Default: the page language." },
      country: { type: "string", default: "AL", desc: "Default country for phone numbers typed without +." },
      ajax: flag("Submit with fetch and show the result in place (server errors appear on their fields)."),
      spam: flag("Add a honeypot field and a time trap that schema().validate(\u2026, { spam: true }) checks.", true),
      reset: flag("Clear the form after a successful AJAX submit."),
      success: { type: "string", desc: "Selector of a message to reveal after a successful AJAX submit (or put data-fx-success on an element inside the form)." },
      color: color("#ffb547", "Accent for focus, the strength meter and the sending spinner.")
    },
    example: '<form data-fx="form" data-fx-ajax action="/api/contact" method="post"><input name="email" type="email" required>\u2026</form>'
  },
  {
    name: "loader-3d",
    title: "3D loader",
    kind: "webgl",
    desc: "Glossy 3D panels over a floating glass plate, rendered live on the GPU with soft shadows and studio reflections. pages: upright panels open like a book, spread into a ring and fold back. stack: flat tiles fan apart. For page preloaders, loading blog posts and any wait. Falls back to CSS 3D without WebGL; one shared GPU context serves every loader on the page.",
    options: {
      style: choice(["pages", "stack"], "pages", "Scene."),
      colors: { type: "string", desc: "Panel colors, comma-separated. The number of colors sets the number of panels (up to 6). Default: indigo to violet for pages, blue to violet for stack." },
      count: num(5, "Number of panels (1\u20136) when you give fewer colors; colors are blended to fill. Default 5 for pages, 4 for stack."),
      base: color("#a6d8ea", "Color of the floating plate."),
      duration: time("3.6s", "Length of one cycle (stack: 2.8s)."),
      size: len("160px", "Width and height of the loader.")
    },
    example: '<div data-fx="loader-3d"></div>'
  }
];
var META = Object.fromEntries(defs.map((d) => [d.name, d]));
var EFFECT_NAMES = defs.map((d) => d.name);

// src/editor/catalog.ts
var GROUPS = [
  {
    id: "entrance",
    label: "Entrance",
    desc: "Plays once when the block scrolls into view.",
    effects: ["reveal", "stagger", "text-reveal", "scramble", "typewriter", "counter", "image-reveal", "svg-draw"]
  },
  {
    id: "hover",
    label: "Hover & click",
    desc: "Reacts to the cursor, taps and clicks.",
    effects: ["tilt", "magnetic", "spotlight", "shadow", "press", "hover-icon", "cursor-image", "ripple", "card"]
  },
  {
    id: "scroll",
    label: "Scroll",
    desc: "Moves with the page as people scroll.",
    effects: ["parallax", "stack", "hscroll", "expand", "video-scrub", "frames"]
  },
  {
    id: "surface",
    label: "Surface",
    desc: "Materials, light and backgrounds.",
    effects: ["glass", "squircle", "border-beam", "shine", "shimmer", "aurora", "dapple", "dot-field"]
  },
  {
    id: "motion",
    label: "Loops",
    desc: "Keeps moving on its own.",
    effects: ["marquee", "carousel", "rotate-words", "ring", "stories", "image-trail", "clock", "morph", "loader-3d"]
  },
  {
    id: "components",
    label: "Page & components",
    desc: "Whole-page pieces and widgets that need their own markup.",
    effects: ["preloader", "page-transition", "smart-header", "scroll-progress", "scrollbar", "modal", "drawer", "hovercard", "lightbox", "dock", "chat", "form"]
  }
];
var FITS = {
  reveal: "any",
  stagger: "container",
  "text-reveal": "text",
  scramble: "text",
  typewriter: "text",
  counter: "text",
  "image-reveal": "image",
  "svg-draw": "svg",
  tilt: "any",
  magnetic: "any",
  spotlight: "any",
  shadow: "any",
  press: "button",
  "hover-icon": "link",
  "cursor-image": "any",
  ripple: "image",
  card: "container",
  parallax: "any",
  stack: "container",
  hscroll: "container",
  expand: "media",
  "video-scrub": "media",
  frames: "container",
  glass: "any",
  squircle: "any",
  "border-beam": "any",
  shine: "any",
  shimmer: "text",
  aurora: "container",
  dapple: "container",
  "dot-field": "container",
  marquee: "container",
  carousel: "container",
  "rotate-words": "text",
  ring: "container",
  stories: "container",
  "image-trail": "container",
  clock: "text",
  morph: "any",
  "loader-3d": "any",
  preloader: "page",
  "page-transition": "page",
  "smart-header": "page",
  "scroll-progress": "page",
  scrollbar: "page",
  modal: "dialog",
  drawer: "dialog",
  hovercard: "text",
  lightbox: "image",
  dock: "container",
  chat: "page",
  form: "form"
};
function groupOf(effect) {
  return GROUPS.find((g) => g.effects.includes(effect))?.id ?? "components";
}
var LABELS = {
  "color-2": "Second color",
  "color-3": "Third color",
  max: "Max angle",
  min: "Minimum time",
  tz: "Time zone",
  hour12: "12-hour clock",
  src: "Image or source",
  ease: "Easing"
};
var label = (key) => LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " ");
var RANGES = {
  "shine.intensity": [0, 1, 0.05],
  "aurora.opacity": [0, 1, 0.05],
  "dapple.opacity": [0, 1, 0.05],
  "squircle.smoothing": [0, 1, 0.05],
  "glass.saturate": [1, 3, 0.1],
  "glass.refraction": [0, 2, 0.1],
  "glass.aberration": [0, 2, 0.1],
  "shadow.elevation": [0, 4, 0.5],
  "magnetic.strength": [0, 1, 0.05],
  "tilt.max": [0, 30, 1],
  "tilt.scale": [1, 1.2, 0.01],
  "parallax.speed": [-1, 1, 0.05],
  "stack.shrink": [0, 0.3, 0.01],
  "image-reveal.scale": [1, 2, 0.05],
  "dot-field.force": [0, 3, 0.1],
  "ripple.strength": [0, 2, 0.1],
  "dock.magnify": [1, 3, 0.1],
  "ring.speed": [0, 40, 1],
  "ring.tilt": [0, 30, 1],
  "marquee.speed": [10, 300, 5],
  "video-scrub.smooth": [0, 20, 1],
  "border-beam.count": [1, 4, 1],
  "loader-3d.count": [1, 6, 1],
  "svg-draw.pulse": [0, 10, 1]
};
var splitUnit = (v) => {
  const m = /^(-?[\d.]+)\s*([a-z%]*)$/i.exec(String(v ?? "").trim());
  return m ? [parseFloat(m[1]), m[2]] : null;
};
function fieldFor(effect, key, o) {
  const f = { key, label: label(key), type: "text", help: o.desc };
  if (o.default !== void 0 && o.default !== "") f.default = o.default;
  switch (o.type) {
    case "enum":
      f.type = "select";
      f.options = (o.values ?? []).map((v) => ({ value: v, label: label(v) }));
      break;
    case "boolean":
      f.type = "toggle";
      f.default = !!o.default;
      break;
    case "color":
      f.type = "color";
      break;
    case "number": {
      const r = RANGES[effect + "." + key];
      if (r) {
        f.type = "range";
        [f.min, f.max, f.step] = r;
      } else {
        f.type = "number";
        f.step = typeof o.default === "number" && Math.abs(o.default) < 2 && !Number.isInteger(o.default) ? 0.05 : 1;
      }
      break;
    }
    case "time": {
      f.type = "time";
      f.unit = "ms";
      const d = splitUnit(o.default);
      if (d) f.default = d[1] === "s" ? d[0] * 1e3 : d[0];
      f.min = 0;
      f.step = 50;
      break;
    }
    case "length":
      f.type = "length";
      f.unit = splitUnit(o.default)?.[1] || "px";
      break;
    case "percent":
      f.type = "percent";
      f.unit = "%";
      f.min = 0;
      f.max = 100;
      break;
  }
  return f;
}
function fields(effect) {
  const m = META[effect];
  if (!m) return [];
  return Object.entries(m.options).map(([k, o]) => fieldFor(effect, k, o));
}
function catalog() {
  return EFFECT_NAMES.map((name) => {
    const m = META[name];
    return { name, title: m.title, desc: m.desc, kind: m.kind, group: groupOf(name), fit: FITS[name] ?? "any", example: m.example, fields: fields(name) };
  });
}
var P = (id, label2, group, ...fx2) => ({ id, label: label2, group, fx: fx2 });
var fx = (effect, options) => options ? { effect, options } : { effect };
var PRESETS = [
  // Entrance
  P("fade-up", "Fade up", "entrance", fx("reveal")),
  P("fade-down", "Fade down", "entrance", fx("reveal", { from: "down" })),
  P("from-left", "From the left", "entrance", fx("reveal", { from: "left" })),
  P("from-right", "From the right", "entrance", fx("reveal", { from: "right" })),
  P("zoom-in", "Zoom in", "entrance", fx("reveal", { from: "zoom" })),
  P("blur-in", "Blur in", "entrance", fx("reveal", { from: "blur" })),
  P("book", "Open like a book", "entrance", fx("reveal", { from: "book" })),
  P("wipe-up", "Wipe up", "entrance", fx("reveal", { from: "clip" })),
  P("cascade", "Cascade children", "entrance", fx("stagger")),
  P("cascade-zoom", "Cascade, zoom", "entrance", fx("stagger", { from: "zoom", stagger: 90 })),
  P("words-blur", "Words from blur", "entrance", fx("text-reveal")),
  P("chars-flip", "Letters flip up", "entrance", fx("text-reveal", { split: "chars", style: "flip" })),
  P("lines-rise", "Lines rise", "entrance", fx("text-reveal", { split: "lines", style: "rise" })),
  P("decode", "Decode", "entrance", fx("scramble")),
  P("type-on", "Type on", "entrance", fx("typewriter")),
  P("count-up", "Count up", "entrance", fx("counter")),
  P("image-curtain", "Image curtain", "entrance", fx("image-reveal")),
  P("image-circle", "Image from a circle", "entrance", fx("image-reveal", { from: "circle" })),
  P("draw-lines", "Draw the lines", "entrance", fx("svg-draw")),
  // Hover & click
  P("tilt", "3D tilt", "hover", fx("tilt")),
  P("tilt-soft", "Soft tilt", "hover", fx("tilt", { max: 5, glare: false })),
  P("magnetic", "Magnetic", "hover", fx("magnetic")),
  P("spotlight", "Spotlight", "hover", fx("spotlight")),
  P("lift", "Lift with shadow", "hover", fx("shadow", { lift: true, light: "cursor" })),
  P("ripple-click", "Ripple on click", "hover", fx("press")),
  P("burst-click", "Burst on click", "hover", fx("press", { style: "burst" })),
  P("fill-hover", "Fill on hover", "hover", fx("press", { style: "fill" })),
  P("squish", "Squish", "hover", fx("press", { style: "squish" })),
  P("arrow-link", "Arrow on hover", "hover", fx("hover-icon")),
  P("card-pop", "Card: pop in + tilt", "hover", fx("reveal", { from: "zoom" }), fx("tilt", { max: 6 })),
  P("cta-glow", "Button: beam + magnet", "hover", fx("border-beam", { duration: 4e3 }), fx("magnetic"), fx("press", { style: "burst" })),
  // Scroll
  P("parallax-soft", "Gentle parallax", "scroll", fx("parallax", { speed: 0.15 })),
  P("parallax-deep", "Deep parallax", "scroll", fx("parallax", { speed: 0.4 })),
  P("stack-cards", "Stacking cards", "scroll", fx("stack")),
  P("side-scroll", "Sideways scroll", "scroll", fx("hscroll")),
  P("expand", "Grow to full width", "scroll", fx("expand")),
  // Surface
  P("liquid-glass", "Liquid glass", "surface", fx("glass")),
  P("frost", "Frosted glass", "surface", fx("glass", { mode: "frost" })),
  P("squircle", "Squircle corners", "surface", fx("squircle")),
  P("beam", "Border beam", "surface", fx("border-beam")),
  P("beam-full", "Glowing border", "surface", fx("border-beam", { mode: "full", glow: true })),
  P("shine", "Shine sweep", "surface", fx("shine")),
  P("shine-hover", "Shine on hover", "surface", fx("shine", { trigger: "hover" })),
  P("shimmer", "Shimmer text", "surface", fx("shimmer")),
  P("aurora", "Aurora background", "surface", fx("aurora")),
  P("leaves", "Leaf shadows", "surface", fx("dapple")),
  P("dots", "Dot field", "surface", fx("dot-field")),
  // Loops
  P("marquee", "Marquee", "motion", fx("marquee")),
  P("marquee-back", "Marquee, reversed", "motion", fx("marquee", { reverse: true })),
  P("carousel", "Carousel", "motion", fx("carousel")),
  P("rotate-words", "Rotating words", "motion", fx("rotate-words")),
  P("ring", "3D ring", "motion", fx("ring")),
  P("loader", "3D loader", "motion", fx("loader-3d"))
];
var presetById = (id) => PRESETS.find((p) => p.id === id);
function fitsOf(el) {
  const tag = el.tagName.toLowerCase();
  const out = [];
  if (tag === "dialog") out.push("dialog");
  if (tag === "form") out.push("form");
  if (tag === "svg" || el.querySelector(":scope > svg")) out.push("svg");
  if (tag === "button" || el.getAttribute("role") === "button") out.push("button");
  if (tag === "a") out.push("link", "button");
  if (/^(img|picture|figure)$/.test(tag) || el.querySelector(":scope > img, :scope > picture")) out.push("image", "media");
  if (tag === "video" || el.querySelector(":scope > video")) out.push("media");
  const text = /^(h[1-6]|p|span|blockquote|li|strong|em|small|label|time)$/.test(tag);
  if (text || !el.children.length && (el.textContent || "").trim()) out.push("text");
  if (el.children.length > 1 || /^(section|div|ul|ol|main|article|header|footer|nav|aside)$/.test(tag)) out.push("container");
  if (tag === "body" || tag === "html") out.push("page");
  out.push("any");
  return out;
}
function suggest(el) {
  const f = new Set(fitsOf(el));
  return GROUPS.flatMap((g) => g.effects).filter((n) => f.has(FITS[n] ?? "any"));
}
function presetsFor(el) {
  const ok = new Set(suggest(el));
  return PRESETS.filter((p) => p.fx.every((s) => ok.has(s.effect)));
}

// src/editor/attrs.ts
var OPTION_KEYS = new Set(Object.values(META).flatMap((m) => Object.keys(m.options)));
var isTimeNumber = (v) => typeof v === "number" || /^-?[\d.]+$/.test(String(v));
function resolve(input) {
  const list = Array.isArray(input) ? input : [input];
  const out = [];
  for (const item of list) {
    if (typeof item === "string") {
      for (const word of item.split(/\s+/).filter(Boolean)) {
        const preset = presetById(word);
        if (preset) out.push(...preset.fx.map((s) => ({ effect: s.effect, options: { ...s.options } })));
        else if (META[word]) out.push({ effect: word });
      }
    } else if (item && META[item.effect]) out.push({ effect: item.effect, options: { ...item.options } });
  }
  const merged = /* @__PURE__ */ new Map();
  for (const s of out) {
    const prev = merged.get(s.effect);
    merged.set(s.effect, { effect: s.effect, options: { ...prev?.options, ...s.options } });
  }
  return [...merged.values()].map(normalize);
}
function normalize(spec) {
  const m = META[spec.effect];
  if (!m) return { effect: spec.effect };
  const options = {};
  for (const [k, raw] of Object.entries(spec.options ?? {})) {
    const o = m.options[k];
    if (!o || raw === void 0 || raw === null || raw === "") continue;
    let v = raw;
    switch (o.type) {
      case "boolean":
        v = raw === true || raw === "true" || raw === "" || raw === 1 || raw === "1";
        break;
      case "number":
        v = Number(raw);
        if (!Number.isFinite(v)) continue;
        break;
      case "enum":
        if (!o.values?.includes(String(raw))) continue;
        v = String(raw);
        break;
      case "time":
        v = isTimeNumber(raw) ? Number(raw) + "ms" : String(raw).trim();
        break;
      case "length":
        v = isTimeNumber(raw) ? Number(raw) + "px" : String(raw).trim();
        break;
      case "percent":
        v = isTimeNumber(raw) ? Number(raw) + "%" : String(raw).trim();
        break;
      default:
        v = String(raw);
    }
    if (sameAsDefault(v, o.default, o.type)) continue;
    options[k] = v;
  }
  return Object.keys(options).length ? { effect: spec.effect, options } : { effect: spec.effect };
}
function toMs(v) {
  const m = /^(-?[\d.]+)\s*(ms|s)?$/.exec(String(v ?? "").trim());
  return m ? parseFloat(m[1]) * (m[2] === "s" ? 1e3 : 1) : NaN;
}
function sameAsDefault(v, d, type) {
  if (d === void 0) return type === "boolean" && v === false;
  if (type === "time") return toMs(v) === toMs(d);
  if (type === "boolean") return !!v === !!d;
  return String(v).replace(/\s+/g, "") === String(d).replace(/\s+/g, "");
}
function toAttributes(input) {
  const specs = resolve(input);
  if (!specs.length) return {};
  const attrs = { "data-fx": specs.map((s) => s.effect).join(" ") };
  for (const s of specs) {
    for (const [k, v] of Object.entries(s.options ?? {})) {
      if (v === false) {
        attrs["data-fx-" + k] = "false";
      } else attrs["data-fx-" + k] = v === true ? "" : String(v);
    }
  }
  return attrs;
}
var esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function toAttributeString(input) {
  return Object.entries(toAttributes(input)).map(([k, v]) => v === "" ? k : `${k}="${esc(v)}"`).join(" ");
}
function fromAttributes(attrs) {
  const get = (k) => typeof attrs.getNamedItem === "function" ? attrs.getNamedItem(k)?.value : attrs[k];
  const names = (get("data-fx") || "").split(/\s+/).filter((n) => META[n]);
  const taken = /* @__PURE__ */ new Set();
  return names.map((name) => {
    const options = {};
    for (const [k, o] of Object.entries(META[name].options)) {
      const raw = get("data-fx-" + k);
      if (raw === void 0 || raw === null || taken.has(k)) continue;
      taken.add(k);
      if (o.type === "boolean") options[k] = raw !== "false" && raw !== "0";
      else if (o.type === "number") options[k] = Number(raw);
      else options[k] = raw;
    }
    return normalize({ effect: name, options });
  });
}
function clear(el) {
  el.removeAttribute("data-fx");
  for (const a of Array.from(el.attributes)) {
    if (a.name.startsWith("data-fx-") && OPTION_KEYS.has(a.name.slice(8))) el.removeAttribute(a.name);
  }
}
function apply(el, input) {
  const specs = resolve(input);
  const attrs = toAttributes(specs);
  clear(el);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return specs;
}
function add(el, input) {
  return apply(el, [...read(el), ...resolve(input)]);
}
function remove(el, effect) {
  return apply(
    el,
    read(el).filter((s) => s.effect !== effect)
  );
}
function read(el) {
  return fromAttributes(el.attributes);
}
var frame = () => new Promise((r) => typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => r()) : setTimeout(r, 16));
async function replay(el) {
  const v = el.getAttribute("data-fx");
  if (!v) return;
  el.removeAttribute("data-fx");
  await frame();
  if (!el.hasAttribute("data-fx")) el.setAttribute("data-fx", v);
}
function preview(el, input) {
  const before = Array.from(el.attributes).filter((a) => a.name === "data-fx" || a.name.startsWith("data-fx-") && OPTION_KEYS.has(a.name.slice(8))).map((a) => [a.name, a.value]);
  apply(el, []);
  let done = false;
  frame().then(() => {
    if (!done) apply(el, input);
  });
  return () => {
    if (done) return;
    done = true;
    clear(el);
    for (const [k, v] of before) if (k !== "data-fx") el.setAttribute(k, v);
    const fxv = before.find(([k]) => k === "data-fx");
    if (fxv) el.setAttribute("data-fx", fxv[1]);
  };
}

// src/editor/motion.ts
var reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches || typeof document !== "undefined" && document.documentElement.hasAttribute("data-fx-reduced");
function spring(bounce = 0.18, points = 32) {
  if (typeof CSS === "undefined" || !CSS.supports?.("animation-timing-function", "linear(0, 1)")) return "cubic-bezier(.2, .9, .25, 1.05)";
  const zeta = Math.max(0.05, 1 - bounce);
  const w = 9;
  const wd = w * Math.sqrt(Math.max(1e-4, 1 - zeta * zeta));
  const out = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const v = i === points ? 1 : 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + zeta * w / wd * Math.sin(wd * t));
    out.push(v.toFixed(4));
  }
  return `linear(${out.join(", ")})`;
}
var SPRING = null;
var ease = () => SPRING ?? (SPRING = spring());
var flying = /* @__PURE__ */ new WeakMap();
function flip(targets, mutate, opts = {}) {
  const container = targets instanceof Element ? targets : null;
  const list = () => container ? Array.from(container.children) : Array.from(targets);
  if (reduced()) {
    const r2 = mutate();
    return r2 instanceof Promise ? r2.then(() => {
    }) : Promise.resolve();
  }
  const before = new Map(list().map((e) => [e, e.getBoundingClientRect()]));
  const play = () => {
    const runs = [];
    for (const el of /* @__PURE__ */ new Set([...before.keys(), ...list()])) {
      if (!el.isConnected || !(el instanceof HTMLElement || el instanceof SVGElement)) continue;
      const a = before.get(el);
      if (!a) continue;
      flying.get(el)?.cancel();
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      const sx = opts.scale && b.width ? a.width / b.width : 1;
      const sy = opts.scale && b.height ? a.height / b.height : 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 5e-3 && Math.abs(sy - 1) < 5e-3) continue;
      const anim = el.animate(
        [
          { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: "0 0", transform: "none" }
        ],
        { duration: opts.duration ?? 460, easing: opts.easing ?? ease() }
      );
      flying.set(el, anim);
      runs.push(anim.finished.catch(() => {
      }));
    }
    return Promise.all(runs).then(() => {
    });
  };
  const r = mutate();
  return r instanceof Promise ? r.then(play) : play();
}
function enter(el, opts = {}) {
  if (reduced() || !(el instanceof HTMLElement || el instanceof SVGElement)) return Promise.resolve();
  const from = opts.from ?? "up";
  const start = from === "scale" ? "scale(.94)" : `translateY(${from === "up" ? 16 : -16}px) scale(.98)`;
  return el.animate([{ opacity: 0, transform: start }, { opacity: 1, transform: "none" }], { duration: opts.duration ?? 520, easing: ease() }).finished.then(() => {
  }).catch(() => {
  });
}
function leave(el, opts = {}) {
  if (reduced() || !(el instanceof HTMLElement || el instanceof SVGElement)) return Promise.resolve();
  return el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)" }], { duration: opts.duration ?? 200, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }).finished.then(() => {
  }).catch(() => {
  });
}
function place(node, parent, before = null, opts = {}) {
  const fresh = !node.isConnected;
  const old = node.parentElement;
  const scope = /* @__PURE__ */ new Set([...Array.from(parent.children), ...old && old !== parent ? Array.from(old.children) : []]);
  const done = flip(scope, () => parent.insertBefore(node, before), opts);
  return fresh ? Promise.all([done, enter(node)]).then(() => {
  }) : done;
}
async function discard(node, opts = {}) {
  const parent = node.parentElement;
  await leave(node);
  if (!parent) return node.remove();
  await flip(parent, () => node.remove(), opts);
}
var lists = /* @__PURE__ */ new Map();
var cssDone = false;
var EDITOR_CSS = `
.fx-sort-ghost{position:fixed!important;margin:0!important;pointer-events:none!important;z-index:2147483000!important;box-sizing:border-box;will-change:transform;transition:none!important;animation:none!important;filter:drop-shadow(0 22px 28px rgb(8 10 30/.32)) drop-shadow(0 2px 6px rgb(8 10 30/.2));}
.fx-sort-origin{opacity:.22!important;filter:saturate(0);}
[data-fx-sort-over]{outline:2px dashed color-mix(in oklab,currentColor 30%,transparent);outline-offset:6px;}
html[data-fx-sorting],html[data-fx-sorting] *{cursor:grabbing!important;-webkit-user-select:none!important;user-select:none!important;}
[data-fx-sortable]>*,[data-fx-sortable] [data-fx-handle]{cursor:grab;}
[data-fx-sortable][data-fx-sort-handle]>*{cursor:auto;}
.fx-sort-live{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
`;
function injectCSS() {
  if (cssDone || typeof document === "undefined") return;
  cssDone = true;
  const s = document.createElement("style");
  s.id = "fx-editor-css";
  s.textContent = EDITOR_CSS;
  document.head.append(s);
}
var live = null;
function announce(msg) {
  if (!live || !live.isConnected) {
    live = document.createElement("div");
    live.className = "fx-sort-live";
    live.setAttribute("aria-live", "assertive");
    document.body.append(live);
  }
  live.textContent = "";
  requestAnimationFrame(() => live && (live.textContent = msg));
}
var itemsOf = (e, except) => Array.from(e.el.children).filter(
  (c) => c instanceof HTMLElement && c !== except && !c.classList.contains("fx-sort-ghost") && (!e.opts.items || c.matches(e.opts.items))
);
function indexAt(rects, x, y) {
  if (!rects.length) return 0;
  const shareRow = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > Math.min(a.height, b.height) * 0.5;
  const rowsShared = rects.some((r, i) => i > 0 && shareRow(r, rects[i - 1]));
  if (!rowsShared) {
    const i = rects.findIndex((r) => y < r.top + r.height / 2);
    return i === -1 ? rects.length : i;
  }
  const rows = [];
  rects.forEach((r, i) => {
    const row2 = rows.find((ix) => shareRow(rects[ix[0]], r));
    if (row2) row2.push(i);
    else rows.push([i]);
  });
  const row = rows.find((ix) => y < Math.max(...ix.map((i) => rects[i].bottom)));
  if (!row) return rects.length;
  const slot = row.find((i) => x < rects[i].left + rects[i].width / 2);
  return slot === void 0 ? row[row.length - 1] + 1 : slot;
}
var drag = null;
var META_NAMES = new Set(EFFECT_NAMES);
function containerAt(x, y, group, self) {
  for (const el of document.elementsFromPoint(x, y)) {
    for (let n = el; n; n = n.parentElement) {
      const e = lists.get(n);
      if (!e) continue;
      if (e === self && e.opts.sort !== false && !e.opts.clone) return e;
      if (e !== self && e.opts.accept !== false && !e.opts.clone && e.opts.group && e.opts.group === group) return e;
      if (e === self) return null;
    }
  }
  return null;
}
function moveGhost(d) {
  d.ghost.style.transform = `translate(${d.x - d.dx - d.offX}px, ${d.y - d.dy - d.offY}px) rotate(${d.tilt.toFixed(2)}deg) scale(1.025)`;
}
function startDrag(entry, item, x, y) {
  injectCSS();
  const r = item.getBoundingClientRect();
  const clone = !!entry.opts.clone;
  const ghost = item.cloneNode(true);
  for (const n of [ghost, ...Array.from(ghost.querySelectorAll("*"))]) {
    n.removeAttribute("id");
    n.removeAttribute("data-fx");
    for (const c of Array.from(n.classList)) if (c.startsWith("fx-") && META_NAMES.has(c.slice(3))) n.classList.remove(c);
  }
  ghost.classList.remove("fx-sort-origin");
  ghost.classList.add("fx-sort-ghost");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, { width: r.width + "px", height: r.height + "px", left: "0px", top: "0px", translate: "none", rotate: "none", scale: "none" });
  item.parentElement.append(ghost);
  ghost.style.transform = "none";
  const g = ghost.getBoundingClientRect();
  const d = {
    entry,
    item,
    origin: clone ? null : item,
    ghost,
    from: entry.el,
    oldIndex: itemsOf(entry).indexOf(item),
    clone,
    over: clone ? null : entry,
    x,
    y,
    dx: x - r.left,
    dy: y - r.top,
    tilt: 0,
    vx: 0,
    lastX: x,
    raf: 0,
    w: r.width,
    h: r.height,
    offX: g.left,
    offY: g.top,
    homeRect: r,
    home: clone ? null : { parent: item.parentElement, next: item.nextSibling }
  };
  if (!clone) item.classList.add("fx-sort-origin");
  document.documentElement.setAttribute("data-fx-sorting", "");
  if (d.over) d.over.el.setAttribute("data-fx-sort-over", "");
  moveGhost(d);
  ghost.animate([{ scale: "0.975" }, { scale: "1" }], { duration: 220, easing: "cubic-bezier(.2,.9,.3,1.2)" });
  const loop = () => {
    d.vx = d.vx * 0.7 + (d.x - d.lastX) * 0.3;
    d.lastX = d.x;
    const target = Math.max(-9, Math.min(9, d.vx * 0.9));
    d.tilt += (target - d.tilt) * 0.2;
    moveGhost(d);
    autoScroll(d);
    d.raf = requestAnimationFrame(loop);
  };
  d.raf = requestAnimationFrame(loop);
  drag = d;
  entry.opts.onStart?.(event(d));
}
function event(d) {
  const to = d.origin?.parentElement ?? d.from;
  const list = lists.get(to);
  return {
    item: d.origin ?? d.item,
    from: d.from,
    to,
    oldIndex: d.clone ? -1 : d.oldIndex,
    newIndex: d.origin && list ? itemsOf(list).indexOf(d.origin) : -1,
    clone: d.clone
  };
}
function autoScroll(d) {
  const edge = 70;
  const h = innerHeight;
  let v = 0;
  if (d.y < edge) v = -((edge - d.y) / edge) * 18;
  else if (d.y > h - edge) v = (d.y - (h - edge)) / edge * 18;
  if (v) {
    scrollBy(0, v);
    reposition(d);
  }
}
function reposition(d) {
  const target = containerAt(d.x, d.y, d.entry.opts.group, d.entry);
  if (target !== d.over) {
    d.over?.el.removeAttribute("data-fx-sort-over");
    target?.el.setAttribute("data-fx-sort-over", "");
    if (!target && d.clone && d.origin) {
      const o = d.origin;
      d.origin = null;
      if (d.over) flip(d.over.el, () => o.remove());
    }
    d.over = target;
  }
  if (!target) return;
  if (!d.origin) {
    d.origin = d.entry.opts.clone(d.item);
    d.origin.classList.add("fx-sort-origin");
  }
  const origin = d.origin;
  const items = itemsOf(target, origin);
  const at = indexAt(
    items.map((i) => i.getBoundingClientRect()),
    d.x,
    d.y
  );
  const ref = items[at] ?? null;
  if (origin.parentElement === target.el && (ref ? origin.nextElementSibling === ref : itemsOf(target).at(-1) === origin)) return;
  const old = origin.parentElement;
  flip(new Set([...Array.from(target.el.children), ...old && old !== target.el ? Array.from(old.children) : []].filter((c) => c !== d.ghost)), () => {
    if (ref) target.el.insertBefore(origin, ref);
    else {
      const last = itemsOf(target, origin).at(-1);
      target.el.insertBefore(origin, last ? last.nextSibling : null);
    }
  });
}
function endDrag(cancel = false) {
  const d = drag;
  if (!d) return;
  drag = null;
  cancelAnimationFrame(d.raf);
  document.documentElement.removeAttribute("data-fx-sorting");
  d.over?.el.removeAttribute("data-fx-sort-over");
  if (cancel && d.origin) {
    if (d.clone) {
      const o = d.origin;
      const p = o.parentElement;
      d.origin = null;
      if (p) flip(p, () => o.remove());
    } else if (d.home) {
      const { parent, next } = d.home;
      const o = d.origin;
      flip(
        new Set([...Array.from(parent.children), ...Array.from(o.parentElement?.children ?? [])].filter((c) => c !== d.ghost)),
        () => parent.insertBefore(o, next && next.parentElement === parent ? next : null)
      );
    }
  }
  const landing = d.origin;
  if (landing) flying.get(landing)?.finish();
  const rect = landing ? landing.getBoundingClientRect() : d.homeRect;
  const ev = event(d);
  const finish = () => {
    d.ghost.remove();
    if (landing) {
      landing.classList.remove("fx-sort-origin");
      if (d.clone) enter(landing, { from: "scale", duration: 360 });
    }
    if (landing && !cancel && (d.clone || ev.to !== ev.from || ev.newIndex !== ev.oldIndex)) {
      d.entry.opts.onEnd?.(ev);
      const target = lists.get(ev.to);
      if (target && target !== d.entry) target.opts.onEnd?.(ev);
      ev.to.dispatchEvent(new CustomEvent("fx:sort", { detail: ev, bubbles: true }));
      announce(`Moved to position ${ev.newIndex + 1} of ${target ? itemsOf(target).length : ev.newIndex + 1}.`);
    }
  };
  if (reduced()) return finish();
  const sx = rect.width / d.w;
  const sy = rect.height / d.h;
  const tx = rect.left - d.offX - (d.w - sx * d.w) / 2;
  const ty = rect.top - d.offY - (d.h - sy * d.h) / 2;
  const a = d.ghost.animate(
    [{ transform: d.ghost.style.transform }, { transform: `translate(${tx}px, ${ty}px) rotate(0deg) scale(${sx}, ${sy})`, opacity: landing ? 1 : 0 }],
    { duration: 380, easing: ease(), fill: "forwards" }
  );
  a.finished.then(finish, finish);
}
function keyMove(entry, item, dir) {
  const items = itemsOf(entry);
  const i = items.indexOf(item);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return;
  const ref = dir < 0 ? items[j] : items[j].nextSibling;
  place(item, entry.el, ref).then(() => item.focus({ preventScroll: true }));
  item.focus({ preventScroll: true });
  const ev = { item, from: entry.el, to: entry.el, oldIndex: i, newIndex: j, clone: false };
  entry.opts.onEnd?.(ev);
  entry.el.dispatchEvent(new CustomEvent("fx:sort", { detail: ev, bubbles: true }));
  announce(`Moved to position ${j + 1} of ${items.length}.`);
}
function sortable(el, opts = {}) {
  injectCSS();
  const palette = !!opts.clone;
  const entry = { el, opts: { sort: !palette, accept: !palette, ...opts } };
  lists.set(el, entry);
  el.setAttribute("data-fx-sortable", "");
  if (opts.handle) el.setAttribute("data-fx-sort-handle", "");
  let pending = null;
  const onDown = (e) => {
    if (drag || e.button !== 0 || !e.isPrimary) return;
    const t = e.target;
    const item = itemsOf(entry).find((i) => i.contains(t));
    if (!item) return;
    if (opts.handle ? !t.closest(opts.handle) : t.closest("input, textarea, select, [contenteditable], [contenteditable] *, button, a[href]")) return;
    const touch = e.pointerType === "touch";
    pending = { item, x: e.clientX, y: e.clientY, id: e.pointerId, touch, timer: 0 };
    if (touch) {
      const p = pending;
      p.timer = window.setTimeout(() => {
        if (pending !== p) return;
        pending = null;
        startDrag(entry, p.item, p.x, p.y);
        navigator.vibrate?.(8);
      }, 240);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
  };
  const onMove = (e) => {
    if (pending && e.pointerId === pending.id) {
      const dist = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
      if (pending.touch) {
        if (dist > 8) cancelPending();
        return;
      }
      if (dist < 5) return;
      const p = pending;
      pending = null;
      startDrag(entry, p.item, p.x, p.y);
    }
    if (!drag || drag.entry !== entry) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    reposition(drag);
  };
  const onTouchMove = (e) => {
    if (drag && drag.entry === entry) e.preventDefault();
  };
  const cancelPending = () => {
    if (pending) clearTimeout(pending.timer);
    pending = null;
    detach();
  };
  const detach = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("touchmove", onTouchMove);
  };
  const onUp = () => {
    cancelPending();
    if (drag && drag.entry === entry) endDrag();
  };
  const onCancel = () => {
    cancelPending();
    if (drag && drag.entry === entry) endDrag(true);
  };
  const onKey = (e) => {
    if (e.key === "Escape" && drag && drag.entry === entry) {
      e.preventDefault();
      detach();
      endDrag(true);
      return;
    }
    if (!e.altKey || palette || entry.opts.sort === false) return;
    const item = itemsOf(entry).find((i) => i === e.target);
    if (!item) return;
    const back = e.key === "ArrowUp" || e.key === "ArrowLeft";
    const fwd = e.key === "ArrowDown" || e.key === "ArrowRight";
    if (!back && !fwd) return;
    e.preventDefault();
    keyMove(entry, item, back ? -1 : 1);
  };
  const onClick = (e) => {
    if (document.documentElement.hasAttribute("data-fx-sorting")) e.preventDefault();
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey);
  return () => {
    cancelPending();
    if (drag?.entry === entry) endDrag(true);
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey);
    el.removeAttribute("data-fx-sortable");
    el.removeAttribute("data-fx-sort-handle");
    lists.delete(el);
  };
}

// src/editor/panel.ts
var GLYPH = {
  "fade-up": "up",
  "fade-down": "down",
  "from-left": "left",
  "from-right": "right",
  "zoom-in": "zoom",
  "blur-in": "blur",
  book: "book",
  "wipe-up": "clip",
  cascade: "cascade",
  "cascade-zoom": "cascade",
  "words-blur": "words",
  "chars-flip": "words",
  "lines-rise": "words",
  decode: "words",
  "type-on": "type",
  "count-up": "type",
  "image-curtain": "clip",
  "image-circle": "circle",
  "draw-lines": "draw",
  tilt: "tilt",
  "tilt-soft": "tilt",
  magnetic: "magnet",
  spotlight: "spot",
  lift: "lift",
  "ripple-click": "ripple",
  "burst-click": "ripple",
  "fill-hover": "fill",
  squish: "squish",
  "arrow-link": "arrow",
  "card-pop": "zoom",
  "cta-glow": "beam",
  "parallax-soft": "parallax",
  "parallax-deep": "parallax",
  "stack-cards": "stack",
  "side-scroll": "side",
  expand: "expand",
  "liquid-glass": "glass",
  frost: "glass",
  squircle: "squircle",
  beam: "beam",
  "beam-full": "beam",
  shine: "shine",
  "shine-hover": "shine",
  shimmer: "shine",
  aurora: "aurora",
  leaves: "aurora",
  dots: "dots",
  marquee: "side",
  "marquee-back": "side",
  carousel: "side",
  "rotate-words": "words",
  ring: "tilt",
  loader: "stack"
};
var CSS2 = `
:host{min-width:0;--fxp-bg:#14161f;--fxp-panel:#1b1e29;--fxp-line:rgb(255 255 255/.08);--fxp-fg:#eef0f6;--fxp-muted:#8d93a8;--fxp-accent:#ffb547;--fxp-accent-ink:#1a1408;--fxp-radius:16px;
  display:block;color:var(--fxp-fg);font:13px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark}
:host([theme=light]){--fxp-bg:#ffffff;--fxp-panel:#f4f5f9;--fxp-line:rgb(10 14 30/.09);--fxp-fg:#141726;--fxp-muted:#6a7086;color-scheme:light}
@media (prefers-color-scheme:light){:host(:not([theme])),:host([theme=auto]){--fxp-bg:#ffffff;--fxp-panel:#f4f5f9;--fxp-line:rgb(10 14 30/.09);--fxp-fg:#141726;--fxp-muted:#6a7086;color-scheme:light}}
*{box-sizing:border-box}
button,input,select{font:inherit;color:inherit}
.p{background:var(--fxp-bg);border:1px solid var(--fxp-line);border-radius:var(--fxp-radius);overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr);min-width:0}
header{display:flex;align-items:center;gap:10px;padding:14px 14px 10px}
header h3{margin:0;font-size:13px;font-weight:650;letter-spacing:.01em;flex:1;display:flex;align-items:center;gap:8px}
header h3 i{width:8px;height:8px;border-radius:50%;background:var(--fxp-accent);box-shadow:0 0 12px var(--fxp-accent)}
.btn{border:1px solid var(--fxp-line);background:var(--fxp-panel);border-radius:999px;padding:6px 11px;cursor:pointer;font-size:12px;font-weight:550;display:inline-flex;gap:6px;align-items:center;transition:background .15s,transform .15s}
.btn:hover{background:color-mix(in oklab,var(--fxp-panel),var(--fxp-fg) 7%)}
.btn:active{transform:scale(.96)}
.btn.primary{background:var(--fxp-accent);color:var(--fxp-accent-ink);border-color:transparent}
.btn:disabled{opacity:.4;pointer-events:none}
.who{padding:0 14px 10px;color:var(--fxp-muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who b{color:var(--fxp-fg);font-weight:600;font-family:ui-monospace,Menlo,monospace;font-size:11.5px}
.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 12px;min-height:30px}
.chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 4px 4px 10px;background:var(--fxp-panel);border:1px solid var(--fxp-line);font-size:12px;cursor:pointer;animation:pop .35s cubic-bezier(.2,.9,.3,1.3) both}
.chip[aria-pressed=true]{border-color:var(--fxp-accent);box-shadow:0 0 0 1px var(--fxp-accent) inset}
.chip small{color:var(--fxp-muted);font-size:10.5px}
.chip button{border:0;background:none;width:20px;height:20px;border-radius:50%;cursor:pointer;color:var(--fxp-muted);display:grid;place-items:center;padding:0}
.chip button:hover{background:var(--fxp-line);color:var(--fxp-fg)}
.empty{color:var(--fxp-muted);font-size:12px;padding:4px 0}
.search{padding:0 14px 10px}
.search input{width:100%;border:1px solid var(--fxp-line);background:var(--fxp-panel);border-radius:10px;padding:8px 10px;outline:none}
.search input:focus{border-color:var(--fxp-accent)}
.tabs{display:flex;gap:2px;padding:0 10px;border-bottom:1px solid var(--fxp-line);overflow-x:auto;scrollbar-width:none}
.tab{border:0;background:none;padding:8px 8px 10px;cursor:pointer;color:var(--fxp-muted);font-size:12px;font-weight:600;position:relative;white-space:nowrap}
.tab[aria-selected=true]{color:var(--fxp-fg)}
.tab[aria-selected=true]::after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;background:var(--fxp-accent)}
.body{max-height:var(--fxp-max,520px);overflow:auto;scrollbar-width:thin}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;padding:12px 14px}
.tile{border:1px solid var(--fxp-line);background:var(--fxp-panel);border-radius:12px;padding:8px 8px 9px;cursor:pointer;display:grid;gap:7px;text-align:left;transition:border-color .15s,transform .2s cubic-bezier(.2,.9,.3,1.3)}
.tile:hover{transform:translateY(-2px);border-color:color-mix(in oklab,var(--fxp-line),var(--fxp-fg) 18%)}
.tile[aria-pressed=true]{border-color:var(--fxp-accent);box-shadow:0 0 0 1px var(--fxp-accent) inset}
.tile span{font-size:11.5px;font-weight:550;line-height:1.2}
.stage{height:46px;border-radius:8px;background:color-mix(in oklab,var(--fxp-bg),var(--fxp-fg) 4%);display:grid;place-items:center;overflow:hidden;perspective:200px}
.g{width:30px;height:20px;border-radius:5px;background:linear-gradient(135deg,var(--fxp-accent),color-mix(in oklab,var(--fxp-accent),#ff4f8b 55%));position:relative}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g{animation:var(--a,pulse) 1.5s cubic-bezier(.2,.8,.2,1) infinite}
.g[data-g=up]{--a:g-up}.g[data-g=down]{--a:g-down}.g[data-g=left]{--a:g-left}.g[data-g=right]{--a:g-right}.g[data-g=zoom]{--a:g-zoom}.g[data-g=blur]{--a:g-blur}
.g[data-g=book]{--a:g-book;transform-origin:0 50%}.g[data-g=clip]{--a:g-clip}.g[data-g=circle]{--a:g-circle}.g[data-g=tilt]{--a:g-tilt}.g[data-g=magnet]{--a:g-magnet}
.g[data-g=lift]{--a:g-lift}.g[data-g=squish]{--a:g-squish}.g[data-g=parallax]{--a:g-parallax}.g[data-g=side]{--a:g-side}.g[data-g=expand]{--a:g-expand}
.g[data-g=squircle]{--a:g-squircle}.g[data-g=glass]{--a:g-glass;background:color-mix(in oklab,var(--fxp-fg) 18%,transparent);backdrop-filter:blur(4px);border:1px solid color-mix(in oklab,var(--fxp-fg) 30%,transparent)}
.g[data-g=cascade],.g[data-g=words],.g[data-g=type],.g[data-g=stack]{background:none;display:grid;gap:3px}
.g[data-g=cascade] b,.g[data-g=words] b,.g[data-g=type] b,.g[data-g=stack] b{display:block;height:4px;border-radius:2px;background:var(--fxp-accent)}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=cascade] b{animation:g-up 1.5s cubic-bezier(.2,.8,.2,1) infinite}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=words] b{animation:g-blur 1.5s ease infinite}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=type] b{animation:g-type 1.5s steps(6) infinite}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=stack] b{animation:g-fan 1.5s cubic-bezier(.5,0,.3,1.3) infinite}
.g b:nth-child(2){animation-delay:.12s!important;width:80%}.g b:nth-child(3){animation-delay:.24s!important;width:60%}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g:is([data-g=cascade],[data-g=words],[data-g=type],[data-g=stack]){animation:none}
.g[data-g=spot]{--a:g-spot;background:radial-gradient(circle at var(--x,30%) 40%,#fff,var(--fxp-accent) 60%)}
.g[data-g=ripple]::after,.g[data-g=fill]::after{content:"";position:absolute;inset:0;margin:auto;width:8px;height:8px;border-radius:50%;background:#fff;opacity:0}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=ripple]::after{animation:g-ripple 1.5s ease-out infinite}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=fill]::after{animation:g-fill 1.5s ease-in-out infinite;background:var(--fxp-fg)}
.g[data-g=arrow]{background:none;width:auto;height:auto;font-weight:700;font-size:16px;color:var(--fxp-accent);--a:g-right}
.g[data-g=beam]{background:var(--fxp-panel);border:1.5px solid color-mix(in oklab,var(--fxp-accent),transparent 50%)}
.g[data-g=beam]::after{content:"";position:absolute;inset:-2px;border-radius:6px;padding:2px;background:conic-gradient(from var(--r,0deg),transparent 70%,var(--fxp-accent));-webkit-mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.g[data-g=shine]{overflow:hidden}
.g[data-g=shine]::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgb(255 255 255/.8),transparent 70%);translate:-100% 0}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=shine]::after{animation:g-shine 1.5s ease-in-out infinite}
.g[data-g=aurora]{background:linear-gradient(120deg,#7c3aed,#06b6d4,#ec4899);background-size:200% 200%;--a:g-aurora}
.g[data-g=dots]{background:radial-gradient(circle,var(--fxp-accent) 1.2px,transparent 1.6px) 0 0/6px 6px;--a:g-dots}
.g[data-g=draw]{background:none;border:2px solid var(--fxp-accent);--a:g-draw;clip-path:inset(0 100% 0 0)}
.tile .g[data-g=draw]{clip-path:inset(0 0 0 0)}
.more{padding:0 14px 12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:var(--fxp-muted);font-size:11.5px}
.more button{border:1px dashed var(--fxp-line);background:none;border-radius:999px;padding:3px 9px;cursor:pointer;font-size:11.5px;font-family:ui-monospace,Menlo,monospace}
.more button:hover{border-style:solid;color:var(--fxp-fg)}
.set{border-top:1px solid var(--fxp-line);border-bottom:1px solid var(--fxp-line);padding:0 14px;background:color-mix(in oklab,var(--fxp-bg),var(--fxp-fg) 2.5%)}
.set summary{list-style:none;cursor:pointer;padding:11px 0}
.set summary::-webkit-details-marker{display:none}
.set .rows{display:grid;gap:10px;padding:0 0 14px}
.set h4{margin:0;font-size:12px;font-weight:650;display:flex;gap:8px;align-items:baseline}
.set .chev{color:var(--fxp-muted);transition:rotate .2s;font-size:14px;line-height:1}
.set:not([open]) .chev{rotate:-90deg}
.pick{position:sticky;top:0;z-index:2;background:var(--fxp-bg);padding-top:12px}
.set h4 code{font-family:ui-monospace,Menlo,monospace;color:var(--fxp-accent);font-size:11.5px}
.set h4 small{color:var(--fxp-muted);font-weight:500;flex:1}
.f{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;align-items:center}
.f>label{color:var(--fxp-muted);font-size:12px;cursor:help}
.f .c{display:flex;gap:8px;align-items:center;min-width:0}
.f input[type=text],.f input[type=number],.f select{width:100%;border:1px solid var(--fxp-line);background:var(--fxp-panel);border-radius:8px;padding:6px 8px;outline:none;min-width:0}
.f input:focus,.f select:focus{border-color:var(--fxp-accent)}
.f input[type=range]{flex:1;accent-color:var(--fxp-accent);min-width:0}
.f output{font:11.5px ui-monospace,Menlo,monospace;color:var(--fxp-muted);min-width:56px;text-align:right}
.f input[type=color]{width:30px;height:30px;border:1px solid var(--fxp-line);border-radius:8px;padding:2px;background:var(--fxp-panel);flex:none}
.sw{position:relative;width:36px;height:20px;flex:none}
.sw input{appearance:none;margin:0;width:36px;height:20px;border-radius:99px;background:var(--fxp-line);cursor:pointer;transition:background .2s}
.sw input::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:translate .25s cubic-bezier(.2,.9,.3,1.3);box-shadow:0 1px 3px rgb(0 0 0/.3)}
.sw input:checked{background:var(--fxp-accent)}
.sw input:checked::after{translate:16px 0}
.code{border-top:1px solid var(--fxp-line);padding:10px 14px;display:flex;gap:8px;align-items:center;background:color-mix(in oklab,var(--fxp-bg),var(--fxp-fg) 4%);min-width:0}
.code code{flex:1;min-width:0;font:11px/1.5 ui-monospace,Menlo,monospace;color:var(--fxp-muted);white-space:nowrap;overflow:auto;scrollbar-width:none}
.none{padding:30px 18px;text-align:center;color:var(--fxp-muted)}
.none b{display:block;color:var(--fxp-fg);font-size:14px;margin-bottom:4px}
@keyframes pop{from{opacity:0;scale:.8}}
@keyframes pulse{50%{scale:.9;opacity:.7}}
@keyframes g-up{0%{opacity:0;translate:0 12px}45%,100%{opacity:1;translate:0 0}}
@keyframes g-down{0%{opacity:0;translate:0 -12px}45%,100%{opacity:1;translate:0 0}}
@keyframes g-left{0%{opacity:0;translate:-16px 0}45%,100%{opacity:1;translate:0 0}}
@keyframes g-right{0%{opacity:0;translate:16px 0}45%,100%{opacity:1;translate:0 0}}
@keyframes g-zoom{0%{opacity:0;scale:.4}45%,100%{opacity:1;scale:1}}
@keyframes g-blur{0%{opacity:0;filter:blur(6px)}50%,100%{opacity:1;filter:blur(0)}}
@keyframes g-book{0%{transform:rotateY(-85deg)}50%,100%{transform:rotateY(0)}}
@keyframes g-clip{0%{clip-path:inset(100% 0 0)}50%,100%{clip-path:inset(0)}}
@keyframes g-circle{0%{clip-path:circle(0)}50%,100%{clip-path:circle(80%)}}
@keyframes g-draw{0%{clip-path:inset(0 100% 0 0)}60%,100%{clip-path:inset(0)}}
@keyframes g-type{0%{width:0}60%,100%{width:100%}}
@keyframes g-fan{0%,15%{translate:0 0;rotate:0deg}50%,70%{translate:-4px -2px;rotate:-14deg}}
@keyframes g-tilt{25%{transform:rotateX(18deg) rotateY(-22deg)}75%{transform:rotateX(-14deg) rotateY(20deg)}}
@keyframes g-magnet{30%{translate:7px -5px}60%{translate:-6px 4px}}
@keyframes g-spot{0%,100%{--x:15%}50%{--x:85%}}
@keyframes g-lift{50%{translate:0 -5px;box-shadow:0 8px 12px -4px rgb(0 0 0/.5)}}
@keyframes g-squish{20%{scale:.82 .9}40%{scale:1.06 1}60%{scale:1}}
@keyframes g-ripple{0%{opacity:.9;scale:.5}70%,100%{opacity:0;scale:5}}
@keyframes g-fill{0%{opacity:.25;scale:0}50%,100%{opacity:.25;scale:6}}
@keyframes g-parallax{50%{translate:0 -7px}}
@keyframes g-side{0%{translate:18px 0;opacity:0}20%,80%{opacity:1}100%{translate:-18px 0;opacity:0}}
@keyframes g-expand{50%{width:52px;height:28px;border-radius:2px}}
@keyframes g-squircle{50%{border-radius:10px}}
@keyframes g-glass{50%{translate:4px -3px}}
@keyframes g-shine{to{translate:100% 0}}
@keyframes g-aurora{50%{background-position:100% 100%}}
@keyframes g-dots{50%{background-size:8px 8px}}
@property --x{syntax:"<percentage>";inherits:false;initial-value:30%}
@property --r{syntax:"<angle>";inherits:false;initial-value:0deg}
.tile:is(:hover,:focus-visible,[aria-pressed=true]) .g[data-g=beam]::after{animation:g-beam 1.5s linear infinite}
@keyframes g-beam{to{--r:360deg}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
var describe = (el) => {
  const named = el.getAttribute("data-label") || el.getAttribute("aria-label");
  if (named) return named;
  const cls = Array.from(el.classList).filter((c) => !c.startsWith("fx-"))[0];
  return el.tagName.toLowerCase() + (el.id ? "#" + el.id : cls ? "." + cls : "");
};
var toMs2 = (v) => {
  const m = /^(-?[\d.]+)\s*(ms|s)?$/.exec(String(v ?? "").trim());
  return m ? parseFloat(m[1]) * (m[2] === "s" ? 1e3 : 1) : NaN;
};
function definePanel(tag = "fx-panel") {
  if (typeof customElements === "undefined" || customElements.get(tag)) return;
  class FxPanel extends HTMLElement {
    constructor() {
      super();
      this.el = null;
      this.fx = [];
      this.selected = "";
      this.tab = "entrance";
      this.query = "";
      this.undoPreview = null;
      this.hoverTimer = 0;
      this.collapsed = false;
      this.root = this.attachShadow({ mode: "open" });
      this.root.addEventListener("click", (e) => this.onClick(e));
      this.root.addEventListener("change", (e) => this.onField(e, true));
      this.root.addEventListener("input", (e) => this.onField(e, false));
      this.root.addEventListener("pointerover", (e) => this.onHover(e));
      this.root.addEventListener("pointerout", (e) => this.onOut(e));
      this.root.addEventListener("focusin", (e) => this.onHover(e));
      this.root.addEventListener("focusout", (e) => this.onOut(e));
      this.root.addEventListener("toggle", (e) => {
        const d = e.target;
        if (d.classList?.contains("set")) this.collapsed = !d.open;
      }, true);
      this.root.addEventListener("keydown", (e) => {
        const k = e;
        const chip = k.target.closest?.("[data-chip]");
        if (chip && k.target === chip && (k.key === "Enter" || k.key === " ")) {
          k.preventDefault();
          chip.click();
        }
      });
    }
    connectedCallback() {
      if (!this.el && this.hasAttribute("target")) this.target = document.querySelector(this.getAttribute("target"));
      this.render();
    }
    disconnectedCallback() {
      this.endPreview();
    }
    attributeChangedCallback(name) {
      if (name === "target" && this.isConnected) this.target = document.querySelector(this.getAttribute("target") || "");
      else if (this.isConnected) this.render();
    }
    /** The element being edited. */
    get target() {
      return this.el;
    }
    set target(el) {
      this.endPreview();
      this.el = el;
      this.fx = el ? read(el) : [];
      this.selected = this.fx.at(-1)?.effect ?? "";
      if (el && this.fx.length) this.tab = groupOf(this.fx[0].effect);
      this.render();
    }
    /** The effects on the target, as data to store. Setting it applies them. */
    get value() {
      return this.fx.map((s) => ({ effect: s.effect, ...s.options ? { options: { ...s.options } } : {} }));
    }
    set value(v) {
      this.commit(resolve(v));
    }
    /** Re-reads the target, after your builder changed its attributes. */
    refresh() {
      this.target = this.el;
    }
    groups() {
      const only = (this.getAttribute("groups") || "").split(",").map((s) => s.trim()).filter(Boolean);
      return GROUPS.filter((g) => only.length ? only.includes(g.id) : g.id !== "components");
    }
    commit(next, replayAfter = false) {
      if (!this.el) return;
      this.endPreview();
      this.fx = apply(this.el, next);
      if (!this.fx.some((s) => s.effect === this.selected)) this.selected = this.fx.at(-1)?.effect ?? "";
      if (replayAfter) replay(this.el);
      this.render();
      const detail = { target: this.el, fx: this.value, attributes: toAttributes(this.fx), html: toAttributeString(this.fx) };
      this.dispatchEvent(new CustomEvent("fx-change", { detail, bubbles: true, composed: true }));
    }
    withPreset(p) {
      const groups = new Set(p.fx.map((s) => groupOf(s.effect)));
      const names = new Set(p.fx.map((s) => s.effect));
      return [...this.fx.filter((s) => !groups.has(groupOf(s.effect)) && !names.has(s.effect)), ...p.fx];
    }
    isOn(p) {
      return p.fx.every((s) => {
        const want = JSON.stringify(normalize(s).options ?? {});
        return this.fx.some((c) => c.effect === s.effect && JSON.stringify(c.options ?? {}) === want);
      });
    }
    endPreview() {
      clearTimeout(this.hoverTimer);
      if (this.undoPreview) {
        this.undoPreview();
        this.undoPreview = null;
      }
    }
    onHover(e) {
      const tile = e.target.closest?.("[data-preset]");
      if (!tile || !this.el) return;
      const p = PRESETS.find((x) => x.id === tile.getAttribute("data-preset"));
      if (!p || this.isOn(p)) return;
      clearTimeout(this.hoverTimer);
      this.hoverTimer = window.setTimeout(() => {
        if (!this.el) return;
        this.undoPreview?.();
        this.undoPreview = preview(this.el, this.withPreset(p));
      }, 140);
    }
    onOut(e) {
      const tile = e.target.closest?.("[data-preset]");
      const to = e.relatedTarget;
      if (!tile || to && tile.contains(to)) return;
      this.endPreview();
    }
    onClick(e) {
      const t = e.target;
      const b = t.closest("button, [data-chip]");
      if (!b) return;
      const act = b.getAttribute("data-act");
      if (b.hasAttribute("data-tab")) {
        this.tab = b.getAttribute("data-tab");
        this.render();
      } else if (b.hasAttribute("data-preset")) {
        const p = PRESETS.find((x) => x.id === b.getAttribute("data-preset"));
        const on = this.isOn(p);
        this.commit(on ? this.fx.filter((s) => !p.fx.some((x) => x.effect === s.effect)) : this.withPreset(p));
        if (!on) this.selected = p.fx[p.fx.length - 1].effect;
        this.render();
      } else if (act === "add") {
        const name = b.getAttribute("data-effect");
        this.selected = name;
        this.commit([...this.fx.filter((s) => s.effect !== name), { effect: name }]);
      } else if (act === "remove") {
        e.stopPropagation();
        const name = b.getAttribute("data-effect");
        this.commit(this.fx.filter((s) => s.effect !== name));
      } else if (b.hasAttribute("data-chip")) {
        this.selected = b.getAttribute("data-chip");
        this.render();
      } else if (act === "replay" && this.el) {
        replay(this.el);
      } else if (act === "clear") {
        this.commit([]);
      } else if (act === "copy") {
        navigator.clipboard?.writeText(toAttributeString(this.fx)).then(() => {
          b.textContent = "Copied";
          setTimeout(() => b.textContent = "Copy", 1200);
        });
      }
    }
    onField(e, committed) {
      const t = e.target;
      if (t.name === "q") {
        this.query = t.value.trim().toLowerCase();
        this.renderGrid();
        return;
      }
      const key = t.getAttribute("data-key");
      if (!key || !this.selected) return;
      const field = fields(this.selected).find((f) => f.key === key);
      if (!field) return;
      let v;
      if (field.type === "toggle") v = t.checked;
      else if (field.type === "range" || field.type === "number" || field.type === "time" || field.type === "percent") v = Number(t.value);
      else v = t.value;
      const out = t.parentElement?.querySelector("output");
      if (out) out.textContent = this.show(field, v);
      if (t.type === "color") {
        const text = t.parentElement?.querySelector("input[type=text]");
        if (text) text.value = String(v);
      }
      if (!committed) return;
      const next = this.fx.map((s) => s.effect === this.selected ? { effect: s.effect, options: { ...s.options, [key]: v } } : s);
      this.commit(next);
    }
    show(f, v) {
      if (f.type === "time") return `${Math.round(Number(v))} ms`;
      if (f.type === "percent") return `${Math.round(Number(v))}%`;
      return String(v);
    }
    /* ---------------- rendering ---------------- */
    render() {
      const a = this.root.activeElement;
      const keep = a ? a.id ? "#" + a.id : ["data-preset", "data-tab", "data-chip", "data-act"].map((k) => a.hasAttribute(k) ? `[${k}="${a.getAttribute(k)}"]` : "").find(Boolean) ?? "" : "";
      this.draw();
      if (keep) this.root.querySelector(keep)?.focus({ preventScroll: true });
    }
    draw() {
      const el = this.el;
      if (!el) {
        this.root.innerHTML = `<style>${CSS2}</style><div class="p" part="panel"><header><h3><i></i>Animation</h3></header><div class="none"><b>Select a block</b>Pick any element on the canvas to animate it.</div></div>`;
        return;
      }
      const sel = this.fx.find((s) => s.effect === this.selected);
      this.root.innerHTML = `<style>${CSS2}</style>
<div class="p" part="panel">
  <header><h3><i></i>Animation</h3>
    <button class="btn" data-act="clear" ${this.fx.length ? "" : "disabled"} title="Remove all effects">Clear</button>
    <button class="btn primary" data-act="replay" ${this.fx.length ? "" : "disabled"}>\u25B6 Replay</button></header>
  <div class="who">Editing <b>${esc2(describe(el))}</b></div>
  <div class="chips">${this.fx.length ? this.fx.map(
        (s) => `<span class="chip" data-chip="${s.effect}" role="button" tabindex="0" aria-pressed="${s.effect === this.selected}">${esc2(META[s.effect]?.title || s.effect)} <small>${s.effect}</small><button data-act="remove" data-effect="${s.effect}" aria-label="Remove ${s.effect}">\u2715</button></span>`
      ).join("") : '<span class="empty">No animation yet. Hover a preset to preview it on the block.</span>'}</div>
  <div class="body">${sel ? this.settings(sel) : ""}
  <div class="pick"><div class="search"><input name="q" type="search" placeholder="Search effects\u2026" value="${esc2(this.query)}" aria-label="Search effects"></div>
  <div class="tabs" role="tablist">${this.groups().map((g) => `<button class="tab" role="tab" data-tab="${g.id}" aria-selected="${g.id === this.tab}" title="${esc2(g.desc)}">${g.label}</button>`).join("")}</div></div>
  <div class="grid-wrap"></div></div>
  <div class="code"><code>${esc2(toAttributeString(this.fx) || "No effects")}</code><button class="btn" data-act="copy">Copy</button></div>
</div>`;
      this.renderGrid();
    }
    renderGrid() {
      const wrap = this.root.querySelector(".grid-wrap");
      if (!wrap || !this.el) return;
      const all = this.hasAttribute("all");
      const fit = new Set(all ? GROUPS.flatMap((g) => g.effects) : suggest(this.el));
      const pool = all ? PRESETS : presetsFor(this.el);
      const q = this.query;
      const presets = q ? PRESETS.filter((p) => (p.label + " " + p.id + " " + p.fx.map((s) => s.effect).join(" ")).toLowerCase().includes(q)) : pool.filter((p) => p.group === this.tab);
      const covered = new Set(PRESETS.flatMap((p) => p.fx.map((s) => s.effect)));
      const extra = q ? [] : (GROUPS.find((g) => g.id === this.tab)?.effects ?? []).filter((n) => fit.has(n) && !covered.has(n));
      wrap.innerHTML = `<div class="grid">${presets.map((p) => {
        const g = GLYPH[p.id] ?? "pulse";
        const inner = ["cascade", "words", "type", "stack"].includes(g) ? "<b></b><b></b><b></b>" : g === "arrow" ? "\u2192" : "";
        return `<button class="tile" data-preset="${p.id}" aria-pressed="${this.isOn(p)}" title="${esc2(p.fx.map((s) => s.effect).join(" + "))}"><span class="stage"><i class="g" data-g="${g}">${inner}</i></span><span>${esc2(p.label)}</span></button>`;
      }).join("") || '<span class="empty">Nothing here fits this element. Try another tab, or search.</span>'}</div>` + (extra.length ? `<div class="more">More: ${extra.map((n) => `<button data-act="add" data-effect="${n}" title="${esc2(META[n]?.desc || "")}">${n}</button>`).join("")}</div>` : "");
    }
    settings(s) {
      const fs = fields(s.effect);
      if (!fs.length) return "";
      const rows = fs.map((f) => {
        const cur = s.options?.[f.key] ?? f.default;
        const id = "f-" + f.key;
        let control = "";
        switch (f.type) {
          case "select":
            control = `<select id="${id}" data-key="${f.key}">${(f.options ?? []).map((o) => `<option value="${esc2(o.value)}" ${String(cur) === o.value ? "selected" : ""}>${esc2(o.label)}</option>`).join("")}</select>`;
            break;
          case "toggle":
            control = `<span class="sw"><input id="${id}" type="checkbox" data-key="${f.key}" ${cur === true || cur === "" ? "checked" : ""}></span>`;
            break;
          case "color": {
            const hex = /^#[0-9a-f]{6}$/i.test(String(cur)) ? String(cur) : "#ffb547";
            control = `<input type="color" data-key="${f.key}" value="${hex}" aria-label="${esc2(f.label)}"><input id="${id}" type="text" data-key="${f.key}" value="${esc2(String(cur ?? ""))}" placeholder="any CSS color">`;
            break;
          }
          case "range":
            control = `<input id="${id}" type="range" data-key="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${Number(cur)}"><output>${this.show(f, cur)}</output>`;
            break;
          case "time": {
            const ms = toMs2(cur);
            const max = Math.max(3e3, (toMs2(f.default) || 0) * 2.5);
            control = `<input id="${id}" type="range" data-key="${f.key}" min="0" max="${max}" step="${max > 6e3 ? 250 : 50}" value="${Number.isFinite(ms) ? ms : 0}"><output>${this.show(f, Number.isFinite(ms) ? ms : 0)}</output>`;
            break;
          }
          case "percent":
            control = `<input id="${id}" type="range" data-key="${f.key}" min="0" max="100" step="1" value="${parseFloat(String(cur)) || 0}"><output>${this.show(f, parseFloat(String(cur)) || 0)}</output>`;
            break;
          case "number":
            control = `<input id="${id}" type="number" data-key="${f.key}" step="${f.step ?? 1}" value="${esc2(String(cur ?? ""))}">`;
            break;
          default:
            control = `<input id="${id}" type="text" data-key="${f.key}" value="${esc2(String(s.options?.[f.key] ?? ""))}" placeholder="${esc2(String(f.default ?? ""))}">`;
        }
        return `<div class="f"><label for="${id}" title="${esc2(f.help)}">${esc2(f.label)}</label><div class="c">${control}</div></div>`;
      }).join("");
      return `<details class="set" ${this.collapsed ? "" : "open"}><summary><h4><code>${s.effect}</code><small>${esc2(META[s.effect]?.title || "")}</small><span class="chev">\u2304</span></h4></summary><div class="rows">${rows}</div></details>`;
    }
  }
  FxPanel.observedAttributes = ["target", "theme", "groups", "all"];
  customElements.define(tag, FxPanel);
}
function esc2(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/editor/index.ts
definePanel();
export {
  EDITOR_CSS,
  FITS,
  GROUPS,
  PRESETS,
  add,
  apply,
  catalog,
  clear,
  definePanel,
  discard,
  enter,
  fields,
  fitsOf,
  flip,
  fromAttributes,
  groupOf,
  indexAt,
  label,
  leave,
  normalize,
  place,
  presetById,
  presetsFor,
  preview,
  read,
  remove,
  replay,
  resolve,
  sortable,
  spring,
  suggest,
  toAttributeString,
  toAttributes
};
