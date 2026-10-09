/**
 * A small MCP Apps client for the view (spec 2026-01-26): the `ui/initialize` handshake, host
 * notifications, the few requests the view sends, and auto-resize. It does what the official
 * `App` class from @modelcontextprotocol/ext-apps does for this view, without bundling the MCP SDK
 * and zod into it (about 95 KB for the whole view instead of 700 KB). The tests run it against the
 * official host side (`AppBridge`).
 */
export const PROTOCOL_VERSION = '2026-01-26';

export interface HostContext {
  theme?: 'light' | 'dark';
  locale?: string;
  timeZone?: string;
  displayMode?: string;
  styles?: { variables?: Record<string, string | undefined>; css?: { fonts?: string } };
  safeAreaInsets?: { top: number; right: number; bottom: number; left: number };
  [k: string]: unknown;
}
export interface HostCapabilities {
  openLinks?: object;
  message?: object;
  updateModelContext?: object;
  [k: string]: unknown;
}
export interface ToolResult {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
export interface Events {
  toolinput: { arguments?: Record<string, unknown> };
  toolinputpartial: { arguments?: Record<string, unknown> };
  toolresult: ToolResult;
  toolcancelled: { reason?: string };
  hostcontextchanged: HostContext;
  teardown: Record<string, never>;
}

const NOTIFICATIONS: Record<string, keyof Events> = {
  'ui/notifications/tool-input': 'toolinput',
  'ui/notifications/tool-input-partial': 'toolinputpartial',
  'ui/notifications/tool-result': 'toolresult',
  'ui/notifications/tool-cancelled': 'toolcancelled',
  'ui/notifications/host-context-changed': 'hostcontextchanged',
};

type Msg = { jsonrpc: '2.0'; id?: number | string; method?: string; params?: any; result?: any; error?: { code: number; message: string } };

export class Host {
  context: HostContext = {};
  capabilities: HostCapabilities = {};
  private parent = window.parent;
  private seq = 0;
  private pending = new Map<number | string, { ok: (v: any) => void; fail: (e: Error) => void }>();
  private handlers: { [K in keyof Events]?: Set<(p: Events[K]) => void> } = {};

  constructor(
    private info: { name: string; version: string },
    private opts: { autoResize?: boolean } = {},
  ) {
    window.addEventListener('message', this.onMessage);
  }

  on<K extends keyof Events>(name: K, fn: (p: Events[K]) => void) {
    ((this.handlers[name] ??= new Set() as any) as Set<(p: Events[K]) => void>).add(fn);
  }

  private emit<K extends keyof Events>(name: K, p: Events[K]) {
    this.handlers[name]?.forEach((fn) => {
      try {
        (fn as (p: Events[K]) => void)(p);
      } catch (e) {
        console.error('[lumafx]', e);
      }
    });
  }

  private post(m: Omit<Msg, 'jsonrpc'>) {
    this.parent.postMessage({ jsonrpc: '2.0', ...m }, '*');
  }

  private onMessage = (e: MessageEvent) => {
    if (e.source !== this.parent) return;
    const m = e.data as Msg;
    if (!m || m.jsonrpc !== '2.0') return;
    // A response to one of our requests.
    if (m.method === undefined && m.id !== undefined) {
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      if (m.error) p.fail(Object.assign(new Error(m.error.message), { code: m.error.code }));
      else p.ok(m.result);
      return;
    }
    if (typeof m.method !== 'string') return;
    // A request from the host.
    if (m.id !== undefined) {
      const id = m.id;
      if (m.method === 'ui/resource-teardown') {
        this.emit('teardown', {});
        this.post({ id, result: {} });
      } else if (m.method === 'ping') this.post({ id, result: {} });
      else this.post({ id, error: { code: -32601, message: `Method not found: ${m.method}` } });
      return;
    }
    // A notification.
    const name = NOTIFICATIONS[m.method];
    if (!name) return;
    if (name === 'hostcontextchanged') this.context = { ...this.context, ...(m.params ?? {}) };
    this.emit(name, m.params ?? {});
  };

  request<T = any>(method: string, params?: unknown, timeout = 30_000): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((ok, fail) => {
      this.pending.set(id, { ok, fail });
      this.post(params === undefined ? { id, method } : { id, method, params });
      setTimeout(() => {
        if (this.pending.delete(id)) fail(new Error(`${method} timed out`));
      }, timeout);
    });
  }

  notify(method: string, params?: unknown) {
    this.post(params === undefined ? { method } : { method, params });
  }

  async connect() {
    const r = await this.request<{ hostContext?: HostContext; hostCapabilities?: HostCapabilities; protocolVersion?: string }>('ui/initialize', {
      appInfo: this.info,
      appCapabilities: { availableDisplayModes: ['inline', 'fullscreen'] },
      protocolVersion: PROTOCOL_VERSION,
    });
    this.context = r?.hostContext ?? {};
    this.capabilities = r?.hostCapabilities ?? {};
    this.notify('ui/notifications/initialized');
    if (this.opts.autoResize !== false) this.autoResize();
    return r;
  }

  openLink(url: string) {
    return this.request('ui/open-link', { url });
  }
  sendMessage(text: string) {
    return this.request('ui/message', { role: 'user', content: [{ type: 'text', text }] }, 120_000);
  }
  updateModelContext(text: string) {
    return this.request('ui/update-model-context', { content: [{ type: 'text', text }] });
  }

  /** Tells the host how tall the content is, whenever it changes (same measure as the SDK). */
  autoResize() {
    let raf = 0;
    let w = 0;
    let h = 0;
    const measure = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const html = document.documentElement;
        const prev = html.style.height;
        html.style.height = 'max-content';
        const height = Math.ceil(html.getBoundingClientRect().height);
        html.style.height = prev;
        const width = Math.ceil(window.innerWidth);
        if (width !== w || height !== h) {
          w = width;
          h = height;
          this.notify('ui/notifications/size-changed', { width, height });
        }
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    ro.observe(document.body);
    return () => ro.disconnect();
  }
}

/* ------------------------------------------------------------------ host styling */

export function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function applyVariables(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) if (v !== undefined && k.startsWith('--')) document.documentElement.style.setProperty(k, v);
}

export function applyFonts(css: string) {
  if (document.getElementById('__mcp-host-fonts')) return;
  const s = document.createElement('style');
  s.id = '__mcp-host-fonts';
  s.textContent = css;
  document.head.append(s);
}
