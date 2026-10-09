import { META } from '../meta';
import type { Effect } from '../core/types';
import { env } from '../core/env';

export const morph: Effect = {
  name: 'morph',
  meta: META.morph,
  mount(el, ctx) {
    const name = ctx.str('name');
    if (!name) return;
    el.style.setProperty('view-transition-name', name);
    return () => el.style.removeProperty('view-transition-name');
  },
};

type DocVT = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> };
};

/**
 * Runs `update` inside a View Transition when the browser supports it (and the
 * user hasn't asked for reduced motion); otherwise just runs it.
 * `preset` picks a page animation from lumafx.css: fade, slide, slide-back, zoom, wipe.
 */
export async function transition(update: () => void | Promise<void>, opts: { preset?: string } = {}): Promise<void> {
  const doc = document as DocVT;
  if (!doc.startViewTransition || env.reduced) {
    await update();
    return;
  }
  const html = document.documentElement;
  const prev = html.getAttribute('data-fx-transition');
  if (opts.preset) html.setAttribute('data-fx-transition', opts.preset);
  try {
    await doc.startViewTransition(update).finished;
  } finally {
    if (opts.preset) {
      if (prev === null) html.removeAttribute('data-fx-transition');
      else html.setAttribute('data-fx-transition', prev);
    }
  }
}
