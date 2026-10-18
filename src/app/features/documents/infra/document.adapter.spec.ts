import { toDocumentDetail, toDocumentSummaries } from './document.adapter';
import { documentDetailApi, documentSummaryApi } from '../test-utils/document.builder';

describe('toDocumentSummaries', () => {
  it('Given API summaries When adapted Then the dates become Date objects and the rest is kept', () => {
    // Given
    const raw = [
      documentSummaryApi({ id: 'd1', baseDocumentId: 'd0', jobTrackId: 'jt-1' }),
      documentSummaryApi({ id: 'd2', kind: 'LETTER' }),
    ];

    // When
    const [first, second] = toDocumentSummaries(raw);

    // Then
    expect(first).toEqual({
      id: 'd1',
      kind: 'CV',
      title: 'Mon CV',
      template: 'sobre',
      baseDocumentId: 'd0',
      jobTrackId: 'jt-1',
      createdAt: new Date('2026-10-01T10:00:00.000Z'),
      updatedAt: new Date('2026-10-17T08:30:00.000Z'),
    });
    expect(second.kind).toBe('LETTER');
    expect(second.baseDocumentId).toBeNull();
  });
});

describe('toDocumentDetail', () => {
  it('Given an API document When adapted Then its Markdown is kept with Date objects', () => {
    // Given
    const raw = documentDetailApi({ markdown: '# Camille' });

    // When
    const detail = toDocumentDetail(raw);

    // Then
    expect(detail.markdown).toBe('# Camille');
    expect(detail.updatedAt).toEqual(new Date('2026-10-17T08:30:00.000Z'));
  });
});
