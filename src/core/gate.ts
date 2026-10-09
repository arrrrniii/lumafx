/**
 * Entrance gate: while a preloader (or anything else) holds the page, entrance animations
 * wait, so they play as the curtain lifts instead of hidden behind it.
 */
let holds = 0;
let waiting: (() => void)[] = [];

/** Holds entrances until the returned release function is called. */
export function hold(): () => void {
  holds++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--holds === 0) {
      const w = waiting;
      waiting = [];
      w.forEach((fn) => fn());
    }
  };
}

/** Runs `fn` now, or as soon as nothing holds the page. Returns a cancel function. */
export function whenLoaded(fn: () => void): () => void {
  if (!holds) {
    fn();
    return () => {};
  }
  waiting.push(fn);
  return () => {
    waiting = waiting.filter((f) => f !== fn);
  };
}
