"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { loadRecipe, recheck } from "@/lib/data/recipes";
import { logEvent } from "@/lib/events-server";
import { matchTags } from "@/lib/rules/filter";
import { RULE_TAGS, type RuleTag } from "@/lib/rules/taxonomy";

const Choice = z.enum(["used", "some", "none"]);

/**
 * 11 Done (update 2): records whether the meal was cooked as suggested and
 * what was really used, updates the fridge, and adds the leftover portion.
 * Nothing changes until the user presses Done.
 */
export async function cookMeal(formData: FormData) {
  const user = await requireUser();
  const ref = String(formData.get("ref") ?? "");
  const loaded = await loadRecipe(user.id, ref);
  if (!loaded) redirect("/");
  const recipe = loaded.recipe;
  if (recipe) {
    const check = await recheck(user.id, recipe, { allowReserved: loaded.allowReserved, mealId: loaded.plannedMeal?.id });
    if (!check.allowed) redirect(`/recipe/${ref}`);
  }
  const asSuggested = formData.get("asSuggested") !== "changed";
  const note = String(formData.get("changes") ?? "").trim().slice(0, 300);
  const addLeftovers = formData.get("leftovers") === "on";

  const ids = [...new Set((recipe?.ingredients ?? []).map((g) => g.itemId).filter((x): x is string => !!x))];
  const items = ids.length
    ? await db
        .select()
        .from(schema.items)
        .where(and(eq(schema.items.userId, user.id), inArray(schema.items.id, ids)))
    : [];
  const choices = new Map(items.map((i) => [i.id, Choice.catch("none").parse(formData.get(`use_${i.id}`))]));
  const used = items.filter((i) => choices.get(i.id) === "used");
  const touched = items.filter((i) => choices.get(i.id) !== "none");
  const edited = items.some((i) => choices.get(i.id) === "none") || !asSuggested;
  // Planned meals that lose food they were saved for (update 7: revise that meal).
  const affected = [
    ...new Set(used.map((i) => i.reservedForMealId).filter((m): m is string => !!m && m !== loaded.plannedMeal?.id)),
  ];

  await db.transaction(async (tx) => {
    if (used.length) {
      await tx
        .update(schema.items)
        .set({ status: "used", reservedForMealId: null, updatedAt: new Date() })
        .where(inArray(schema.items.id, used.map((i) => i.id)));
    }
    if (recipe && addLeftovers && recipe.leftovers) {
      // The leftover holds whatever went into the meal, so it carries their rule tags.
      const tags = new Set<RuleTag>(touched.flatMap((i) => i.mayContain));
      for (const g of recipe.ingredients) matchTags(g.name, RULE_TAGS).forEach((t) => tags.add(t));
      await tx.insert(schema.items).values({
        userId: user.id,
        name: `${recipe.title} (leftover)`.slice(0, 80),
        quantity: recipe.leftovers,
        state: "leftover",
        status: "ready",
        confidence: "high",
        mayContain: [...tags],
        contentsKnown: touched.every((i) => i.contentsKnown),
        evidence: { text: `Cooked by you: ${recipe.title}` },
      });
    }
    await tx.insert(schema.cookLogs).values({
      userId: user.id,
      title: loaded.title,
      recipeRef: ref,
      plannedMealId: loaded.plannedMeal?.id ?? null,
      cookedAsSuggested: asSuggested,
      usedItemIds: touched.map((i) => i.id),
      extraCostCents: recipe?.extraCostCents ?? null,
    });
    if (loaded.plannedMeal) {
      await tx.update(schema.plannedMeals).set({ status: "cooked" }).where(eq(schema.plannedMeals.id, loaded.plannedMeal.id));
      // Food saved for this meal and not used stays in the fridge as ready.
      await tx
        .update(schema.items)
        .set({ status: "ready", reservedForMealId: null })
        .where(and(eq(schema.items.reservedForMealId, loaded.plannedMeal.id), eq(schema.items.status, "reserved")));
    }
  });

  await logEvent(user.id, "cooked", "11", {
    ref,
    title: loaded.title,
    asSuggested,
    edited,
    changes: note || null,
    used: used.length,
    partly: touched.length - used.length,
    skipped: items.length - touched.length,
    leftovers: addLeftovers,
    affectedMeals: affected.length,
  });
  revalidatePath("/");
  revalidatePath("/fridge");
  revalidatePath("/plan");
  redirect(affected.length ? `/plan/replan?meal=${affected[0]}&reason=used` : "/?cooked=1");
}
