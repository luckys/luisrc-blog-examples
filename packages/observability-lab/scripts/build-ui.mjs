import { build } from 'esbuild'
await build({ entryPoints: [new URL('../web/app.tsx', import.meta.url).pathname],
  outfile: new URL('../.artifacts/app.js', import.meta.url).pathname,
  bundle: true, platform: 'browser', format: 'esm', target: 'es2023',
  define: { 'process.env.NODE_ENV': '"production"' }, minify: true })
