import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { unfilteredSuggest } from "@/lib/ai";
import { applyRuleFilter } from "@/lib/rules/apply";
import { RULE_LABELS } from "@/lib/rules/taxonomy";

export type SuggestOptions = {
  minutes: number;
  readyOnly: boolean;
  count?: number;
  /** Let meals use items saved for a planned meal (update 7). The planned meal is revised after cooking. */
  allowReserved?: boolean;
  /** Set when the user is picking a meal for a plan day (13 Swap, 12 empty day) instead of tonight. */
  forDay?: string;
};

/**
 * The only way screens get meal suggestions. Loads the user's rules and usable
 * inventory, asks the meal suggester, runs the rule filter, and records what
 * was shown and what was removed (suggestions table, evidence for N1).
 */
export async function suggestMeals(userId: string, opts: SuggestOptions) {
  const [profile] = await db
    .select({ rules: schema.profiles.rules, customRules: schema.profiles.customRules })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId));
  const tags = [...new Set((profile?.rules ?? []).map((r) => r.tag))];
  const customWords = (profile?.customRules ?? []).map((r) => r.word);

  // Every item the suggester might reference, including unusable ones, so the
  // filter can explain why a meal that used them was removed.
  const inventory = await db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.userId, userId), inArray(schema.items.status, ["ready", "needs_check", "reserved"])));

  // A reserved item the user chose to use counts as ready for this request only.
  const usable = (status: string) => status === "ready" || (opts.allowReserved === true && status === "reserved");
  const filterInventory = inventory.map((i) => ({ ...i, status: usable(i.status) ? "ready" : i.status }));

  const offered = inventory.filter((i) => usable(i.status) && !(opts.readyOnly && i.state === "frozen"));

  const { value: meals, model } = await unfilteredSuggest({
    minutes: opts.minutes,
    readyOnly: opts.readyOnly,
    ruleLabels: [...tags.map((t) => RULE_LABELS[t]), ...customWords.map((w) => `No ${w}`)],
    inventory: offered.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, state: i.state, useBy: i.useBy })),
    count: opts.count ?? 3,
  });

  const { shown, filteredOut } = applyRuleFilter(meals, tags, filterInventory, customWords);

  const [row] = await db
    .insert(schema.suggestions)
    .values({
      userId,
      request: {
        minutes: opts.minutes,
        readyOnly: opts.readyOnly,
        ...(opts.allowReserved ? { allowReserved: true } : {}),
        ...(opts.forDay ? { forDay: opts.forDay } : {}),
      },
      shown: shown.map((m) => ({
        title: m.title,
        minutes: m.minutes,
        pans: m.pans,
        servings: m.servings,
        leftovers: m.leftovers ?? undefined,
        ingredients: m.ingredients.map((i) => ({ name: i.name, quantity: i.quantity ?? undefined, itemId: i.item_id ?? undefined })),
        steps: m.steps,
        extraCostCents: m.extra_cost_cents ?? undefined,
        why: m.why,
      })),
      filteredOut,
      model,
    })
    .returning({ id: schema.suggestions.id });

  return { suggestionId: row.id, shown, filteredOut };
}
