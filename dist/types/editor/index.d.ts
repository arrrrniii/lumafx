/**
 * lumafx/editor: the pieces to put lumafx inside a page builder.
 *
 * - Data: effects as JSON (`FxSpec[]`) ⇄ HTML attributes, on the server or in the browser.
 * - Catalogue: groups, presets and form fields generated from the effect metadata.
 * - Live: apply, preview, replay on elements in your canvas.
 * - Motion: FLIP layout animations and drag-to-reorder for blocks.
 * - <fx-panel>: a ready animation panel, if you would rather not build your own.
 */
export { GROUPS, FITS, PRESETS, presetById, presetsFor, suggest, fitsOf, groupOf, fields, catalog, label } from './catalog';
export type { GroupId, Fit, Field, CatalogEntry, Preset, FxSpec } from './catalog';
export { resolve, normalize, toAttributes, toAttributeString, fromAttributes, apply, add, remove, read, clear, replay, preview } from './attrs';
export type { FxInput } from './attrs';
export { flip, enter, leave, place, discard, sortable, spring, indexAt, EDITOR_CSS } from './motion';
export type { FlipOptions, SortableOptions, SortEvent } from './motion';
export { definePanel } from './panel';
export type { PanelChange } from './panel';
