/**
 * Parses JSON that is still arriving. Strings that are cut off are closed, unfinished numbers,
 * keys and literals are dropped, and open arrays and objects are closed, so a UI can render
 * whatever has arrived so far. Text before the first { or [ (and ```json fences) is ignored.
 */
export function parsePartial(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start < 0) return undefined;
  const s = text;
  let i = start;
  const ws = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  const INCOMPLETE = Symbol('incomplete');
  type R = unknown | typeof INCOMPLETE;

  function str(): { v: string; done: boolean } {
    // s[i] === '"'
    i++;
    let out = '';
    while (i < s.length) {
      const c = s[i];
      if (c === '"') {
        i++;
        return { v: out, done: true };
      }
      if (c === '\\') {
        if (i + 1 >= s.length) break;
        const n = s[i + 1];
        if (n === 'u') {
          const hex = s.slice(i + 2, i + 6);
          if (hex.length < 4 || !/^[0-9a-f]{4}$/i.test(hex)) break;
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        out += ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' } as Record<string, string>)[n] ?? n;
        i += 2;
        continue;
      }
      out += c;
      i++;
    }
    i = s.length;
    return { v: out, done: false };
  }

  function value(): R {
    ws();
    if (i >= s.length) return INCOMPLETE;
    const c = s[i];
    if (c === '{') return obj();
    if (c === '[') return arr();
    if (c === '"') return str().v;
    const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(s.slice(i, i + 40));
    if (m) {
      const end = i + m[0].length;
      // A number at the very end may still grow ("12" → "123"): keep it, it only updates later.
      i = end;
      return JSON.parse(m[0]);
    }
    // A cut-off literal or number ("tr", "-", "1.").
    i = s.length;
    return INCOMPLETE;
  }

  function obj(): Record<string, unknown> {
    i++;
    const out: Record<string, unknown> = {};
    while (true) {
      ws();
      if (i >= s.length) return out;
      if (s[i] === '}') {
        i++;
        return out;
      }
      if (s[i] === ',') {
        i++;
        continue;
      }
      if (s[i] !== '"') {
        // Not valid JSON from here on: stop where we are.
        i = s.length;
        return out;
      }
      const k = str();
      if (!k.done) return out;
      ws();
      if (s[i] !== ':') return out;
      i++;
      const v = value();
      if (v === INCOMPLETE) return out;
      out[k.v] = v;
    }
  }

  function arr(): unknown[] {
    i++;
    const out: unknown[] = [];
    while (true) {
      ws();
      if (i >= s.length) return out;
      if (s[i] === ']') {
        i++;
        return out;
      }
      if (s[i] === ',') {
        i++;
        continue;
      }
      const v = value();
      if (v === INCOMPLETE) return out;
      out.push(v);
    }
  }

  const v = value();
  return v === INCOMPLETE ? undefined : v;
}
