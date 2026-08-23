// Backend Zod schema requires a full ISO datetime, not a date-only string from <input type="date">
export function dateOnlyToIso(dateOnly: string): string {
  return new Date(dateOnly).toISOString();
}
