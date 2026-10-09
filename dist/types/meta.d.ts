/**
 * Effect metadata — the single source of truth for the public API.
 *
 * Used by the runtime (option parsing, CSS-variable mapping, off-screen pausing),
 * by the React wrappers (which props are effect options), and by the build to
 * generate `effects.json` and `llms.txt` for AI coding agents.
 */
export type OptType = 'time' | 'length' | 'percent' | 'number' | 'color' | 'string' | 'boolean' | 'enum';
export interface Opt {
    type: OptType;
    default?: string | number | boolean;
    values?: readonly string[];
    /** Mapped to the `--fx-<key>` custom property so CSS can read it. */
    css?: boolean;
    desc: string;
}
export interface Meta {
    name: string;
    title: string;
    /** css = works with zero JS · js = needs the runtime · hybrid = CSS with JS upgrade · webgl = GPU shader */
    kind: 'css' | 'js' | 'hybrid' | 'webgl';
    desc: string;
    /** Infinite CSS animation: the runtime pauses it while off-screen. */
    loop?: boolean;
    options: Record<string, Opt>;
    example: string;
}
export declare const META: Record<string, Meta>;
export declare const EFFECT_NAMES: string[];
/** Every `data-fx-*` option attribute, for the MutationObserver filter. */
export declare function optionAttributes(): string[];
/** Option keys that are exposed to CSS as `--fx-<key>`. */
export declare function cssOptionKeys(): string[];
