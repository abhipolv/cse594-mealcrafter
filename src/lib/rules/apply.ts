// Runs the rule filter over a list of suggested meals. Pure, so it can be
// tested without a database. The only production caller is suggestMeals() in
// src/lib/meals.ts.
import type { SuggestedMeal } from "@/lib/ai/types";
import { checkMeal, type FilterItem } from "./filter";
import type { RuleTag } from "./taxonomy";

export type FilteredMeals = {
  shown: SuggestedMeal[];
  filteredOut: { title: string; reasons: string[] }[];
};

export function applyRuleFilter(
  meals: SuggestedMeal[],
  userTags: readonly RuleTag[],
  inventory: FilterItem[],
  customWords: readonly string[] = [],
): FilteredMeals {
  const byId = new Map(inventory.map((i) => [i.id, i]));
  const shown: SuggestedMeal[] = [];
  const filteredOut: FilteredMeals["filteredOut"] = [];
  for (const meal of meals) {
    const result = checkMeal(
      meal.ingredients.map((i) => ({ name: i.name, itemId: i.item_id ?? undefined })),
      userTags,
      byId,
      customWords,
    );
    if (result.allowed) shown.push(meal);
    else filteredOut.push({ title: meal.title, reasons: result.reasons });
  }
  return { shown, filteredOut };
}
