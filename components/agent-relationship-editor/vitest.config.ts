import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@casehubio/blocks-ui-core', replacement: path.resolve(__dirname, '../../packages/blocks-ui-core/src') },
      { find: '@casehubio/graph-stencil-org', replacement: path.resolve(__dirname, '../../packages/graph-stencil-org/src') },
    ],
  },
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
