/** Holds entrances until the returned release function is called. */
export declare function hold(): () => void;
/** Runs `fn` now, or as soon as nothing holds the page. Returns a cancel function. */
export declare function whenLoaded(fn: () => void): () => void;
