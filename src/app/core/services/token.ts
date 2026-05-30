import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class TokenStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  hasValidRefreshToken(): boolean {
    if (!this.isBrowser) return false; // SSR-safe : pas de localStorage côté serveur
    const userStr = localStorage.getItem('auth_user');
    return Boolean(userStr && userStr !== 'undefined');
  }
}
