import { defineConfig } from 'vitest/config';

// Tests d'intégration sous Node : l'app Hono est appelée en mémoire (app.request) contre un
// Postgres réel (DATABASE_URL). `wrangler dev` sert de contrôle du runtime Workers.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    fileParallelism: false,
  },
});
