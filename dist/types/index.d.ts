import { register, start, stop, refresh, mount, stats, registered, isStarted } from './core/runtime';
import { env } from './core/env';
import { transition } from './effects/morph';
import { page } from './effects/navigation';
import { modals } from './effects/modal';
import { loading } from './effects/loader3d';
import * as forms from './forms/core';
import { META, EFFECT_NAMES } from './meta';
export declare const version: string;
export { start, stop, refresh, register, mount, stats, registered, isStarted, env, transition, page, modals, forms, loading, META, EFFECT_NAMES };
export type { FormApi } from './effects/form';
export type { LoadingOptions } from './effects/loader3d';
export type { ChatApi } from './effects/chat';
export * from './effects/index';
export type { StartOptions } from './core/runtime';
export type { Effect, Ctx, Cleanup } from './core/types';
export type { Meta, Opt } from './meta';
export type { Env } from './core/env';
declare const lumafx: {
    version: string;
    start: typeof start;
    stop: typeof stop;
    refresh: typeof refresh;
    register: typeof register;
    mount: typeof mount;
    stats: typeof stats;
    registered: typeof registered;
    isStarted: typeof isStarted;
    env: import(".").Env;
    transition: typeof transition;
    page: {
        cover: (x?: number, y?: number) => Promise<void>;
        reveal: () => Promise<void>;
    };
    modals: {
        open: (target: string | HTMLDialogElement, opts?: {
            from?: Element | null;
        }) => void;
        close: (target: string | HTMLDialogElement) => void;
    };
    forms: typeof forms;
    loading: typeof loading;
    effects: string[];
};
export default lumafx;
