// Point d'entrée du service Vercel « api » : la sortie compilée de src/ (pnpm build).
// Le builder Services ne sait pas vérifier les types avec TypeScript 7, d'où le JS compilé.
export { default } from './dist/index.js';
