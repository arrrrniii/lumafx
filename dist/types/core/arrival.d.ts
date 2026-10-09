/** Shared by the runtime and the page-transition effect: the note a covered page leaves for the next one. */
export declare const ARRIVAL_KEY = "fx-pt";
export interface Arrival {
    style: string;
    color: string;
    t: number;
}
/**
 * Called from start(): if the previous page left a "covering" note, paint the cover
 * before the first frame so the new page never flashes before the reveal.
 */
export declare function earlyCover(): void;
