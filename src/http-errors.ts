import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const REASONS: Partial<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

// Même forme d'erreur que l'API Nest ({ statusCode, message, error }) : le front et
// l'extension lisent `message` sans changement.
export function errorBody(status: number, message: string) {
  return { statusCode: status, message, error: REASONS[status] ?? 'Error' };
}

export function httpError(status: ContentfulStatusCode, message: string): HTTPException {
  return new HTTPException(status, { message });
}

export function handleError(err: Error, c: Context): Response {
  if (err instanceof HTTPException) {
    return c.json(errorBody(err.status, err.message), err.status as ContentfulStatusCode);
  }
  console.error(err);
  return c.json(errorBody(500, 'Erreur interne du serveur'), 500);
}
