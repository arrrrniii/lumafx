export declare const clamp: (v: number, min: number, max: number) => number;
export declare const lerp: (a: number, b: number, t: number) => number;
/** Frame-rate independent smoothing toward a target. `lambda` ≈ responsiveness (higher = snappier). */
export declare const damp: (current: number, target: number, lambda: number, dtMs: number) => number;
export declare function on<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions): () => void;
export declare function on(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): () => void;
/** Runs `fn` at most once per animation frame. */
export declare function rafThrottle<A extends unknown[]>(fn: (...args: A) => void): {
    (...args: A): void;
    cancel: () => void | 0;
};
/** `data-fx-state` holds runtime state tokens (in, active, paused…), separate from options. */
export declare function hasState(el: Element, token: string): boolean;
export declare function setState(el: Element, token: string, onOff?: boolean): void;
/** Sets attributes and returns a function that restores the previous values. */
export declare function setAttrs(el: Element, attrs: Record<string, string>): () => void;
export declare const isInteractive: (el: Element) => boolean;
export declare const px: (v: string | null | undefined) => number;
