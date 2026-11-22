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
