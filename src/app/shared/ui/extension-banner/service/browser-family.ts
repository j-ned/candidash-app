export type BrowserFamily = 'firefox' | 'chromium' | 'other';

export function toBrowserFamily(userAgent: string): BrowserFamily {
  if (/\bFirefox\//.test(userAgent)) return 'firefox';
  if (/\b(Chrome|Chromium|Edg)\//.test(userAgent)) return 'chromium';
  return 'other';
}
