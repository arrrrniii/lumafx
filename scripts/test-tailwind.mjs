// Compiles a sample project with the real Tailwind v4 CLI and checks the generated CSS.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// Inside the project so `@import "tailwindcss"` resolves from node_modules.
fs.mkdirSync(path.join(root, 'test'), { recursive: true });
const dir = fs.mkdtempSync(path.join(root, 'test', '.tw-'));
const tw = path.join(root, 'dist/tailwind.css').replaceAll('\\', '/');

fs.writeFileSync(
  path.join(dir, 'input.css'),
  `@import "tailwindcss" source(none);\n@import "${tw}";\n@source "./index.html";\n`,
);
fs.writeFileSync(
  path.join(dir, 'index.html'),
  `<div class="fx-border-beam fx-duration-4000 fx-color-violet-500 fx-color2-cyan-400 fx-length-[30%] fx-width-2 rounded-2xl"></div>
   <nav class="fx-glass fx-blur-20 fx-tint-[rgb(255_255_255/.1)]"></nav>
   <section class="fx-reveal fx-from-left fx-delay-200"></section>
   <h1 class="fx-text-reveal fx-split-chars fx-style-flip fx-stagger-30">Hello</h1>
   <a class="fx-magnetic fx-strength-[0.5]"></a>
   <ul class="fx-stagger fx-stagger-[90ms]"></ul>
   <div class="fx-marquee fx-gap-8"></div>
   <div class="fx-squircle fx-radius-32"></div>`,
);

const out = path.join(dir, 'out.css');
const bin = path.join(root, 'node_modules/.bin/tailwindcss');
try {
  // --minify runs Lightning CSS like a production build (flattens nesting, lowers syntax).
  execFileSync(bin, ['-i', path.join(dir, 'input.css'), '-o', out, '--minify'], { cwd: dir, stdio: 'pipe' });
} catch (e) {
  console.error(String(e.stderr || e));
  process.exit(1);
}
const css = fs.readFileSync(out, 'utf8');

const checks = [
  ['border-beam utility', /\.fx-border-beam\{/],
  ['beam pseudo element', /\.fx-border-beam::?before/],
  ['zero-specificity structural rule', /:where\(\.fx-border-beam\)\{position:relative/],
  ['duration option (ms)', /\.fx-duration-4000\{--fx-duration:(calc\(4000 ?\* ?1ms\)|4s|4000ms)/],
  ['theme color option', /\.fx-color-violet-500\{--fx-color:var\(--color-violet-500\)/],
  ['second color option', /\.fx-color2-cyan-400\{--fx-color-2:var\(--color-cyan-400\)/],
  ['arbitrary length', /--fx-length:30%/],
  ['glass utility', /\.fx-glass\{[^}]*backdrop-filter/],
  ['reveal preset class', /\.fx-reveal:is\(\[data-fx-from=left\],\.fx-from-left\)/],
  ['reveal hidden state', /\.fx-ready \.fx-reveal:not\(\[data-fx-state~=in\]\)/],
  ['reduced-motion media query', /prefers-reduced-motion:\s*reduce/],
  ['forced reduced motion', /:root\[data-fx-reduced\] \.fx-border-beam/],
  ['enum option sets variable', /\.fx-split-chars\{--fx-split:chars/],
  ['text style option', /\.fx-style-flip\{--fx-style:flip/],
  ['arbitrary JS option', /--fx-strength:0?\.5/],
  ['spacing-scale gap', /\.fx-gap-8\{--fx-gap:calc\(var\(--spacing\) ?\* ?8\)/],
  ['squircle native corners', /corner-shape:squircle/],
  ['registered option properties', /@property --fx-duration/],
  ['keyframes', /@keyframes fx-spin/],
];
const notExpected = [
  ['unused effect is tree-shaken', /\.fx-aurora\{/],
  ['unused option is tree-shaken', /\.fx-opacity-/],
];

let failed = 0;
for (const [name, re] of checks) {
  const ok = re.test(css);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
}
for (const [name, re] of notExpected) {
  const ok = !re.test(css);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
}
console.log(`\nTailwind ${JSON.parse(fs.readFileSync(path.join(root, 'node_modules/tailwindcss/package.json'), 'utf8')).version} · output ${(css.length / 1024).toFixed(1)} KB · ${checks.length + notExpected.length - failed}/${checks.length + notExpected.length} checks passed`);
if (failed) {
  fs.copyFileSync(out, path.join(root, 'test/.tailwind-out.css'));
  console.log('Output saved to test/.tailwind-out.css');
  process.exit(1);
}
fs.rmSync(dir, { recursive: true, force: true });
