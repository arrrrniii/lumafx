import { META } from '../meta';
import type { Effect } from '../core/types';
import { sleeper } from '../core/ticker';
import { damp, on, setState } from '../core/util';

const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision mediump float;
uniform sampler2D t;
uniform vec2 m;     // pointer, 0–1
uniform vec2 vel;   // pointer velocity
uniform float h;    // hover amount 0–1
uniform float time;
uniform float k;    // strength
uniform vec2 res;
uniform vec4 fit;   // object-fit: scale.xy, offset.zw
varying vec2 v;
void main(){
  vec2 asp = vec2(res.x / res.y, 1.0);
  vec2 d = (v - m) * asp;
  float r = length(d);
  vec2 dir = r > 0.0001 ? d / r : vec2(0.0);
  float lens = exp(-r * r * 18.0);
  float ring = sin(r * 40.0 - time * 5.0) * exp(-r * 5.5);
  vec2 off = dir * ring * 0.016 * k - dir * lens * 0.05 * k;
  off += vel * lens * 0.8;
  off = off / asp * h;
  vec2 uv = (v + off) * fit.xy + fit.zw;
  float sh = (0.002 + length(vel) * 0.18) * k * h * (lens + 0.3);
  vec4 c = texture2D(t, uv);
  c.r = texture2D(t, uv + vec2(sh, 0.0)).r;
  c.b = texture2D(t, uv - vec2(sh, 0.0)).b;
  gl_FragColor = c;
}`;

function program(gl: WebGLRenderingContext) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  return p;
}

export const ripple: Effect = {
  name: 'ripple',
  meta: META.ripple,
  mount(el, ctx) {
    let host = el;
    let img: HTMLImageElement | null = el instanceof HTMLImageElement ? el : el.querySelector('img');
    let wrapper: HTMLElement | null = null;
    // An <img> can't hold a canvas, so wrap it.
    if (el instanceof HTMLImageElement) {
      wrapper = document.createElement('span');
      wrapper.className = 'fx-ripple-wrap';
      el.replaceWith(wrapper);
      wrapper.append(el);
      host = wrapper;
    }
    const src = ctx.str('src');
    let ownImg = false;
    if (!img && src) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      ownImg = true;
    }
    const unwrap = () => {
      if (wrapper) {
        wrapper.replaceWith(el);
        wrapper = null;
      }
    };
    if (!img || ctx.env.reduced || ctx.env.lite || !ctx.env.finePointer) {
      setState(host, 'nogl');
      return () => {
        setState(host, 'nogl', false);
        unwrap();
      };
    }
    const image = img;
    const strength = ctx.num('strength', 1);
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-ripple-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.append(canvas);

    let gl: WebGLRenderingContext | null = null;
    let u: Record<string, WebGLUniformLocation | null> = {};
    let failed = false;
    const s = { h: 0, ht: 0, mx: 0.5, my: 0.5, tx: 0.5, ty: 0.5, vx: 0, vy: 0, time: 0 };

    const fail = () => {
      failed = true;
      setState(host, 'nogl');
      canvas.remove();
    };

    const init = () => {
      if (gl || failed) return !!gl;
      if (!image.complete || !image.naturalWidth) return false;
      try {
        gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
        if (!gl) throw new Error('no webgl');
        const p = program(gl);
        gl.useProgram(p);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(p, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // Throws a SecurityError for cross-origin images without CORS headers.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        for (const n of ['t', 'm', 'vel', 'h', 'time', 'k', 'res', 'fit']) u[n] = gl.getUniformLocation(p, n);
        setState(host, 'ready');
        return true;
      } catch (err) {
        console.warn('[lumafx] ripple: falling back to CSS', err);
        gl = null;
        fail();
        return false;
      }
    };

    const resize = () => {
      if (!gl) return;
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr));
      const hh = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== hh) {
        canvas.width = w;
        canvas.height = hh;
      }
      gl.viewport(0, 0, w, hh);
      // object-fit: cover (the default for images used this way) vs. stretch.
      const ea = r.width / r.height;
      const ia = image.naturalWidth / image.naturalHeight;
      const cover = getComputedStyle(image).objectFit !== 'fill' || ownImg;
      let sx = 1;
      let sy = 1;
      if (cover) {
        if (ia > ea) sx = ea / ia;
        else sy = ia / ea;
      }
      gl.uniform4f(u.fit, sx, sy, (1 - sx) / 2, (1 - sy) / 2);
      gl.uniform2f(u.res, r.width, r.height);
    };

    const loop = sleeper((_now, dt) => {
      if (!gl) return false;
      s.h = damp(s.h, s.ht, 5, dt);
      const px = s.mx;
      const py = s.my;
      s.mx = damp(s.mx, s.tx, 10, dt);
      s.my = damp(s.my, s.ty, 10, dt);
      s.vx = damp(s.vx, (s.mx - px) * 6, 8, dt);
      s.vy = damp(s.vy, (s.my - py) * 6, 8, dt);
      s.time += dt / 1000;
      setState(host, 'gl', s.h > 0.01);
      gl.uniform2f(u.m, s.mx, s.my);
      gl.uniform2f(u.vel, s.vx, s.vy);
      gl.uniform1f(u.h, s.h);
      gl.uniform1f(u.time, s.time);
      gl.uniform1f(u.k, strength);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return s.ht > 0 || s.h > 0.002;
    });

    const local = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      s.tx = (e.clientX - r.left) / r.width;
      s.ty = (e.clientY - r.top) / r.height;
    };

    const offs = [
      on(host, 'pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        if (!init()) {
          if (!failed) image.addEventListener('load', () => init(), { once: true });
          return;
        }
        resize();
        local(e);
        s.mx = s.tx;
        s.my = s.ty;
        s.ht = 1;
        loop.wake();
      }),
      on(host, 'pointermove', (e) => {
        if (!gl) return;
        local(e);
        loop.wake();
      }),
      on(host, 'pointerleave', () => {
        s.ht = 0;
        loop.wake();
      }),
    ];

    return () => {
      offs.forEach((f) => f());
      loop.stop();
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
      ['gl', 'ready', 'nogl'].forEach((t) => setState(host, t, false));
      unwrap();
    };
  },
};
