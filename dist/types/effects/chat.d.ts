import type { Effect } from '../core/types';
export interface ChatApi {
    open(): void;
    close(): void;
    toggle(): void;
    /** Adds a message from you (the site). Shows the typing indicator first when `typing` > 0 ms. */
    reply(text: string, opts?: {
        typing?: number;
    }): Promise<void>;
    /** Shows or hides the typing indicator. */
    typing(on: boolean): void;
    /** Sends a message as the visitor (same as typing it in). */
    send(text: string): void;
}
export declare const chat: Effect;
