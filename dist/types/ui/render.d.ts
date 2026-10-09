/**
 * Renders lumafx/ui blocks to HTML strings. Isomorphic: the same function renders on the server
 * (for SEO, blogs and emails of the page) and in the browser; interactivity is attached separately
 * by `mount` functions in the browser build.
 */
import { type Block, type Doc } from './schema';
import { type Fmt } from './html';
export interface RenderOptions {
    /** Label language: en or sq. Default: the document's lang, else en. */
    lang?: string;
    /** Number and date locale, e.g. "sq-AL". Default: from lang. */
    locale?: string;
    /** Time zone for dates, e.g. "Europe/Tirane". Default: the viewer's. */
    timeZone?: string;
    /** Embed the JSON so the browser can make the HTML interactive (`hydrate`). Default true. */
    embed?: boolean;
    /** Current time, for countdowns and tests. */
    now?: number;
    /** Validate while the JSON is still streaming in. */
    partial?: boolean;
    /** Force a theme. Default: follows the page ([data-theme], .dark) or the system. */
    theme?: 'light' | 'dark';
}
export interface Ctx extends Fmt {
    t: (key: string) => string;
    lang: string;
    now: number;
    uid: (prefix?: string) => string;
    blocks: (list: unknown) => string;
    /** A renderer calls this with the moment its output would change (an event starts or ends). */
    expire: (at: number) => void;
    /** @internal earliest expiry registered while rendering the current block */
    exp?: number;
}
export type Renderer = (b: Block & Record<string, any>, c: Ctx) => string;
export declare const RENDERERS: Record<string, Renderer>;
export declare function makeCtx(o: RenderOptions & {
    lang: string;
}): Ctx;
export declare function renderBlock(b: Block, c: Ctx): string;
/** Every block in document order, nested ones included: the order of `.fxui-b` sections in the DOM. */
export declare function flatten(blocks: Block[]): Block[];
/** Renders a document (or blocks, or JSON text) to HTML. */
export declare function renderToString(input: unknown, o?: RenderOptions): string;
export type { Block, Doc };
