import type { DocumentDetail, DocumentSummary } from '../domain/models/document.model';
import type { DocumentDetailApi, DocumentSummaryApi } from './document.types';

export function toDocumentSummary(raw: DocumentSummaryApi): DocumentSummary {
  return {
    id: raw.id,
    kind: raw.kind,
    title: raw.title,
    template: raw.template,
    baseDocumentId: raw.baseDocumentId,
    jobTrackId: raw.jobTrackId,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export function toDocumentSummaries(raw: DocumentSummaryApi[]): DocumentSummary[] {
  return raw.map(toDocumentSummary);
}

export function toDocumentDetail(raw: DocumentDetailApi): DocumentDetail {
  return { ...toDocumentSummary(raw), markdown: raw.markdown };
}
