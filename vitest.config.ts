import { defineConfig } from 'vitest/config';

import { fileURLToPath } from 'node:url';

export default defineConfig({
  define: { __VERSION__: JSON.stringify('test') },
  resolve: { alias: { 'lumafx/ui': fileURLToPath(new URL('./src/ui/index.ts', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    setupFiles: ['test/setup.ts'],
  },
});
