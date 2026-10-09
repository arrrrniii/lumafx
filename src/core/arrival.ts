/** Shared by the runtime and the page-transition effect: the note a covered page leaves for the next one. */
export const ARRIVAL_KEY = 'fx-pt';

export interface Arrival {
  style: string;
  color: string;
  t: number;
}

/**
 * Called from start(): if the previous page left a "covering" note, paint the cover
 * before the first frame so the new page never flashes before the reveal.
 */
export function earlyCover() {
  try {
    const raw = sessionStorage.getItem(ARRIVAL_KEY);
    if (!raw) return;
    const a = JSON.parse(raw) as Arrival;
    if (Date.now() - a.t > 6000) return sessionStorage.removeItem(ARRIVAL_KEY);
    document.documentElement.classList.add('fx-pt-arriving');
    document.documentElement.style.setProperty('--fx-pt-early', a.color);
  } catch {
    /* storage blocked */
  }
}
