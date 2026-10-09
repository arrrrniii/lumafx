/** Shared mouse position. Touch input is ignored so hover effects never fire on phones. */
export const pointer = { x: -1e5, y: -1e5, t: 0 };

const subs = new Set<() => void>();
let bound = false;

function onMove(e: PointerEvent) {
  if (e.pointerType === 'touch') return;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.t = performance.now();
  for (const fn of subs) fn();
}
function onScroll() {
  for (const fn of subs) fn();
}

/** Calls `fn` on every mouse move and scroll. */
export function onPointer(fn: () => void): () => void {
  subs.add(fn);
  if (!bound) {
    bound = true;
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  }
  return () => {
    subs.delete(fn);
    if (!subs.size && bound) {
      bound = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll, { capture: true });
    }
  };
}
