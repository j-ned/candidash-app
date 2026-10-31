import { createApp, defaultMailer } from './app';
import type { Bindings } from './env';
import { runScheduled } from './jobs/scheduled';

const app = createApp();

export default {
  fetch: app.fetch,
  // Cron Triggers déclarés dans wrangler.jsonc
  scheduled: (controller, env, ctx) => ctx.waitUntil(runScheduled(controller.cron, env, defaultMailer(env))),
} satisfies ExportedHandler<Bindings>;
