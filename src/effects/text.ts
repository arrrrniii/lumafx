import { META } from '../meta';
import type { Effect } from '../core/types';
import { onView } from '../core/view';
import { whenLoaded } from '../core/gate';
import { isInteractive, setState } from '../core/util';
import { indexLines, splitText, type SplitMode } from './split';

const VIEW = { margin: '0px 0px -10% 0px' };
const DEFAULT_STAGGER: Record<SplitMode, string> = { words: '60ms', chars: '22ms', lines: '120ms' };

export const textReveal: Effect = {
  name: 'text-reveal',
  meta: META['text-reveal'],
  mount(el, ctx) {
    if (ctx.env.reduced) {
      setState(el, 'in');
      return () => setState(el, 'in', false);
    }
    const mode = (ctx.str('split', 'words') as SplitMode) || 'words';
    const split = splitText(el, DEFAULT_STAGGER[mode] ? mode : 'words');
    el.style.setProperty('--_tr-st-def', DEFAULT_STAGGER[mode] ?? '60ms');
    setState(el, 'split');

    // Letter-by-letter spans can make screen readers spell words out, so expose the plain text instead.
    let undoAria: (() => void) | null = null;
    if (mode === 'chars' && !isInteractive(el) && !el.hasAttribute('aria-label')) {
      el.setAttribute('aria-label', (el.textContent || '').replace(/\s+/g, ' ').trim());
      split.words.forEach((w) => w.setAttribute('aria-hidden', 'true'));
      undoAria = () => el.removeAttribute('aria-label');
    }

    let ro: ResizeObserver | null = null;
    if (mode === 'lines') {
      indexLines(split.units);
      let lastW = el.clientWidth;
      ro = new ResizeObserver(() => {
        if (el.clientWidth !== lastW) {
          lastW = el.clientWidth;
          indexLines(split.units);
        }
      });
      ro.observe(el);
    }

    const once = ctx.bool('once', true);
    let off: (() => void) | null = null;
    let raf = 0;
    if (ctx.str('trigger', 'view') === 'load') {
      // Two frames so the hidden state is painted before transitioning.
      whenLoaded(() => (raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setState(el, 'in'))))));
    } else {
      off = onView(
        el,
        (visible) => {
          if (visible) {
            whenLoaded(() => setState(el, 'in'));
            if (once) {
              off?.();
              off = null;
            }
          } else if (!once) setState(el, 'in', false);
        },
        VIEW,
      );
    }

    return () => {
      cancelAnimationFrame(raf);
      off?.();
      ro?.disconnect();
      undoAria?.();
      split.restore();
      el.style.removeProperty('--_tr-st-def');
      setState(el, 'in', false);
      setState(el, 'split', false);
    };
  },
};

const DEFAULT_CHARS = META.scramble.options.chars.default as string;

export const scramble: Effect = {
  name: 'scramble',
  meta: META.scramble,
  mount(el, ctx) {
    if (ctx.env.reduced) return;
    const per = ctx.time('speed', 28);
    const charset = Array.from(ctx.str('chars', DEFAULT_CHARS) || DEFAULT_CHARS);
    const trigger = ctx.str('trigger', 'view');

    const nodes: { node: Text; text: string }[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if ((n.nodeValue || '').trim()) nodes.push({ node: n as Text, text: n.nodeValue || '' });
    }
    const total = nodes.reduce((s, n) => s + n.text.length, 0);
    if (!total) return;

    let raf = 0;
    let running = false;
    const finish = () => {
      for (const n of nodes) n.node.nodeValue = n.text;
      running = false;
      setState(el, 'scrambling', false);
    };
    const play = () => {
      if (running) return;
      running = true;
      setState(el, 'scrambling');
      // rAF timestamps can be slightly older than performance.now(), so time from the first frame.
      let start = -1;
      const dur = total * per + 300;
      let frame = 0;
      const step = (now: number) => {
        if (start < 0) start = now;
        const revealed = Math.floor(((now - start) / dur) * total * 1.15);
        if (revealed >= total) return finish();
        // Change the random letters every other frame so it reads as decoding, not noise.
        if (frame++ % 2 === 0) {
          let i = 0;
          for (const n of nodes) {
            let out = '';
            for (const ch of n.text) {
              out += i++ < revealed || /\s/.test(ch) ? ch : charset[(Math.random() * charset.length) | 0];
            }
            n.node.nodeValue = out;
          }
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const offs: (() => void)[] = [];
    if (trigger === 'hover') {
      el.addEventListener('pointerenter', play);
      el.addEventListener('focusin', play);
      offs.push(() => {
        el.removeEventListener('pointerenter', play);
        el.removeEventListener('focusin', play);
      });
    } else if (trigger === 'load') whenLoaded(play);
    else {
      let off: (() => void) | null = onView(
        el,
        (v) => {
          if (v) {
            whenLoaded(play);
            off?.();
            off = null;
          }
        },
        VIEW,
      );
      offs.push(() => off?.());
    }

    return () => {
      cancelAnimationFrame(raf);
      offs.forEach((f) => f());
      finish();
    };
  },
};

export interface ParsedNumber {
  prefix: string;
  suffix: string;
  value: number;
  decimals: number;
  decimalSep: string;
  groupSep: string;
}

/** Finds the first number in a string and remembers how it was formatted. */
export function parseNumber(text: string): ParsedNumber | null {
  const m = /-?\d(?:[\d.,'\u00a0\u202f]*\d)?/.exec(text);
  if (!m) return null;
  const s = m[0];
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let decimalSep = '';
  if (lastDot > -1 && lastComma > -1) decimalSep = lastDot > lastComma ? '.' : ',';
  else if (lastDot > -1 || lastComma > -1) {
    const sep = lastDot > -1 ? '.' : ',';
    const count = s.split(sep).length - 1;
    const after = s.length - s.lastIndexOf(sep) - 1;
    // "1,5" or "3.14" are decimals; "12,500" or "1.000.000" are thousands.
    if (count === 1 && after !== 3) decimalSep = sep;
  }
  const intPart = decimalSep ? s.slice(0, s.lastIndexOf(decimalSep)) : s;
  const groupMatch = /[^\d-]/.exec(intPart);
  const groupSep = groupMatch ? groupMatch[0] : '';
  const decimals = decimalSep ? s.length - s.lastIndexOf(decimalSep) - 1 : 0;
  const normalized = (decimalSep ? intPart.replace(/[^\d-]/g, '') + '.' + s.slice(s.lastIndexOf(decimalSep) + 1) : s.replace(/[^\d-]/g, ''));
  return {
    prefix: text.slice(0, m.index),
    suffix: text.slice(m.index + s.length),
    value: parseFloat(normalized),
    decimals,
    decimalSep,
    groupSep,
  };
}

export function formatNumber(n: number, p: ParsedNumber): string {
  const fixed = Math.abs(n).toFixed(p.decimals);
  let [int, frac] = fixed.split('.');
  if (p.groupSep) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, p.groupSep);
  return (n < 0 ? '-' : '') + int + (p.decimals ? p.decimalSep + frac : '');
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export const counter: Effect = {
  name: 'counter',
  meta: META.counter,
  mount(el, ctx) {
    if (ctx.env.reduced) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Text | null = null;
    let parsed: ParsedNumber | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      parsed = parseNumber(n.nodeValue || '');
      if (parsed) {
        node = n as Text;
        break;
      }
    }
    if (!node || !parsed) return;
    const target = node;
    const p = parsed;
    const original = target.nodeValue || '';
    const from = ctx.num('from', 0);
    const dur = ctx.time('duration', 1800);
    const render = (v: number) => (target.nodeValue = p.prefix + formatNumber(v, p) + p.suffix);

    render(from);
    let raf = 0;
    let off: (() => void) | null = onView(
      el,
      (v) => {
        if (!v) return;
        off?.();
        off = null;
        let start = -1;
        const step = (now: number) => {
          if (start < 0) start = now;
          const t = Math.min(1, Math.max(0, (now - start) / dur));
          if (t >= 1) {
            target.nodeValue = original;
            return;
          }
          render(from + (p.value - from) * easeOutExpo(t));
          raf = requestAnimationFrame(step);
        };
        whenLoaded(() => (raf = requestAnimationFrame(step)));
      },
      VIEW,
    );
    return () => {
      off?.();
      cancelAnimationFrame(raf);
      target.nodeValue = original;
    };
  },
};
