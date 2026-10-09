import type { Effect } from '../core/types';
export declare const modal: Effect;
/** A modal docked to an edge: side panels, bottom sheets. */
export declare const drawer: Effect;
/** Opens or closes a lumafx modal from code. `from` is the element the liquid comes out of. */
export declare const modals: {
    open: (target: string | HTMLDialogElement, opts?: {
        from?: Element | null;
    }) => void;
    close: (target: string | HTMLDialogElement) => void;
};
