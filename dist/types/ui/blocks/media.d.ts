import type { Renderer } from '../render';
export interface VideoRef {
    provider: 'youtube' | 'vimeo';
    id: string;
    watch: string;
    embed: string;
    poster: string;
}
/** Recognises YouTube and Vimeo links. Embed and poster URLs are built here, never taken from input. */
export declare function parseVideo(url: unknown, start?: number): VideoRef | null;
export declare const media: Record<string, Renderer>;
