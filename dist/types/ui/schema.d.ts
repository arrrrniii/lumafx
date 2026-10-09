/**
 * lumafx/ui schema: the blocks an AI (or your backend) can send, defined once.
 *
 * From these definitions come the validator (coerces and cleans what a model wrote), the JSON
 * Schema for tool calling and structured output, and a compact reference for system prompts.
 * No DOM here, so it runs in route handlers, MCP servers and the browser alike.
 */
export type Kind = 'string' | 'number' | 'integer' | 'boolean' | 'enum' | 'array' | 'object' | 'block' | 'cell';
export type Format = 'url' | 'image' | 'date' | 'color' | 'markdown';
export interface T {
    kind: Kind;
    desc?: string;
    optional?: boolean;
    values?: readonly string[];
    of?: T;
    props?: Record<string, T>;
    format?: Format;
    min?: number;
    max?: number;
    /** For arrays: [a, b] pairs and other fixed-length lists. */
    length?: number;
}
export declare const S: {
    str: (desc?: string) => T;
    md: (desc?: string) => T;
    url: (desc?: string) => T;
    img: (desc?: string) => T;
    date: (desc?: string) => T;
    color: (desc?: string) => T;
    num: (desc?: string, min?: number, max?: number) => T;
    int: (desc?: string, min?: number, max?: number) => T;
    bool: (desc?: string) => T;
    en: (values: readonly string[], desc?: string) => T;
    arr: (of: T, desc?: string) => T;
    pair: (of: T, desc?: string) => T;
    obj: (props: Record<string, T>, desc?: string) => T;
    /** A string or a number: table cells, stat values. */
    cell: (desc?: string) => T;
    blocks: (desc?: string) => T;
};
/** Marks a type optional. */
export declare const opt: (x: T) => T;
export interface BlockDef {
    type: string;
    group: 'content' | 'data' | 'sport' | 'event';
    desc: string;
    props: Record<string, T>;
    example: Record<string, unknown>;
}
/** Props every block accepts. */
export declare const COMMON: Record<string, T>;
export declare const BLOCKS: BlockDef[];
export declare const BLOCK_MAP: Record<string, BlockDef>;
export interface UIError {
    path: string;
    message: string;
}
export interface Block {
    type: string;
    [k: string]: unknown;
}
export interface Doc {
    blocks: Block[];
    lang?: string;
}
export interface ValidateOptions {
    /** While streaming: missing required fields are not errors and unfinished items are kept. */
    partial?: boolean;
    /** Keep blocks of unknown types (rendered as nothing) instead of dropping them. */
    keepUnknown?: boolean;
}
export interface Validated {
    ok: boolean;
    doc: Doc;
    errors: UIError[];
}
/**
 * Cleans what a model wrote: accepts a doc, a list of blocks or one block (also as a JSON string,
 * even wrapped in ```json fences). Coerces types, drops unknown props and unsafe URLs, and reports
 * what it fixed so you can send the errors back to the model.
 */
export declare function validate(input: unknown, o?: ValidateOptions): Validated;
type JSONSchema = Record<string, unknown>;
/** JSON Schema for one block type. */
export declare function blockSchema(type: string): JSONSchema;
/**
 * JSON Schema for a whole UI document: `{ blocks: Block[] }`. Pass `types` to offer only some
 * blocks (smaller prompts, focused tools).
 */
export declare function jsonSchema(types?: string[]): JSONSchema;
/**
 * A compact reference of the blocks for a system prompt (about 2–3k tokens for everything).
 * Pass `types` to include only some.
 */
export declare function prompt(types?: string[]): string;
export interface ToolOptions {
    name?: string;
    types?: string[];
    description?: string;
}
/** A tool definition for the Anthropic Messages API (`tools: [lumafxTool()]`). */
export declare function anthropicTool(o?: ToolOptions): {
    name: string;
    description: string;
    input_schema: JSONSchema;
};
/** A function tool for the OpenAI Responses / Chat Completions APIs. */
export declare function openaiTool(o?: ToolOptions): {
    type: 'function';
    name: string;
    description: string;
    parameters: JSONSchema;
};
export {};
