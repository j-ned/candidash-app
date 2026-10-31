import { z } from 'zod';
import { contractTypeEnum, jobStatusEnum } from '../db/schema.js';

// Repris des DTO de l'API Nest (mêmes règles, mêmes messages).
export const OFFER_TEXT_MAX = 20_000;

const isoDate = (message: string) => z.iso.datetime({ message });
const offerText = z
  .string({ message: 'Le texte de l’offre doit être une chaîne de caractères' })
  .max(OFFER_TEXT_MAX, { message: 'Le texte de l’offre ne peut pas dépasser 20 000 caractères' });
const contractType = z.enum(contractTypeEnum.enumValues, {
  message: 'Le type de contrat doit être un type de contrat valide',
});

const jobFields = {
  title: z
    .string({ message: 'Le titre doit être une chaîne de caractères' })
    .min(1, { message: 'Le titre ne peut pas être vide' }),
  company: z.string({ message: 'Le nom de l’entreprise doit être une chaîne de caractères' }).optional(),
  jobUrl: z.string({ message: 'L’URL de l’offre doit être une chaîne de caractères' }).optional(),
  appliedAt: isoDate('La date de candidature doit être une date ISO valide').optional(),
  status: z
    .enum(jobStatusEnum.enumValues, { message: 'Le statut doit être un statut de candidature valide' })
    .optional(),
  contractType: contractType.optional(),
  notes: z.string({ message: 'Les notes doivent être une chaîne de caractères' }).optional(),
  offerText: offerText.optional(),
};

const frequency = z
  .number({ message: 'La fréquence doit être un entier' })
  .int({ message: 'La fréquence doit être un entier' })
  .min(1, { message: 'La fréquence doit être d’au moins 1 jour' });
const nextReminderAt = isoDate('La prochaine date de rappel doit être une date ISO valide');
const isActive = z.boolean({ message: 'Le champ isActive doit être un booléen' });

export const createWithReminderSchema = z
  .object({ ...jobFields, frequency, nextReminderAt, isActive: isActive.optional() })
  .strict();

export const updateWithReminderSchema = z
  .object({
    ...z.object(jobFields).partial().shape,
    frequency: frequency.optional(),
    nextReminderAt: nextReminderAt.optional(),
    isActive: isActive.optional(),
  })
  .strict();

export const quickAddSchema = z
  .object({
    title: z
      .string({ message: 'Le titre doit être une chaîne de caractères' })
      .min(1, { message: 'Le titre ne peut pas être vide' })
      .max(200, { message: 'Le titre ne peut pas dépasser 200 caractères' }),
    company: z
      .string({ message: "Le nom de l'entreprise doit être une chaîne de caractères" })
      .max(200, { message: "Le nom de l'entreprise ne peut pas dépasser 200 caractères" })
      .optional(),
    jobUrl: z.string({ message: "L'URL de l'offre doit être une chaîne de caractères" }).optional(),
    notes: z.string({ message: 'Les notes doivent être une chaîne de caractères' }).optional(),
    offerText: offerText.optional(),
    contractType: contractType.optional(),
    status: z
      .enum(['TO_APPLY', 'APPLIED'], { message: 'Le statut doit être "Repérée" ou "Candidaturée"' })
      .default('TO_APPLY'),
  })
  .strict();

export const lookupSchema = z.object({ url: z.string().min(1).max(2000) }).strict();
export const statusParamSchema = z.object({ status: z.enum(jobStatusEnum.enumValues) });

export type JobInput = z.infer<typeof updateWithReminderSchema>;
