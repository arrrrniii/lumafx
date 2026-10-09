import type { Effect } from '../core/types';
export interface Placement {
    x: number;
    y: number;
    side: 'top' | 'bottom' | 'left' | 'right';
    ox: number;
    oy: number;
}
/** Pure placement math (unit-tested): pick a side with room, then keep the card inside the viewport. */
export declare function placeCard(t: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}, c: {
    width: number;
    height: number;
}, vw: number, vh: number, prefer?: string, gap?: number): Placement;
export declare const hovercard: Effect;
export declare const smartHeader: Effect;
export declare const scrollbar: Effect;
export declare const scrollProgress: Effect;
export declare const dock: Effect;
export declare const lightbox: Effect;
