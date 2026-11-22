import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { unfilteredSuggest } from "@/lib/ai";
import { applyRuleFilter } from "@/lib/rules/apply";
import { RULE_LABELS } from "@/lib/rules/taxonomy";

/**
 * The only way screens get meal suggestions. Loads the user's rules and usable
 * inventory, asks the meal suggester, runs the rule filter, and records what
 * was shown and what was removed (suggestions table, evidence for N1).
 */
export async function suggestMeals(userId: string, opts: { minutes: number; readyOnly: boolean; count?: number }) {
  const [profile] = await db
    .select({ rules: schema.profiles.rules })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId));
  const tags = (profile?.rules ?? []).map((r) => r.tag);

  // Every item the suggester might reference, including unusable ones, so the
  // filter can explain why a meal that used them was removed.
  const inventory = await db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.userId, userId), inArray(schema.items.status, ["ready", "needs_check", "reserved"])));

  const offered = inventory.filter(
    (i) => i.status === "ready" && !(opts.readyOnly && i.state === "frozen"),
  );

  const { value: meals, model } = await unfilteredSuggest({
    minutes: opts.minutes,
    readyOnly: opts.readyOnly,
    ruleLabels: tags.map((t) => RULE_LABELS[t]),
    inventory: offered.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, state: i.state, useBy: i.useBy })),
    count: opts.count ?? 3,
  });

  const { shown, filteredOut } = applyRuleFilter(meals, tags, inventory);

  const [row] = await db
    .insert(schema.suggestions)
    .values({
      userId,
      request: { minutes: opts.minutes, readyOnly: opts.readyOnly },
      shown: shown.map((m) => ({
        title: m.title,
        minutes: m.minutes,
        pans: m.pans,
        servings: m.servings,
        leftovers: m.leftovers ?? undefined,
        ingredients: m.ingredients.map((i) => ({ name: i.name, quantity: i.quantity ?? undefined, itemId: i.item_id ?? undefined })),
        steps: m.steps,
        extraCostCents: m.extra_cost_cents ?? undefined,
      })),
      filteredOut,
      model,
    })
    .returning({ id: schema.suggestions.id });

  return { suggestionId: row.id, shown, filteredOut };
}
