import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { httpError } from '../http-errors';
import { sha256Hex, timingSafeEqualHex } from '../auth/crypto';
import { purgeExpired, sendDueReminders } from '../jobs/scheduled';

// Appelé une fois par jour par Vercel Cron (vercel.json) avec `Authorization: Bearer CRON_SECRET`.
export const cronRoutes = new Hono<AppEnv>().get('/daily', async (c) => {
  const secret = c.env.CRON_SECRET;
  const given = c.req.header('authorization') ?? '';
  const authorized =
    !!secret && timingSafeEqualHex(await sha256Hex(given), await sha256Hex(`Bearer ${secret}`));
  if (!authorized) throw httpError(401, 'Non autorisé');

  const reminders = await sendDueReminders(c.var.db, c.var.mailer);
  await purgeExpired(c.var.db);
  console.log(`Relances : ${reminders.sent} envoyée(s), ${reminders.failed} échec(s)`);
  return c.json(reminders);
});
