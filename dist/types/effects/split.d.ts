/**
 * Splits the text inside an element into animatable pieces without destroying
 * inline markup (links, <em>, <br>…). The original text nodes are kept so the
 * split can be undone exactly, which keeps frameworks like React happy.
 */
export type SplitMode = 'words' | 'chars' | 'lines';
export interface SplitResult {
    /** The animated pieces (words, or characters). */
    units: HTMLElement[];
    /** Word wrappers (in chars mode they hold the characters). */
    words: HTMLElement[];
    restore(): void;
}
export declare function splitText(root: HTMLElement, mode: SplitMode): SplitResult;
/** Assigns `--fx-i` per visual line (all words on a line share an index). */
export declare function indexLines(units: HTMLElement[]): void;
