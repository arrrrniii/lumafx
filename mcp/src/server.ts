/**
 * lumafx-mcp: shows lumafx/ui blocks (match cards, lineups, standings, charts, weather, tickets…)
 * as interactive UI inside MCP Apps hosts such as Claude and ChatGPT.
 *
 * Use it on its own (`createServer`) or add the tool to your own MCP server (`registerUI`), and
 * link your own tools to the same view with `uiToolMeta` + `uiResult`.
 */
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { McpServer, type CallToolResult, type ReadResourceResult, type StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { BLOCKS, prompt, jsonSchema, validate, toText, type Doc } from '../../src/ui/server';

declare const __VIEW_HTML__: string;
declare const __VERSION__: string;

export const VERSION: string = typeof __VERSION__ === 'string' ? __VERSION__ : '0.0.0-dev';
/** The view every lumafx tool renders into. */
export const VIEW_URI = 'ui://lumafx/view.html';
/** The bundled view (HTML with the renderer and CSS inlined). */
export const viewHtml = (): string => (typeof __VIEW_HTML__ === 'string' ? __VIEW_HTML__ : '');

/** `_meta` for any tool whose result should render as lumafx UI. */
export const uiToolMeta = { ui: { resourceUri: VIEW_URI } } as const;

export interface UIOptions {
  /** Tool name. Default "render_ui". */
  name?: string;
  title?: string;
  /** Replaces the first paragraph of the tool description (the block reference is always added). */
  description?: string;
  /** Offer only some block types (smaller tool definition), e.g. ["match", "lineup", "standings"]. */
  types?: string[];
  /** Origins the view may load images from, e.g. ["https://sphere.al", "https://media.api-sports.io"]. */
  imageDomains?: string[];
  /** Put the full JSON Schema (about 12k tokens) in the tool definition instead of the compact reference. */
  fullSchema?: boolean;
}

const ALL = BLOCKS.map((b) => b.type);

const INTRO =
  'Show the answer as rich, interactive UI right in the chat: match cards, lineups on a pitch, live scores, standings, stats, charts, tables, weather, places, tickets and seat maps, quizzes, timelines and more. It renders while you write it. Use it whenever structured facts read better as UI than as text, then add at most a sentence or two of prose.';

/** A JSON-Schema input that the SDK passes through untouched: blocks are checked leniently by `validate`. */
function passThrough(schema: Record<string, unknown>): StandardSchemaWithJSON {
  return {
    '~standard': {
      version: 1,
      vendor: 'lumafx',
      jsonSchema: { input: () => schema, output: () => schema },
      validate: (value: unknown) => ({ value }),
    },
  } as unknown as StandardSchemaWithJSON;
}

function inputSchema(types: string[], full: boolean) {
  if (full) return jsonSchema(types);
  return {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        description: 'Blocks in reading order. Their props are listed in the tool description.',
        items: { type: 'object', properties: { type: { type: 'string', enum: types } }, required: ['type'], additionalProperties: true },
      },
      lang: { type: 'string', description: 'Language of the built-in labels: "en" or "sq" (Albanian). Use the language of the conversation.' },
    },
    required: ['blocks'],
  };
}

/**
 * Turns blocks into a tool result that renders in the lumafx view: structured content for the
 * view, plus a plain-text version for the model and for hosts without UI.
 */
export function uiResult(input: unknown, o: { lang?: string } = {}): CallToolResult {
  const { doc, errors } = validate(input);
  if (o.lang && !doc.lang) doc.lang = o.lang;
  if (!doc.blocks.length) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Nothing to show. ${errors.map((e) => `${e.path || 'input'}: ${e.message}`).join('; ') || 'Send {"blocks": [...]}'}` }],
    };
  }
  const fixes = errors.length
    ? `\n\n(Shown with ${errors.length} fix${errors.length > 1 ? 'es' : ''}: ${errors
        .slice(0, 12)
        .map((e) => `${e.path}: ${e.message}`)
        .join('; ')}${errors.length > 12 ? '; …' : ''})`
    : '';
  return {
    content: [{ type: 'text', text: `Shown to the user as UI:\n\n${toText(doc)}${fixes}` }],
    structuredContent: doc as unknown as Record<string, unknown>,
  };
}

const registered = new WeakSet<object>();

/** Registers the view resource once per server. `registerUI` calls it for you. */
export function registerView(server: McpServer, o: Pick<UIOptions, 'imageDomains'> = {}) {
  if (registered.has(server)) return;
  registered.add(server);
  const csp = o.imageDomains?.length ? { resourceDomains: o.imageDomains } : undefined;
  registerAppResource(
    server,
    'lumafx UI',
    VIEW_URI,
    { mimeType: RESOURCE_MIME_TYPE, description: 'Renders lumafx/ui blocks.', _meta: { ui: { prefersBorder: false, ...(csp ? { csp } : {}) } } },
    async (): Promise<ReadResourceResult> => ({
      contents: [{ uri: VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: viewHtml(), _meta: { ui: { prefersBorder: false, ...(csp ? { csp } : {}) } } }],
    }),
  );
}

/** Adds the `render_ui` tool and its view to an MCP server (yours or `createServer()`'s). */
export function registerUI(server: McpServer, o: UIOptions = {}) {
  const types = (o.types?.length ? o.types : ALL).filter((t) => ALL.includes(t));
  registerView(server, o);
  const reference = o.fullSchema ? '' : '\n\n' + prompt(types).split('\n').slice(1).join('\n');
  return registerAppTool(
    server,
    o.name ?? 'render_ui',
    {
      title: o.title ?? 'Show UI',
      description: (o.description ?? INTRO) + reference,
      inputSchema: passThrough(inputSchema(types, !!o.fullSchema)),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false },
      _meta: { ...uiToolMeta },
    },
    async (args: unknown) => uiResult(args),
  );
}

/** A ready MCP server with the `render_ui` tool. */
export function createServer(o: UIOptions = {}): McpServer {
  const server = new McpServer({ name: 'lumafx', title: 'lumafx UI', version: VERSION });
  registerUI(server, o);
  return server;
}

export type { Doc };
