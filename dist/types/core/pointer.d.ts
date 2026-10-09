/** Shared mouse position. Touch input is ignored so hover effects never fire on phones. */
export declare const pointer: {
    x: number;
    y: number;
    t: number;
};
/** Calls `fn` on every mouse move and scroll. */
export declare function onPointer(fn: () => void): () => void;
