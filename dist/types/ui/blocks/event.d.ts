import type { Renderer, Ctx } from '../render';
/** Where an event is in time: before, during or after. Registers the next change with the context. */
export declare function phase(c: Ctx, start: unknown, end: unknown, defaultHours?: number): 'before' | 'during' | 'after' | 'unknown';
export declare const events: Record<string, Renderer>;
