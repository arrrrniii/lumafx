// Builds lumafx-mcp: the view (one HTML file with the renderer and CSS inlined) and the server.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm, chmod } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

// 1. The view.
const js = await build({
  entryPoints: ['src/view.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  write: false,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const css = await build({ entryPoints: ['../src/css/ui.css'], bundle: true, minify: true, write: false, loader: { '.css': 'css' } });
const template = await readFile('src/view.html', 'utf8');
const html = template
  .replace('/*CSS*/', () => css.outputFiles[0].text.replace(/<\/style/gi, '<\\/style'))
  .replace('/*JS*/', () => js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
await writeFile('dist/view.html', html);

// 2. The server: a library (dist/server.js) and the command (dist/index.js).
await build({
  entryPoints: { server: 'src/server.ts', index: 'src/main.ts' },
  outdir: 'dist',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'external',
  chunkNames: 'chunks/[name]-[hash]',
  define: { __VIEW_HTML__: JSON.stringify(html), __VERSION__: JSON.stringify(pkg.version) },
  legalComments: 'none',
});
const index = await readFile('dist/index.js', 'utf8');
await writeFile('dist/index.js', '#!/usr/bin/env node\n' + index);
await chmod('dist/index.js', 0o755);

await writeFile(
  'dist/server.d.ts',
  `import type { McpServer, CallToolResult } from '@modelcontextprotocol/server';
export declare const VERSION: string;
export declare const VIEW_URI = "ui://lumafx/view.html";
export declare const viewHtml: () => string;
export declare const uiToolMeta: { readonly ui: { readonly resourceUri: "ui://lumafx/view.html" } };
export interface UIOptions {
  name?: string;
  title?: string;
  description?: string;
  types?: string[];
  imageDomains?: string[];
  fullSchema?: boolean;
}
export interface Doc { blocks: Array<{ type: string; [k: string]: unknown }>; lang?: string }
export declare function uiResult(input: unknown, o?: { lang?: string }): CallToolResult;
export declare function registerView(server: McpServer, o?: Pick<UIOptions, 'imageDomains'>): void;
export declare function registerUI(server: McpServer, o?: UIOptions): unknown;
export declare function createServer(o?: UIOptions): McpServer;
`,
);
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('view.html', kb(html.length), '| js', kb(js.outputFiles[0].text.length), '| css', kb(css.outputFiles[0].text.length));
