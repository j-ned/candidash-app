import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  hasValidRefreshToken(): boolean {
    const userStr = localStorage.getItem('auth_user');
    return Boolean(userStr && userStr !== 'undefined');
  }
}
