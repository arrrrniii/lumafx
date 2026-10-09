import { META } from '../meta';
import type { Effect } from '../core/types';
import { setState, clamp } from '../core/util';
import { tick } from '../core/ticker';
import { onView } from '../core/view';

/* ======================================================================
   loader-3d · glossy 3D panels over a floating plate.

   Two scenes share one shader:
   - pages (default): upright panels hinged like the pages of a book. They
     sit in a deck, fan open, spread into a ring, then fold back.
   - stack: flat tiles that fan apart around a corner.

   The scene is ray-marched in one fragment shader: rounded slabs as signed
   distance fields, soft shadows, ambient occlusion, a studio environment for
   the reflections and a soft contact shadow under the plate. Each slab is
   placed with a world-to-local matrix computed on the CPU. One WebGL context
   is shared by every loader on the page (browsers cap contexts), and each
   loader copies its frame into its own 2D canvas.
   ====================================================================== */

const MAX = 6;

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform int uN;
uniform int uMode;            // 0 pages, 1 stack
uniform vec4 uM[${MAX * 3}];  // world -> slab space, three rows per slab
uniform vec3 uCol[${MAX}];    // linear colours
uniform vec3 uBase;
uniform vec3 uSize;           // slab half extents: profile x, profile y, thickness
uniform vec2 uRound;          // profile corner radius, edge radius
uniform vec4 uPlate;          // half x, half z, half thickness, y
uniform vec2 uPlateR;
uniform vec4 uCam;            // yaw, height, distance, focal length
uniform vec3 uTarget;
uniform vec4 uBound;          // bounding sphere
uniform float uGround;

// A rounded rectangle in the xy plane, extruded along z, with rounded edges.
float slab(vec3 p, vec3 b, float rc, float re) {
  vec2 q = abs(p.xy) - b.xy + rc;
  float d2 = min(max(q.x, q.y), 0.) + length(max(q, 0.)) - rc;
  vec2 w = vec2(d2 + re, abs(p.z) - b.z + re);
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - re;
}

float plateD(vec3 p) {
  vec3 q = p - vec3(0., uPlate.w, 0.);
  return slab(vec3(q.x, q.z, q.y), uPlate.xyz, uPlateR.x, uPlateR.y);
}

vec2 map(vec3 p) {
  vec2 res = vec2(plateD(p), 0.);
  vec4 P = vec4(p, 1.);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    vec3 q = vec3(dot(uM[i * 3], P), dot(uM[i * 3 + 1], P), dot(uM[i * 3 + 2], P));
    float d = slab(q, uSize, uRound.x, uRound.y);
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

// Bright studio for the stack.
vec3 envStudio(vec3 d) {
  float y = d.y;
  vec3 c = mix(vec3(.18, .2, .34), vec3(.62, .66, .86), smoothstep(-.45, .1, y));
  c = mix(c, vec3(.92, .94, 1.), smoothstep(.1, .95, y));
  c += vec3(3.2, 3.15, 3.) * softbox(d, normalize(vec3(-.55, .78, .32)), vec3(0., 1., 0.), vec2(.42, .26), .1);
  c += vec3(1.3, 1.4, 1.8) * softbox(d, normalize(vec3(.85, .3, -.3)), vec3(0., 1., 0.), vec2(.9, .05), .05);
  c += vec3(.9, .8, 1.3) * softbox(d, normalize(vec3(.2, .25, .95)), vec3(0., 1., 0.), vec2(.7, .04), .06);
  return c;
}

// Dark stage with coloured lights for the pages: lavender key, magenta side light,
// cyan bounce from the plate below, and soft cloudy variation for iridescent reflections.
vec3 envStage(vec3 d) {
  vec3 c = vec3(.006, .005, .02);
  c += vec3(1.5, 1.4, 2.4) * softbox(d, normalize(vec3(-.45, .75, .55)), vec3(0., 1., 0.), vec2(.55, .4), .35);
  c += vec3(2.6, .55, 1.7) * softbox(d, normalize(vec3(.95, .15, -.25)), vec3(0., 1., 0.), vec2(.35, .7), .4);
  c += vec3(.9, .7, 2.2) * softbox(d, normalize(vec3(-.9, .1, -.4)), vec3(0., 1., 0.), vec2(.3, .8), .4);
  c += vec3(.45, 1.1, 1.5) * smoothstep(-.15, -.85, d.y);
  // A cloudy pink-white glow in front, behind the viewer: faces turned to the camera pick it up.
  float cloud = sin(d.x * 9.3 + 1.7) * sin(d.y * 7.1 - d.x * 3.) * sin(d.z * 5.7 + d.y * 4.) * .5 + .5;
  c += mix(vec3(.9, .35, 1.1), vec3(1.4, 1.3, 1.6), cloud) * softbox(d, normalize(vec3(.5, .2, .85)), vec3(0., 1., 0.), vec2(.8, .55), .6) * (.18 + .62 * cloud);
  float n = sin(d.x * 6.1 + d.y * 2.7) * sin(d.y * 4.3 - d.z * 5.2) * .5 + .5;
  return c * (.7 + .6 * n);
}

vec3 env(vec3 d) {
  return uMode == 0 ? envStage(d) : envStudio(d);
}

vec3 albedo(float id, vec3 p, out vec3 q, out vec3 axis) {
  q = p;
  axis = vec3(0., 1., 0.);
  if (id < .5) return uBase;
  vec3 c = uCol[0];
  vec4 P = vec4(p, 1.);
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    if (abs(id - float(i + 1)) < .5) {
      c = uCol[i];
      q = vec3(dot(uM[i * 3], P), dot(uM[i * 3 + 1], P), dot(uM[i * 3 + 2], P));
      axis = uM[i * 3 + 2].xyz;
    }
  }
  vec2 u = q.xy / uSize.xy;
  // Pages: lighter towards the lower left. Stack: a gentle diagonal.
  return uMode == 0 ? c * (.4 + 1.1 * clamp(.5 - .45 * u.y - .3 * u.x, 0., 1.)) : c * (.86 + .3 * clamp(.5 + .275 * (q.y - q.x), 0., 1.));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 ro = vec3(sin(uCam.x) * uCam.z, uCam.y, cos(uCam.x) * uCam.z);
  vec3 ww = normalize(uTarget - ro);
  vec3 uu = normalize(cross(ww, vec3(0., 1., 0.)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + uCam.w * ww);

  vec3 col = vec3(0.);
  float alpha = 0.;

  // Bounding sphere around everything that can be hit.
  vec3 oc = ro - uBound.xyz;
  float b = dot(oc, rd);
  float disc = b * b - (dot(oc, oc) - uBound.w * uBound.w);
  bool hit = false;
  float t = 0.;
  vec2 h = vec2(1., 0.);
  if (disc > 0.) {
    float sq = sqrt(disc);
    t = max(0., -b - sq);
    float tmax = -b + sq;
    for (int i = 0; i < 120; i++) {
      h = map(ro + rd * t);
      if (h.x < .0006 * t) { hit = true; break; }
      t += h.x * .9;
      if (t > tmax) break;
    }
  }

  bool stage = uMode == 0;
  vec3 L = stage ? normalize(vec3(-.5, .8, .6)) : normalize(vec3(-.55, .9, .42));
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normal(p);
    vec3 v = -rd;
    vec3 q, axis;
    vec3 a = albedo(h.y, p, q, axis);
    float occ = occlusion(p, n);
    float sha = shadow(p + n * .004, L);
    float ndl = dot(n, L);
    float wrap = clamp(ndl * .5 + .5, 0., 1.);
    float nv = clamp(dot(n, v), 0., 1.);
    float fre = pow(1. - nv, 5.);
    vec3 r = reflect(rd, n);
    vec3 hv = normalize(L + v);
    bool plate = h.y < .5;

    if (stage) {
      if (plate) {
        // Pale glass-blue plate: bright top, darker sides, nearly black underneath.
        float top = smoothstep(.2, .9, n.y);
        float under = smoothstep(.2, .9, -n.y);
        vec3 dif = a * mix(.32, .9 + .25 * wrap, top) * mix(1., .08, under) * mix(.6, 1., occ);
        float rs = shadow(p + n * .01, r);
        vec3 spec = env(r) * (.04 + .5 * fre) * mix(.35, 1., rs) * top;
        spec += vec3(1.) * pow(clamp(dot(n, hv), 0., 1.), 70.) * .6 * sha * top;
        col = dif + spec;
      } else {
        // Deep glossy panels: low diffuse, strong coat, edges that catch the light.
        vec3 dif = a * (.04 + .32 * clamp(ndl, 0., 1.) * mix(.3, 1., sha)) * occ;
        dif += a * vec3(.55, .85, 1.25) * smoothstep(.1, .9, -n.y) * 1.4;   // light bouncing up from the plate
        dif += a * vec3(.5, .45, 1.) * pow(1. - nv, 2.5) * .9 * occ;       // lavender rim
        vec3 spec = env(r) * (.1 + .9 * fre) * mix(.4, 1., occ);
        spec += vec3(1.) * pow(clamp(dot(n, hv), 0., 1.), 160.) * 2. * sha;
        // Thin bright rims where the rounded edges turn away from the faces.
        float edge = 1. - smoothstep(.35, .8, abs(dot(n, axis)));
        spec += vec3(.62, .6, 1.25) * edge * .35;
        col = dif + spec;
      }
    } else {
      vec3 dif = a * (.16 + .84 * wrap * mix(.42, 1., sha)) * mix(.55, 1., occ);
      dif += a * a * .5 * clamp(n.y * .5 + .5, 0., 1.) * occ;
      dif += a * .55 * pow(clamp(1. - nv, 0., 1.), 2.) * occ;
      float coat = plate ? .05 + .6 * fre : .045 + .9 * fre;
      vec3 spec = env(r) * coat * mix(.35, 1., occ);
      if (plate) {
        float rs = shadow(p + n * .01, r);
        spec *= mix(.45, 1., rs);
        dif += vec3(.05, .07, .12) * (1. - rs);
      }
      spec += vec3(1.) * pow(clamp(dot(n, hv), 0., 1.), plate ? 60. : 140.) * (plate ? .8 : 2.2) * sha;
      col = dif + spec;
    }
    alpha = 1.;
  }

  // Soft contact shadow on an invisible floor, so the plate looks like it floats.
  if (!hit && rd.y < 0.) {
    float tg = (uGround - ro.y) / rd.y;
    vec3 g = ro + rd * tg;
    vec2 q = abs(g.xz) - uPlate.xy + uPlateR.x;
    float d2 = min(max(q.x, q.y), 0.) + length(max(q, 0.)) - uPlateR.x;
    float lift = uPlate.w - uGround;
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
  for (const n of ['uRes', 'uN', 'uMode', 'uM', 'uCol', 'uBase', 'uSize', 'uRound', 'uPlate', 'uPlateR', 'uCam', 'uTarget', 'uBound', 'uGround']) r.u[n] = gl.getUniformLocation(p, n);
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

/* ---------------- slab placement (world -> slab space) ---------------- */

/** A 3×4 affine matrix, row by row. */
type Affine = number[];
const T = (x: number, y: number, z: number): Affine => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
/** A∘B: apply B, then A. */
function mul(A: Affine, B: Affine): Affine {
  const o = new Array(12);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) o[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c] + (c === 3 ? A[r * 4 + 3] : 0);
  return o;
}

const PIVOT = [-0.36, -0.36];

/** Stack scene: the flat tiles' matrices from their poses (profile in xy, thickness along z). */
export function stackMatrices(n: number, time: number, duration: number, still = false) {
  const ps = poses(n, time, duration, still);
  const out = new Float32Array(MAX * 12);
  for (let i = 0; i < n; i++) {
    const [y, c, s, tilt] = [ps[i * 4], ps[i * 4 + 1], ps[i * 4 + 2], ps[i * 4 + 3]];
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    let m = T(0, -y, 0);
    m = mul(T(-PIVOT[0], 0, -PIVOT[1]), m);
    m = mul([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0], m);
    m = mul(T(PIVOT[0], 0, PIVOT[1]), m);
    m = mul([1, 0, 0, 0, 0, ct, -st, 0, 0, st, ct, 0], m);
    m = mul([1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0], m); // tiles lie flat: thickness is world y
    out.set(m, i * 12);
  }
  return out;
}

const smooth01 = (t: number) => easeInOut(Math.min(1, Math.max(0, t)));

export interface PageState {
  /** Angle of each panel around the hinge, radians. */
  angles: number[];
  /** 0 = closed deck, 1 = open (fan or ring). */
  open: number;
}

/**
 * Pages scene over one cycle: a closed deck fans open like a book, spreads into a full ring
 * that turns by one slot, then folds straight back into the deck.
 */
export function pageState(n: number, p: number, still = false): PageState {
  const fan = 0.55;
  const ring = (Math.PI * 2) / Math.max(1, n);
  if (still) return { angles: Array.from({ length: n }, (_, i) => i * fan * 0.9), open: 1 };
  p = ((p % 1) + 1) % 1;
  const spin = ring * smooth01((p - 0.34) / 0.6);
  const angles: number[] = [];
  let open = 0;
  for (let i = 0; i < n; i++) {
    const fanA = i * fan;
    const ringA = i * ring + spin;
    let a = 0;
    if (p < 0.08) a = 0;
    else if (p < 0.34) {
      // Pages leave the deck one after another.
      const k = smooth01((p - 0.08 - i * 0.012) / 0.24);
      a = fanA * k;
      open = smooth01((p - 0.08) / 0.24);
    } else if (p < 0.52) {
      a = fanA + (ringA - fanA) * smooth01((p - 0.34) / 0.18);
      open = 1;
    } else if (p < 0.7) {
      a = ringA;
      open = 1;
    } else if (p < 0.94) {
      const k = smooth01((p - 0.7) / 0.24);
      a = ringA * (1 - k);
      open = 1 - k;
    }
    angles.push(a);
  }
  return { angles, open };
}

export const PAGE = { halfW: 0.42, halfH: 0.5, halfT: 0.032, hinge: 0.05, centerY: 0.2 };

/** Pages scene: panel matrices for a moment in the loop, centred on the plate. */
export function pageMatrices(n: number, time: number, duration: number, still = false) {
  const { angles, open } = pageState(n, time / duration, still);
  const bob = still ? 0 : Math.sin((time / 1000) * 1.9) * 0.03;
  const deck = 1 - open;
  // The hinge is the panels' right edge; pages swing back and out to the right.
  const C = angles.map((_, i) => [
    -(PAGE.hinge + PAGE.halfW) + 0.05 * i * deck,
    PAGE.centerY + bob + 0.035 * i * deck,
    -(2 * PAGE.halfT + 0.03) * i * deck,
  ]);
  // Centre the group so the deck, the fan and the ring all sit in the middle of the plate.
  let gx = 0;
  let gz = 0;
  const turn = angles.map((a) => -a);
  turn.forEach((a, i) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    gx += C[i][0] * c + C[i][2] * s;
    gz += -C[i][0] * s + C[i][2] * c;
  });
  gx /= Math.max(1, n);
  gz /= Math.max(1, n);
  const out = new Float32Array(MAX * 12);
  turn.forEach((a, i) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const [cx, cy, cz] = C[i];
    out.set([c, 0, -s, c * gx - s * gz - cx, 0, 1, 0, -cy, s, 0, c, s * gx + c * gz - cz], i * 12);
  });
  return out;
}

interface Scene {
  size: [number, number, number];
  round: [number, number];
  plate: [number, number, number];
  plateR: [number, number];
  plateY: number;
  cam: [number, number, number, number];
  target: [number, number, number];
  bound: [number, number, number, number];
  ground: number;
}

const SCENES: Record<'pages' | 'stack', Scene> = {
  pages: {
    size: [PAGE.halfW, PAGE.halfH, PAGE.halfT],
    round: [0.075, 0.022],
    plate: [0.7, 0.7, 0.032],
    plateR: [0.06, 0.018],
    plateY: -0.58,
    cam: [0.55, -0.38, 5.4, 2.3],
    target: [0, 0.02, 0],
    bound: [0, 0, 0, 1.6],
    ground: -0.88,
  },
  stack: {
    size: [0.5, 0.5, 0.058],
    round: [0.17, 0.05],
    plate: [0.76, 0.76, 0.05],
    plateR: [0.27, 0.05],
    plateY: -0.56,
    cam: [0.66, 2.7, 5.2, 2.45],
    target: [-0.1, -0.2, -0.06],
    bound: [0, -0.15, 0, 2.1],
    ground: -0.74,
  },
};

/* ---------------- effect ---------------- */

const DEFAULT_COLORS = '#3a6bff,#5560ff,#7457ff,#9a5cf6';
const DEFAULT_PAGES = '#2b26c9,#3326c8,#3d25c5,#4925c1,#5726bd';

export const loader3d: Effect = {
  name: 'loader-3d',
  meta: META['loader-3d'],
  mount(el, ctx) {
    const mode: 'pages' | 'stack' = ctx.str('style', 'pages') === 'stack' ? 'stack' : 'pages';
    const fallback = mode === 'pages' ? DEFAULT_PAGES : DEFAULT_COLORS;
    const listed = (ctx.str('colors', fallback) || fallback)
      .split(/,(?![^(]*\))/)
      .map(parseColor)
      .filter((c): c is [number, number, number] => !!c);
    const colors = listed.length ? listed : (fallback.split(',').map(parseColor) as [number, number, number][]);
    const count = clamp(Math.round(ctx.num('count', listed.length > 1 ? listed.length : mode === 'pages' ? 5 : 4)), 1, MAX);
    const slabs = palette(colors, count);
    const baseDefault = mode === 'pages' ? '#a6d8ea' : '#b2d6ff';
    const base = parseColor(ctx.str('base', baseDefault) || baseDefault) || [166, 216, 234];
    const duration = Math.max(600, ctx.time('duration', mode === 'pages' ? 3600 : 2800));
    const scene = SCENES[mode];
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
      const box = document.createElement('div');
      box.className = 'fx-l3d-css' + (mode === 'pages' ? ' fx-l3d-pages' : '');
      box.setAttribute('aria-hidden', 'true');
      box.style.setProperty('--n', String(count));
      const plate = document.createElement('i');
      plate.className = 'fx-l3d-plate';
      plate.style.setProperty('--c', `rgb(${base.join(' ')})`);
      box.append(plate);
      slabs.forEach((c, i) => {
        const s = document.createElement('i');
        s.className = 'fx-l3d-slab';
        s.style.setProperty('--i', String(i));
        s.style.setProperty('--k', String(count === 1 ? 0 : i / (count - 1) - 0.5));
        s.style.setProperty('--c', `rgb(${c.map(Math.round).join(' ')})`);
        box.append(s);
      });
      el.append(box);
      setState(el, 'ready css');
      return () => {
        offs.forEach((f) => f());
        box.remove();
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
    // Drops resolution step by step if the device cannot keep up.
    let quality = 1;
    let ema = 16.7;
    let frames = 0;
    const layout = () => {
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Small loaders render supersampled for smooth edges; large ones stay at screen resolution.
      const scale = (rect.width * dpr <= 420 ? Math.min(2.5, dpr * 1.6) : Math.min(2, dpr)) * quality;
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
      const sc = scene;
      const sway = still ? 0 : Math.sin((time / 1000) * 0.45) * (mode === 'pages' ? 0.14 : 0.2);
      const float = still ? 0 : Math.sin((time / 1000) * 1.6 + 1) * 0.035;
      gl.uniform1i(u.uN, count);
      gl.uniform1i(u.uMode, mode === 'pages' ? 0 : 1);
      gl.uniform4fv(u.uM, mode === 'pages' ? pageMatrices(count, time, duration, still) : stackMatrices(count, time, duration, still));
      gl.uniform3fv(u.uCol, linSlabs);
      gl.uniform3f(u.uBase, linBase[0], linBase[1], linBase[2]);
      gl.uniform3f(u.uSize, sc.size[0], sc.size[1], sc.size[2]);
      gl.uniform2f(u.uRound, sc.round[0], sc.round[1]);
      gl.uniform4f(u.uPlate, sc.plate[0], sc.plate[1], sc.plate[2], sc.plateY + float);
      gl.uniform2f(u.uPlateR, sc.plateR[0], sc.plateR[1]);
      gl.uniform4f(u.uCam, sc.cam[0] + sway, sc.cam[1], sc.cam[2], sc.cam[3]);
      gl.uniform3f(u.uTarget, sc.target[0], sc.target[1], sc.target[2]);
      gl.uniform4f(u.uBound, sc.bound[0], sc.bound[1], sc.bound[2], sc.bound[3]);
      gl.uniform1f(u.uGround, sc.ground);
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
          ema = ema * 0.92 + dt * 0.08;
          if (++frames > 8 && ema > 30 && quality > 0.4) {
            quality = Math.max(0.4, quality * (ema > 80 ? 0.6 : 0.8));
            frames = 0;
            layout();
          }
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
