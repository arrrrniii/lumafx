// End-to-end checks for lumafx-mcp over stdio and HTTP with the official MCP client.
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(new URL('../demo/ui-samples.js', import.meta.url), 'utf8'), sandbox);
const SAMPLES = sandbox.window.FXUI_SAMPLES;

let passed = 0;
const ok = (name) => {
  passed++;
  console.log('  ✓', name);
};

async function suite(client, label) {
  console.log(label);
  const { tools } = await client.listTools();
  const tool = tools.find((t) => t.name === 'render_ui');
  assert.ok(tool, 'render_ui listed');
  assert.equal(tool._meta?.ui?.resourceUri, 'ui://lumafx/view.html');
  assert.equal(tool.inputSchema.type, 'object');
  assert.ok(tool.inputSchema.properties.blocks.items.properties.type.enum.includes('lineup'));
  assert.match(tool.description, /\nlineup: /);
  assert.equal(tool.annotations?.readOnlyHint, true);
  ok('lists render_ui linked to the view');

  for (const [name, doc] of Object.entries(SAMPLES)) {
    const r = await client.callTool({ name: 'render_ui', arguments: doc });
    assert.ok(!r.isError, `${name} renders`);
    assert.equal(r.structuredContent.blocks.length, doc.blocks.length, `${name}: all blocks kept`);
    assert.match(r.content[0].text, /^Shown to the user as UI:/);
  }
  ok(`renders every sample (${Object.keys(SAMPLES).join(', ')})`);

  const orbit = await client.callTool({ name: 'render_ui', arguments: SAMPLES.orbit });
  assert.equal(orbit.structuredContent.lang, 'sq');
  assert.match(orbit.content[0].text, /Shqipëria/);
  assert.match(orbit.content[0].text, /Hysaj/);
  ok('text fallback carries the facts (lineup names, teams)');

  const fixed = await client.callTool({
    name: 'render_ui',
    arguments: { blocks: [{ type: 'actions', buttons: [{ label: 'Bad', url: 'javascript:alert(1)' }, { label: 'Good', url: 'https://sphere.al' }] }, { type: 'nope' }] },
  });
  assert.ok(!fixed.isError);
  assert.equal(fixed.structuredContent.blocks.length, 1);
  assert.equal(fixed.structuredContent.blocks[0].buttons.length, 1);
  assert.match(fixed.content[0].text, /unsafe or invalid URL/);
  assert.match(fixed.content[0].text, /unknown block "nope"/);
  ok('drops unsafe links and unknown blocks, and tells the model');

  const empty = await client.callTool({ name: 'render_ui', arguments: { blocks: [] } });
  assert.equal(empty.isError, true);
  const junk = await client.callTool({ name: 'render_ui', arguments: { stuff: 1 } });
  assert.equal(junk.isError, true);
  ok('reports an error when there is nothing to show');

  const { resources } = await client.listResources();
  assert.ok(resources.some((r) => r.uri === 'ui://lumafx/view.html'));
  const res = await client.readResource({ uri: 'ui://lumafx/view.html' });
  const c = res.contents[0];
  assert.equal(c.mimeType, 'text/html;profile=mcp-app');
  assert.match(c.text, /<main id="ui"/);
  assert.match(c.text, /ui\/initialize/);
  assert.ok(!/<script[^>]+src=/.test(c.text), 'no external scripts');
  ok(`serves the view (${(c.text.length / 1024).toFixed(0)} KB, self-contained)`);
}

// stdio
{
  const client = new Client({ name: 'lumafx-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: 'node', args: ['dist/index.js', '--stdio'] }));
  await suite(client, 'stdio');
  await client.close();
}

// stdio with a focused tool and image domains
{
  const client = new Client({ name: 'lumafx-test', version: '1.0.0' });
  await client.connect(
    new StdioClientTransport({ command: 'node', args: ['dist/index.js', '--stdio', '--types', 'match,lineup,standings', '--images', 'https://sphere.al'] }),
  );
  const { tools } = await client.listTools();
  const t = tools[0];
  assert.deepEqual(t.inputSchema.properties.blocks.items.properties.type.enum, ['match', 'lineup', 'standings']);
  assert.ok(!/\nweather: /.test(t.description));
  const res = await client.readResource({ uri: 'ui://lumafx/view.html' });
  assert.deepEqual(res.contents[0]._meta?.ui?.csp?.resourceDomains, ['https://sphere.al']);
  console.log('options');
  ok('--types narrows the tool, --images sets the view CSP');
  await client.close();
}

// HTTP
{
  const port = 3900 + Math.floor(Math.random() * 90);
  const proc = spawn('node', ['dist/index.js', '--port', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    proc.stdout.on('data', (d) => /listening|on http/.test(String(d)) && resolve());
    proc.on('exit', (code) => reject(new Error('server exited ' + code)));
    setTimeout(() => reject(new Error('server did not start')), 8000);
  });
  try {
    const client = new Client({ name: 'lumafx-test', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
    await suite(client, 'http');
    await client.close();
  } finally {
    proc.kill();
  }
}

console.log(`\n${passed} checks passed`);
