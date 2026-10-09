/** String helpers for lumafx/ui renderers. Everything a model wrote passes through `esc` or `md`. */
export declare const esc: (v: unknown) => string;
export declare const safeUrl: (u: unknown) => string;
export declare const isExternal: (u: string) => boolean;
/** `<a>` attributes for a link that may leave the page. */
export declare const linkAttrs: (u: string) => string;
export declare const safeColor: (c: unknown, fallback?: string) => string;
/** Small, safe markdown: paragraphs, "- " and "1. " lists, line breaks, inline styles. */
export declare function md(src: unknown): string;
export interface Fmt {
    locale: string;
    timeZone?: string;
}
export declare function parseDate(v: unknown): Date | null;
export declare function fmtDate(f: Fmt, v: unknown, kind?: 'date' | 'time' | 'datetime' | 'day' | 'short' | 'dom' | 'month'): string;
export declare function fmtNum(f: Fmt, n: unknown, o?: Intl.NumberFormatOptions): string;
export declare function money(f: Fmt, n: unknown, currency?: string): string;
export declare const initials: (name: unknown) => string;
export declare const ICONS: Record<string, string>;
export declare const icon: (name: string) => string;
