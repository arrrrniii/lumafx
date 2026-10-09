import type { Effect } from '../core/types';
/** Programmatic page transitions for SPAs (Next.js router events, etc.). */
export declare const page: {
    cover: (x?: number, y?: number) => Promise<void>;
    reveal: () => Promise<void>;
};
export declare const pageTransition: Effect;
export declare const preloader: Effect;
