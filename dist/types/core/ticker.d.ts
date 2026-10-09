/** One shared requestAnimationFrame loop. It only runs while something is subscribed. */
type Tick = (now: number, dt: number) => void;
export declare function tick(fn: Tick): () => void;
/**
 * A ticker that stops itself: `step` returns `true` while it still has work to do.
 * Call the returned `wake()` whenever input changes.
 */
export declare function sleeper(step: (now: number, dt: number) => boolean): {
    wake(): void;
    stop(): void;
};
export {};
