/**
 * lumafx/ui/server: everything that runs without a DOM. Validate what a model wrote, render it to
 * HTML for SEO and blogs, and get the JSON Schema, tool definitions and prompt reference.
 *
 *   import { anthropicTool, validate, renderToString } from 'lumafx/ui/server';
 */
export { BLOCKS, BLOCK_MAP, COMMON, S, opt, validate, jsonSchema, blockSchema, prompt, anthropicTool, openaiTool } from './schema';
export type { Block, Doc, BlockDef, T, UIError, Validated, ValidateOptions, ToolOptions } from './schema';
export { renderToString, renderBlock, RENDERERS } from './render';
export type { RenderOptions, Renderer, Ctx } from './render';
export { parsePartial } from './partial';
export { toText, blockToText } from './text';
export { addLabels, labels } from './i18n';
export { placePlayers, formationLines } from './blocks/sport';
