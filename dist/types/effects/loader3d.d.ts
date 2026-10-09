import type { Effect } from '../core/types';
/** How open the fan is at phase `p` (0–1 over one cycle). */
export declare function fanAt(p: number): number;
/** Slab poses for a moment in the loop: [y, cos a, sin a, tilt] per slab. */
export declare function poses(n: number, time: number, duration: number, still?: boolean): Float32Array<ArrayBuffer>;
/** Stack scene: the flat tiles' matrices from their poses (profile in xy, thickness along z). */
export declare function stackMatrices(n: number, time: number, duration: number, still?: boolean): Float32Array<ArrayBuffer>;
export interface PageState {
    /** Angle of each panel around the hinge, radians. */
    angles: number[];
    /** 0 = closed deck, 1 = open (fan or ring). */
    open: number;
}
/**
 * Pages scene over one cycle: a closed deck fans open like a book, spreads into a full ring
 * that turns by one slot, then folds straight back into the deck.
 */
export declare function pageState(n: number, p: number, still?: boolean): PageState;
export declare const PAGE: {
    halfW: number;
    halfH: number;
    halfT: number;
    hinge: number;
    centerY: number;
};
/** Pages scene: panel matrices for a moment in the loop, centred on the plate. */
export declare function pageMatrices(n: number, time: number, duration: number, still?: boolean): Float32Array<ArrayBuffer>;
export declare const loader3d: Effect;
export interface LoadingOptions {
    /** Slab colours, as for data-fx-colors. */
    colors?: string;
    /** Loader size, e.g. "120px". */
    size?: string;
    /** Keep the loader up at least this long (ms), so it never just flickers. Default 500. */
    min?: number;
    /** Cover the target with a soft scrim instead of appending below its content. */
    overlay?: boolean;
    /** Accessible label. Default "Loading". */
    label?: string;
}
/**
 * Shows a 3D loader in `target` while `work` runs, marks the target aria-busy, then fades the
 * loader out and resolves with the work's result.
 *
 *   const posts = await lumafx.loading('#posts', fetch('/api/posts?page=2').then(r => r.json()));
 */
export declare function loading<T>(target: Element | string, work: Promise<T> | (() => Promise<T>), opts?: LoadingOptions): Promise<T>;
