import { defineConfig } from 'vitest/config';

// Tests d'intégration sous Node : l'app Hono est appelée en mémoire (app.request) contre un
// Postgres réel (DATABASE_URL). `wrangler dev` sert de contrôle du runtime Workers.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    fileParallelism: false,
    // argon2 en JS pur (~300 ms par hachage) : un parcours 2FA complet dépasse les 5 s par défaut
    // quand la machine est chargée (tests du front lancés en parallèle par `pnpm test`)
    testTimeout: 20_000,
  },
});
