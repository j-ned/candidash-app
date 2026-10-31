import { JobTrackBuilder } from '../test-utils/jobtrack.builder';
import type { JobStatus, JobTrack } from './models/jobtrack.model';
import {
  computeJobStats,
  conversionFunnel,
  countByStatus,
  interviewRate,
  sentDate,
  startOfWeek,
  weeklyActivity,
} from './job-stats';

function job(
  status: JobStatus,
  appliedAt: string | null = null,
  createdAt = '2026-10-01T12:00:00',
): JobTrack {
  return JobTrackBuilder.default()
    .with('id', `${status}-${appliedAt ?? 'none'}-${Math.random()}`)
    .with('status', status)
    .with('appliedAt', appliedAt)
    .with('createdAt', createdAt)
    .build();
}

function many(status: JobStatus, count: number): JobTrack[] {
  return Array.from({ length: count }, () => job(status, '2026-10-01T12:00:00'));
}

// Samedi 17 octobre 2026, midi (heure locale) : la semaine commence le lundi 12.
const NOW = new Date(2026, 9, 17, 12, 0, 0);

describe('job-stats', () => {
  describe('countByStatus', () => {
    it('counts every status, including the absent ones at zero', () => {
      // Given
      const jobs = [...many('TO_APPLY', 2), ...many('APPLIED', 3), ...many('REJECTED', 1)];

      // When
      const counts = countByStatus(jobs);

      // Then
      expect(counts).toEqual({ TO_APPLY: 2, APPLIED: 3, INTERVIEW: 0, ACCEPTED: 0, REJECTED: 1 });
    });
  });

  describe('interviewRate', () => {
    it.each<[string, JobTrack[], number | null]>([
      ['no sent application', many('TO_APPLY', 4), null],
      ['only sent, no interview', many('APPLIED', 4), 0],
      [
        'interviews and acceptances over every sent application',
        [
          ...many('APPLIED', 2),
          ...many('INTERVIEW', 1),
          ...many('ACCEPTED', 1),
          ...many('REJECTED', 2),
        ],
        2 / 6,
      ],
      [
        'spotted jobs are left out of the denominator',
        [...many('TO_APPLY', 10), ...many('INTERVIEW', 1), ...many('APPLIED', 1)],
        0.5,
      ],
      ['every sent application got an interview', many('ACCEPTED', 3), 1],
    ])('Given %s, returns the expected rate', (_label, jobs, expected) => {
      // When
      const rate = interviewRate(jobs);

      // Then
      if (expected === null) expect(rate).toBeNull();
      else expect(rate).toBeCloseTo(expected, 10);
    });
  });

  describe('sentDate', () => {
    it.each<[string, JobTrack, string | null]>([
      ['a spotted job is not sent, even with a date', job('TO_APPLY', '2026-10-10T12:00:00'), null],
      [
        'a sent job uses appliedAt',
        job('APPLIED', '2026-10-10T12:00:00', '2026-09-01T12:00:00'),
        '2026-10-10T12:00:00',
      ],
      [
        'a sent job without appliedAt falls back on createdAt',
        job('REJECTED', null, '2026-09-01T12:00:00'),
        '2026-09-01T12:00:00',
      ],
    ])('%s', (_label, given, expected) => {
      // When
      const date = sentDate(given);

      // Then
      expect(date?.getTime() ?? null).toBe(expected === null ? null : new Date(expected).getTime());
    });
  });

  describe('startOfWeek', () => {
    it.each<[string, Date, Date]>([
      ['a Saturday', new Date(2026, 9, 17, 12), new Date(2026, 9, 12)],
      ['a Monday', new Date(2026, 9, 12, 8), new Date(2026, 9, 12)],
      [
        'a Sunday belongs to the week started the previous Monday',
        new Date(2026, 9, 18, 23),
        new Date(2026, 9, 12),
      ],
    ])('returns the Monday at midnight for %s', (_label, date, expected) => {
      expect(startOfWeek(date).getTime()).toBe(expected.getTime());
    });
  });

  describe('weeklyActivity', () => {
    it('returns the last 8 weeks, oldest first, the current week last', () => {
      // When
      const weeks = weeklyActivity([], NOW);

      // Then
      expect(weeks).toHaveLength(8);
      expect(weeks[0].weekStart).toBe('2026-08-24');
      expect(weeks[7].weekStart).toBe('2026-10-12');
      expect(weeks.every((week) => week.count === 0)).toBe(true);
    });

    it.each<[string, JobTrack[], number[]]>([
      ['one sent this week', [job('APPLIED', '2026-10-14T12:00:00')], [0, 0, 0, 0, 0, 0, 0, 1]],
      [
        'two sent the previous week, one spotted ignored',
        [
          job('INTERVIEW', '2026-10-05T12:00:00'),
          job('APPLIED', '2026-10-11T12:00:00'),
          job('TO_APPLY', '2026-10-06T12:00:00'),
        ],
        [0, 0, 0, 0, 0, 0, 2, 0],
      ],
      [
        'older than 8 weeks is left out, the oldest week is kept',
        [job('APPLIED', '2026-08-23T12:00:00'), job('APPLIED', '2026-08-24T12:00:00')],
        [1, 0, 0, 0, 0, 0, 0, 0],
      ],
    ])('Given %s, counts sent applications per week', (_label, jobs, expected) => {
      // When
      const counts = weeklyActivity(jobs, NOW).map((week) => week.count);

      // Then
      expect(counts).toEqual(expected);
    });
  });

  describe('conversionFunnel', () => {
    it('chains spotted → sent → interviews → accepted with their share of the first step', () => {
      // Given
      const jobs = [
        ...many('TO_APPLY', 4),
        ...many('APPLIED', 2),
        ...many('INTERVIEW', 1),
        ...many('ACCEPTED', 1),
        ...many('REJECTED', 2),
      ];

      // When
      const funnel = conversionFunnel(jobs);

      // Then
      expect(funnel.map(({ key, label, count, share }) => [key, label, count, share])).toEqual([
        ['SPOTTED', 'Repérées', 10, 100],
        ['SENT', 'Envoyées', 6, 60],
        ['INTERVIEW', 'Entretiens', 2, 20],
        ['ACCEPTED', 'Acceptées', 1, 10],
      ]);
    });

    it('keeps every share at zero when there is no job', () => {
      expect(conversionFunnel([]).map((step) => step.share)).toEqual([0, 0, 0, 0]);
    });
  });

  describe('computeJobStats', () => {
    it.each<[string, JobTrack[], number, number]>([
      ['nothing sent', many('TO_APPLY', 3), 0, 0],
      ['sent on Monday of this week', [job('APPLIED', '2026-10-12T09:00:00')], 1, 1],
      [
        'sent at the beginning of the month, previous week',
        [job('APPLIED', '2026-10-02T12:00:00')],
        0,
        1,
      ],
      ['sent last month', [job('INTERVIEW', '2026-09-30T12:00:00')], 0, 0],
      [
        'sent without appliedAt, created this week (createdAt fallback)',
        [job('APPLIED', null, '2026-10-15T12:00:00')],
        1,
        1,
      ],
    ])(
      'Given %s, counts the applications sent this week and this month',
      (_label, jobs, week, month) => {
        // When
        const stats = computeJobStats(jobs, NOW);

        // Then
        expect([stats.sentThisWeek, stats.sentThisMonth]).toEqual([week, month]);
      },
    );

    it('exposes the total, the counts, the rate, the activity and the funnel', () => {
      // Given
      const jobs = [...many('TO_APPLY', 1), ...many('APPLIED', 1), ...many('INTERVIEW', 2)];

      // When
      const stats = computeJobStats(jobs, NOW);

      // Then
      expect(stats.total).toBe(4);
      expect(stats.byStatus.INTERVIEW).toBe(2);
      expect(stats.sent).toBe(3);
      expect(stats.interviewRate).toBeCloseTo(2 / 3, 10);
      expect(stats.weekly).toHaveLength(8);
      expect(stats.funnel).toHaveLength(4);
    });
  });
});
