const DAY_MS = 24 * 60 * 60 * 1000;

const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const weekdayFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const dayMonthFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fullDateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const longFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Calendar days between the two dates' local midnights (0 = same day). */
function daysAgo(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
}

/** Inbox-list timestamp that always fits one short line: "14:32", "hier", "lun.", "12 oct.", "12/10/2024". */
export function compactMailDate(date: Date, now: Date = new Date()): string {
  const days = daysAgo(date, now);
  if (days <= 0) return timeFormat.format(date);
  if (days === 1) return "hier";
  if (days < 7) return weekdayFormat.format(date);
  if (date.getFullYear() === now.getFullYear()) return dayMonthFormat.format(date);
  return fullDateFormat.format(date);
}

export type DateGroup = "Aujourd'hui" | "Hier" | "Cette semaine" | "Ce mois-ci" | "Plus ancien";

export function mailDateGroup(date: Date, now: Date = new Date()): DateGroup {
  const days = daysAgo(date, now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return "Cette semaine";
  if (days < 31) return "Ce mois-ci";
  return "Plus ancien";
}

/** "jeudi 30 octobre 2026 à 14:32" — for the reading pane and tooltips. */
export function longMailDate(date: Date): string {
  return longFormat.format(date);
}

/** "30 oct., 14:32" — for dense technical timestamps (security checks, sync times). */
export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}
