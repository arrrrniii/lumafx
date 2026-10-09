import { type FxSpec } from './catalog';
export interface PanelChange {
    target: Element;
    fx: FxSpec[];
    attributes: Record<string, string>;
    html: string;
}
/** Registers <fx-panel> (or your own tag name). Safe to call more than once and on the server. */
export declare function definePanel(tag?: string): void;
