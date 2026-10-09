import type { Effect } from '../core/types';
export declare const textReveal: Effect;
export declare const scramble: Effect;
export interface ParsedNumber {
    prefix: string;
    suffix: string;
    value: number;
    decimals: number;
    decimalSep: string;
    groupSep: string;
}
/** Finds the first number in a string and remembers how it was formatted. */
export declare function parseNumber(text: string): ParsedNumber | null;
export declare function formatNumber(n: number, p: ParsedNumber): string;
export declare const counter: Effect;
