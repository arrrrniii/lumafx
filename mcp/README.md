# lumafx-mcp

An MCP server that lets Claude, ChatGPT and other MCP Apps hosts answer with real interface: match cards, lineups on a pitch, live scores, standings, charts, weather, places, tickets and seat maps, quizzes, follow-up questions and more, from [lumafx/ui](../README.md#intelligent-ui-lumafxui). Free and open source (MIT).

- **One tool, `render_ui`.** The model sends `{ "blocks": [...] }`; the host shows them inline.
- **Streams.** The view renders the blocks while the model is still writing them.
- **Talks back.** Follow-up chips become the user's next message, links open through the host, ticket and seat picks reach the model's context.
- **Works everywhere.** Hosts without UI get a clean plain-text version of the same answer.
- **Small and safe.** The view is one self-contained 170 KB HTML file with no external requests; everything the model writes is escaped and checked, and unsafe links are dropped (the tool tells the model what it fixed).

## Run it

Needs Node 20 or newer. Each [release](https://github.com/arrrrniii/lumafx/releases) carries the package as `lumafx-mcp-<version>.tgz`; `npx` runs it straight from that link.

Claude Desktop (`claude_desktop_config.json`), Claude Code, Cursor, VS Code or any stdio client:

```json
{
  "mcpServers": {
    "lumafx": { "command": "npx", "args": ["-y", "https://github.com/arrrrniii/lumafx/releases/download/v0.5.0/lumafx-mcp-0.5.0.tgz", "--stdio"] }
  }
}
```

Claude Code in one line: `claude mcp add lumafx -- npx -y https://github.com/arrrrniii/lumafx/releases/download/v0.5.0/lumafx-mcp-0.5.0.tgz --stdio`

Over HTTP (Streamable HTTP, stateless), for remote hosts such as Claude.ai custom connectors and ChatGPT:

```bash
npx -y https://github.com/arrrrniii/lumafx/releases/download/v0.5.0/lumafx-mcp-0.5.0.tgz --port 3001                  # http://127.0.0.1:3001/mcp
npx -y https://github.com/arrrrniii/lumafx/releases/download/v0.5.0/lumafx-mcp-0.5.0.tgz --host 0.0.0.0 --port 3001   # all interfaces (put it behind HTTPS)
```

Or install it once and use the `lumafx-mcp` command:

```bash
npm install -g https://github.com/arrrrniii/lumafx/releases/download/v0.5.0/lumafx-mcp-0.5.0.tgz
lumafx-mcp --stdio
```

| Flag | Environment | |
|---|---|---|
| `--stdio` | | Talk over stdin and stdout |
| `--port 3001` | `PORT` | HTTP port |
| `--host 127.0.0.1` | `HOST` | HTTP host |
| `--types match,lineup,standings` | `LUMAFX_TYPES` | Offer only these blocks (a smaller tool definition) |
| `--images https://sphere.al,https://…` | `LUMAFX_IMAGE_DOMAINS` | Origins the view may load pictures from (crests, posters, photos). Hosts block every other origin; blocked pictures fold away. |
| `--full-schema` | `LUMAFX_FULL_SCHEMA=1` | Put the full JSON Schema (about 12k tokens) in the tool instead of the compact reference (about 2.5k) |

## Add it to your own MCP server

```bash
npm install https://github.com/arrrrniii/lumafx/releases/download/v0.5.0/lumafx-mcp-0.5.0.tgz
```

```js
import { McpServer } from '@modelcontextprotocol/server';
import { registerUI, uiToolMeta, uiResult } from 'lumafx-mcp';

const server = new McpServer({ name: 'sphere', version: '1.0.0' });

// The render_ui tool and its view.
registerUI(server, { imageDomains: ['https://sphere.al'] });

// Your own tools can render into the same view: link them with uiToolMeta and return uiResult(blocks).
server.registerTool(
  'get_event',
  { description: 'An event with tickets', inputSchema, _meta: uiToolMeta },
  async ({ slug }) => {
    const e = await getEvent(slug);
    return uiResult({
      lang: 'sq',
      blocks: [
        { type: 'event', name: e.name, start: e.start, venue: { name: e.venue }, image: e.poster, url: e.url, priceFrom: e.priceFrom, currency: 'ALL' },
        { type: 'tickets', currency: 'ALL', url: e.checkoutUrl, tiers: e.tiers },
        { type: 'suggestions', items: [{ text: 'How do I get to the venue?' }, { text: 'Similar events this month' }] },
      ],
    });
  },
);
```

`uiResult` validates the blocks and returns `structuredContent` for the view plus a plain-text `content` for the model and for hosts without UI. `createServer(options)` gives you a ready server; `viewHtml()` and `VIEW_URI` (`ui://lumafx/view.html`) are there if you serve the view yourself.

## How it works

- `render_ui` is linked to the `ui://lumafx/view.html` resource (`text/html;profile=mcp-app`) through `_meta.ui.resourceUri`, as in the MCP Apps spec (2026-01-26).
- The view does the `ui/initialize` handshake, renders `ui/notifications/tool-input-partial` as it arrives, settles on the validated `tool-result`, follows the host's theme, fonts and locale, and reports its height so the host can size the frame.
- It uses a small built-in MCP Apps client instead of bundling the SDK, which keeps the view at about 170 KB instead of 700 KB. The tests run it against the official host bridge from `@modelcontextprotocol/ext-apps`.

## Develop

```bash
cd mcp
npm install
npm run build   # dist/index.js (command), dist/server.js (library), dist/view.html
npm test        # stdio and HTTP end to end with the official MCP client
npm run test:view  # the view inside the official MCP Apps host bridge (needs Python Playwright)
```

MIT © Arnold Kajolli.
