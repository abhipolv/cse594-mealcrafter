import "server-only";
import { and, eq, gte, inArray, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Recipe } from "@/lib/db/schema";
import { checkMeal } from "@/lib/rules/filter";
import { today as todayIso, weekStart } from "@/lib/time";
import { getProfile, ruleContext, type Profile } from "./profile";

export type LoadedRecipe = {
  ref: string;
  title: string;
  recipe: Recipe | null;
  back: string;
  suggestionId?: string;
  plannedMeal?: { id: string; day: string; status: string };
  allowReserved: boolean;
  forDay?: string;
};

const SUGGESTED = /^s\.([0-9a-f-]{36})\.(\d{1,2})$/;
const PLANNED = /^p\.([0-9a-f-]{36})$/;

/** Recipe refs: "s.<suggestionId>.<index>" for a suggested meal, "p.<plannedMealId>" for a planned one. */
export async function loadRecipe(userId: string, ref: string): Promise<LoadedRecipe | null> {
  const s = ref.match(SUGGESTED);
  if (s) {
    const [row] = await db
      .select()
      .from(schema.suggestions)
      .where(and(eq(schema.suggestions.id, s[1]), eq(schema.suggestions.userId, userId)));
    const recipe = row?.shown[Number(s[2])];
    if (!row || !recipe) return null;
    return {
      ref,
      title: recipe.title,
      recipe,
      back: `/cook/results?s=${row.id}`,
      suggestionId: row.id,
      allowReserved: row.request.allowReserved === true,
      forDay: row.request.forDay,
    };
  }
  const p = ref.match(PLANNED);
  if (p) {
    const [meal] = await db
      .select()
      .from(schema.plannedMeals)
      .where(and(eq(schema.plannedMeals.id, p[1]), eq(schema.plannedMeals.userId, userId)));
    if (!meal) return null;
    return {
      ref,
      title: meal.title,
      recipe: meal.recipe,
      back: "/plan",
      plannedMeal: { id: meal.id, day: meal.day, status: meal.status },
      allowReserved: false,
    };
  }
  return null;
}

/**
 * Runs the rule filter again with today's rules and fridge, so a meal shown
 * earlier is not cooked after the user changed a rule or an item (N1).
 * Items saved for this planned meal, or any saved item when the user chose
 * to use it (update 7), count as usable.
 */
export async function recheck(userId: string, recipe: Recipe, opts: { allowReserved: boolean; mealId?: string }) {
  const profile = await getProfile(userId);
  const ctx = ruleContext(profile);
  const ids = recipe.ingredients.map((i) => i.itemId).filter((x): x is string => !!x);
  const items = ids.length
    ? await db
        .select()
        .from(schema.items)
        .where(and(eq(schema.items.userId, userId), inArray(schema.items.id, ids)))
    : [];
  const usable = (i: (typeof items)[number]) =>
    i.status === "reserved" && (opts.allowReserved || (!!opts.mealId && i.reservedForMealId === opts.mealId)) ? "ready" : i.status;
  const inventory = new Map(items.map((i) => [i.id, { ...i, status: usable(i) }]));
  const result = checkMeal(
    recipe.ingredients.map((i) => ({ name: i.name, itemId: i.itemId })),
    ctx.tags,
    inventory,
    ctx.customWords,
  );
  return { ...result, items, profile, ctx };
}

/** Weekly budget left after the extra spending logged when cooking (update 9); null without a weekly budget. */
export async function budgetLeft(userId: string, profile: Profile | null) {
  if (!profile?.budgetCents || !profile.budgetPeriod || profile.budgetPeriod === "meal") return null;
  const perWeek = profile.budgetPeriod === "two_weeks" ? Math.round(profile.budgetCents / 2) : profile.budgetCents;
  // Monday 00:00 in Ann Arbor is 04:00 or 05:00 UTC; 05:00 is close enough for a weekly total.
  const since = new Date(`${weekStart(todayIso())}T05:00:00Z`);
  const [{ spent }] = await db
    .select({ spent: sum(schema.cookLogs.extraCostCents) })
    .from(schema.cookLogs)
    .where(and(eq(schema.cookLogs.userId, userId), gte(schema.cookLogs.createdAt, since)));
  return { perWeek, left: perWeek - Number(spent ?? 0) };
}
