import { build } from 'esbuild';
const comun = { bundle: true, platform: 'node', format: 'esm', target: 'node22', packages: 'bundle', external: ['@electric-sql/pglite'] };
await build({ ...comun, entryPoints: ['servidor/main.ts'], outfile: 'servidor-dist/main.mjs' });
await build({ ...comun, entryPoints: ['pruebas/fixtures/semillaDemo.ts'], outfile: 'servidor-dist/semillaDemo.mjs' });
