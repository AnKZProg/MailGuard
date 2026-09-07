const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

const formatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  for (const [unit, unitMs] of UNITS) {
    if (Math.abs(diffMs) >= unitMs) {
      return formatter.format(Math.round(diffMs / unitMs), unit);
    }
  }
  return formatter.format(Math.round(diffMs / 1000), "second");
}
