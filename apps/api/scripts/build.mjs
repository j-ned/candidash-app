// Bundle autonome de l'API, dépendances incluses : dist/main.js, le serveur Node de l'image Docker
// (qui n'embarque pas node_modules).
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  // Bundle ~2 Mo chargé au démarrage du conteneur : la minification réduit la lecture et le parsing.
  minify: true,
  // drizzle reconnaît un Pool pg à son nom de classe (constructor.name.includes('Pool')) ; garder
  // les noms préserve aussi des traces d'erreur lisibles dans les journaux du conteneur.
  keepNames: true,
  // pg charge pg-native de façon optionnelle ; les modules CommonJS (pg, nodemailer) ont besoin de require.
  external: ['pg-native'],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
writeFileSync('dist/package.json', '{"type":"module"}\n');
