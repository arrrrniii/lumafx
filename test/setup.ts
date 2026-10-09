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

// jsdom has no Web Animations or modal dialogs: minimal stand-ins that finish immediately.
if (!Element.prototype.animate) {
  Element.prototype.animate = function () {
    return { finished: Promise.resolve(), cancel() {}, finish() {}, play() {}, pause() {}, reverse() {}, updatePlaybackRate() {}, effect: null } as unknown as Animation;
  };
}
if (!Element.prototype.getAnimations) Element.prototype.getAnimations = () => [];
const D = HTMLDialogElement.prototype as HTMLDialogElement & Record<string, unknown>;
if (typeof D.showModal !== 'function') {
  D.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  D.show = D.showModal;
  D.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
