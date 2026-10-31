import type { Bucket } from './bucket';

// CV et lettres de motivation joints aux candidatures, dans R2 :
// une clé par fichier, `<userId>/<jobTrackId>/{cv,lm}.pdf` (même schéma que l'API Nest).
export type DocumentType = 'cv' | 'lm';

export const jobFileKey = (userId: string, jobTrackId: string, type: DocumentType) =>
  `${userId}/${jobTrackId}/${type}.pdf`;

type JobWithFiles = { id: string; cvFileName: string | null; lmFileName: string | null };

/**
 * Supprime les fichiers enregistrés de ces candidatures (RGPD), avant la suppression en base :
 * sinon les PDF resteraient orphelins dans le bucket. Aucun appel à R2 sans fichier.
 */
export async function deleteJobFiles(bucket: Bucket, userId: string, jobs: JobWithFiles[]): Promise<void> {
  const keys = jobs.flatMap((job) => [
    ...(job.cvFileName ? [jobFileKey(userId, job.id, 'cv')] : []),
    ...(job.lmFileName ? [jobFileKey(userId, job.id, 'lm')] : []),
  ]);
  if (keys.length) await bucket.delete(keys);
}
