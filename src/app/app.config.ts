import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from '@core/interceptors/auth';
import { API_BASE_URL, Config } from '@core/services/config';
import { AuthGateway } from '@features/auth/domain/gateways/auth.gateway';
import { HttpAuthGateway } from '@features/auth/infra/http-auth.gateway';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import { HttpJobtrackGateway } from '@features/jobtrack/infra/http-jobtrack.gateway';
import { ProfileGateway } from '@features/profile/domain/gateways/profile.gateway';
import { HttpProfileGateway } from '@features/profile/infra/http-profile.gateway';
import { ApiTokenGateway } from '@features/profile/domain/gateways/api-token.gateway';
import { HttpApiTokenGateway } from '@features/profile/infra/http-api-token.gateway';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Backend API
    { provide: API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
    provideAppInitializer(() => inject(Config).loadConfig()),

    // Clean Architecture: Gateway → HTTP implementation
    { provide: AuthGateway, useClass: HttpAuthGateway },
    { provide: JobtrackGateway, useClass: HttpJobtrackGateway },
    { provide: ProfileGateway, useClass: HttpProfileGateway },
    { provide: ApiTokenGateway, useClass: HttpApiTokenGateway },
    // Hydratation incrémentale (full hydration + event replay) — permet
    // `@defer (hydrate on ...)` : le contenu est prérendu puis hydraté à la demande.
    provideClientHydration(withIncrementalHydration(), withEventReplay()),
  ],
};
