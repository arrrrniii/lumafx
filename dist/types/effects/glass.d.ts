import type { Effect } from '../core/types';
/**
 * Builds a displacement map for a rounded rectangle: neutral grey in the middle,
 * and a vector pointing toward the centre inside the bezel. Sampling inward keeps
 * the lookup inside the backdrop, which avoids dark fringes at the edges.
 * Red = x displacement, green = y displacement, 128 = none.
 */
export declare function displacementMap(w: number, h: number, radius: number, bezel: number): {
    data: Uint8ClampedArray<ArrayBuffer>;
    width: number;
    height: number;
};
export declare const glass: Effect;
