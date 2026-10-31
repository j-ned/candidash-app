import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { and, eq } from 'drizzle-orm';
import type { AppEnv } from '../env.js';
import { jobTracks } from '../db/schema.js';
import { httpError } from '../http-errors.js';
import { requireUser } from '../auth/middleware.js';
import { jobFileKey, type DocumentType } from '../files/job-files.js';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const PDF_MAGIC = '%PDF-';
const FILE_NAME_FIELD = { cv: 'cvFileName', lm: 'lmFileName' } as const;
const DELETED_MESSAGE = { cv: 'CV supprimé', lm: 'Lettre de motivation supprimée' } as const;

/** Candidature de l'utilisateur avec ses noms de fichiers, ou 404. */
async function ownJobFiles(c: Context<AppEnv>, id: string) {
  const job = await c.var.db.query.jobTracks.findFirst({
    columns: { id: true, cvFileName: true, lmFileName: true },
    where: and(eq(jobTracks.id, id), eq(jobTracks.userId, c.var.user.sub)),
  });
  if (!job) throw httpError(404, 'Candidature introuvable');
  return job;
}

async function upload(c: Context<AppEnv>, type: DocumentType) {
  const job = await ownJobFiles(c, c.req.param('id')!);
  const file = (await c.req.parseBody())['file'];
  if (!(file instanceof File)) throw httpError(400, 'Fichier manquant');
  const content = await file.arrayBuffer();
  // Le type MIME est déclaré par le client : la signature du fichier fait foi
  const signature = new TextDecoder().decode(content.slice(0, PDF_MAGIC.length));
  if (file.type !== 'application/pdf' || signature !== PDF_MAGIC) {
    throw httpError(400, 'Seuls les fichiers PDF sont acceptés');
  }
  if (content.byteLength > MAX_FILE_SIZE) throw httpError(400, 'Le fichier ne doit pas dépasser 5 Mo');

  await c.env.FILES.put(jobFileKey(c.var.user.sub, job.id, type), content, {
    contentType: 'application/pdf',
  });
  await c.var.db
    .update(jobTracks)
    .set({ [FILE_NAME_FIELD[type]]: file.name, updatedAt: new Date() })
    .where(eq(jobTracks.id, job.id));
  return c.json({ fileName: file.name }, 201);
}

async function download(c: Context<AppEnv>, type: DocumentType) {
  const job = await ownJobFiles(c, c.req.param('id')!);
  const fileName = job[FILE_NAME_FIELD[type]];
  const object = fileName && (await c.env.FILES.get(jobFileKey(c.var.user.sub, job.id, type)));
  if (!fileName || !object) throw httpError(404, 'Aucun document trouvé');
  return c.body(object.body, 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
  });
}

async function remove(c: Context<AppEnv>, type: DocumentType) {
  const job = await ownJobFiles(c, c.req.param('id')!);
  if (!job[FILE_NAME_FIELD[type]]) throw httpError(404, 'Aucun document trouvé');
  await c.env.FILES.delete(jobFileKey(c.var.user.sub, job.id, type));
  await c.var.db
    .update(jobTracks)
    .set({ [FILE_NAME_FIELD[type]]: null, updatedAt: new Date() })
    .where(eq(jobTracks.id, job.id));
  return c.json({ message: DELETED_MESSAGE[type] });
}

// Coupe la requête au-delà de 5 Mo (plus l'enveloppe multipart) sans la lire en entier
const uploadLimit = bodyLimit({
  maxSize: MAX_FILE_SIZE + 64 * 1024,
  onError: () => {
    throw httpError(413, 'Le fichier ne doit pas dépasser 5 Mo');
  },
});

export const jobFileRoutes = new Hono<AppEnv>();
for (const type of ['cv', 'lm'] as const) {
  jobFileRoutes
    .post(`/:id/${type}`, requireUser, uploadLimit, (c) => upload(c, type))
    .get(`/:id/${type}`, requireUser, (c) => download(c, type))
    .delete(`/:id/${type}`, requireUser, (c) => remove(c, type));
}
