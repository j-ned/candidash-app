import { dateOnlyToIso } from './date-only-to-iso';

describe('dateOnlyToIso', () => {
  it('should convert a date-only string (YYYY-MM-DD) to a full ISO datetime string', () => {
    // Given
    const dateOnly = '2026-08-23';

    // When
    const result = dateOnlyToIso(dateOnly);

    // Then
    expect(result).toBe('2026-08-23T00:00:00.000Z');
  });

  it('should produce a string accepted by the same ISO datetime regex the backend validates against', () => {
    // Given
    const dateOnly = '2026-01-05';
    const isoDatetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

    // When
    const result = dateOnlyToIso(dateOnly);

    // Then
    expect(result).toMatch(isoDatetimeRegex);
  });
});
