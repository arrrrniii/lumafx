/**
 * Parses JSON that is still arriving. Strings that are cut off are closed (except for links,
 * dates and enums, see WHOLE), unfinished numbers, keys and literals are dropped, and open arrays
 * and objects are closed, so a UI can render whatever has arrived so far. Text before the first
 * { or [ (and ```json fences) is ignored.
 */
export declare function parsePartial(text: string): unknown;
