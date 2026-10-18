import { updatedSince } from './updated-since';

const NOW = new Date('2026-10-18T12:00:00.000Z');

describe('updatedSince', () => {
  it.each([
    { at: '2026-10-18T11:59:40.000Z', label: 'à l’instant' },
    { at: '2026-10-18T11:55:00.000Z', label: 'il y a 5 minutes' },
    { at: '2026-10-18T09:00:00.000Z', label: 'il y a 3 heures' },
    { at: '2026-10-17T09:00:00.000Z', label: 'hier' },
    { at: '2026-10-14T12:00:00.000Z', label: 'il y a 4 jours' },
    { at: '2026-09-03T12:00:00.000Z', label: 'le 3 sept. 2026' },
  ])('Given an update at $at When labelled Then it reads « $label »', ({ at, label }) => {
    // Given / When / Then
    expect(updatedSince(new Date(at), NOW)).toBe(label);
  });
});
