import { build } from 'esbuild';

await build({
  entryPoints: ['src/diagram-entry.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/diagram-panel.bundle.js',
  sourcemap: 'linked',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
