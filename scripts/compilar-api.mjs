import { build } from 'esbuild';
// Empaqueta la función de Vercel en un solo archivo ESM. Así no quedan imports sin extensión de src/ en runtime.
await build({ entryPoints: ['vercel/manejador.ts'], outfile: 'vercel-dist/manejador.mjs', bundle: true, platform: 'node', format: 'esm', target: 'node22', packages: 'external' });
