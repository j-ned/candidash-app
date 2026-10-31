import { z } from 'zod';

// Repris des DTO de l'API Nest (mêmes règles, mêmes messages).
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// Profil : ni rôle, ni mot de passe (change-password) ; changer d'email exige le mot de passe actuel.
export const updateProfileSchema = z
  .object({
    email: z.email({ message: 'Veuillez fournir une adresse e-mail valide' }).optional(),
    username: z.string().optional(),
    currentPassword: z.string().optional(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "L'e-mail est requis" })
      .pipe(z.email({ message: 'Veuillez fournir une adresse e-mail valide' })),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string({ message: 'Le token doit être une chaîne de caractères' }).min(1, { message: 'Le token est requis' }),
    newPassword: z
      .string({ message: 'Le mot de passe doit être une chaîne de caractères' })
      .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
      .regex(STRONG, {
        message:
          'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
      }),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ message: 'Le mot de passe actuel doit être une chaîne de caractères' })
      .min(1, { message: 'Le mot de passe actuel est requis' }),
    newPassword: z
      .string({ message: 'Le nouveau mot de passe doit être une chaîne de caractères' })
      .min(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
      .regex(STRONG, {
        message:
          'Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
      }),
  })
  .strict();
