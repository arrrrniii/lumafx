import { META } from '../meta';
import type { Effect } from '../core/types';
import { rafThrottle } from '../core/util';

export const marquee: Effect = {
  name: 'marquee',
  meta: META.marquee,
  mount(el, ctx) {
    // Reuse a track the markup already provides (React component, zero-JS markup); otherwise build one.
    let track = el.querySelector<HTMLElement>(':scope > .fx-mq-track');
    const created = !track;
    if (!track) {
      track = document.createElement('div');
      track.className = 'fx-mq-track';
      track.append(...Array.from(el.childNodes));
      el.append(track);
    }
    const t = track;
    // Clones the markup may already contain (zero-JS usage) are kept as they are.
    const clones: HTMLElement[] = [];
    if (ctx.env.reduced) {
      return () => created && restore();
    }

    const vertical = ctx.bool('vertical', false);
    const speed = Math.max(1, ctx.num('speed', 60));

    const layout = rafThrottle(() => {
      const size = vertical ? el.clientHeight : el.clientWidth;
      const tsize = vertical ? t.offsetHeight : t.offsetWidth;
      if (!tsize || !size) return;
      const cs = getComputedStyle(el);
      const gap = parseFloat(vertical ? cs.rowGap : cs.columnGap) || 0;
      // Enough copies that the strip is always longer than the visible area plus one lap.
      const need = Math.min(24, Math.max(1, Math.ceil(size / (tsize + gap))));
      while (clones.length < need) {
        const c = t.cloneNode(true) as HTMLElement;
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('inert', '');
        c.setAttribute('data-fx-clone', '');
        el.append(c);
        clones.push(c);
      }
      while (clones.length > need) clones.pop()!.remove();
      el.style.setProperty('--fx-mq-dur', ((tsize + gap) / speed).toFixed(3) + 's');
    });

    const ro = new ResizeObserver(() => layout());
    ro.observe(el);
    ro.observe(t);
    layout();

    function restore() {
      if (t.parentNode === el) {
        while (t.firstChild) el.insertBefore(t.firstChild, t);
        t.remove();
      }
    }

    return () => {
      ro.disconnect();
      layout.cancel();
      clones.forEach((c) => c.remove());
      el.style.removeProperty('--fx-mq-dur');
      if (created) restore();
    };
  },
};
