import { Component, type Provider, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi, type Mock } from 'vitest';
import { Config } from '@core/services/config';
import { JobtrackGateway } from '@features/jobtrack/domain/gateways/jobtrack.gateway';
import { ConfirmModal } from '@shared/ui/confirm-modal/confirm-modal';
import { Layout } from '@shared/ui/layout/layout';
import { Toaster } from '@shared/ui/toast/service/toast';

export const API = 'https://api.example.test/api/v1';
export const DOCUMENTS_URL = `${API}/documents`;
export const JOBS_URL = `${API}/jobtrack`;

export type ResponseBody = Parameters<TestRequest['flush']>[0];

export type Harness = {
  readonly http: HttpTestingController;
  readonly router: Router;
  readonly toaster: { readonly success: Mock; readonly danger: Mock };
  readonly confirm: Mock;
};

// La vraie enveloppe tire l'authentification (menu avatar) : hors sujet pour ces pages.
@Component({ selector: 'app-layout', template: '<ng-content />' })
class LayoutStub {}

/** Gateway réelle sur HttpTestingController ; toasts, modale de confirmation et jobtrack doublés. */
export function setupDocumentsTest(
  page: Type<unknown>,
  confirmAnswer = true,
  providers: readonly Provider[] = [],
): Harness {
  const toaster = { success: vi.fn(), danger: vi.fn() };
  const confirm = vi.fn().mockResolvedValue(confirmAnswer);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: Config, useValue: { apiUrl: API } },
      { provide: JobtrackGateway, useValue: { listUrl: () => JOBS_URL } },
      { provide: Toaster, useValue: toaster },
      { provide: ConfirmModal, useValue: { confirm } },
      ...providers,
    ],
  });
  TestBed.overrideComponent(page, {
    remove: { imports: [Layout] },
    add: { imports: [LayoutStub] },
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return { http: TestBed.inject(HttpTestingController), router, toaster, confirm };
}

/** Laisse partir les requêtes des httpResource, répond, puis rend. */
export async function respond(
  fixture: ComponentFixture<unknown>,
  http: HttpTestingController,
  responses: readonly {
    readonly url: string;
    readonly body: ResponseBody;
    readonly method?: string;
  }[],
): Promise<void> {
  TestBed.tick();
  for (const { url, body, method = 'GET' } of responses) {
    http.expectOne({ method, url }).flush(body);
  }
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Laisse finir les promesses en cours (une ressource rechargée garde la fixture instable). */
export function nextMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
