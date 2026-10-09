import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { parsePartial } from '../../src/ui/partial';

declare global { interface Window { FXUI_SAMPLES: any; __log: any[]; __state: string; __bridge: AppBridge } }
const q = new URLSearchParams(location.search);
const theme = (q.get('theme') ?? 'light') as 'light' | 'dark';
const docName = q.get('doc') ?? 'orbit';
const chunk = Number(q.get('chunk') ?? 48);
const pause = q.get('pause') ? Number(q.get('pause')) : 0; // stop streaming at this fraction (0..1) for a mid-stream shot
document.documentElement.dataset.theme = theme;
window.__log = [];
window.__state = 'loading';

const html = await (await fetch('../dist/view.html')).text();
const frame = document.createElement('iframe');
frame.setAttribute('sandbox', 'allow-scripts');
frame.style.cssText = 'width:100%;border:0;height:200px;display:block;transition:height .2s';
frame.srcdoc = html;
document.getElementById('chat')!.append(frame);

const bridge = new AppBridge(null, { name: 'lumafx-test-host', version: '1.0.0' }, { openLinks: {}, message: { text: {} }, updateModelContext: { text: {} } }, {
  hostContext: {
    theme,
    locale: q.get('locale') ?? 'en-GB',
    timeZone: 'Europe/Tirane',
    platform: 'web',
    displayMode: 'inline',
    containerDimensions: { maxHeight: 6000 },
    styles: { variables: { '--font-sans': '"Inter", ui-sans-serif, system-ui, sans-serif', '--color-text-primary': theme === 'dark' ? '#f5f5f5' : '#171717' } as any },
  },
});
window.__bridge = bridge;
bridge.onsizechange = ({ height }) => {
  if (height) frame.style.height = height + 'px';
  window.__log.push({ type: 'size', height });
};
bridge.onopenlink = async (p) => { window.__log.push({ type: 'openlink', url: p.url }); return {}; };
bridge.onmessage = async (p) => { window.__log.push({ type: 'message', content: p.content }); return {}; };
bridge.onupdatemodelcontext = async (p) => { window.__log.push({ type: 'context', content: p.content }); return {}; };
bridge.onloggingmessage = (p) => window.__log.push({ type: 'log', p });

const doc = window.FXUI_SAMPLES[docName];
const text = JSON.stringify(doc);
bridge.oninitialized = async () => {
  window.__log.push({ type: 'initialized' });
  window.__state = 'streaming';
  const stopAt = pause ? Math.floor(text.length * pause) : text.length;
  for (let i = chunk; i < stopAt + chunk; i += chunk) {
    const partial = parsePartial(text.slice(0, Math.min(i, stopAt)));
    if (partial && typeof partial === 'object') await bridge.sendToolInputPartial({ arguments: partial as Record<string, unknown> });
    await new Promise((r) => setTimeout(r, 12));
  }
  if (pause) { window.__state = 'paused'; return; }
  await bridge.sendToolInput({ arguments: doc });
  await new Promise((r) => setTimeout(r, 50));
  await bridge.sendToolResult({ content: [{ type: 'text', text: 'Shown to the user as UI' }], structuredContent: doc });
  setTimeout(() => (window.__state = 'done'), 900);
};
await bridge.connect(new PostMessageTransport(frame.contentWindow!, frame.contentWindow!));
