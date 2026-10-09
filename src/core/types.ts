import type { Meta } from '../meta';
import type { Env } from './env';

export type Cleanup = () => void;

export interface Ctx {
  el: HTMLElement;
  env: Env;
  /** Raw option: `data-fx-<key>` attribute, else the `--fx-<key>` CSS variable, else undefined. */
  str(key: string, def?: string): string | undefined;
  num(key: string, def: number): number;
  /** Milliseconds. Accepts "1.2s", "400ms" or a bare number of ms. */
  time(key: string, def: number): number;
  /** Pixels for px or bare numbers; other units are resolved against the element. */
  px(key: string, def: number): number;
  /** Presence of `data-fx-<key>` (or "true"); "false"/"0" turn it off. */
  bool(key: string, def: boolean): boolean;
}

export interface Effect {
  name: string;
  meta: Meta;
  mount?(el: HTMLElement, ctx: Ctx): Cleanup | void;
}
