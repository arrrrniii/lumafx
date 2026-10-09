export interface FxUIProps {
    /** A document ({ blocks }), a list of blocks, one block, or JSON text. */
    doc: unknown;
    /** Label language: en or sq. Default: the document's lang. */
    lang?: string;
    locale?: string;
    /** Time zone for dates, e.g. "Europe/Tirane". Set it on the server so the HTML matches. */
    timeZone?: string;
    /** Where follow-up chips go when no chat handles them, e.g. "/search?q=". */
    askUrl?: string;
    /** Pin "now" for countdowns so server and client agree. */
    now?: number;
    className?: string;
    id?: string;
}
export declare function FxUI({ doc, lang, locale, timeZone, askUrl, now, className, id }: FxUIProps): import("react").DOMElement<{
    className: string | undefined;
    id: string | undefined;
    lang: string | undefined;
    'time-zone': string | undefined;
    'ask-url': string | undefined;
    suppressHydrationWarning: boolean;
    dangerouslySetInnerHTML: {
        __html: string;
    };
}, Element>;
export { renderToString, validate, toText, prompt, jsonSchema, anthropicTool, openaiTool } from '../ui/server';
