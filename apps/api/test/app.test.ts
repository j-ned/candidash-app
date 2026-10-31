import { describe, expect, it } from 'vitest';
import { request } from './helpers.js';

describe('app', () => {
  it('reports health once the database answers', async () => {
    const res = await request('/health');

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  it('answers unknown routes with the Nest error shape', async () => {
    const res = await request('/nope');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      statusCode: 404,
      message: 'Cannot GET /api/v1/nope',
      error: 'Not Found',
    });
  });

  it('sends security headers and only trusts the configured origin', async () => {
    const res = await request('/health', { headers: { Origin: 'https://evil.example' } });

    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
