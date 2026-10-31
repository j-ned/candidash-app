// Worker devant les fichiers statiques du front (Workers Static Assets) : il reprend le rôle de
// nginx — nonce CSP par requête, en-têtes de sécurité, cache, coquille CSR et config.json.

export type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** URL de l'API (https://…/api/v1) : config.json du front et connect-src de la CSP. */
  API_URL: string;
  EXTENSION_ID?: string;
  FIREFOX_ADDON_URL?: string;
};

/** Marqueur posé au build (index.html, ngCspNonce) : remplacé à chaque requête. */
const NONCE_MARKER = '**CSP_NONCE**';
const NO_STORE = 'no-cache, no-store, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const ONE_DAY = 'public, max-age=86400';
const STATIC_FILE = /\.(js|mjs|css|png|jpe?g|gif|ico|svg|woff2?|ttf|eot|webp|mp4|webm|json|txt|xml)$/i;
// Nom haché par le build (chunk-XXXXXXXX.js) ou empreinte ?v= (médias, sprite) : jamais modifié
const HASHED = /-[A-Za-z0-9_-]{8}\.(js|mjs|css)$/;

export function contentSecurityPolicy(apiUrl: string, nonce: string): string {
  const apiOrigin = new URL(apiUrl).origin;
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self'",
    // Aperçu PDF : iframe sur un blob local (pdf-viewer-modal)
    'frame-src blob:',
    `connect-src 'self' ${apiOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function cacheControl(url: URL, status: number, isHtml: boolean): string {
  // Une erreur ou une redirection ne doit pas rester en cache (fichier publié juste après…)
  if (isHtml || status !== 200) return NO_STORE;
  if (url.pathname === '/config.json') return 'no-cache';
  return HASHED.test(url.pathname) || url.searchParams.has('v') ? IMMUTABLE : ONE_DAY;
}

function secured(response: Response, url: URL, env: Env, nonce: string, isHtml: boolean): Response {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', contentSecurityPolicy(env.API_URL, nonce));
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Cache-Control', cacheControl(url, response.status, isHtml));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** Configuration lue par le front au démarrage (ce que faisait entrypoint.sh). */
function runtimeConfig(env: Env): Response {
  return Response.json({
    apiUrl: env.API_URL,
    ...(env.EXTENSION_ID && { extensionId: env.EXTENSION_ID }),
    ...(env.FIREFOX_ADDON_URL && { firefoxAddonUrl: env.FIREFOX_ADDON_URL }),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const nonce = crypto.randomUUID().replaceAll('-', '');

    if (url.pathname === '/config.json') {
      return secured(runtimeConfig(env), url, env, nonce, false);
    }

    let response = await env.ASSETS.fetch(request);
    // Route sans fichier ni page prérendue (/dashboard, /auth/…) : coquille CSR vierge. L'accueil
    // prérendu ferait flasher l'accueil avant la vraie route. `/index.csr` et non `.html` : le
    // service de fichiers redirigerait vers l'URL sans extension, et le navigateur quitterait la route.
    if (response.status === 404 && !STATIC_FILE.test(url.pathname)) {
      response = await env.ASSETS.fetch(new Request(new URL('/index.csr', url), request));
    }

    const isHtml = response.headers.get('Content-Type')?.includes('text/html') ?? false;
    if (isHtml) {
      const html = (await response.text()).replaceAll(NONCE_MARKER, nonce);
      const headers = new Headers(response.headers);
      headers.delete('Content-Length'); // la longueur change avec le nonce
      response = new Response(html, { status: response.status, headers });
    }
    return secured(response, url, env, nonce, isHtml);
  },
};
