import worker, { contentSecurityPolicy, type Env } from './worker';

const SHELL = '<html><script nonce="**CSP_NONCE**"></script><app-root ngCspNonce="**CSP_NONCE**"></app-root></html>';
const FILES: Record<string, { body: string; type: string }> = {
  '/': { body: SHELL.replace('<html>', '<html ng-server-context="ssg">'), type: 'text/html' },
  '/index.csr': { body: SHELL, type: 'text/html' },
  '/main-ABCD1234.js': { body: 'js', type: 'text/javascript' },
  '/favicon.svg': { body: '<svg/>', type: 'image/svg+xml' },
};

// Faux service de fichiers statiques : 404 pour tout fichier absent, comme Workers Static Assets
const assets: Env['ASSETS'] = {
  async fetch(request) {
    const file = FILES[new URL(request.url).pathname];
    return file
      ? new Response(file.body, { headers: { 'Content-Type': file.type, 'Content-Length': '9999' } })
      : new Response('Not found', { status: 404 });
  },
};

const env: Env = { ASSETS: assets, API_URL: 'https://api.example.test/api/v1', EXTENSION_ID: 'abc' };
const get = (path: string) => worker.fetch(new Request(`https://candidash.example.test${path}`), env);

describe('front Worker', () => {
  it('replaces the nonce marker with the CSP nonce, fresh on every request', async () => {
    const [first, second] = await Promise.all([get('/'), get('/')]);
    const nonce = first.headers.get('Content-Security-Policy')!.match(/nonce-([a-f0-9]+)/)![1];
    const html = await first.text();

    expect(html).not.toContain('**CSP_NONCE**');
    expect(html.match(new RegExp(`nonce="${nonce}"`, 'g'))).toHaveLength(1);
    expect(html).toContain(`ngCspNonce="${nonce}"`);
    expect(second.headers.get('Content-Security-Policy')).not.toContain(nonce);
    expect(first.headers.get('Content-Length')).toBeNull();
  });

  it('serves the blank CSR shell for a route without a file, never cached', async () => {
    const res = await get('/dashboard/jobtrack/42');

    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain('ng-server-context');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });

  it('keeps a 404 for a missing static file, and does not cache it', async () => {
    const res = await get('/chunk-MISSING1.js');

    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });

  it.each([
    ['/main-ABCD1234.js', 'public, max-age=31536000, immutable'],
    ['/favicon.svg?v=1a2b', 'public, max-age=31536000, immutable'],
    ['/favicon.svg', 'public, max-age=86400'],
  ])('caches %s with "%s"', async (path, expected) => {
    expect((await get(path)).headers.get('Cache-Control')).toBe(expected);
  });

  it('answers config.json from the Worker variables, revalidated on each visit', async () => {
    const res = await get('/config.json');

    expect(await res.json()).toEqual({ apiUrl: 'https://api.example.test/api/v1', extensionId: 'abc' });
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('sends the security headers on every response', async () => {
    const res = await get('/favicon.svg');

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  });

  it('allows only the API origin to be called, and blob frames for the PDF preview', () => {
    const csp = contentSecurityPolicy('https://api.example.test/api/v1', 'n0nce');

    expect(csp).toContain("connect-src 'self' https://api.example.test;");
    expect(csp).toContain('frame-src blob:');
    expect(csp).toContain("script-src 'self' 'nonce-n0nce'");
    expect(csp).not.toContain('unsafe-inline');
  });
});
