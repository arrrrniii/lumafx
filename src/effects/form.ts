import { META } from '../meta';
import type { Effect } from '../core/types';
import { setState } from '../core/util';
import { checkValue, message, parsePhone, parseRules, passwordScore, type Options, type ParsedRule } from '../forms/core';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface Field {
  name: string;
  controls: Control[];
  rules: ParsedRule[];
  touched: boolean;
  error?: HTMLElement;
  hint?: HTMLElement;
  counter?: HTMLElement;
  meter?: HTMLElement;
  anchor: Element;
}

export interface FormApi {
  /** Validates every field and shows the errors. */
  validate(): boolean;
  /** Current values by field name. */
  values(): Record<string, string>;
  /** Shows errors returned by your server: { email: 'Already registered' } or { email: { message } }. */
  showErrors(errors: Record<string, string | { message: string }>): void;
}

let uid = 0;
const SKIP = /^(submit|button|reset|hidden|image|file)$/;

const ruleFor = (c: Control, country: string): ParsedRule[] => {
  const rules = parseRules(c.getAttribute('data-rules') || '');
  const has = (n: string) => rules.some((r) => r.name === n);
  const add = (name: string, arg?: string) => !has(name) && rules.push({ name, arg });
  const type = (c.getAttribute('type') || '').toLowerCase();
  if (c.hasAttribute('required')) {
    if (type === 'checkbox') add('accepted');
    else if (!has('required')) rules.unshift({ name: 'required' });
  }
  if (type === 'email') add('email');
  if (type === 'tel') add('phone', c.getAttribute('data-fx-country') || country);
  if (type === 'url') add('url');
  if (type === 'number') add('number');
  for (const a of ['min', 'max', 'minlength', 'maxlength'] as const) {
    const v = c.getAttribute(a);
    if (v !== null && v !== '' && (a.endsWith('length') || type === 'number' || type === 'range')) add(a, v);
  }
  const pat = c.getAttribute('pattern');
  if (pat) add('pattern', pat);
  // A phone rule without a country uses the form's default.
  for (const r of rules) if (r.name === 'phone' && !r.arg) r.arg = c.getAttribute('data-fx-country') || country;
  return rules;
};

export const form: Effect = {
  name: 'form',
  meta: META.form,
  mount(el, ctx) {
    if (!(el instanceof HTMLFormElement)) {
      console.warn('[lumafx] form: use it on a <form> element');
      return;
    }
    const f = el;
    const country = (ctx.str('country', 'AL') || 'AL').toUpperCase();
    const opts: Options = { locale: ctx.str('locale') || document.documentElement.lang || 'en', country };
    const ajax = ctx.bool('ajax', false);
    const spam = ctx.bool('spam', true);
    const reduced = ctx.env.reduced;
    const prevNoValidate = f.noValidate;
    f.noValidate = true;
    const created: Element[] = [];
    const id = ++uid;

    // Spam traps: a field people never see (bots fill it) and the time the page was shown.
    if (spam && !f.querySelector('[name="_hp"]')) {
      const hp = document.createElement('input');
      Object.assign(hp, { type: 'text', name: '_hp', tabIndex: -1, autocomplete: 'off', className: 'fx-hp' });
      hp.setAttribute('aria-hidden', 'true');
      const ts = Object.assign(document.createElement('input'), { type: 'hidden', name: '_ts', value: String(Date.now()) });
      f.append(hp, ts);
      created.push(hp, ts);
    }

    const fields = new Map<string, Field>();
    for (const node of Array.from(f.elements)) {
      const c = node as Control;
      if (!c.name || c.name.startsWith('_') || c.disabled || SKIP.test((c as HTMLInputElement).type || '')) continue;
      const existing = fields.get(c.name);
      if (existing) {
        existing.controls.push(c);
        continue;
      }
      const isChoice = c instanceof HTMLInputElement && (c.type === 'checkbox' || c.type === 'radio');
      // Messages go right under a text field, or under the whole group for checkboxes and radios.
      const anchor: Element = isChoice ? c.closest('fieldset') || c.closest('label') || c : c;
      fields.set(c.name, { name: c.name, controls: [c], rules: ruleFor(c, country), touched: false, anchor });
    }

    const valueOf = (fd: Field): string => {
      const c = fd.controls[0];
      if (c instanceof HTMLInputElement && c.type === 'radio') return (fd.controls.find((x) => (x as HTMLInputElement).checked) as HTMLInputElement | undefined)?.value ?? '';
      if (c instanceof HTMLInputElement && c.type === 'checkbox') {
        const on = fd.controls.filter((x) => (x as HTMLInputElement).checked) as HTMLInputElement[];
        return on.length ? on.map((x) => x.value || 'on').join(',') : '';
      }
      return c.value;
    };
    const values = () => Object.fromEntries([...fields.values()].map((fd) => [fd.name, valueOf(fd)]));

    const after = (fd: Field, node: HTMLElement) => {
      // Radios and checkboxes report under their group; text inputs right under the input.
      const lastControl = fd.controls[fd.controls.length - 1];
      const target = fd.controls.length > 1 && fd.anchor.tagName !== 'FIELDSET' ? lastControl.closest('label') || lastControl : fd.anchor;
      let ref: Element = target;
      while (ref.nextElementSibling && ref.nextElementSibling.matches('.fx-error, .fx-hint, .fx-count, .fx-meter')) ref = ref.nextElementSibling;
      ref.after(node);
      created.push(node);
    };
    const describe = (fd: Field, nodeId: string, on: boolean) => {
      for (const c of fd.controls) {
        const ids = (c.getAttribute('aria-describedby') || '').split(/\s+/).filter((x) => x && x !== nodeId);
        if (on) ids.push(nodeId);
        if (ids.length) c.setAttribute('aria-describedby', ids.join(' '));
        else c.removeAttribute('aria-describedby');
      }
    };

    const showError = (fd: Field, text: string) => {
      if (!fd.error) {
        fd.error = document.createElement('p');
        fd.error.className = 'fx-error';
        fd.error.id = `fx-err-${id}-${fd.name.replace(/\W/g, '')}`;
        fd.error.setAttribute('aria-live', 'polite');
        fd.error.append(document.createElement('span'));
        after(fd, fd.error);
      }
      (fd.error.firstChild as HTMLElement).textContent = text;
      fd.error.setAttribute('data-show', '');
      describe(fd, fd.error.id, true);
      fd.controls.forEach((c) => {
        c.setAttribute('aria-invalid', 'true');
        c.removeAttribute('data-fx-valid');
      });
    };
    const clearError = (fd: Field) => {
      if (fd.error) {
        fd.error.removeAttribute('data-show');
        describe(fd, fd.error.id, false);
      }
      fd.controls.forEach((c) => c.removeAttribute('aria-invalid'));
    };

    const showHint = (fd: Field, suggestion?: string) => {
      if (!suggestion) {
        fd.hint?.removeAttribute('data-show');
        return;
      }
      if (!fd.hint) {
        fd.hint = document.createElement('p');
        fd.hint.className = 'fx-hint';
        after(fd, fd.hint);
      }
      const [before, rest = ''] = message('emailSuggest', opts, { s: '\u0000' }).split('\u0000');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = suggestion;
      btn.addEventListener('click', () => {
        (fd.controls[0] as HTMLInputElement).value = suggestion;
        fd.controls[0].dispatchEvent(new Event('input', { bubbles: true }));
        check(fd, true);
        fd.controls[0].focus();
      });
      fd.hint.replaceChildren(document.createTextNode(before), btn, document.createTextNode(rest));
      fd.hint.setAttribute('data-show', '');
    };

    const extras = (fd: Field) => {
      const c = fd.controls[0];
      const max = Number(c.getAttribute('maxlength'));
      if (max > 0 && (c instanceof HTMLTextAreaElement || c.hasAttribute('data-fx-counter'))) {
        if (!fd.counter) {
          fd.counter = document.createElement('span');
          fd.counter.className = 'fx-count';
          fd.counter.setAttribute('aria-hidden', 'true');
          after(fd, fd.counter);
        }
        const n = [...c.value].length;
        fd.counter.textContent = `${n} / ${max}`;
        fd.counter.toggleAttribute('data-near', n >= max * 0.9);
      }
      if (fd.rules.some((r) => r.name === 'password')) {
        if (!fd.meter) {
          fd.meter = document.createElement('div');
          fd.meter.className = 'fx-meter';
          fd.meter.setAttribute('aria-hidden', 'true');
          fd.meter.innerHTML = '<i></i><i></i><i></i><i></i>';
          after(fd, fd.meter);
        }
        fd.meter.dataset.level = String(passwordScore(c.value));
      }
    };

    /** Validates one field; `show` decides whether errors are displayed. */
    const check = (fd: Field, show: boolean) => {
      const v = valueOf(fd);
      const r = checkValue(v, fd.rules, values(), opts);
      showHint(fd, r.suggestion || r.error?.suggestion);
      if (r.error) {
        if (show) showError(fd, r.error.suggestion ? message('email', opts) : r.error.message);
        return false;
      }
      clearError(fd);
      fd.controls.forEach((c) => c.toggleAttribute('data-fx-valid', v !== '' && fd.rules.length > 0 && !(c instanceof HTMLSelectElement) && !['checkbox', 'radio'].includes((c as HTMLInputElement).type)));
      // Phone numbers settle into a readable international format once the visitor leaves the field.
      const phone = fd.rules.find((x) => x.name === 'phone');
      if (phone && show && v && document.activeElement !== fd.controls[0]) {
        const p = parsePhone(v, phone.arg || country);
        if (p) (fd.controls[0] as HTMLInputElement).value = p.international;
      }
      return true;
    };

    const fieldOf = (t: EventTarget | null) => {
      const c = t as Control | null;
      return c && c.name ? fields.get(c.name) : undefined;
    };
    const shake = (c: Element) => {
      if (reduced) return;
      (c as HTMLElement).animate?.(
        [{ translate: '0 0' }, { translate: '-6px 0' }, { translate: '5px 0' }, { translate: '-3px 0' }, { translate: '2px 0' }, { translate: '0 0' }],
        { duration: 420, easing: 'ease-out' },
      );
    };

    const onInput = (e: Event) => {
      const fd = fieldOf(e.target);
      if (!fd) return;
      extras(fd);
      // Live feedback once the visitor has seen an error (or left the field once).
      if (fd.touched || fd.controls[0].getAttribute('aria-invalid') === 'true') check(fd, true);
      else showHint(fd, undefined);
      formError(null);
    };
    const onBlur = (e: Event) => {
      const fd = fieldOf(e.target);
      if (!fd) return;
      // Don't nag about an empty field the visitor only tabbed through.
      if (valueOf(fd) === '' && !fd.touched) return;
      fd.touched = true;
      check(fd, true);
    };
    const onChange = (e: Event) => {
      const fd = fieldOf(e.target);
      if (fd && fd.controls[0] instanceof HTMLInputElement && ['checkbox', 'radio'].includes(fd.controls[0].type)) {
        fd.touched = true;
        check(fd, true);
      }
    };

    let formMsg: HTMLElement | null = null;
    const formError = (text: string | null) => {
      if (!text) return formMsg?.removeAttribute('data-show');
      if (!formMsg) {
        formMsg = document.createElement('p');
        formMsg.className = 'fx-form-error';
        formMsg.setAttribute('role', 'alert');
        const submit = f.querySelector('[type="submit"], button:not([type])');
        (submit ? submit : f.lastElementChild || f).before?.(formMsg);
        if (!formMsg.isConnected) f.append(formMsg);
        created.push(formMsg);
      }
      formMsg.textContent = text;
      formMsg.setAttribute('data-show', '');
    };

    const validateAll = () => {
      let first: Field | null = null;
      for (const fd of fields.values()) {
        fd.touched = true;
        if (!check(fd, true) && !first) first = fd;
      }
      if (first) {
        first.controls[0].focus({ preventScroll: false });
        shake(first.controls[0]);
        return false;
      }
      return true;
    };

    const showErrors = (errors: Record<string, string | { message: string }>) => {
      let first: Field | null = null;
      for (const [name, err] of Object.entries(errors || {})) {
        const text = typeof err === 'string' ? err : err?.message;
        if (!text) continue;
        const fd = fields.get(name);
        if (fd) {
          fd.touched = true;
          showError(fd, text);
          first ??= fd;
        } else formError(text);
      }
      if (first) {
        first.controls[0].focus();
        shake(first.controls[0]);
      }
    };

    const onSubmit = async (e: SubmitEvent) => {
      if (!validateAll()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        f.dispatchEvent(new CustomEvent('fx:invalid', { bubbles: true }));
        return;
      }
      const go = f.dispatchEvent(new CustomEvent('fx:submit', { bubbles: true, cancelable: true, detail: { values: values(), form: f } }));
      if (!go) return e.preventDefault();
      if (!ajax) return;
      e.preventDefault();
      const btn = (e.submitter as HTMLButtonElement | null) || f.querySelector<HTMLButtonElement>('[type="submit"], button:not([type])');
      setState(f, 'sending');
      formError(null);
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
      }
      let json: Record<string, unknown> | null = null;
      let ok = false;
      try {
        const res = await fetch(f.action || location.href, {
          method: (f.getAttribute('method') || 'post').toUpperCase(),
          body: new FormData(f),
          headers: { Accept: 'application/json' },
        });
        json = await res.json().catch(() => null);
        ok = res.ok && (!json || json.ok !== false);
        if (!ok) {
          if (json && json.errors) showErrors(json.errors as Record<string, { message: string }>);
          else formError(message('spam', opts));
        }
      } catch {
        formError(message('spam', opts));
      }
      setState(f, 'sending', false);
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
      if (!ok) return;
      setState(f, 'sent');
      const sent = btn?.getAttribute('data-fx-sent');
      if (btn && sent) btn.textContent = sent;
      const success = f.querySelector<HTMLElement>('[data-fx-success]') || (ctx.str('success') ? document.querySelector<HTMLElement>(ctx.str('success')!) : null);
      if (success) success.hidden = false;
      if (ctx.bool('reset', false)) {
        f.reset();
        fields.forEach((fd) => {
          fd.touched = false;
          clearError(fd);
          fd.controls.forEach((c) => c.removeAttribute('data-fx-valid'));
        });
      }
      f.dispatchEvent(new CustomEvent('fx:success', { bubbles: true, detail: json }));
    };

    f.addEventListener('input', onInput);
    f.addEventListener('focusout', onBlur);
    f.addEventListener('change', onChange);
    f.addEventListener('submit', onSubmit);
    fields.forEach(extras);
    const api: FormApi = { validate: validateAll, values, showErrors };
    (f as HTMLFormElement & { fxForm?: FormApi }).fxForm = api;
    setState(f, 'ready');

    return () => {
      f.removeEventListener('input', onInput);
      f.removeEventListener('focusout', onBlur);
      f.removeEventListener('change', onChange);
      f.removeEventListener('submit', onSubmit);
      f.noValidate = prevNoValidate;
      created.forEach((n) => n.remove());
      fields.forEach((fd) =>
        fd.controls.forEach((c) => {
          c.removeAttribute('aria-invalid');
          c.removeAttribute('data-fx-valid');
          if (fd.error) describe(fd, fd.error.id, false);
        }),
      );
      delete (f as HTMLFormElement & { fxForm?: FormApi }).fxForm;
      ['ready', 'sending', 'sent'].forEach((s) => setState(f, s, false));
    };
  },
};
