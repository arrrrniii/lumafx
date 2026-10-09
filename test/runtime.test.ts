import { describe, it, expect, beforeAll, vi } from 'vitest';
import { start, register, stats, isStarted, version } from '../src/index';
import type { Effect } from '../src/core/types';
import { META } from '../src/meta';
import { tick } from './setup';

const log: string[] = [];
const probe: Effect = {
  name: 'probe',
  meta: { name: 'probe', title: 'Probe', kind: 'js', desc: '', options: {}, example: '' },
  mount(el, ctx) {
    log.push('mount:' + (el.id || el.className) + ':' + ctx.time('duration', 0));
    return () => log.push('unmount:' + (el.id || el.className));
  },
};

beforeAll(() => {
  register(probe);
  start();
});

describe('runtime', () => {
  it('starts and marks the document', () => {
    expect(isStarted()).toBe(true);
    expect(document.documentElement.classList.contains('fx-ready')).toBe(true);
    expect(document.documentElement.classList.contains('fx-booted')).toBe(true);
    expect(version).toBe('test');
  });

  it('mounts effects added later by attribute and by class', async () => {
    log.length = 0;
    document.body.insertAdjacentHTML('beforeend', '<div id="a" data-fx="probe" data-fx-duration="1.5s"></div><div class="fx-probe x"></div>');
    await tick();
    expect(log).toContain('mount:a:1500');
    expect(log).toContain('mount:fx-probe x:0');
    expect(stats().probe).toBe(2);
  });

  it('unmounts when the element is removed', async () => {
    log.length = 0;
    document.getElementById('a')!.remove();
    await tick();
    expect(log).toEqual(['unmount:a']);
  });

  it('remounts when an option attribute changes', async () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="b" data-fx="probe"></div>');
    await tick();
    log.length = 0;
    document.getElementById('b')!.setAttribute('data-fx-duration', '250');
    await tick();
    expect(log).toEqual(['unmount:b', 'mount:b:250']);
  });

  it('unmounts when the effect name is removed', async () => {
    log.length = 0;
    document.getElementById('b')!.removeAttribute('data-fx');
    await tick();
    expect(log).toEqual(['unmount:b']);
  });

  it('skips anything inside data-fx-off', async () => {
    log.length = 0;
    document.body.insertAdjacentHTML('beforeend', '<section data-fx-off><div id="c" data-fx="probe"></div></section>');
    await tick();
    expect(log).toEqual([]);
  });

  it('maps CSS options to non-inheriting variables with units', async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="beam" data-fx="border-beam" data-fx-duration="4000" data-fx-width="2" data-fx-length="30" data-fx-color="#f0f"></div>',
    );
    await tick();
    const s = document.getElementById('beam')!.style;
    expect(s.getPropertyValue('--fx-duration')).toBe('4000ms');
    expect(s.getPropertyValue('--fx-width')).toBe('2px');
    expect(s.getPropertyValue('--fx-length')).toBe('30%');
    expect(s.getPropertyValue('--fx-color')).toBe('#f0f');
  });

  it('removes mapped variables on unmount', async () => {
    const el = document.getElementById('beam')!;
    el.removeAttribute('data-fx');
    await tick();
    expect(el.style.getPropertyValue('--fx-duration')).toBe('');
  });

  it('warns once for unknown effects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.insertAdjacentHTML('beforeend', '<i data-fx="nope"></i><i data-fx="nope"></i>');
    await tick();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/Unknown effect "nope"/);
    warn.mockRestore();
  });

  it('keeps one effect failing from breaking the others', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register({ name: 'boom', meta: META.reveal, mount: () => { throw new Error('x'); } });
    log.length = 0;
    document.body.insertAdjacentHTML('beforeend', '<div id="d" data-fx="boom probe"></div>');
    await tick();
    expect(log).toContain('mount:d:0');
    warn.mockRestore();
  });
});
