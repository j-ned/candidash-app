import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp } from './create-app.js';
import { runMigrations } from './db/migrate.js';
import { nodeEnv } from './node-env.js';

// Point d'entrée de l'image Docker (`node dist/main.js`) : un serveur Node au long cours, là où
// Vercel appelle `index.ts` requête par requête. Une variable manquante ou une migration en échec
// arrête le démarrage, avant que le conteneur ne soit déclaré sain.
const env = nodeEnv();
// `drizzle/` est voisin de `src/` dans le dépôt et de `dist/` dans l'image.
await runMigrations(env.DATABASE_URL, fileURLToPath(new URL('../drizzle', import.meta.url)));

const server = serve(
  { fetch: createApp().fetch, port: Number(process.env.PORT ?? 3000), hostname: '0.0.0.0' },
  ({ port }) => console.info(`API Candidash à l'écoute sur le port ${port} (${env.ENVIRONMENT})`),
);

// `docker stop` et les mises à jour Swarm envoient SIGTERM : finir les requêtes en cours.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
