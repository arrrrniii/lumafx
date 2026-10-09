/** Shared IntersectionObservers, one per (margin, threshold) pair. */
type Cb = (visible: boolean, entry: IntersectionObserverEntry) => void;

const pools = new Map<string, { io: IntersectionObserver; cbs: Map<Element, Set<Cb>> }>();

export interface ViewOpts {
  margin?: string;
  threshold?: number;
}

export function onView(el: Element, cb: Cb, opts: ViewOpts = {}): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    // Old browser or test environment: treat everything as visible.
    const id = setTimeout(() => cb(true, { isIntersecting: true, target: el } as IntersectionObserverEntry), 0);
    return () => clearTimeout(id);
  }
  const margin = opts.margin ?? '0px';
  const threshold = opts.threshold ?? 0;
  const key = `${margin}|${threshold}`;
  let pool = pools.get(key);
  if (!pool) {
    const cbs = new Map<Element, Set<Cb>>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) cbs.get(e.target)?.forEach((fn) => fn(e.isIntersecting, e));
      },
      { rootMargin: margin, threshold },
    );
    pool = { io, cbs };
    pools.set(key, pool);
  }
  let set = pool.cbs.get(el);
  if (!set) {
    set = new Set();
    pool.cbs.set(el, set);
    pool.io.observe(el);
  }
  set.add(cb);
  const p = pool;
  return () => {
    const s = p.cbs.get(el);
    if (!s) return;
    s.delete(cb);
    if (!s.size) {
      p.cbs.delete(el);
      p.io.unobserve(el);
    }
  };
}
