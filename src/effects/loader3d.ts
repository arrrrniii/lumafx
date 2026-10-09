import { META } from '../meta';
import type { Effect } from '../core/types';
import { setState, clamp } from '../core/util';
import { tick } from '../core/ticker';
import { onView } from '../core/view';

/* ======================================================================
   loader-3d · glossy slabs that fan apart over a floating plate.

   The scene is ray-marched in one fragment shader: rounded tiles as signed
   distance fields, soft shadows, ambient occlusion, a studio environment for
   the reflections and a soft contact shadow under the plate. One WebGL
   context is shared by every loader on the page (browsers cap contexts), and
   each loader copies its frame into its own 2D canvas.
   ====================================================================== */

const MAX = 6;

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform int uN;
uniform vec4 uSlab[${MAX}];   // y, cos(a), sin(a), tilt
uniform vec3 uCol[${MAX}];    // linear colours
uniform vec3 uBase;
uniform float uPlateY;
uniform float uYaw;

const vec3 HS = vec3(.5, .058, .5);
const float RC = .17;
const float RE = .05;
const vec2 PIV = vec2(-.36, -.36);
const vec3 PS = vec3(.76, .05, .76);
const float GROUND = -.74;

float tile(vec3 p, vec3 b, float rc, float re) {
  vec2 q = abs(p.xz) - b.xz + rc;
  float d2 = min(max(q.x, q.y), 0.) + length(max(q, 0.)) - rc;
  vec2 w = vec2(d2 + re, abs(p.y) - b.y + re);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - re;
}

vec3 slabLocal(vec3 p, vec4 s) {
  vec3 q = p;
  q.y -= s.x;
  vec2 r = q.xz - PIV;
  q.xz = vec2(s.y * r.x + s.z * r.y, -s.z * r.x + s.y * r.y) + PIV;
  float ct = cos(s.w), st = sin(s.w);
  q.yz = vec2(ct * q.y - st * q.z, st * q.y + ct * q.z);
  return q;
}

vec2 map(vec3 p) {
  vec2 res = vec2(tile(p - vec3(0., uPlateY, 0.), PS, .27, .05), 0.);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    float d = tile(slabLocal(p, uSlab[i]), HS, RC, RE);
    if (d < res.x) res = vec2(d, float(i + 1));
  }
  return res;
}

vec3 normal(vec3 p) {
  const vec2 k = vec2(1., -1.);
  const float e = .0008;
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x + k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

float shadow(vec3 ro, vec3 rd) {
  float res = 1., t = .02;
  for (int i = 0; i < 32; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, 9. * h / t);
    t += clamp(h, .015, .18);
    if (res < .003 || t > 3.) break;
  }
  return clamp(res, 0., 1.);
}

float occlusion(vec3 p, vec3 n) {
  float o = 0., s = 1.;
  for (int i = 0; i < 5; i++) {
    float h = .012 + .07 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= .72;
  }
  return clamp(1. - 2.6 * o, 0., 1.);
}

// A soft rectangular light seen in direction d.
float softbox(vec3 d, vec3 L, vec3 U, vec2 size, float soft) {
  float c = dot(d, L);
  if (c <= 0.) return 0.;
  vec3 h = d / c - L;
  vec3 R = normalize(cross(L, U));
  vec3 Up = cross(R, L);
  vec2 q = abs(vec2(dot(h, R), dot(h, Up))) - size;
  float sd = length(max(q, 0.)) + min(max(q.x, q.y), 0.);
  return 1. - smoothstep(-soft, soft, sd);
}

vec3 env(vec3 d) {
  float y = d.y;
  vec3 c = mix(vec3(.18, .2, .34), vec3(.62, .66, .86), smoothstep(-.45, .1, y));
  c = mix(c, vec3(.92, .94, 1.), smoothstep(.1, .95, y));
  c += vec3(3.2, 3.15, 3.) * softbox(d, normalize(vec3(-.55, .78, .32)), vec3(0., 1., 0.), vec2(.42, .26), .1);
  c += vec3(1.3, 1.4, 1.8) * softbox(d, normalize(vec3(.85, .3, -.3)), vec3(0., 1., 0.), vec2(.9, .05), .05);
  c += vec3(.9, .8, 1.3) * softbox(d, normalize(vec3(.2, .25, .95)), vec3(0., 1., 0.), vec2(.7, .04), .06);
  return c;
}

vec3 albedo(float id, vec3 p) {
  if (id < .5) return uBase;
  vec3 c = uCol[0];
  vec4 s = uSlab[0];
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    if (abs(id - float(i + 1)) < .5) { c = uCol[i]; s = uSlab[i]; }
  }
  // A gentle diagonal gradient across each slab.
  vec3 q = slabLocal(p, s);
  return c * (.86 + .3 * clamp(.5 + .55 * (q.z - q.x), 0., 1.));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float D = 5.2;
  vec3 ro = vec3(sin(uYaw) * D, 2.7, cos(uYaw) * D);
  vec3 ta = vec3(-.1, -.2, -.06);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0., 1., 0.)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 2.45 * ww);

  vec3 col = vec3(0.);
  float alpha = 0.;

  // Bounding sphere around everything that can be hit.
  vec3 oc = ro - vec3(0., -.15, 0.);
  float b = dot(oc, rd);
  float disc = b * b - (dot(oc, oc) - 2.1 * 2.1);
  bool hit = false;
  float t = 0.;
  vec2 h = vec2(1., 0.);
  if (disc > 0.) {
    float sq = sqrt(disc);
    t = max(0., -b - sq);
    float tmax = -b + sq;
    for (int i = 0; i < 110; i++) {
      h = map(ro + rd * t);
      if (h.x < .0006 * t) { hit = true; break; }
      t += h.x * .9;
      if (t > tmax) break;
    }
  }

  vec3 L = normalize(vec3(-.55, .9, .42));
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normal(p);
    vec3 v = -rd;
    vec3 a = albedo(h.y, p);
    float occ = occlusion(p, n);
    float sha = shadow(p + n * .004, L);
    float ndl = dot(n, L);
    float wrap = clamp(ndl * .5 + .5, 0., 1.);
    float fre = pow(1. - clamp(dot(n, v), 0., 1.), 5.);
    vec3 r = reflect(rd, n);
    vec3 hv = normalize(L + v);
    bool plate = h.y < .5;

    // Diffuse with a soft wrap, cool sky fill from above and bounce from below.
    vec3 dif = a * (.16 + .84 * wrap * mix(.42, 1., sha)) * mix(.55, 1., occ);
    dif += a * a * .5 * clamp(n.y * .5 + .5, 0., 1.) * occ;
    // Light that seems to pass through the material near the edges.
    dif += a * .55 * pow(clamp(1. - abs(dot(n, v)), 0., 1.), 2.) * occ;

    // Clear coat: environment reflection + a sharp highlight.
    float coat = plate ? .05 + .6 * fre : .045 + .9 * fre;
    vec3 spec = env(r) * coat * mix(.35, 1., occ);
    // Reflections of the slabs on the plate: darken where the reflected ray hits them.
    if (plate) {
      float rs = shadow(p + n * .01, r);
      spec *= mix(.45, 1., rs);
      dif += vec3(.05, .07, .12) * (1. - rs);
    }
    spec += vec3(1.) * pow(clamp(dot(n, hv), 0., 1.), plate ? 60. : 140.) * (plate ? .8 : 2.2) * sha;

    col = dif + spec;
    alpha = 1.;
  }

  // Soft contact shadow on an invisible floor, so the plate looks like it floats.
  if (!hit && rd.y < 0.) {
    float tg = (GROUND - ro.y) / rd.y;
    vec3 g = ro + rd * tg;
    vec2 q = abs(g.xz) - PS.xz + .27;
    float d2 = min(max(q.x, q.y), 0.) + length(max(q, 0.)) - .27;
    float lift = uPlateY - GROUND;
    float s = (1. - smoothstep(-.32, .12 + lift * .25, d2)) * (.34 - lift * .18);
    alpha = clamp(s, 0., 1.);
    col = vec3(0., 0., .015);
  }

  // Never end in a hard line at the canvas edge.
  vec2 e = min(gl_FragCoord.xy, uRes - gl_FragCoord.xy) / uRes.y;
  alpha *= smoothstep(0., .06, min(e.x, e.y));

  // Filmic tone map, then gamma.
  vec3 c = col;
  c = (c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14);
  c = pow(clamp(c, 0., 1.), vec3(1. / 2.2));
  gl_FragColor = vec4(c * alpha, alpha);
}
`;

interface Renderer {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  u: Record<string, WebGLUniformLocation | null>;
  ok: boolean;
}

let shared: Renderer | null | undefined;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

function setup(r: Renderer) {
  const { gl } = r;
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) || 'link');
  gl.useProgram(p);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  r.u = {};
  for (const n of ['uRes', 'uN', 'uSlab', 'uCol', 'uBase', 'uPlateY', 'uYaw']) r.u[n] = gl.getUniformLocation(p, n);
  r.ok = true;
}

function renderer(): Renderer | null {
  if (shared !== undefined) return shared;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error('no webgl');
    const r: Renderer = { gl, canvas, u: {}, ok: false };
    setup(r);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      r.ok = false;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try {
        setup(r);
      } catch {
        /* stays off */
      }
    });
    shared = r;
  } catch (err) {
    console.warn('[lumafx] loader-3d: WebGL unavailable, using the CSS version', err);
    shared = null;
  }
  return shared;
}

/* ---------------- colours ---------------- */

function parseColor(c: string): [number, number, number] | null {
  const s = c.trim();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  if (m) return [+m[1], +m[2], +m[3]];
  // Anything else (named colours, oklch…): let the browser resolve it.
  if (typeof document === 'undefined') return null;
  const probe = document.createElement('span');
  probe.style.color = s;
  if (!probe.style.color) return null;
  document.body.append(probe);
  const out = parseColor(getComputedStyle(probe).color);
  probe.remove();
  return out;
}

const toLinear = (rgb: [number, number, number]) => rgb.map((v) => Math.pow(v / 255, 2.2)) as [number, number, number];

/** Spreads a list of colours over `n` slabs, blending between neighbours. */
function palette(list: [number, number, number][], n: number) {
  if (list.length >= n) return list.slice(0, n);
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : (i / (n - 1)) * (list.length - 1);
    const a = list[Math.floor(f)];
    const b = list[Math.min(list.length - 1, Math.floor(f) + 1)];
    const k = f - Math.floor(f);
    out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
  }
  return out;
}

/* ---------------- motion ---------------- */

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** How open the fan is at phase `p` (0–1 over one cycle). */
export function fanAt(p: number) {
  p = ((p % 1) + 1) % 1;
  if (p < 0.1) return 0;
  if (p < 0.44) return easeOutBack((p - 0.1) / 0.34);
  if (p < 0.6) return 1;
  if (p < 0.94) return 1 - easeInOut((p - 0.6) / 0.34);
  return 0;
}

/** Slab poses for a moment in the loop: [y, cos a, sin a, tilt] per slab. */
export function poses(n: number, time: number, duration: number, still = false) {
  const out = new Float32Array(MAX * 4);
  const bob = still ? 0 : Math.sin((time / 1000) * 2.1) * 0.025;
  // Taller stacks open less per slab, so the whole fan always fits the frame.
  const open = n > 1 ? Math.min(0.17, Math.max(0.03, 0.9 / (n - 1) - 0.13)) : 0;
  const base = n > 4 ? -0.3 - (n - 4) * 0.04 : -0.3;
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1) - 0.5;
    // The top slab leads, the others follow a beat later.
    const e = still ? 0.85 : fanAt(time / duration - (n - 1 - i) * 0.035);
    const a = e * k * 1.9;
    out[i * 4] = base + bob + i * (0.13 + e * open);
    out[i * 4 + 1] = Math.cos(a);
    out[i * 4 + 2] = Math.sin(a);
    out[i * 4 + 3] = e * k * 0.16;
  }
  return out;
}

/* ---------------- effect ---------------- */

const DEFAULT_COLORS = '#3a6bff,#5560ff,#7457ff,#9a5cf6';

export const loader3d: Effect = {
  name: 'loader-3d',
  meta: META['loader-3d'],
  mount(el, ctx) {
    const listed = (ctx.str('colors', DEFAULT_COLORS) || DEFAULT_COLORS)
      .split(/,(?![^(]*\))/)
      .map(parseColor)
      .filter((c): c is [number, number, number] => !!c);
    const colors = listed.length ? listed : (DEFAULT_COLORS.split(',').map(parseColor) as [number, number, number][]);
    const count = clamp(Math.round(ctx.num('count', listed.length > 1 ? listed.length : 4)), 1, MAX);
    const slabs = palette(colors, count);
    const base = parseColor(ctx.str('base', '#b2d6ff') || '#b2d6ff') || [178, 214, 255];
    const duration = Math.max(600, ctx.time('duration', 2800));
    const still = ctx.env.reduced;
    const offs: (() => void)[] = [];

    // Accessible as an indeterminate progress indicator, unless something around it
    // (a preloader, say) already is one.
    if (el.parentElement?.closest('[role="progressbar"], [data-fx~="preloader"], .fx-preloader')) {
      el.setAttribute('aria-hidden', 'true');
      offs.push(() => el.removeAttribute('aria-hidden'));
    } else if (!el.hasAttribute('role')) {
      el.setAttribute('role', 'progressbar');
      const label = !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby');
      if (label) el.setAttribute('aria-label', 'Loading');
      offs.push(() => {
        el.removeAttribute('role');
        if (label) el.removeAttribute('aria-label');
      });
    }

    const r = renderer();

    /* ---- CSS 3D version: no WebGL ---- */
    if (!r) {
      const scene = document.createElement('div');
      scene.className = 'fx-l3d-css';
      scene.setAttribute('aria-hidden', 'true');
      const plate = document.createElement('i');
      plate.className = 'fx-l3d-plate';
      plate.style.setProperty('--c', `rgb(${base.join(' ')})`);
      scene.append(plate);
      slabs.forEach((c, i) => {
        const s = document.createElement('i');
        s.className = 'fx-l3d-slab';
        s.style.setProperty('--i', String(i));
        s.style.setProperty('--k', String(count === 1 ? 0 : i / (count - 1) - 0.5));
        s.style.setProperty('--c', `rgb(${c.map(Math.round).join(' ')})`);
        scene.append(s);
      });
      el.append(scene);
      setState(el, 'ready css');
      return () => {
        offs.forEach((f) => f());
        scene.remove();
        setState(el, 'ready css', false);
      };
    }

    /* ---- WebGL version ---- */
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-l3d-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    el.append(canvas);
    const g = canvas.getContext('2d')!;
    const linSlabs = new Float32Array(MAX * 3);
    slabs.forEach((c, i) => linSlabs.set(toLinear(c), i * 3));
    const linBase = toLinear(base);

    let W = 0;
    let H = 0;
    const layout = () => {
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Small loaders render supersampled for smooth edges; large ones stay at screen resolution.
      const scale = rect.width * dpr <= 420 ? Math.min(2.5, dpr * 1.6) : Math.min(2, dpr);
      W = Math.max(1, Math.round(rect.width * scale));
      H = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
    };

    let time = 0;
    const draw = () => {
      if (!r.ok || !W || !H) return;
      const { gl, u } = r;
      if (r.canvas.width < W || r.canvas.height < H) {
        r.canvas.width = Math.max(r.canvas.width, W);
        r.canvas.height = Math.max(r.canvas.height, H);
      }
      gl.viewport(0, 0, W, H);
      gl.uniform2f(u.uRes, W, H);
      gl.uniform1i(u.uN, count);
      gl.uniform4fv(u.uSlab, poses(count, time, duration, still));
      gl.uniform3fv(u.uCol, linSlabs);
      gl.uniform3f(u.uBase, linBase[0], linBase[1], linBase[2]);
      gl.uniform1f(u.uPlateY, -0.56 + (still ? 0 : Math.sin((time / 1000) * 1.6 + 1) * 0.035));
      gl.uniform1f(u.uYaw, 0.66 + (still ? 0 : Math.sin((time / 1000) * 0.45) * 0.2));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      g.clearRect(0, 0, W, H);
      // The frame sits in the bottom-left corner of the shared canvas.
      g.drawImage(r.canvas, 0, r.canvas.height - H, W, H, 0, 0, W, H);
    };

    layout();
    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(el);

    let off: (() => void) | null = null;
    const offView = onView(el, (v) => {
      if (still) {
        if (v) draw();
        return;
      }
      if (v && !off)
        off = tick((_now, dt) => {
          time += dt;
          draw();
        });
      else if (!v && off) {
        off();
        off = null;
      }
    });
    setState(el, 'ready');
    (el as HTMLElement & { fxLoader?: unknown }).fxLoader = {
      /** Jump to a moment in the loop (ms) and draw it — handy for screenshots and tests. */
      seek(ms: number) {
        time = ms;
        draw();
      },
    };

    return () => {
      offView();
      off?.();
      ro.disconnect();
      canvas.remove();
      offs.forEach((f) => f());
      delete (el as HTMLElement & { fxLoader?: unknown }).fxLoader;
      setState(el, 'ready', false);
    };
  },
};

/* ---------------- loading(): show a loader while something loads ---------------- */

export interface LoadingOptions {
  /** Slab colours, as for data-fx-colors. */
  colors?: string;
  /** Loader size, e.g. "120px". */
  size?: string;
  /** Keep the loader up at least this long (ms), so it never just flickers. Default 500. */
  min?: number;
  /** Cover the target with a soft scrim instead of appending below its content. */
  overlay?: boolean;
  /** Accessible label. Default "Loading". */
  label?: string;
}

/**
 * Shows a 3D loader in `target` while `work` runs, marks the target aria-busy, then fades the
 * loader out and resolves with the work's result.
 *
 *   const posts = await lumafx.loading('#posts', fetch('/api/posts?page=2').then(r => r.json()));
 */
export async function loading<T>(target: Element | string, work: Promise<T> | (() => Promise<T>), opts: LoadingOptions = {}): Promise<T> {
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!host) return typeof work === 'function' ? work() : work;
  const box = document.createElement('div');
  box.className = 'fx-loading-box' + (opts.overlay ? ' fx-loading-overlay' : '');
  const l = document.createElement('div');
  l.setAttribute('data-fx', 'loader-3d');
  l.setAttribute('aria-label', opts.label || 'Loading');
  if (opts.colors) l.setAttribute('data-fx-colors', opts.colors);
  if (opts.size) l.style.setProperty('--fx-size', opts.size);
  box.append(l);
  host.append(box);
  host.setAttribute('aria-busy', 'true');
  const t0 = performance.now();
  try {
    return await (typeof work === 'function' ? work() : work);
  } finally {
    const wait = (opts.min ?? 500) - (performance.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    host.removeAttribute('aria-busy');
    const out = box.animate?.([{ opacity: 1 }, { opacity: 0, scale: 0.94 }], { duration: 260, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    await out?.finished.catch(() => {});
    box.remove();
  }
}
