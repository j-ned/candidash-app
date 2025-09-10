import { Injectable, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { AuthService } from '@core/services/auth';

@Injectable({
  providedIn: 'root',
})
export class FileUrlService {
  private readonly baseUrl = environment.apiUrl;
  private readonly authService = inject(AuthService);

  getAvatarUrl(_avatarPath?: string): string {
    const userId = this.authService.user()?.id;
    if (!userId) return '';

    const timestamp = Date.now();
    return `${this.baseUrl}/accounts/avatar/${userId}?t=${timestamp}`;
  }

  getCvUrl(cvPath?: string): string {
    if (!cvPath) return '';

    return `${this.baseUrl.replace('/api/v1', '')}${cvPath}`;
  }

  getFileName(filePath?: string | null, defaultName = 'Fichier'): string {
    if (!filePath) return defaultName;

    const segments = filePath.split('/');
    const fileName = segments[segments.length - 1];

    return fileName || defaultName;
  }
}
