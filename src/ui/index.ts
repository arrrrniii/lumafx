/**
 * lumafx/ui: intelligent UI blocks that an AI (or your backend) describes as JSON and the page
 * renders: match cards, lineups, standings, charts, weather, tickets, venue maps and more.
 *
 *   import { render, stream } from 'lumafx/ui';
 *   import 'lumafx/ui.css';
 *   render(el, { blocks: [{ type: 'match', home: { name: 'Albania' }, away: { name: 'San Marino' } }] });
 */
export * from './server';
export { render, stream, hydrate, update, destroy, adapter, addMount, defineElement } from './dom';
export type { Stream, Adapter } from './dom';

import { RENDERERS } from './render';
import type { Renderer } from './render';
import { defineElement } from './dom';

/** Register your own block type: a renderer (string HTML) and, optionally, a schema via BLOCKS. */
export function addBlock(type: string, renderer: Renderer) {
  RENDERERS[type] = renderer;
}

// <fx-ui> in browsers; nothing on the server.
defineElement();
