export type GroupId = 'entrance' | 'hover' | 'scroll' | 'surface' | 'motion' | 'components';
export declare const GROUPS: {
    id: GroupId;
    label: string;
    desc: string;
    effects: string[];
}[];
/** What kind of element an effect is meant for, so a panel can hide ones that do not fit. */
export type Fit = 'any' | 'text' | 'container' | 'image' | 'media' | 'button' | 'link' | 'svg' | 'dialog' | 'form' | 'page';
export declare const FITS: Record<string, Fit>;
export declare function groupOf(effect: string): GroupId;
export interface Field {
    key: string;
    label: string;
    type: 'select' | 'toggle' | 'color' | 'number' | 'range' | 'time' | 'length' | 'percent' | 'text';
    default?: string | number | boolean;
    options?: {
        value: string;
        label: string;
    }[];
    min?: number;
    max?: number;
    step?: number;
    /** For time/length/percent: the unit the number is in. */
    unit?: string;
    help: string;
}
export declare const label: (key: string) => string;
/** Form fields for an effect's options, ready to render in a settings panel. */
export declare function fields(effect: string): Field[];
export interface CatalogEntry {
    name: string;
    title: string;
    desc: string;
    kind: string;
    group: GroupId;
    fit: Fit;
    example: string;
    fields: Field[];
}
/** Every effect with its group, what it fits and its fields. Render a picker straight from this. */
export declare function catalog(): CatalogEntry[];
export interface FxSpec {
    effect: string;
    options?: Record<string, string | number | boolean>;
}
export interface Preset {
    id: string;
    label: string;
    group: GroupId;
    /** One or more effects applied together. */
    fx: FxSpec[];
}
/** Curated starting points. Each one is plain data, so builders can store or extend them. */
export declare const PRESETS: Preset[];
export declare const presetById: (id: string) => Preset | undefined;
/** The kinds of element `el` counts as, most specific first. */
export declare function fitsOf(el: Element): Fit[];
/** Effects that suit `el`, in group order. Page-level pieces are left out unless `el` is the page. */
export declare function suggest(el: Element): string[];
/** Presets whose effects all suit `el`. */
export declare function presetsFor(el: Element): Preset[];
