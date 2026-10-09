/**
 * Plain-text version of a UI document: for MCP hosts and models that show no UI, for screen
 * readers, for feeds and for the model's own context after it rendered something.
 */
import type { Block, Doc } from './schema';
export declare function blockToText(b: Block): string;
/** The whole document as readable text. */
export declare function toText(doc: Doc): string;
