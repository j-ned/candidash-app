import { z } from 'zod';

// Repris des DTO de l'API Nest (mêmes règles, mêmes messages).
const email = z.email({ message: 'Veuillez fournir une adresse e-mail valide' });

export const loginSchema = z
  .object({
    email,
    password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' }),
  })
  .strict();

const passwordSchema = z
  .string()
  .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  .regex(/(?=.*[A-Z])/, { message: 'Le mot de passe doit contenir au moins une majuscule' })
  .regex(/(?=.*\d)/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
  .regex(/(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/, {
    message: 'Le mot de passe doit contenir au moins un caractère spécial',
  });

export const registerSchema = z
  .object({
    email: z.email({ message: 'Email invalide' }),
    password: passwordSchema,
    username: z
      .string()
      .min(3, { message: "Le nom d'utilisateur doit contenir au moins 3 caractères" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores",
      })
      .optional(),
  })
  .strict();

export const verifyRegistrationSchema = z
  .object({
    email: z.email({ message: 'Email invalide' }),
    verificationCode: z.string().regex(/^\d{6}$/, {
      message: 'Le code de validation doit être composé de 6 chiffres',
    }),
  })
  .strict();

export const emailOnlySchema = z.object({ email: z.email({ message: 'Email invalide' }) }).strict();

const totpToken = z.string().regex(/^\d{6}$/, {
  message: 'Le code TOTP doit contenir exactement 6 chiffres',
});

export const totpTokenSchema = z.object({ token: totpToken }).strict();
export const validateTotpSchema = z.object({ tempToken: z.string().min(1), token: totpToken }).strict();
export const disableTotpSchema = z.object({ password: z.string().min(1) }).strict();
export const recoverySchema = z
  .object({ tempToken: z.string().min(1), recoveryCode: z.string().min(1) })
  .strict();

const nomAffiche = z
  .string({ message: 'Le nom du jeton doit être une chaîne de caractères' })
  .min(1, { message: 'Le nom du jeton ne peut pas être vide' })
  .max(100, { message: 'Le nom du jeton ne peut pas dépasser 100 caractères' })
  .default('Extension Chrome');

export const createApiTokenSchema = z.object({ nomAffiche }).strict();
export const loginApiTokenSchema = z
  .object({
    email: z.email({ message: 'Email invalide' }),
    password: z.string().min(1, { message: 'Le mot de passe est requis' }),
    nomAffiche,
  })
  .strict();
export const login2faApiTokenSchema = z
  .object({ tempToken: z.string().min(1), token: totpToken, nomAffiche })
  .strict();
