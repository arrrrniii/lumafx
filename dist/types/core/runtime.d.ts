import { type EnvOverrides } from './env';
import type { Effect } from './types';
export interface StartOptions {
    /** Element to scan and watch. Defaults to the whole document. */
    root?: Element;
    /** 'auto' follows the OS setting; 'reduce' forces reduced motion everywhere. */
    motion?: 'auto' | 'reduce';
    /** Force or disable lite mode (heavy effects degrade). Defaults to automatic detection. */
    lite?: boolean;
    /** Override feature detection, e.g. { sda: false } to test fallbacks. */
    features?: EnvOverrides;
}
export declare function register(...effects: Effect[]): void;
export declare function registered(): string[];
/** Starts the runtime: mounts every effect in the page and watches for changes. Safe to call more than once. */
export declare function start(opts?: StartOptions): void;
/** Unmounts every effect and stops watching the page. */
export declare function stop(): void;
/** Re-detects the environment and remounts everything. */
export declare function refresh(): void;
/** Mounts effects under `root` right away (useful after injecting HTML when you can't wait a microtask). */
export declare function mount(root: Element): void;
/** Debug helper: how many elements each effect is running on. */
export declare function stats(): Record<string, number>;
export declare function isStarted(): boolean;
