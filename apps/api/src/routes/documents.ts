import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AppEnv } from '../env';
import type { Db } from '../db/client';
import { documents, jobTracks, type DocumentRow } from '../db/schema';
import { validate } from '../validate';
import { httpError } from '../http-errors';
import { requireUser } from '../auth/middleware';

// CV et lettres rédigés en Markdown. L'export PDF se fait dans le navigateur : l'API ne fait
// que stocker le texte (plus de Gotenberg).
export const DOCUMENT_MARKDOWN_MAX = 50_000;

const title = z
  .string()
  .trim()
  .min(1, { message: 'Le titre est requis' })
  .max(120, { message: 'Le titre ne peut pas dépasser 120 caractères' });
const markdown = z.string().max(DOCUMENT_MARKDOWN_MAX, { message: 'Le document dépasse 50 000 caractères' });

const createSchema = z
  .object({
    kind: z.enum(['CV', 'LETTER'], { message: 'Le type doit être CV ou LETTER' }),
    title,
    markdown: markdown.optional(),
    jobTrackId: z.string().min(1).optional(),
  })
  .strict();
const updateSchema = z
  .object({ title: title.optional(), markdown: markdown.optional(), jobTrackId: z.string().min(1).nullable().optional() })
  .strict();
const duplicateSchema = z.object({ title: title.optional(), jobTrackId: z.string().min(1).optional() }).strict();

const toDetail = ({ userId: _userId, ...detail }: DocumentRow) => detail;

// 404 et non 403 : l'existence du document d'un autre utilisateur ne doit pas se deviner
async function owned(db: Db, id: string, userId: string): Promise<DocumentRow> {
  const row = await db.query.documents.findFirst({ where: and(eq(documents.id, id), eq(documents.userId, userId)) });
  if (!row) throw httpError(404, 'Document introuvable');
  return row;
}

async function assertOwnJobTrack(db: Db, jobTrackId: string | null | undefined, userId: string) {
  if (!jobTrackId) return;
  const job = await db.query.jobTracks.findFirst({
    columns: { id: true },
    where: and(eq(jobTracks.id, jobTrackId), eq(jobTracks.userId, userId)),
  });
  if (!job) throw httpError(404, 'Candidature introuvable');
}

export const documentRoutes = new Hono<AppEnv>()
  .use(requireUser)

  // Liste sans le contenu, du plus récemment modifié au plus ancien
  .get('/', async (c) =>
    c.json(
      await c.var.db
        .select({
          id: documents.id,
          kind: documents.kind,
          title: documents.title,
          template: documents.template,
          baseDocumentId: documents.baseDocumentId,
          jobTrackId: documents.jobTrackId,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .where(eq(documents.userId, c.var.user.sub))
        .orderBy(desc(documents.updatedAt)),
    ),
  )

  .get('/:id', async (c) => c.json(toDetail(await owned(c.var.db, c.req.param('id'), c.var.user.sub))))

  .post('/', validate('json', createSchema), async (c) => {
    const dto = c.req.valid('json');
    await assertOwnJobTrack(c.var.db, dto.jobTrackId, c.var.user.sub);
    const [row] = await c.var.db
      .insert(documents)
      .values({
        userId: c.var.user.sub,
        kind: dto.kind,
        title: dto.title,
        markdown: dto.markdown ?? '',
        jobTrackId: dto.jobTrackId ?? null,
      })
      .returning();
    return c.json(toDetail(row!), 201);
  })

  .put('/:id', validate('json', updateSchema), async (c) => {
    const dto = c.req.valid('json');
    const doc = await owned(c.var.db, c.req.param('id'), c.var.user.sub);
    await assertOwnJobTrack(c.var.db, dto.jobTrackId, c.var.user.sub);
    const [row] = await c.var.db
      .update(documents)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.markdown !== undefined && { markdown: dto.markdown }),
        ...(dto.jobTrackId !== undefined && { jobTrackId: dto.jobTrackId }),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, doc.id))
      .returning();
    return c.json(toDetail(row!));
  })

  // Déclinaison indépendante (par exemple pour une offre), rattachée à son document de base
  .post('/:id/duplicate', validate('json', duplicateSchema), async (c) => {
    const dto = c.req.valid('json');
    const base = await owned(c.var.db, c.req.param('id'), c.var.user.sub);
    await assertOwnJobTrack(c.var.db, dto.jobTrackId, c.var.user.sub);
    const [row] = await c.var.db
      .insert(documents)
      .values({
        userId: c.var.user.sub,
        kind: base.kind,
        title: dto.title ?? `${base.title} (copie)`,
        markdown: base.markdown,
        template: base.template,
        baseDocumentId: base.id,
        jobTrackId: dto.jobTrackId ?? null,
      })
      .returning();
    return c.json(toDetail(row!), 201);
  })

  .delete('/:id', async (c) => {
    const doc = await owned(c.var.db, c.req.param('id'), c.var.user.sub);
    await c.var.db.delete(documents).where(eq(documents.id, doc.id));
    return c.body(null, 204);
  });
