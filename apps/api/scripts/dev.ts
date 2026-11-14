import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';

// Serveur local (`pnpm dev`) : la même app qu'en production, variables lues dans .env.
if (existsSync('.env')) process.loadEnvFile('.env');
const { createApp } = await import('../src/create-app.js');
const app = createApp();

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) }, ({ port }) =>
  console.log(`API Candidash sur http://localhost:${port}/api/v1`),
);
