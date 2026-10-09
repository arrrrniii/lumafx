/**
 * lumafx-mcp command line.
 *
 *   lumafx-mcp --stdio                         # Claude Desktop, Claude Code, any stdio client
 *   lumafx-mcp                                 # Streamable HTTP on http://localhost:3001/mcp
 *   (without installing: npx -y https://github.com/arrrrniii/lumafx/releases/download/v<version>/lumafx-mcp-<version>.tgz)
 *
 * Options (flags or environment):
 *   --port 3001              PORT
 *   --types match,lineup     LUMAFX_TYPES          only offer these blocks
 *   --images https://a,…     LUMAFX_IMAGE_DOMAINS  origins the view may load images from
 *   --full-schema            LUMAFX_FULL_SCHEMA=1  put the full JSON Schema in the tool
 */
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import cors from 'cors';
import type { Request, Response } from 'express';
import { createServer, VERSION, type UIOptions } from './server';

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : 'true';
};
const list = (v?: string) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : undefined);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`lumafx-mcp ${VERSION}

  --stdio              talk over stdin/stdout (Claude Desktop, Claude Code)
  --port <n>           HTTP port (default 3001, env PORT)
  --host <h>           HTTP host (default 127.0.0.1, env HOST)
  --types <a,b>        only offer these block types (env LUMAFX_TYPES)
  --images <origins>   origins the view may load images from (env LUMAFX_IMAGE_DOMAINS)
  --full-schema        full JSON Schema in the tool definition (env LUMAFX_FULL_SCHEMA=1)`);
  process.exit(0);
}

const options: UIOptions = {
  types: list(flag('types') ?? process.env.LUMAFX_TYPES),
  imageDomains: list(flag('images') ?? process.env.LUMAFX_IMAGE_DOMAINS),
  fullSchema: flag('full-schema') === 'true' || process.env.LUMAFX_FULL_SCHEMA === '1',
};
const make = () => createServer(options);

async function http() {
  const port = Number(flag('port') ?? process.env.PORT ?? 3001);
  const host = flag('host') ?? process.env.HOST ?? '127.0.0.1';
  const app = createMcpExpressApp({ host });
  app.use(cors({ exposedHeaders: ['Mcp-Session-Id'] }));
  app.get('/', (_req: Request, res: Response) => res.type('text/plain').send(`lumafx-mcp ${VERSION}: POST /mcp`));
  app.all('/mcp', async (req: Request, res: Response) => {
    const server = make();
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP error:', error);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  });
  const srv = app.listen(port, host, (err?: Error) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`lumafx-mcp ${VERSION} on http://${host}:${port}/mcp`);
  });
  const stop = () => srv.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (argv.includes('--stdio')) {
  make()
    .connect(new StdioServerTransport())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
} else {
  http().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
