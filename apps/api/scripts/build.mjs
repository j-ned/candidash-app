// Bundles autonomes de l'API, dépendances incluses (dist/ est déployé sans node_modules) :
// dist/index.js pour le service Vercel « api », dist/main.js pour l'image Docker (serveur Node).
import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts', 'src/main.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  // Bundle ~2 Mo chargé à chaque démarrage à froid : la minification réduit la lecture et le parsing.
  minify: true,
  // drizzle reconnaît un Pool pg à son nom de classe (constructor.name.includes('Pool')) ; garder
  // les noms préserve aussi des traces d'erreur lisibles dans les logs Vercel.
  keepNames: true,
  // pg charge pg-native de façon optionnelle ; les modules CommonJS (pg, nodemailer) ont besoin de require.
  external: ['pg-native'],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
writeFileSync('dist/package.json', '{"type":"module"}\n');
