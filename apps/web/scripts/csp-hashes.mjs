// CSP des scripts par empreintes, posée dans chaque page du build (après `ng build`). Le front est
// servi en statique par Vercel : pas de nonce par requête possible, et l'auto-CSP d'Angular refuse
// le prérendu. Chaque script inline exécutable reçoit son SHA-256 dans un <meta> CSP placé en tête
// de <head> ; le vercel.json racine pose le reste de la politique (frame-ancestors, connect-src…), et un
// script injecté sans empreinte reste bloqué par ce <meta>.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist/ng-candidash-app/browser';
const INLINE_SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
const DATA_TYPE = /type="application\/(ld\+)?json"/;
const META = /<meta http-equiv="Content-Security-Policy"[^>]*>/;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

for (const file of htmlFiles(root)) {
  const html = readFileSync(file, 'utf8').replace(META, '');
  const hashes = [...html.matchAll(INLINE_SCRIPT)]
    .filter(([, attrs = '']) => !attrs.includes('src=') && !DATA_TYPE.test(attrs))
    .map(([, , body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  const policy = [`script-src 'self' ${[...new Set(hashes)].join(' ')}`.trim(), "object-src 'none'", "base-uri 'self'"];
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy.join('; ')}">`;
  writeFileSync(file, html.replace(/<head>/, `<head>${meta}`));
}
