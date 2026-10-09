/**
 * Splits the text inside an element into animatable pieces without destroying
 * inline markup (links, <em>, <br>…). The original text nodes are kept so the
 * split can be undone exactly, which keeps frameworks like React happy.
 */
export type SplitMode = 'words' | 'chars' | 'lines';

export interface SplitResult {
  /** The animated pieces (words, or characters). */
  units: HTMLElement[];
  /** Word wrappers (in chars mode they hold the characters). */
  words: HTMLElement[];
  restore(): void;
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'SVG', 'svg']);

type SegmenterLike = { segment(s: string): Iterable<{ segment: string }> };
let segmenter: SegmenterLike | null | undefined;
function graphemes(s: string): string[] {
  if (segmenter === undefined) {
    const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => SegmenterLike }).Segmenter;
    segmenter = Seg ? new Seg(undefined, { granularity: 'grapheme' }) : null;
  }
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s);
}

function unit(text: string): HTMLElement {
  const u = document.createElement('span');
  u.className = 'fx-u';
  const inner = document.createElement('span');
  inner.className = 'fx-ui';
  inner.textContent = text;
  u.append(inner);
  return u;
}

export function splitText(root: HTMLElement, mode: SplitMode): SplitResult {
  const texts: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest('.fx-u')) return NodeFilter.FILTER_REJECT;
      return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);

  const units: HTMLElement[] = [];
  const words: HTMLElement[] = [];
  const swaps: { original: Text; nodes: Node[] }[] = [];

  for (const t of texts) {
    const parts = (t.nodeValue || '').split(/(\s+)/);
    const nodes: Node[] = [];
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        nodes.push(document.createTextNode(part));
        continue;
      }
      if (mode === 'chars') {
        const w = document.createElement('span');
        w.className = 'fx-word';
        for (const g of graphemes(part)) {
          const u = unit(g);
          w.append(u);
          units.push(u);
        }
        words.push(w);
        nodes.push(w);
      } else {
        const u = unit(part);
        units.push(u);
        words.push(u);
        nodes.push(u);
      }
    }
    const frag = document.createDocumentFragment();
    frag.append(...nodes);
    t.parentNode!.replaceChild(frag, t);
    swaps.push({ original: t, nodes });
  }

  units.forEach((u, i) => u.style.setProperty('--fx-i', String(i)));

  return {
    units,
    words,
    restore() {
      for (const { original, nodes } of swaps) {
        const first = nodes[0];
        if (first?.parentNode) first.parentNode.insertBefore(original, first);
        for (const n of nodes) (n as ChildNode).remove();
      }
    },
  };
}

/** Assigns `--fx-i` per visual line (all words on a line share an index). */
export function indexLines(units: HTMLElement[]) {
  let line = -1;
  let lastTop = -Infinity;
  for (const u of units) {
    const top = Math.round(u.getBoundingClientRect().top);
    if (top > lastTop + 2) {
      line++;
      lastTop = top;
    }
    u.style.setProperty('--fx-i', String(Math.max(0, line)));
  }
}
