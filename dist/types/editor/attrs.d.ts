import { type FxSpec } from './catalog';
export type { FxSpec };
export type FxInput = string | FxSpec | (string | FxSpec)[];
/** Turns preset ids, effect names and specs into a clean list of specs. */
export declare function resolve(input: FxInput): FxSpec[];
/** Drops unknown options, coerces values to the option's type and removes defaults. */
export declare function normalize(spec: FxSpec): FxSpec;
/** The HTML attributes for a set of effects: `{ 'data-fx': 'reveal tilt', 'data-fx-from': 'zoom' }`. */
export declare function toAttributes(input: FxInput): Record<string, string>;
/** The same as an attribute string for templates: `data-fx="reveal" data-fx-from="zoom"`. */
export declare function toAttributeString(input: FxInput): string;
/** Reads effects back from attributes (an element's, or a plain record from your own HTML parser). */
export declare function fromAttributes(attrs: Record<string, string | null | undefined> | NamedNodeMap): FxSpec[];
/** Removes every effect and option attribute lumafx put on `el` (other data-fx-* attributes stay). */
export declare function clear(el: Element): void;
/** Replaces the effects on `el`. Accepts preset ids, effect names or specs. Returns the specs applied. */
export declare function apply(el: Element, input: FxInput): FxSpec[];
/** Adds one effect (or preset) to what `el` already has. */
export declare function add(el: Element, input: FxInput): FxSpec[];
/** Removes one effect, keeping the others and their options. */
export declare function remove(el: Element, effect: string): FxSpec[];
/** The effects currently on `el`. */
export declare function read(el: Element): FxSpec[];
/**
 * Plays the effects on `el` again from the start, e.g. after an option changed in the editor.
 * Entrance effects replay even if they already ran.
 */
export declare function replay(el: Element): Promise<void>;
/**
 * Tries effects on `el` without committing: call the returned function to put the previous
 * effects back. Ideal for hovering over presets in a picker.
 */
export declare function preview(el: Element, input: FxInput): () => void;
