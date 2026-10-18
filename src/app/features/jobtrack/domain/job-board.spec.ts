import { JobTrackBuilder } from '../test-utils/jobtrack.builder';
import type { JobStatus, JobTrack } from './models/jobtrack.model';
import {
  groupByStatus,
  moveJob,
  relativeDate,
  reminderNotice,
  replaceJob,
  statusChangePayload,
} from './job-board';

function job(id: string, status: JobStatus, appliedAt: string | null = null): JobTrack {
  return JobTrackBuilder.default()
    .with('id', id)
    .with('title', `Poste ${id}`)
    .with('status', status)
    .with('appliedAt', appliedAt)
    .build();
}

const NOW = new Date(2026, 9, 17, 12, 0, 0);

describe('job-board', () => {
  describe('groupByStatus', () => {
    it('returns one column per status, in the pipeline order, with French titles and counts', () => {
      // Given
      const jobs = [job('1', 'APPLIED'), job('2', 'TO_APPLY'), job('3', 'APPLIED')];

      // When
      const columns = groupByStatus(jobs);

      // Then
      expect(columns.map(({ status, title, count }) => [status, title, count])).toEqual([
        ['TO_APPLY', 'Repérées', 1],
        ['APPLIED', 'Envoyées', 2],
        ['INTERVIEW', 'Entretiens prévus', 0],
        ['ACCEPTED', 'Acceptées', 0],
        ['REJECTED', 'Refusées', 0],
      ]);
      expect(columns[1].jobs.map((j) => j.id)).toEqual(['1', '3']);
    });
  });

  describe('moveJob', () => {
    it.each<[JobStatus]>([['INTERVIEW'], ['REJECTED'], ['TO_APPLY']])(
      'moves the targeted job to %s without mutating the source',
      (target) => {
        // Given
        const jobs = [job('1', 'APPLIED'), job('2', 'APPLIED')];

        // When
        const moved = moveJob(jobs, '2', target);

        // Then
        expect(moved.map((j) => j.status)).toEqual(['APPLIED', target]);
        expect(jobs[1].status).toBe('APPLIED');
        expect(moved[0]).toBe(jobs[0]);
      },
    );

    it('leaves the list untouched when the job is unknown', () => {
      const jobs = [job('1', 'APPLIED')];
      expect(moveJob(jobs, 'missing', 'ACCEPTED')).toEqual(jobs);
    });
  });

  describe('replaceJob (rollback and server reconciliation)', () => {
    it('restores the previous version of a moved job, leaving the other moves in place', () => {
      // Given : deux déplacements optimistes, le second échoue
      const original = [job('1', 'APPLIED'), job('2', 'TO_APPLY')];
      const afterMoves = moveJob(moveJob(original, '1', 'INTERVIEW'), '2', 'APPLIED');

      // When
      const rolledBack = replaceJob(afterMoves, original[1]);

      // Then
      expect(rolledBack.map((j) => j.status)).toEqual(['INTERVIEW', 'TO_APPLY']);
    });
  });

  describe('statusChangePayload', () => {
    it.each<[string, JobTrack, JobStatus, Record<string, string>]>([
      [
        'spotted → sent without date sets appliedAt to now',
        job('1', 'TO_APPLY'),
        'APPLIED',
        { appliedAt: NOW.toISOString() },
      ],
      [
        'spotted → interview without date sets appliedAt to now',
        job('1', 'TO_APPLY'),
        'INTERVIEW',
        { appliedAt: NOW.toISOString() },
      ],
      [
        'sent → interview keeps the existing appliedAt',
        job('1', 'APPLIED', '2026-10-01T10:00:00.000Z'),
        'INTERVIEW',
        {},
      ],
      ['sent → spotted does not invent a date', job('1', 'APPLIED'), 'TO_APPLY', {}],
    ])('%s', (_label, given, target, extra) => {
      // When
      const payload = statusChangePayload(given, target, NOW);

      // Then
      expect(payload).toEqual({ title: given.title, status: target, ...extra });
    });
  });

  describe('reminderNotice', () => {
    const reminder = (isActive: boolean) => ({
      id: 'r-1',
      jobTrackId: '1',
      frequency: 7,
      nextReminderAt: '2026-10-24T12:00:00.000Z',
      isActive,
      createdAt: '2026-10-17T12:00:00.000Z',
      updatedAt: '2026-10-17T12:00:00.000Z',
    });

    it('announces the follow-up reminder of a sent application', () => {
      // Given
      const sent = { ...job('1', 'APPLIED'), reminder: reminder(true) };

      // When / Then
      expect(reminderNotice(sent)).toBe('Rappel pour relancer le 24 oct.');
    });

    it.each([
      ['no reminder', { ...job('1', 'APPLIED'), reminder: null }],
      ['an inactive reminder', { ...job('1', 'APPLIED'), reminder: reminder(false) }],
      ['another status', { ...job('1', 'INTERVIEW'), reminder: reminder(true) }],
    ])('says nothing with %s', (_case, candidate) => {
      expect(reminderNotice(candidate)).toBeNull();
    });
  });

  describe('relativeDate', () => {
    it.each<[string, string]>([
      ['2026-10-17T08:00:00', 'aujourd’hui'],
      ['2026-10-16T08:00:00', 'hier'],
      ['2026-10-14T08:00:00', 'il y a 3 jours'],
      ['2026-10-03T08:00:00', 'il y a 2 semaines'],
      ['2026-07-10T08:00:00', 'il y a 3 mois'],
      ['2025-09-01T08:00:00', 'il y a 1 an'],
    ])('formats %s as « %s »', (iso, expected) => {
      expect(relativeDate(iso, NOW).replace("'", '’')).toBe(expected);
    });
  });
});
