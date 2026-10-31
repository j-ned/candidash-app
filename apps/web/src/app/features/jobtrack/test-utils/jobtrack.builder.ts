import type { JobTrack } from '../domain/models/jobtrack.model';

const defaults: JobTrack = {
  id: 'jt-1',
  userId: 'user-1',
  title: 'Frontend Developer',
  company: 'Acme Corp',
  jobUrl: 'https://acme.com/jobs/1',
  status: 'APPLIED',
  appliedAt: '2024-01-15',
  contractType: 'CDI',
  notes: null,
  attachments: null,
  cvFileName: null,
  lmFileName: null,
  reminder: null,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

export class JobTrackBuilder {
  private overrides: Partial<JobTrack> = {};

  static default(): JobTrackBuilder {
    return new JobTrackBuilder();
  }

  with<K extends keyof JobTrack>(key: K, value: JobTrack[K]): this {
    this.overrides[key] = value;
    return this;
  }

  build(): JobTrack {
    return { ...defaults, ...this.overrides };
  }
}
