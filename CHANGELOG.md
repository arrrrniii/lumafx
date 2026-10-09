# Changelog

## 0.5.0

- **lumafx/ui: blocks that know the time.** `event`, `tickets`, `match`, `listing` and `poll` change state when something starts, ends or closes, in server-rendered HTML too. `salesEnd` stops selling at kickoff; after the event a card can point to the page with the result (`recap`, `recapLabel`).
- **New blocks:** `video` (YouTube and Vimeo, one or a playlist, nothing loads before a click), `artists`, `listing` (what's on, by day, with filters), `fixtures`, `poll`.
- **Tables readers can work with:** sort by any column, search the rows, bars in number columns, `datetime` format; live tables keep the reader's sort and search when fresh rows arrive.
- **Evidence line on any block** (`verified`, `reported`, `unconfirmed`, `analysis`, with source and time).
- **JSON-LD from the same blocks:** Article, Event, SportsEvent, FAQPage, ItemList, VideoObject, BreadcrumbList (`jsonLd`, `jsonLdScript`).
- Streaming no longer renders half-received links, dates or enum values.
- Fixed: an empty table cell shifted the cells after it one column left.
- Fixed: the event date box used the browser's month names instead of the page language.

## 0.4.0

- **lumafx/ui everywhere:** `lumafx-mcp` (MCP server and MCP Apps view for Claude, ChatGPT and other hosts), React server component and streaming component, the `[lumafx_ui]` WordPress shortcode, `<fx-ui>` element.

## 0.3.x

- **lumafx/ui:** intelligent UI blocks an AI writes as JSON, rendered while they stream.
- Builder kit (`lumafx/editor`) for putting effects inside your own page builder; drawers in WordPress.
- WebGL 3D loader; cards (5 designs) and press effects; drawers and bottom sheets; smart forms with one rule language for browser and server.

## 0.2.0

- Navigation (page transitions, preloader), components (modal, hovercard, chat, header, scrollbar, dock, lightbox), media effects and the WordPress plugin.

## 0.1.0

- 24 web effects, Tailwind v4 utilities, React bindings, tests and demo.
