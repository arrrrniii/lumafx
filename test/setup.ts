// jsdom has no layout engine: provide the observers the effects rely on.
class RO {
  cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver ??= RO;

export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
