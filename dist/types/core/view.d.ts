/** Shared IntersectionObservers, one per (margin, threshold) pair. */
type Cb = (visible: boolean, entry: IntersectionObserverEntry) => void;
export interface ViewOpts {
    margin?: string;
    threshold?: number;
}
export declare function onView(el: Element, cb: Cb, opts?: ViewOpts): () => void;
export {};
