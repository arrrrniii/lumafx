import type { OptType } from '../meta';
import type { Env } from './env';
import type { Ctx } from './types';
/** Normalizes an attribute value into a CSS value: bare numbers get the option's unit. */
export declare function cssValue(type: OptType, raw: string): string;
/** "1.2s" → 1200, "400ms" → 400, "400" → 400. */
export declare function parseTime(v: string | undefined | null, def: number): number;
export declare function parsePx(v: string | undefined | null, def: number, el?: Element): number;
export declare function makeCtx(el: HTMLElement, env: Env): Ctx;
