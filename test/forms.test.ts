import { describe, it, expect, beforeAll, vi } from 'vitest';
import { schema, validate, parsePhone, suggestEmail, passwordScore, parseRules, addRule, message } from '../src/forms/core';
import { start } from '../src/index';
import type { FormApi } from '../src/effects/form';
import { tick } from './setup';

describe('rules (shared by browser and server)', () => {
  it('parses rule strings, including quoted patterns', () => {
    expect(parseRules('required email minlength:3 phone:IT')).toEqual([
      { name: 'required', arg: undefined },
      { name: 'email', arg: undefined },
      { name: 'minlength', arg: '3' },
      { name: 'phone', arg: 'IT' },
    ]);
    expect(parseRules('pattern:"[A-Z]{2} \\d+"')[0]).toEqual({ name: 'pattern', arg: '[A-Z]{2} \\d+' });
  });

  it('normalises phone numbers to E.164 from the ways people type them', () => {
    expect(parsePhone('069 123 4567', 'AL')?.e164).toBe('+355691234567');
    expect(parsePhone('+355 69 123 4567')?.e164).toBe('+355691234567');
    expect(parsePhone('00355691234567')?.e164).toBe('+355691234567');
    expect(parsePhone('+355 069 123 4567')?.e164).toBe('+355691234567');
    expect(parsePhone('(069) 123-45-67', 'AL')?.international).toBe('+355 69 123 4567');
    expect(parsePhone('333 123 4567', 'IT')?.e164).toBe('+393331234567');
    expect(parsePhone('(415) 555-2671', 'US')?.e164).toBe('+14155552671');
    expect(parsePhone('+44 7911 123456')?.e164).toBe('+447911123456');
    expect(parsePhone('12345', 'AL')).toBeNull();
    expect(parsePhone('069 abc 4567', 'AL')).toBeNull();
    expect(parsePhone('000000000', 'AL')).toBeNull();
  });

  it('suggests fixes for email typos and leaves good addresses alone', () => {
    expect(suggestEmail('arni@gmial.com')).toBe('arni@gmail.com');
    expect(suggestEmail('arni@gmail.con')).toBe('arni@gmail.com');
    expect(suggestEmail('arni@hotmial.com')).toBe('arni@hotmail.com');
    expect(suggestEmail('arni@yaho.com')).toBe('arni@yahoo.com');
    expect(suggestEmail('arni@gmail.com')).toBeNull();
    expect(suggestEmail('arni@sphere.al')).toBeNull();
  });

  it('scores passwords', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('aaaaaaaa')).toBe(0);
    expect(passwordScore('tirana2026')).toBe(1);
    expect(passwordScore('Tirana-2026!xyz')).toBe(4);
  });

  it('validates a whole form on the server with cleaned data and error codes', () => {
    const contact = schema({
      name: 'required name',
      email: 'required email',
      phone: 'phone:AL',
      message: 'required minlength:10 maxlength:200',
      password: 'password',
      confirm: 'match:password',
      plan: 'oneof:free|pro',
    });
    const fd = new FormData();
    fd.set('name', '  Arni  Kajolli ');
    fd.set('email', 'Arni@Example.COM');
    fd.set('phone', '069 123 4567');
    fd.set('message', 'Hello from Tirana!');
    fd.set('password', 'tirana2026');
    fd.set('confirm', 'tirana2026');
    fd.set('plan', 'pro');
    const ok = contact.validate(fd);
    expect(ok.ok).toBe(true);
    expect(ok.data).toMatchObject({ name: 'Arni Kajolli', email: 'arni@example.com', phone: '+355691234567', plan: 'pro' });

    const bad = contact.validate({ name: 'A', email: 'nope', phone: '12', message: 'short', password: 'abc', confirm: 'x', plan: 'gold' });
    expect(bad.ok).toBe(false);
    expect(Object.fromEntries(Object.entries(bad.errors).map(([k, v]) => [k, v.code]))).toEqual({
      name: 'name',
      email: 'email',
      phone: 'phone',
      message: 'minlength',
      password: 'password',
      confirm: 'match',
      plan: 'oneof',
    });
    expect(bad.errors.message.message).toBe('Use at least 10 characters.');
  });

  it('speaks Albanian and accepts custom messages and rules', () => {
    const r = validate({ email: 'required email' }, { email: '' }, { locale: 'sq' });
    expect(r.errors.email.message).toBe('Kjo fushë është e detyrueshme.');
    expect(message('minlength', { locale: 'sq' }, { n: '3' })).toBe('Përdorni të paktën 3 karaktere.');
    addRule('nipt', (v) => (/^[A-Z]\d{8}[A-Z]$/.test(v) ? true : 'nipt'), { en: 'Enter a valid NIPT.', sq: 'Shkruani një NIPT të vlefshëm.' });
    expect(validate({ nipt: 'nipt' }, { nipt: 'K12345678L' }).ok).toBe(true);
    expect(validate({ nipt: 'nipt' }, { nipt: '123' }, { locale: 'sq' }).errors.nipt.message).toBe('Shkruani një NIPT të vlefshëm.');
    expect(validate({ a: 'required' }, { a: '' }, { messages: { required: 'Fill me' } }).errors.a.message).toBe('Fill me');
  });

  it('blocks bots with the honeypot and the time trap', () => {
    const now = 1_000_000;
    const s = schema({ email: 'email' });
    expect(s.validate({ email: 'a@b.co', _hp: '', _ts: String(now - 5000) }, { spam: true, now }).ok).toBe(true);
    expect(s.validate({ email: 'a@b.co', _hp: 'http://spam', _ts: String(now - 5000) }, { spam: true, now }).errors._form.code).toBe('spam');
    expect(s.validate({ email: 'a@b.co', _hp: '', _ts: String(now - 300) }, { spam: true, now }).ok).toBe(false);
  });
});

beforeAll(() => start());

const html = (s: string) => {
  const wrap = document.createElement('div');
  wrap.innerHTML = s.trim();
  document.body.append(wrap);
  return wrap.firstElementChild as HTMLElement;
};

describe('form effect (browser)', () => {
  it('shows accessible errors, live feedback, an email fix and blocks an invalid submit', async () => {
    const f = html(`<form data-fx="form" data-fx-country="AL">
      <input name="email" type="email" required>
      <input name="phone" type="tel">
      <textarea name="msg" maxlength="20"></textarea>
      <button>Send</button></form>`) as HTMLFormElement;
    await tick(10);
    expect(f.noValidate).toBe(true);
    expect(f.querySelector('[name=_hp]')).not.toBeNull();
    expect(f.querySelector('.fx-count')!.textContent).toBe('0 / 20');
    let invalid = 0;
    f.addEventListener('fx:invalid', () => invalid++);
    const ev = new Event('submit', { cancelable: true, bubbles: true });
    f.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(invalid).toBe(1);
    const email = f.querySelector<HTMLInputElement>('[name=email]')!;
    const err = f.querySelector<HTMLElement>('.fx-error')!;
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe(err.id);
    expect(err.textContent).toBe('This field is required.');

    email.value = 'arni@gmial.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    expect(email.hasAttribute('aria-invalid')).toBe(false);
    const hint = f.querySelector<HTMLElement>('.fx-hint')!;
    expect(hint.hasAttribute('data-show')).toBe(true);
    hint.querySelector('button')!.click();
    expect(email.value).toBe('arni@gmail.com');

    const phone = f.querySelector<HTMLInputElement>('[name=phone]')!;
    phone.value = '0691234567';
    phone.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(phone.value).toBe('+355 69 123 4567');
    expect(phone.hasAttribute('data-fx-valid')).toBe(true);

    const api = (f as HTMLFormElement & { fxForm: FormApi }).fxForm;
    expect(api.validate()).toBe(true);
    f.removeAttribute('data-fx');
    await tick();
    expect(f.querySelector('.fx-error, .fx-hint, .fx-count, [name=_hp]')).toBeNull();
    expect(f.noValidate).toBe(false);
  });

  it('submits with fetch and shows the server’s errors on the right fields', async () => {
    const f = html(`<form data-fx="form" data-fx-ajax action="/api/join" method="post">
      <input name="email" type="email" required value="taken@sphere.al">
      <button>Join</button><p data-fx-success hidden>Thanks!</p></form>`) as HTMLFormElement;
    await tick(10);
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, errors: { email: { code: 'taken', message: 'Already on the list.' } } }), { status: 422 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await tick(20);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(f.querySelector('.fx-error')!.textContent).toBe('Already on the list.');

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    let success = false;
    f.addEventListener('fx:success', () => (success = true));
    f.querySelector<HTMLInputElement>('[name=email]')!.value = 'new@sphere.al';
    f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await tick(20);
    expect(success).toBe(true);
    expect(f.getAttribute('data-fx-state')).toContain('sent');
    expect(f.querySelector<HTMLElement>('[data-fx-success]')!.hidden).toBe(false);
    vi.unstubAllGlobals();
  });
});
