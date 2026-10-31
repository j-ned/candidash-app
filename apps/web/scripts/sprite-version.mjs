// Empreinte du contenu de public/icons/sprite.svg, écrite dans un module TypeScript non versionné.
// Le sprite est servi en cache immuable (1 an) : sans empreinte dans l'URL, une icône ajoutée resterait
// invisible pour tout navigateur qui a déjà le fichier. Lancé avant build, test, lint et serve.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const sprite = readFileSync('public/icons/sprite.svg');
const version = createHash('sha256').update(sprite).digest('hex').slice(0, 8);
writeFileSync(
  'src/app/shared/ui/icon/sprite-version.ts',
  `// Généré par scripts/sprite-version.mjs, ne pas modifier.\nexport const SPRITE_VERSION = '${version}';\n`,
);
console.log(`sprite.svg -> v=${version}`);
