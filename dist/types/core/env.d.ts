export interface Env {
    /** prefers-reduced-motion (or forced with start({ motion: 'reduce' })). */
    reduced: boolean;
    /** A mouse or trackpad: hover effects are enabled. */
    finePointer: boolean;
    /** Save-Data or a very low-memory device: heavy effects degrade. */
    lite: boolean;
    /** Chromium engine: SVG filters in backdrop-filter actually render. */
    chromium: boolean;
    /** CSS scroll-driven animations. */
    sda: boolean;
    /** CSS corner-shape (native squircles). */
    cornerShape: boolean;
    /** View Transitions API. */
    vt: boolean;
}
export declare const isBrowser: boolean;
export declare const env: Env;
export type EnvOverrides = Partial<Env>;
export declare function detect(overrides?: EnvOverrides): Env;
export declare function watchReducedMotion(cb: () => void): () => void;
