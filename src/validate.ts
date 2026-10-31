import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';
import { errorBody } from './http-errors';

// Comme le ZodValidationPipe Nest (schémas .strict()), mais le message est celui du premier
// champ invalide : c'est `message` que le front et l'extension affichent.
export function validate<T extends ZodType, K extends keyof ValidationTargets>(target: K, schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Validation failed';
      return c.json(errorBody(400, message), 400);
    }
  });
}
