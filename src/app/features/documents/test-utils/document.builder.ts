import type { DocumentDetailApi, DocumentSummaryApi } from '../infra/document.types';

const SUMMARY: DocumentSummaryApi = {
  id: 'doc-1',
  kind: 'CV',
  title: 'Mon CV',
  template: 'sobre',
  baseDocumentId: null,
  jobTrackId: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-17T08:30:00.000Z',
};

export function documentSummaryApi(
  overrides: Partial<DocumentSummaryApi> = {},
): DocumentSummaryApi {
  return { ...SUMMARY, ...overrides };
}

export function documentDetailApi(overrides: Partial<DocumentDetailApi> = {}): DocumentDetailApi {
  return { ...SUMMARY, markdown: '# Camille Martin\n\nDéveloppeuse Angular', ...overrides };
}
