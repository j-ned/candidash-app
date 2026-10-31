import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { visits } from '../db/schema';
import { validate } from '../validate';
import { sha256Hex } from '../auth/crypto';
import { isBot, toReferrerHost, toTrackedPath, toVisitorHash } from '../analytics/visit-rules';
import { toVisitSource } from '../analytics/visit-source';

const trackSchema = z
  .object({ path: z.string().min(1).max(500), referrer: z.string().max(1000).optional() })
  .strict();

const hostOf = (origin: string | undefined) => {
  try {
    return origin ? new URL(origin).hostname : '';
  } catch {
    return '';
  }
};

/** Jour courant à Paris (AAAA-MM-JJ) : l'identifiant de visite change à minuit, heure locale. */
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());

export const analyticsRoutes = new Hono<AppEnv>()
  // Mesure d'audience sans cookie ni IP stockée ; ne lève jamais : une mesure perdue ne doit pas
  // casser la navigation
  .post('/track', validate('json', trackSchema), async (c) => {
    const { path: rawPath, referrer } = c.req.valid('json');
    const userAgent = c.req.header('user-agent') ?? '';
    const path = toTrackedPath(rawPath);
    if (isBot(userAgent) || !path) return c.body(null, 204);

    const referrerHost = toReferrerHost(referrer, hostOf(c.req.header('origin')));
    try {
      // Clé dérivée du secret JWT (pas de secret de plus), même dérivation que l'API Nest
      const secret = await sha256Hex(`analytics|${c.env.JWT_SECRET}`);
      await c.var.db.insert(visits).values({
        visitorHash: await toVisitorHash(secret, c.req.header('cf-connecting-ip') ?? '', userAgent, today()),
        path,
        referrerHost,
        source: toVisitSource(rawPath, referrerHost, userAgent),
      });
    } catch (error) {
      console.warn(`Visite non enregistrée : ${String(error)}`);
    }
    return c.body(null, 204);
  });
