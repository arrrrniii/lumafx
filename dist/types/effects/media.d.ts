import type { Effect } from '../core/types';
/** Pinned scroll range: 0 when the section's top reaches the viewport top, 1 when its bottom reaches the viewport bottom. */
export declare function pinnedProgress(rectTop: number, rectHeight: number, vh: number): number;
/** "f-###.jpg" + 7 → "f-007.jpg" */
export declare function framePath(pattern: string, n: number): string;
export declare const imageReveal: Effect;
export declare const expand: Effect;
export declare const imageTrail: Effect;
export declare const videoScrub: Effect;
export declare const frames: Effect;
