import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly accessToken = signal<string | null>(null);

  setAccessToken(accessToken: string): void {
    this.accessToken.set(accessToken);
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  clearAccessToken(): void {
    this.accessToken.set(null);
  }

  hasValidRefreshToken(): boolean {
    const userStr = localStorage.getItem('auth_user');
    return Boolean(userStr && userStr !== 'undefined');
  }
}
