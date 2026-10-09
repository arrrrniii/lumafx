import { META } from '../meta';
import type { Effect } from '../core/types';
import { onView } from '../core/view';
import { setState } from '../core/util';
import { whenLoaded } from '../core/gate';

const VIEW = { margin: '0px 0px -10% 0px', threshold: 0 };

/** Toggles the "in" state when the element enters the viewport. */
function watchIn(el: HTMLElement, once: boolean) {
  let off: (() => void) | null = null;
  off = onView(
    el,
    (visible) => {
      if (visible) {
        whenLoaded(() => setState(el, 'in'));
        if (once && off) {
          off();
          off = null;
        }
      } else if (!once) setState(el, 'in', false);
    },
    VIEW,
  );
  return () => {
    off?.();
    setState(el, 'in', false);
  };
}

export const reveal: Effect = {
  name: 'reveal',
  meta: META.reveal,
  mount(el, ctx) {
    if (ctx.env.reduced) {
      setState(el, 'in');
      return () => setState(el, 'in', false);
    }
    return watchIn(el, ctx.bool('once', true));
  },
};

export const stagger: Effect = {
  name: 'stagger',
  meta: META.stagger,
  mount(el, ctx) {
    const index = () => {
      let i = 0;
      for (const c of el.children) (c as HTMLElement).style.setProperty('--fx-i', String(i++));
    };
    index();
    // Re-index when children are added later ("load more").
    const mo = new MutationObserver(index);
    mo.observe(el, { childList: true });
    const stop = ctx.env.reduced ? (setState(el, 'in'), () => setState(el, 'in', false)) : watchIn(el, ctx.bool('once', true));
    return () => {
      mo.disconnect();
      stop();
      for (const c of el.children) (c as HTMLElement).style.removeProperty('--fx-i');
    };
  },
};
