// One clock for the whole app. The server runs in UTC, but "today", "tonight"
// and use-by dates mean the user's local day. Everyone in the study is in Ann
// Arbor, so a fixed zone is enough.
export const APP_TIME_ZONE = "America/Detroit";

function parts(date: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

/** Today's date in the app time zone, as YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  return parts(now).iso;
}

/** Hour of day (0 to 23) in the app time zone. */
export function localHour(now: Date = new Date()): number {
  return parts(now).hour;
}

/** Adds whole days to a YYYY-MM-DD date. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Tue", "Wednesday", "Nov 25" and so on for a YYYY-MM-DD date. */
export function formatDay(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** The local calendar day (YYYY-MM-DD) of a timestamp. */
export function dayOf(at: Date): string {
  return today(at);
}

/** "Sun 7:42 pm" for a timestamp, in the app time zone. */
export function formatMoment(at: Date): string {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.hour}:${p.minute} ${String(p.dayPeriod).toLowerCase()}`;
}

/** Monday of the week that contains `iso`. */
export function weekStart(iso: string): string {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

/**
 * "today", "tomorrow", "yesterday", the weekday within a week either way, or
 * "Nov 30" further out. Used for use-by dates and plan days.
 */
export function relativeDay(iso: string, todayIso: string): string {
  const d = daysBetween(todayIso, iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  if (d > 1 && d < 7) return formatDay(iso, { weekday: "short" });
  if (iso.slice(0, 4) !== todayIso.slice(0, 4) && Math.abs(d) > 180) return formatDay(iso, { month: "short", year: "numeric" });
  return formatDay(iso, { month: "short", day: "numeric" });
}
