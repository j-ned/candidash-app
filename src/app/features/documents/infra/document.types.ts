import type { DocumentKind } from '../domain/models/document.model';

/** Formes brutes renvoyées par l'API : dates en ISO string. */
export type DocumentSummaryApi = {
  id: string;
  kind: DocumentKind;
  title: string;
  template: string;
  baseDocumentId: string | null;
  jobTrackId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetailApi = DocumentSummaryApi & { markdown: string };
