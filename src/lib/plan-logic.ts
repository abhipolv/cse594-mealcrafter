// Pure week-plan logic for 01, 12 and 15.
import { daysBetween } from "@/lib/time";

export type PlanMeal = { id: string; day: string; title: string; status: "planned" | "skipped" | "moved" | "cooked"; createdAt: Date };
export type PlanItem = { id: string; name: string; state: string; status: string; reservedForMealId: string | null; useByDay: string | null };

/** The meal shown for a day: a cooked or planned one first, then a skipped one. "moved" rows were replaced. */
export function mealForDay<T extends PlanMeal>(meals: T[], day: string): T | null {
  const rank = { cooked: 0, planned: 1, skipped: 2, moved: 9 } as const;
  const candidates = meals.filter((m) => m.day === day && m.status !== "moved");
  candidates.sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt.getTime() - a.createdAt.getTime());
  return candidates[0] ?? null;
}

const STOP = new Set(["and", "with", "the", "a", "of", "in", "on", "fresh", "frozen", "raw", "leftover", "leftovers", "x"]);
function words(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ies|es|s)$/, ""));
}

/**
 * Frozen food a planned meal in the next 2 days seems to need, by a shared
 * word ("Chicken tacos" and "Chicken thighs"). Shown as a reminder to move it
 * to the fridge; the user decides.
 */
export function thawNeeds<M extends PlanMeal, I extends PlanItem>(meals: M[], items: I[], today: string): { meal: M; item: I }[] {
  const frozen = items.filter((i) => i.state === "frozen" && (i.status === "ready" || i.status === "reserved"));
  const out: { meal: M; item: I }[] = [];
  for (const m of meals) {
    const d = daysBetween(today, m.day);
    if (m.status !== "planned" || d < 0 || d > 2) continue;
    const mw = new Set(words(m.title));
    for (const i of frozen) {
      if (i.reservedForMealId === m.id || words(i.name).some((w) => mw.has(w))) out.push({ meal: m, item: i });
    }
  }
  return out;
}

/**
 * Where a skipped meal could move (15, option A): the first later day this
 * week that is free or holds a meal without saved food, and not after any of
 * the saved food's use-by dates. Returns null when no day works.
 */
export function moveTarget<M extends PlanMeal>(
  skipped: M,
  days: string[],
  meals: M[],
  saved: PlanItem[],
  reservedMealIds: Set<string>,
  today: string,
): { day: string; displaced: M | null; usesEverything: boolean } | null {
  const lastOk = saved.map((s) => s.useByDay).filter((x): x is string => !!x).sort()[0] ?? null;
  for (const day of days) {
    if (day <= skipped.day || day < today) continue;
    const there = mealForDay(meals, day);
    if (there && (there.status === "cooked" || (there.status === "planned" && reservedMealIds.has(there.id)))) continue;
    const usesEverything = !lastOk || day <= lastOk;
    if (!usesEverything) continue;
    return { day, displaced: there && there.status === "planned" ? there : null, usesEverything };
  }
  return null;
}
