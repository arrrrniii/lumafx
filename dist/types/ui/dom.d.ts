/**
 * lumafx/ui in the browser: render documents into the page, stream them in while a model is still
 * writing, make server-rendered HTML interactive, keep blocks live through data adapters, and the
 * <fx-ui> element for blogs and CMSs.
 */
import { type Block, type Doc, type ValidateOptions } from './schema';
import { type Ctx, type RenderOptions } from './render';
type Cleanup = () => void;
type Mount = (el: HTMLElement, b: Block & Record<string, any>, c: Ctx) => Cleanup | void;
/** Add interactivity for your own block type, or replace a built-in one. */
export declare function addMount(type: string, fn: Mount): void;
export interface Adapter {
    /** Fetch fresh props for a block. Called every `live.every` seconds (default 30). */
    fetch?(id: string, block: Block): Promise<Record<string, unknown>>;
    /** Or push updates yourself (WebSocket, SSE…). Return an unsubscribe function. */
    subscribe?(id: string, block: Block, push: (props: Record<string, unknown>) => void): () => void;
}
export declare const adapter: {
    set(name: string, a: Adapter): void;
    get(name: string): Adapter | undefined;
    delete(name: string): void;
};
/** Renders a document (object, blocks, one block or JSON text) into `el`. */
export declare function render(el: HTMLElement, input: unknown, opts?: RenderOptions & ValidateOptions): {
    doc: Doc;
    errors: import("./schema").UIError[];
};
/** Makes server-rendered HTML (`renderToString`) interactive without re-rendering it. */
export declare function hydrate(el: HTMLElement, opts?: RenderOptions): void;
export interface Stream {
    /** Add the next chunk of JSON text as it arrives from the model. */
    write(chunk: string): void;
    /** Replace everything received so far (e.g. partial tool input that is resent whole). */
    set(textOrDoc: string | unknown): void;
    /** The model finished: validate strictly and settle. Returns validation errors, if any. */
    end(): {
        doc: Doc;
        errors: {
            path: string;
            message: string;
        }[];
    };
    readonly text: string;
}
/**
 * Renders JSON while it streams in. Finished blocks stay put; the one being written updates in
 * place, and its new items (players, rows, events) pop in as they arrive.
 */
export declare function stream(el: HTMLElement, opts?: RenderOptions): Stream;
/** Updates one block (found by its `id`) with new props, e.g. a live score. */
export declare function update(el: HTMLElement, id: string, props: Record<string, unknown>): boolean;
/** Removes listeners, timers and live subscriptions. */
export declare function destroy(el: HTMLElement): void;
/**
 * <fx-ui> renders the JSON inside it (or from `src`), for blogs and CMSs:
 *
 *   <fx-ui lang="sq"><script type="application/json">{"blocks":[…]}</script></fx-ui>
 *   <fx-ui src="/api/match/123/ui.json"></fx-ui>
 */
export declare function defineElement(tag?: string): void;
export {};
