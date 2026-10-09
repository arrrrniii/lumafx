/**
 * Motion for builder canvases: blocks that glide into place when the layout changes (FLIP),
 * enter and leave softly, and drag-to-reorder with a lifted, tilting ghost, between lists and
 * from a block palette. Works with any framework: it only needs the DOM elements.
 */
/** A damped spring as a CSS linear() easing, with a cubic-bezier fallback for older browsers. */
export declare function spring(bounce?: number, points?: number): string;
export interface FlipOptions {
    duration?: number;
    easing?: string;
    /** Also animate size changes (fine for boxes, can blur text mid-flight). */
    scale?: boolean;
}
/**
 * Records where elements are, runs `mutate` (reorder, insert, remove, change classes…), then
 * animates every element from its old place to its new one. Pass a container to track its children.
 */
export declare function flip(targets: Element | Iterable<Element>, mutate: () => unknown, opts?: FlipOptions): Promise<void>;
/** Fades and springs a new element in. */
export declare function enter(el: Element, opts?: {
    duration?: number;
    from?: 'up' | 'down' | 'scale';
}): Promise<void>;
/** Shrinks and fades an element out (it stays in the DOM; see `discard`). */
export declare function leave(el: Element, opts?: {
    duration?: number;
}): Promise<void>;
/** Inserts or moves `node` into `parent` (before `before`), and everything around makes room smoothly. */
export declare function place(node: Element, parent: Element, before?: Node | null, opts?: FlipOptions): Promise<void>;
/** Animates `node` out, removes it, and lets its neighbours close the gap. */
export declare function discard(node: Element, opts?: FlipOptions): Promise<void>;
export interface SortEvent {
    item: HTMLElement;
    from: HTMLElement;
    to: HTMLElement;
    oldIndex: number;
    newIndex: number;
    /** True when the item was created from a palette (`clone`). */
    clone: boolean;
}
export interface SortableOptions {
    /** Which children can be dragged. Default: every direct child. */
    items?: string;
    /** Drag only from this part of an item (needed for touch scrolling on long items). */
    handle?: string;
    /** Lists with the same group exchange items. */
    group?: string;
    /** Palette mode: dragging makes a new element with this function instead of moving the item. */
    clone?: (item: HTMLElement) => HTMLElement;
    /** Allow reordering inside this list. Default true (false for palettes). */
    sort?: boolean;
    /** Allow dropping into this list. Default true (false for palettes). */
    accept?: boolean;
    onStart?(e: SortEvent): void;
    onEnd?(e: SortEvent): void;
}
export declare const EDITOR_CSS = "\n.fx-sort-ghost{position:fixed!important;margin:0!important;pointer-events:none!important;z-index:2147483000!important;box-sizing:border-box;will-change:transform;transition:none!important;animation:none!important;filter:drop-shadow(0 22px 28px rgb(8 10 30/.32)) drop-shadow(0 2px 6px rgb(8 10 30/.2));}\n.fx-sort-origin{opacity:.22!important;filter:saturate(0);}\n[data-fx-sort-over]{outline:2px dashed color-mix(in oklab,currentColor 30%,transparent);outline-offset:6px;}\nhtml[data-fx-sorting],html[data-fx-sorting] *{cursor:grabbing!important;-webkit-user-select:none!important;user-select:none!important;}\n[data-fx-sortable]>*,[data-fx-sortable] [data-fx-handle]{cursor:grab;}\n[data-fx-sortable][data-fx-sort-handle]>*{cursor:auto;}\n.fx-sort-live{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}\n";
/** Where in `items` a pointer at (x, y) should insert: list, row or grid, decided from the layout. */
export declare function indexAt(rects: DOMRect[], x: number, y: number): number;
/**
 * Drag-to-reorder for a list, a row or a grid. Items lift into a tilting ghost, the others glide
 * out of the way, and the ghost settles into its slot. Alt + arrow keys move a focused item.
 * Returns a function that turns it off.
 */
export declare function sortable(el: HTMLElement, opts?: SortableOptions): () => void;
