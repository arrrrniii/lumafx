// Builds JS (ESM + CDN), CSS (plain + Tailwind v4), metadata (effects.json, llms.txt) and types.
import { build, transform } from 'esbuild';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const define = { __VERSION__: JSON.stringify(pkg.version) };

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// ---------- metadata (bundle meta.ts so this script can read it) ----------
const metaOut = path.join(dist, '.meta.mjs');
await build({ entryPoints: [path.join(root, 'src/meta.ts')], bundle: true, format: 'esm', outfile: metaOut, logLevel: 'error' });
const { META, EFFECT_NAMES } = await import(metaOut + '?t=' + Date.now());
fs.rmSync(metaOut);

// The runtime only needs option types/defaults; descriptions live in effects.json and llms.txt.
const slim = Object.fromEntries(
  Object.entries(META).map(([n, m]) => [
    n,
    {
      name: n,
      kind: m.kind,
      ...(m.loop ? { loop: true } : {}),
      options: Object.fromEntries(
        Object.entries(m.options).map(([k, o]) => [
          k,
          Object.fromEntries(Object.entries({ type: o.type, css: o.css, default: o.default, values: o.values }).filter(([, v]) => v !== undefined)),
        ]),
      ),
    },
  ]),
);
const slimSource = `export const META = ${JSON.stringify(slim)};
export const EFFECT_NAMES = ${JSON.stringify(EFFECT_NAMES)};
export function optionAttributes() { const s = new Set(); for (const m of Object.values(META)) for (const k of Object.keys(m.options)) s.add('data-fx-' + k); return [...s]; }
export function cssOptionKeys() { const s = new Set(); for (const m of Object.values(META)) for (const [k, o] of Object.entries(m.options)) if (o.css) s.add(k); return [...s].sort(); }`;
const slimMeta = {
  name: 'slim-meta',
  setup(b) {
    b.onLoad({ filter: /src[\\/]meta\.ts$/ }, () => ({ contents: slimSource, loader: 'js' }));
  },
};

// ---------- JavaScript ----------
await build({
  entryPoints: {
    index: 'src/index.ts',
    core: 'src/core.ts',
    auto: 'src/auto.ts',
    // Isomorphic validation (no DOM): the same rules in route handlers and server actions.
    forms: 'src/forms/core.ts',
  },
  absWorkingDir: root,
  outdir: dist,
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2020',
  outExtension: { '.js': '.mjs' },
  chunkNames: 'chunks/[name]-[hash]',
  define,
  plugins: [slimMeta],
  logLevel: 'warning',
});

await build({
  entryPoints: ['src/global.ts'],
  absWorkingDir: root,
  outfile: path.join(dist, 'lumafx.global.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  define,
  legalComments: 'none',
  banner: { js: `/*! lumafx v${pkg.version} | MIT */` },
  plugins: [slimMeta],
  logLevel: 'warning',
});

// React: components are server-safe; the runtime island is a client component that imports the package itself.
await build({
  entryPoints: { 'react/index': 'src/react/index.ts' },
  absWorkingDir: root,
  outdir: dist,
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outExtension: { '.js': '.mjs' },
  external: ['react', 'react/*', 'lumafx'],
  plugins: [slimMeta],
  logLevel: 'warning',
});
await build({
  entryPoints: { 'react/runtime': 'src/react/runtime.ts' },
  absWorkingDir: root,
  outdir: dist,
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outExtension: { '.js': '.mjs' },
  external: ['react', 'react/*', 'lumafx'],
  banner: { js: "'use client';" },
  logLevel: 'warning',
});

// ---------- CSS ----------
function blockAt(src, start) {
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return { open, close: i, body: src.slice(open + 1, i) };
  }
  throw new Error('Unbalanced braces near ' + src.slice(start, start + 40));
}

const MACROS = {
  '@fx-reduced': (b) => `@media (prefers-reduced-motion: reduce) {${b}}\n:root[data-fx-reduced] & {${b}}`,
  '@fx-sda': (b) => `@supports (animation-timeline: view()) { :root:not([data-fx-nosda]) & {${b}} }`,
  '@fx-cs': (b) => `@supports (corner-shape: squircle) { :root:not([data-fx-nocs]) & {${b}} }`,
};

function expandMacros(css) {
  let out = css;
  for (const [name, fn] of Object.entries(MACROS)) {
    let i;
    while ((i = out.indexOf(name)) !== -1) {
      const { close, body } = blockAt(out, i);
      out = out.slice(0, i) + fn(expandMacros(body)) + out.slice(close + 1);
    }
  }
  return out;
}

const allKeys = [...new Set(Object.values(META).flatMap((m) => Object.keys(m.options)))].sort();
const optionProps = allKeys.map((k) => `@property --fx-${k} { syntax: "*"; inherits: false; }`).join('\n');
const base = fs.readFileSync(path.join(root, 'src/css/base.css'), 'utf8').replace('/*__OPTION_PROPERTIES__*/', optionProps);

const bodies = EFFECT_NAMES.map((name) => {
  const file = path.join(root, 'src/css/effects', name + '.css');
  if (!fs.existsSync(file)) throw new Error('Missing CSS for effect ' + name);
  // `@fx-include "other.css";` shares one body between effects (drawer reuses the modal's styles).
  const src = fs
    .readFileSync(file, 'utf8')
    .replace(/@fx-include "([\w.-]+)";/g, (_, f) => fs.readFileSync(path.join(root, 'src/css/effects', f), 'utf8'));
  return { name, body: expandMacros(src) };
});

const header = `/*! lumafx v${pkg.version} | MIT */\n`;
const plainSrc =
  base +
  '\n' +
  bodies.map(({ name, body }) => `:where([data-fx~="${name}"], .fx-${name}) {\n${body}\n}`).join('\n\n');

// Lower native nesting so the stylesheet works in browsers from 2022 onward.
const targets = ['chrome105', 'safari15.4', 'firefox110'];
const plain = await transform(plainSrc, { loader: 'css', minify: true, target: targets, legalComments: 'none' });
fs.writeFileSync(path.join(dist, 'lumafx.css'), header + plain.code);
const readable = await transform(plainSrc, { loader: 'css', minify: false, target: targets });
fs.writeFileSync(path.join(dist, 'lumafx.dev.css'), header + readable.code);

const twSrc =
  `/*! lumafx v${pkg.version} for Tailwind CSS v4 | MIT\n   @import "lumafx/tailwind.css";  then use fx-border-beam, fx-glass, fx-reveal … */\n` +
  base +
  '\n' +
  bodies.map(({ name, body }) => `@utility fx-${name} {\n${body}\n}`).join('\n\n') +
  '\n\n' +
  fs.readFileSync(path.join(root, 'src/css/tailwind-options.css'), 'utf8');
fs.writeFileSync(path.join(dist, 'tailwind.css'), twSrc);

fs.writeFileSync(
  path.join(dist, 'transitions.css'),
  `/*! lumafx page transitions: animate between pages of a multi-page site.\n   Pick a preset with <html data-fx-transition="slide | slide-back | zoom | wipe | fade">. */\n@view-transition { navigation: auto; }\n`,
);

for (const w of plain.warnings ?? []) console.warn('css:', w.text);

// ---------- effects.json + llms.txt ----------
fs.writeFileSync(path.join(dist, 'effects.json'), JSON.stringify({ version: pkg.version, effects: META }, null, 2));

const optLine = (k, o) => {
  const def = o.default === undefined || o.default === '' ? '' : ` (default: ${o.default})`;
  const vals = o.values ? ` One of: ${o.values.join(', ')}.` : '';
  return `  - data-fx-${k}: ${o.type}${def}. ${o.desc}${vals}`;
};
const llms = [
  `# lumafx ${pkg.version}`,
  '',
  '> Premium web effects and animated components from one HTML attribute. Framework-agnostic, zero dependencies, CSS-first, accessible by default. MIT, free forever.',
  '',
  '## Usage',
  '- Plain HTML: <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lumafx/dist/lumafx.css"> and <script src="https://cdn.jsdelivr.net/npm/lumafx/dist/lumafx.global.js"></script> in <head>.',
  '- npm: `import "lumafx/css"; import "lumafx/auto";` (or `import { start } from "lumafx"; start();`).',
  '- Tailwind v4: `@import "lumafx/tailwind.css";` then classes like `fx-border-beam fx-duration-4000 fx-color-violet-500`.',
  '- React/Next.js: `import { BorderBeam, TextReveal } from "lumafx/react"` (Server Component safe) plus `<FxRuntime />` from "lumafx/react/runtime" once in the layout.',
  '- WordPress: the lumafx plugin adds an Effects panel to every block (stored as a block attribute, rendered as data-fx attributes) and site-wide settings for page transitions, preloader, scrollbar, chat, smart header. Page builders: add fx-<name> classes.',
  '- Modal: <dialog id="x" data-fx="modal"> opened by data-fx-open="#x", a link to #x, or lumafx.modals.open("#x"); close with data-fx-close or Esc.',
  '- Chat: listen for fx:chat-send (detail.text) on the element and answer with el.fxChat.reply(text).',
  '- Add an effect: data-fx="name" (several: data-fx="tilt spotlight"), or class="fx-name".',
  '- Options: data-fx-<option>="value". Bare numbers: time = ms, length = px, percent = %.',
  '- Every effect respects prefers-reduced-motion. Content is never left hidden if JavaScript fails.',
  '- Combine freely. Pseudo-elements in use: border-beam ::before, shine ::after, aurora ::before and ::after, dapple ::after, hover-icon ::before/::after. Avoid combining effects that use the same pseudo-element.',
  '',
  '## Effects',
  '',
  ...Object.values(META).flatMap((m) => [
    `### ${m.name} — ${m.title} [${m.kind}]`,
    m.desc,
    `Example: ${m.example}`,
    ...(Object.keys(m.options).length ? ['Options:', ...Object.entries(m.options).map(([k, o]) => optLine(k, o))] : []),
    '',
  ]),
  '## JavaScript API',
  '- start(options?) · stop() · refresh() · mount(root) · stats() · register(effect)',
  '- transition(update, { preset }) — runs a DOM update inside a View Transition (presets: fade, slide, slide-back, zoom, wipe).',
  '- page.cover(x?, y?) / page.reveal() — play the page-transition cover in single-page apps.',
  '- modals.open(target) / modals.close(target).',
  '- Events: fx:loaded (preloader done), fx:open / fx:close (modal), fx:chat-send / fx:chat-open (chat).',
  '- start({ motion: "reduce" }) forces reduced motion; start({ features: { sda: false } }) tests fallbacks.',
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'llms.txt'), llms);

// ---------- types ----------
execSync('npx tsc -p tsconfig.json', { cwd: root, stdio: 'inherit' });

// ---------- size report ----------
const sizes = ['lumafx.global.js', 'lumafx.css', 'index.mjs', 'react/index.mjs', 'react/runtime.mjs'].map((f) => {
  const buf = fs.readFileSync(path.join(dist, f));
  return `${f.padEnd(20)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB  ${(gzipSync(buf, { level: 9 }).length / 1024).toFixed(1).padStart(5)} KB gzip`;
});
console.log('\n' + sizes.join('\n'));

// ---------- demo ----------
// demo/page.html is the artifact body; demo/index.html wraps it in a full document for local testing.
const demoDir = path.join(root, 'demo');
if (fs.existsSync(path.join(demoDir, 'page.html'))) {
  const gz = (f) => (gzipSync(fs.readFileSync(path.join(dist, f)), { level: 9 }).length / 1024).toFixed(1) + ' KB';
  fs.copyFileSync(path.join(dist, 'lumafx.css'), path.join(demoDir, 'lumafx.css'));
  fs.copyFileSync(path.join(dist, 'lumafx.global.js'), path.join(demoDir, 'lumafx.global.js'));
  const page = fs
    .readFileSync(path.join(demoDir, 'page.html'), 'utf8')
    .replace('__JS_GZ__', gz('lumafx.global.js'))
    .replace('__CSS_GZ__', gz('lumafx.css'));
  fs.writeFileSync(path.join(demoDir, 'artifact.html'), page);
  fs.writeFileSync(
    path.join(demoDir, 'index.html'),
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}\n</body>\n</html>\n`,
  );
}

// ---------- WordPress plugin ----------
// The plugin ships the same files as the CDN build, plus effects.json for its editor panel.
const wpDir = path.join(root, 'wordpress', 'lumafx');
if (fs.existsSync(wpDir)) {
  const assets = path.join(wpDir, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  for (const f of ['lumafx.css', 'lumafx.global.js', 'effects.json']) fs.copyFileSync(path.join(dist, f), path.join(assets, f));
  const zip = path.join(dist, 'lumafx-wordpress.zip');
  try {
    execSync(`zip -qr ${JSON.stringify(zip)} lumafx -x '*.DS_Store'`, { cwd: path.join(root, 'wordpress') });
    console.log('wordpress plugin   ' + (fs.statSync(zip).size / 1024).toFixed(1) + ' KB zip');
  } catch {
    console.warn('zip not available: skipped dist/lumafx-wordpress.zip');
  }
}

// ---------- README effects table ----------
const readmePath = path.join(root, 'README.md');
if (fs.existsSync(readmePath)) {
  const kindLabel = { css: 'CSS', js: 'JS', hybrid: 'CSS + JS', webgl: 'WebGL' };
  const rows = Object.values(META).map((m) => {
    const opts = Object.keys(m.options).map((k) => '`' + k + '`').join(', ') || '—';
    return `| \`${m.name}\` | ${kindLabel[m.kind]} | ${m.desc} | ${opts} |`;
  });
  const table = ['| Effect | Runs on | What it does | Options |', '|---|---|---|---|', ...rows].join('\n');
  const readme = fs.readFileSync(readmePath, 'utf8');
  fs.writeFileSync(readmePath, readme.replace(/<!-- effects:start -->[\s\S]*<!-- effects:end -->/, `<!-- effects:start -->\n${table}\n<!-- effects:end -->`));
}
