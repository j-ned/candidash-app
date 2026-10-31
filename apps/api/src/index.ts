import type { Hono } from 'hono';
import type { AppEnv } from './env';
import { createApp } from './app';

// Point d'entrée Vercel (Hono détecté sans configuration) : une fonction Node pour /api/v1/*.
const app: Hono<AppEnv> = createApp();

export default app;
