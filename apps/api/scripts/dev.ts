import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';

// Serveur local (`pnpm dev`) : la même app que sur Vercel, variables lues dans .env.
if (existsSync('.env')) process.loadEnvFile('.env');
const { default: app } = await import('../src/index');

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8787) }, ({ port }) =>
  console.log(`API Candidash sur http://localhost:${port}/api/v1`),
);
