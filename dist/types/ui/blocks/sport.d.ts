import type { Renderer } from '../render';
/** ISO 3166 alpha-2 code → flag emoji. */
export declare const flag: (cc: unknown) => string;
/** Lines (outfield player counts, defence first) from a formation string or the players' positions. */
export declare function formationLines(formation: unknown, players: any[]): number[];
/** x/y (0–100, own goal at the bottom) for each player. Explicit x/y wins. */
export declare function placePlayers(players: any[], formation: unknown, half?: 'full' | 'bottom' | 'top', expected?: number): {
    x: number;
    y: number;
}[];
export declare const sport: Record<string, Renderer>;
