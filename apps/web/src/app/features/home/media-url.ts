import { MEDIA_VERSIONS } from './media-versions';

/** `/demo/x.webp` → `/demo/x.webp?v=<empreinte>` : URL changée dès que le fichier change. */
export function withVersion(
  path: string,
  versions: Readonly<Record<string, string>> = MEDIA_VERSIONS,
): string {
  const version = versions[path.replace(/^\//, '')];
  return version ? `${path}?v=${version}` : path;
}
