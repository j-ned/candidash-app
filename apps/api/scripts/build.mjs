// Bundle de l'API pour le service Vercel « api » : le builder Services déploie dist/ seul,
// sans node_modules, d'où un fichier unique avec ses dépendances.
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // pg charge pg-native de façon optionnelle ; les modules CommonJS (pg, nodemailer) ont besoin de require.
  external: ['pg-native'],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
writeFileSync('dist/package.json', '{"type":"module"}\n');
