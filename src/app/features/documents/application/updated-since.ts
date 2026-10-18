const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const RELATIVE = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
const DATE = new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short', year: 'numeric' });

/** « il y a 3 heures », « hier », puis la date au-delà d'une semaine. */
export function updatedSince(date: Date, now: Date): string {
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE) return 'à l’instant';
  if (elapsed < HOUR) return RELATIVE.format(-Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return RELATIVE.format(-Math.floor(elapsed / HOUR), 'hour');
  if (elapsed < WEEK) return RELATIVE.format(-Math.max(1, Math.round(elapsed / DAY)), 'day');
  return `le ${DATE.format(date)}`;
}
