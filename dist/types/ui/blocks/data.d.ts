import type { Renderer } from '../render';
/** Round axis ticks: 0 / 250 / 500… */
export declare function niceTicks(min: number, max: number, count?: number): number[];
export declare const data: Record<string, Renderer>;
