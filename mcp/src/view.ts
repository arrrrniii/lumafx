/**
 * The lumafx view that MCP Apps hosts load in a sandboxed frame. It renders the tool's blocks while
 * the model is still writing them (tool-input-partial), settles on the validated result, follows
 * the host's theme and fonts, and turns clicks into host actions: links open through the host,
 * follow-up chips become the user's next message, selections reach the model's context.
 */
import { Host, applyTheme, applyVariables, applyFonts, type HostContext } from './bridge';
import { stream, destroy, type Stream } from '../../src/ui/index';

const host = document.getElementById('ui') as HTMLElement;
const known = ['en', 'sq'];
let ctx: HostContext = {};
let current: Stream | null = null;
let settled = false;

const app = new Host({ name: 'lumafx-ui', version: '0.4.0' });

function langFor(args?: Record<string, unknown>) {
  const own = typeof args?.lang === 'string' ? args.lang.slice(0, 2).toLowerCase() : '';
  if (own) return own;
  const loc = (ctx.locale ?? navigator.language ?? 'en').slice(0, 2).toLowerCase();
  return known.includes(loc) ? loc : 'en';
}

function begin(args?: Record<string, unknown>) {
  if (current && !settled) return current;
  destroy(host);
  host.removeAttribute('data-state');
  settled = false;
  current = stream(host, { lang: langFor(args), timeZone: ctx.timeZone });
  return current;
}

function finish(doc: unknown) {
  const s = begin(doc as Record<string, unknown>);
  s.set(doc);
  s.end();
  settled = true;
}

function showError(text: string) {
  finish({ blocks: [{ type: 'callout', tone: 'warning', text: text || 'Something went wrong.' }] });
}

/* ------------------------------------------------------------------ host → view */

app.on('toolinputpartial', (p) => {
  if (settled) return;
  if (p.arguments) begin(p.arguments).set(p.arguments);
});

app.on('toolinput', (p) => {
  if (settled) return;
  if (p.arguments) begin(p.arguments).set(p.arguments);
});

app.on('toolresult', (r) => {
  const sc = r.structuredContent as { blocks?: unknown[] } | undefined;
  if (sc && Array.isArray(sc.blocks)) return finish(sc);
  // Some servers return the blocks as JSON text instead of structured content.
  const text = (r.content ?? []).map((c) => (c.type === 'text' ? (c.text ?? '') : '')).join('\n');
  if (!r.isError && /^\s*[[{]/.test(text)) {
    try {
      return finish(JSON.parse(text));
    } catch {
      /* not JSON */
    }
  }
  if (r.isError) return showError(text);
  if (current && !settled) {
    current.end();
    settled = true;
  }
});

app.on('toolcancelled', () => {
  if (current && !settled) {
    current.end();
    settled = true;
  }
  if (!host.querySelector('.fxui-b')) host.dataset.state = 'empty';
});

function applyContext(c: HostContext) {
  ctx = { ...ctx, ...c };
  if (c.theme) applyTheme(c.theme);
  if (c.styles?.variables) applyVariables(c.styles.variables);
  if (c.styles?.css?.fonts) applyFonts(c.styles.css.fonts);
  if (c.safeAreaInsets) {
    const s = c.safeAreaInsets;
    document.body.style.padding = `${s.top}px ${s.right}px ${s.bottom}px ${s.left}px`;
  }
  if (c.displayMode) document.documentElement.dataset.display = c.displayMode;
}
app.on('hostcontextchanged', applyContext);
app.on('teardown', () => destroy(host));

/* ------------------------------------------------------------------ view → host */

const caps = () => app.capabilities;

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0) return;
  const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a) return;
  e.preventDefault();
  const url = a.href;
  if (/^(https?:|mailto:|tel:)/i.test(url)) app.openLink(url).catch(() => window.open(url, '_blank', 'noopener'));
});

host.addEventListener('fxui:ask', (e) => {
  const text = (e as CustomEvent<{ text?: string }>).detail?.text;
  if (!text) return;
  e.preventDefault();
  if (caps().message) app.sendMessage(text).catch(() => {});
});

const tell = (text: string) => {
  if (caps().updateModelContext) app.updateModelContext(text).catch(() => {});
};
host.addEventListener('fxui:select', (e) => {
  const d = (e as CustomEvent<{ block: string; tier?: string; zone?: string }>).detail;
  tell(d.tier ? `The user picked the ticket tier "${d.tier}" (${d.block}).` : `The user picked the seating zone "${d.zone}" (${d.block}).`);
});
host.addEventListener('fxui:answer', (e) => {
  const d = (e as CustomEvent<{ question: number; correct: boolean }>).detail;
  tell(`Quiz: the user answered question ${d.question + 1} ${d.correct ? 'correctly' : 'incorrectly'}.`);
});

// Images from origins the server did not allow are blocked by the host's CSP; lumafx/ui folds them away.

app
  .connect()
  .then(() => applyContext(app.context))
  .catch((e) => console.error('[lumafx] could not connect to the host', e));
