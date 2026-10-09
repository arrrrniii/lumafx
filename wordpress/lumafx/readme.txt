=== lumafx ===
Contributors: arnoldkajolli
Tags: animation, effects, page transition, scroll, glassmorphism
Requires at least: 6.3
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.3.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Premium web effects for any block: glass, reveals, border beams, liquid modals, scroll-scrubbed video, page transitions and a chat widget. Free forever.

== Description ==

lumafx adds an **Effects** panel to every block in the editor. Pick one or more effects, adjust a few options, publish. Nothing is written into your content: deactivate the plugin and every post stays exactly as it was.

**Effects for blocks**

* Surfaces: border-beam, shine, glass (liquid glass in Chromium), squircle corners, cursor-lit shadow, aurora
* Text: text-reveal, shimmer, scramble, counter, typewriter, rotating words, live clock
* Pointer: spotlight, magnetic, tilt, cursor-image, dock, image trail, hover card, hover icons for menus
* Scroll: reveal, stagger, parallax, stack, horizontal scroll, expand, image reveal, video that plays with the scroll, image sequences
* Media and layout: marquee, carousel, Instagram-style stories, WebGL ripple, 3D ring, lightbox, leaf shadows, SVG drawing with pulses, dot field
* Components: the liquid modal (a Group block that opens from any link to its anchor)

**Site-wide, from Settings → lumafx**

* Page transitions between pages (wave, curtain, circle, slide)
* Preloader with a real 000 → 100 counter
* Animated scrollbar with section marks and a hover label, reading progress bar
* Chat widget that can hand conversations to WhatsApp
* Smart header (glass on scroll, hides while reading) and menu hover icons for any theme

**Page builders**

In Elementor, Bricks, Divi or any theme, add an effect as a CSS class such as `fx-reveal`, `fx-glass` or `fx-border-beam`.

Every effect respects "reduced motion", keeps content visible if JavaScript fails, and pauses while off-screen.

== Installation ==

1. Plugins → Add New → Upload Plugin, choose lumafx.zip, activate.
2. Select any block and open **Effects** in the block sidebar.
3. Optional: Settings → lumafx for page transitions, preloader, scrollbar and chat.

== Frequently Asked Questions ==

= Is it really free? =

Yes. MIT licensed, every effect and component, no pro version, no account, no tracking.

= Does it slow my site down? =

The runtime is about 30 KB and the stylesheet about 12 KB gzipped, loaded once and cached. Effects that run continuously pause while off-screen.

= How do I make a modal? =

Add a Group block with your content. In Advanced, give it an HTML anchor such as "join". Add the modal effect. Link any button to "#join".

== Changelog ==

= 0.3.0 =
* Drawers: give a Group block an HTML anchor and the drawer effect; it opens from any link to #anchor as a side panel or bottom sheet (slide, glass, scale, push, dock or liquid).
* Cards, button press effects, smart forms with live validation, and a WebGL 3D loader in the Effects panel.
* The liquid modal now flows out of the button or link that opened it.

= 0.2.0 =
* First release of the WordPress plugin: Effects panel for every block, site-wide page transitions, preloader, scrollbar, reading progress, chat widget, smart header and menu icons.
