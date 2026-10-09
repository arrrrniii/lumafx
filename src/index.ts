import { register, start, stop, refresh, mount, stats, registered, isStarted } from './core/runtime';
import { env } from './core/env';
import { allEffects } from './effects/index';
import { transition } from './effects/morph';
import { page } from './effects/navigation';
import { modals } from './effects/modal';
import { loading } from './effects/loader3d';
import * as forms from './forms/core';
import { META, EFFECT_NAMES } from './meta';

register(...allEffects);

declare const __VERSION__: string;
export const version: string = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev';
export { start, stop, refresh, register, mount, stats, registered, isStarted, env, transition, page, modals, forms, loading, META, EFFECT_NAMES };
export type { FormApi } from './effects/form';
export type { LoadingOptions } from './effects/loader3d';
export type { ChatApi } from './effects/chat';
export * from './effects/index';
export type { StartOptions } from './core/runtime';
export type { Effect, Ctx, Cleanup } from './core/types';
export type { Meta, Opt } from './meta';
export type { Env } from './core/env';

const lumafx = { version, start, stop, refresh, register, mount, stats, registered, isStarted, env, transition, page, modals, forms, loading, effects: EFFECT_NAMES };
export default lumafx;
