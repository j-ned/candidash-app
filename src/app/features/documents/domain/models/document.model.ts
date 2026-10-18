export type DocumentKind = 'CV' | 'LETTER';

/** Élément de liste : l'API ne renvoie pas le Markdown dans la liste. */
export type DocumentSummary = {
  readonly id: string;
  readonly kind: DocumentKind;
  readonly title: string;
  readonly template: string;
  /** Document de base dont celui-ci est une déclinaison (copie indépendante). */
  readonly baseDocumentId: string | null;
  /** Candidature visée. */
  readonly jobTrackId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type DocumentDetail = DocumentSummary & { readonly markdown: string };

export type CreateDocumentPayload = {
  readonly kind: DocumentKind;
  readonly title: string;
  readonly markdown?: string;
  readonly jobTrackId?: string;
};

/** `jobTrackId: null` détache le document de sa candidature. */
export type UpdateDocumentPayload = {
  readonly title?: string;
  readonly markdown?: string;
  readonly jobTrackId?: string | null;
};

export type DuplicateDocumentPayload = {
  readonly title?: string;
  readonly jobTrackId?: string;
};

/** Export PDF : le fichier et le nom choisi par l'API. */
export type DocumentPdf = { readonly fileName: string; readonly blob: Blob };

/** Le PDF joint à la candidature comme CV (`cv`) ou lettre de motivation (`lm`). */
export type AttachedPdf = {
  readonly jobTrackId: string;
  readonly type: 'cv' | 'lm';
  readonly fileName: string;
};

/** Bornes identiques à celles de l'API (dto/document.dto.ts). */
export const DOCUMENT_TITLE_MAX = 120;
export const DOCUMENT_MARKDOWN_MAX = 50_000;
