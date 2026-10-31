import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import type { CookieOptions } from 'hono/utils/cookie';
import type { AppEnv } from '../env';
import { ACCESS_TTL_S, REFRESH_TTL_S } from './tokens';

// Cookie-only : les jetons ne transitent jamais par le body ni par le JS.
function options(c: Context<AppEnv>): CookieOptions {
  return {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Strict',
    path: '/',
  };
}

export function setAuthCookies(
  c: Context<AppEnv>,
  tokens: { accessToken: string; refreshToken: string },
): void {
  setCookie(c, 'refresh_token', tokens.refreshToken, { ...options(c), maxAge: REFRESH_TTL_S });
  setCookie(c, 'access_token', tokens.accessToken, { ...options(c), maxAge: ACCESS_TTL_S });
}

export function clearAuthCookies(c: Context<AppEnv>): void {
  deleteCookie(c, 'refresh_token', options(c));
  deleteCookie(c, 'access_token', options(c));
}
