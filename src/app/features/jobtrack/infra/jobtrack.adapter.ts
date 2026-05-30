import type { JobTrack, Reminder } from '../domain/models/jobtrack.model';
import type { JobTrackApi, ReminderApi } from './jobtrack.types';

/** Fonctions pures : DTO API → modèle domain. Frontière infra explicite
 *  (découple la forme du wire du modèle domain consommé par l'app). */
export function toReminder(api: ReminderApi): Reminder {
  return {
    id: api.id,
    jobTrackId: api.jobTrackId,
    frequency: api.frequency,
    nextReminderAt: api.nextReminderAt,
    lastSentAt: api.lastSentAt,
    isActive: api.isActive,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function toJobTrack(api: JobTrackApi): JobTrack {
  return {
    id: api.id,
    userId: api.userId,
    title: api.title,
    company: api.company,
    jobUrl: api.jobUrl,
    status: api.status,
    appliedAt: api.appliedAt,
    contractType: api.contractType,
    notes: api.notes,
    attachments: api.attachments,
    cvFileName: api.cvFileName,
    lmFileName: api.lmFileName,
    reminder: api.reminder ? toReminder(api.reminder) : null,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}
