import type { Effect } from '../core/types';
export declare const morph: Effect;
/**
 * Runs `update` inside a View Transition when the browser supports it (and the
 * user hasn't asked for reduced motion); otherwise just runs it.
 * `preset` picks a page animation from lumafx.css: fade, slide, slide-back, zoom, wipe.
 */
export declare function transition(update: () => void | Promise<void>, opts?: {
    preset?: string;
}): Promise<void>;
