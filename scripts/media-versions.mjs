// Empreinte du contenu de chaque média de la landing (public/demo, public/badges), écrite dans un
// module TypeScript non versionné. Ces fichiers ont des noms fixes et sont servis en cache
// immuable : sans empreinte dans l'URL, une capture régénérée par `pnpm capture` resterait
// invisible pour tout navigateur qui a déjà l'ancienne. Une empreinte par fichier : recapturer une
// scène n'invalide que ses fichiers. Lancé avant build, test, lint et serve.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const versions = {};
for (const dir of ['demo', 'badges']) {
  for (const name of readdirSync(`public/${dir}`).sort()) {
    const content = readFileSync(`public/${dir}/${name}`);
    versions[`${dir}/${name}`] = createHash('sha256').update(content).digest('hex').slice(0, 8);
  }
}
writeFileSync(
  'src/app/features/home/media-versions.ts',
  `// Généré par scripts/media-versions.mjs, ne pas modifier.\nexport const MEDIA_VERSIONS: Readonly<Record<string, string>> = ${JSON.stringify(versions, null, 2)};\n`,
);
console.log(`médias de la landing -> ${Object.keys(versions).length} empreintes`);
