import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env.js';
import { validate } from '../validate.js';
import { httpError } from '../http-errors.js';
import { rateLimit } from '../auth/middleware.js';

const UNAVAILABLE = "Le message n'a pas pu être envoyé, réessayez plus tard.";

const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Le nom doit contenir au moins 2 caractères' })
      .max(100, { message: 'Le nom ne peut pas dépasser 100 caractères' }),
    email: z.string().trim().pipe(z.email({ message: 'Email invalide' })).pipe(z.string().max(254)),
    subject: z
      .string()
      .trim()
      .min(3, { message: 'Le sujet doit contenir au moins 3 caractères' })
      .max(150, { message: 'Le sujet ne peut pas dépasser 150 caractères' }),
    message: z
      .string()
      .trim()
      .min(10, { message: 'Le message doit contenir au moins 10 caractères' })
      .max(5000, { message: 'Le message ne peut pas dépasser 5000 caractères' }),
    // Honeypot : invisible pour un humain, rempli par les robots
    website: z.string().max(200).optional(),
  })
  .strict();

export const contactRoutes = new Hono<AppEnv>()
  // Limite après la validation : corriger un champ ne consomme pas d'envoi
  .post('/', validate('json', contactSchema), rateLimit('CONTACT_LIMITER'), async (c) => {
    const { website, ...message } = c.req.valid('json');
    if (website) {
      console.warn('Message de contact ignoré (honeypot rempli)');
      return c.body(null, 204);
    }
    const to = c.env.CONTACT_RECIPIENT;
    if (!to) {
      console.error('CONTACT_RECIPIENT absent : formulaire de contact inactif');
      throw httpError(503, UNAVAILABLE);
    }
    if (!(await c.var.mailer.sendContact({ to, ...message }))) throw httpError(503, UNAVAILABLE);
    return c.body(null, 204);
  });
