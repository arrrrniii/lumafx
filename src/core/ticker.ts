/** One shared requestAnimationFrame loop. It only runs while something is subscribed. */
type Tick = (now: number, dt: number) => void;

const subs = new Set<Tick>();
let raf = 0;
let last = 0;

function loop(now: number) {
  const dt = last ? Math.min(64, now - last) : 16.7;
  last = now;
  for (const fn of [...subs]) fn(now, dt);
  if (subs.size) raf = requestAnimationFrame(loop);
  else {
    raf = 0;
    last = 0;
  }
}

export function tick(fn: Tick): () => void {
  subs.add(fn);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    subs.delete(fn);
  };
}

/**
 * A ticker that stops itself: `step` returns `true` while it still has work to do.
 * Call the returned `wake()` whenever input changes.
 */
export function sleeper(step: (now: number, dt: number) => boolean) {
  let off: (() => void) | null = null;
  const run: Tick = (now, dt) => {
    if (!step(now, dt) && off) {
      off();
      off = null;
    }
  };
  return {
    wake() {
      if (!off) off = tick(run);
    },
    stop() {
      off?.();
      off = null;
    },
  };
}
