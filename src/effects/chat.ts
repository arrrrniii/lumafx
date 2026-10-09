import { META } from '../meta';
import type { Effect } from '../core/types';
import { setState } from '../core/util';

export interface ChatApi {
  open(): void;
  close(): void;
  toggle(): void;
  /** Adds a message from you (the site). Shows the typing indicator first when `typing` > 0 ms. */
  reply(text: string, opts?: { typing?: number }): Promise<void>;
  /** Shows or hides the typing indicator. */
  typing(on: boolean): void;
  /** Sends a message as the visitor (same as typing it in). */
  send(text: string): void;
}

const ICON_CHAT =
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.9 2 11.6c0 2.4 1.2 4.6 3.2 6.1L4.4 21l3.9-1.9c1.2.4 2.4.6 3.7.6 5.5 0 10-3.9 10-8.6S17.5 3 12 3Z"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>';
const ICON_SEND =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2z"/></svg>';

let uid = 0;

export const chat: Effect = {
  name: 'chat',
  meta: META.chat,
  mount(el, ctx) {
    const id = `fx-chat-${++uid}`;
    const title = ctx.str('title', 'Chat') || 'Chat';
    const subtitle = ctx.str('subtitle', '') || '';
    const greeting = ctx.str('greeting');
    const placeholder = ctx.str('placeholder', 'Write a message…') || 'Write a message…';
    const quick = (ctx.str('quick') || '').split(',').map((s) => s.trim()).filter(Boolean);
    el.dataset.position = ctx.str('position', 'right') === 'left' ? 'left' : 'right';

    const ui = document.createElement('div');
    ui.className = 'fx-chat-ui';
    ui.innerHTML = `
      <section class="fx-chat-panel" id="${id}" role="dialog" aria-label="${title.replace(/"/g, '&quot;')}">
        <header class="fx-chat-head">
          <span class="fx-chat-avatar" aria-hidden="true"></span>
          <span class="fx-chat-titles"><b></b><small></small></span>
          <button type="button" class="fx-chat-x" aria-label="Close chat">${ICON_CLOSE}</button>
        </header>
        <div class="fx-chat-log" role="log" aria-live="polite"></div>
        <div class="fx-chat-quick"></div>
        <form class="fx-chat-form">
          <input type="text" autocomplete="off" aria-label="Message">
          <button type="submit" aria-label="Send">${ICON_SEND}</button>
        </form>
      </section>
      <button type="button" class="fx-chat-launch" aria-expanded="false" aria-controls="${id}" aria-label="Open chat">
        <span class="fx-chat-i1">${ICON_CHAT}</span><span class="fx-chat-i2">${ICON_CLOSE}</span>
      </button>`;
    el.append(ui);
    const $ = <T extends Element>(s: string) => ui.querySelector(s) as T;
    $<HTMLElement>('.fx-chat-titles b').textContent = title;
    $<HTMLElement>('.fx-chat-titles small').textContent = subtitle;
    const input = $<HTMLInputElement>('.fx-chat-form input');
    input.placeholder = placeholder;
    const log = $<HTMLElement>('.fx-chat-log');
    const launch = $<HTMLButtonElement>('.fx-chat-launch');
    const quickBox = $<HTMLElement>('.fx-chat-quick');

    let typingEl: HTMLElement | null = null;
    const scrollDown = () =>
      typeof log.scrollTo === 'function'
        ? log.scrollTo({ top: log.scrollHeight, behavior: ctx.env.reduced ? 'auto' : 'smooth' })
        : (log.scrollTop = log.scrollHeight);
    const add = (text: string, from: 'me' | 'them') => {
      const m = document.createElement('div');
      m.className = 'fx-msg';
      m.dataset.from = from;
      m.textContent = text;
      if (typingEl) log.insertBefore(m, typingEl);
      else log.append(m);
      scrollDown();
      return m;
    };
    const api: ChatApi = {
      open() {
        if (el.hasAttribute('data-open')) return;
        el.setAttribute('data-open', '');
        launch.setAttribute('aria-expanded', 'true');
        launch.setAttribute('aria-label', 'Close chat');
        setTimeout(() => input.focus({ preventScroll: true }), 120);
        el.dispatchEvent(new CustomEvent('fx:chat-open', { bubbles: true }));
      },
      close() {
        if (!el.hasAttribute('data-open')) return;
        el.removeAttribute('data-open');
        launch.setAttribute('aria-expanded', 'false');
        launch.setAttribute('aria-label', 'Open chat');
        launch.focus({ preventScroll: true });
      },
      toggle() {
        el.hasAttribute('data-open') ? api.close() : api.open();
      },
      typing(on) {
        if (on && !typingEl) {
          typingEl = document.createElement('div');
          typingEl.className = 'fx-msg fx-typing';
          typingEl.dataset.from = 'them';
          typingEl.setAttribute('aria-label', 'Typing');
          typingEl.innerHTML = '<i></i><i></i><i></i>';
          log.append(typingEl);
          scrollDown();
        } else if (!on && typingEl) {
          typingEl.remove();
          typingEl = null;
        }
      },
      async reply(text, opts = {}) {
        const wait = opts.typing ?? Math.min(1600, 350 + text.length * 18);
        if (wait > 0) {
          api.typing(true);
          await new Promise((r) => setTimeout(r, ctx.env.reduced ? 0 : wait));
          api.typing(false);
        }
        add(text, 'them');
      },
      send(text) {
        const t = text.trim();
        if (!t) return;
        add(t, 'me');
        quickBox.replaceChildren();
        el.dispatchEvent(new CustomEvent('fx:chat-send', { bubbles: true, detail: { text: t } }));
      },
    };
    (el as HTMLElement & { fxChat?: ChatApi }).fxChat = api;

    if (greeting) add(greeting, 'them');
    quickBox.append(
      ...quick.map((q, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = q;
        b.style.setProperty('--i', String(i));
        b.addEventListener('click', () => api.send(q));
        return b;
      }),
    );

    const form = $<HTMLFormElement>('.fx-chat-form');
    const onSubmit = (e: Event) => {
      e.preventDefault();
      api.send(input.value);
      input.value = '';
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && api.close();
    form.addEventListener('submit', onSubmit);
    launch.addEventListener('click', api.toggle);
    $<HTMLButtonElement>('.fx-chat-x').addEventListener('click', api.close);
    ui.addEventListener('keydown', onKey);
    setState(el, 'ready');

    return () => {
      ui.remove();
      delete (el as HTMLElement & { fxChat?: ChatApi }).fxChat;
      el.removeAttribute('data-open');
      el.removeAttribute('data-position');
      setState(el, 'ready', false);
    };
  },
};
