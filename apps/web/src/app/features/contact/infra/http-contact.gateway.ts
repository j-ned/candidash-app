import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from '@core/services/config';
import type { ContactMessage } from '../domain/models/contact-message.model';

@Injectable({ providedIn: 'root' })
export class HttpContactGateway {
  private readonly http = inject(HttpClient);
  private readonly config = inject(Config);

  send(message: ContactMessage): Observable<void> {
    return this.http.post<void>(`${this.config.apiUrl}/contact`, message);
  }
}
