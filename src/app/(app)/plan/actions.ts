"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { logEvent } from "@/lib/events-server";
import { changePlan, putMealOnDay, undoChange } from "@/lib/data/plan";
import { loadRecipe, recheck } from "@/lib/data/recipes";
import { SKIP_REASONS } from "@/lib/plan-text";
import { formatDay } from "@/lib/time";

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Id = z.string().uuid();
const short = (day: string) => formatDay(day, { weekday: "short" });

function refresh() {
  revalidatePath("/plan");
  revalidatePath("/");
  revalidatePath("/fridge");
}

async function ownMeal(userId: string, id: string) {
  const [m] = await db
    .select()
    .from(schema.plannedMeals)
    .where(and(eq(schema.plannedMeals.id, id), eq(schema.plannedMeals.userId, userId)));
  return m ?? null;
}

/** 09/10 "Plan for <day>": puts a suggested meal on a plan day, saving its fridge food. */
export async function planMeal(formData: FormData) {
  const user = await requireUser();
  const ref = String(formData.get("ref") ?? "");
  const day = Day.parse(formData.get("day"));
  const loaded = await loadRecipe(user.id, ref);
  if (!loaded?.recipe) redirect("/plan");
  // Never plan a meal that no longer passes the rule filter (N1).
  const check = await recheck(user.id, loaded.recipe, { allowReserved: loaded.allowReserved });
  if (!check.allowed) redirect(`/recipe/${ref}`);
  const kind = formData.get("swap") === "1" ? "swap" : "add";
  const changeId = await changePlan(user.id, kind, async (tx) => {
    const r = await putMealOnDay(tx, user.id, day, loaded.title, loaded.recipe);
    return { [day]: r.replaced ? "Swapped in" : "Added" };
  });
  await logEvent(user.id, "plan_change", "09", { kind, day, ref, changeId });
  refresh();
  redirect(`/plan/updated?change=${changeId}`);
}

/** 13 "Move to another day". If the day has a meal, the two swap days. */
export async function moveMeal(formData: FormData) {
  const user = await requireUser();
  const id = Id.parse(formData.get("id"));
  const to = Day.parse(formData.get("to"));
  const meal = await ownMeal(user.id, id);
  if (!meal || meal.day === to) redirect("/plan");
  const changeId = await changePlan(user.id, "move", async (tx) => {
    const labels: Record<string, string> = { [to]: `Moved from ${short(meal.day)}` };
    const there = await tx
      .select({ id: schema.plannedMeals.id })
      .from(schema.plannedMeals)
      .where(and(eq(schema.plannedMeals.userId, user.id), eq(schema.plannedMeals.day, to), eq(schema.plannedMeals.status, "planned")));
    if (there.length) {
      await tx.update(schema.plannedMeals).set({ day: meal.day }).where(inArray(schema.plannedMeals.id, there.map((t) => t.id)));
      labels[meal.day] = `Moved from ${short(to)}`;
    }
    await tx.update(schema.plannedMeals).set({ day: to, status: "planned" }).where(eq(schema.plannedMeals.id, meal.id));
    return labels;
  });
  await logEvent(user.id, "plan_change", "13", { kind: "move", from: meal.day, to, changeId });
  refresh();
  redirect(`/plan/updated?change=${changeId}`);
}

const SkipInput = z.object({ id: Id, reason: z.enum(["eating_out", "too_tired", "not_hungry", ""]) });

/** 14: skips the meal with an optional reason (update 10). Saved food then needs a new plan (15). */
export async function skipMeal(formData: FormData) {
  const user = await requireUser();
  const { id, reason } = SkipInput.parse({ id: formData.get("id"), reason: formData.get("reason") ?? "" });
  const meal = await ownMeal(user.id, id);
  if (!meal) redirect("/plan");
  const saved = await db
    .select({ id: schema.items.id })
    .from(schema.items)
    .where(and(eq(schema.items.userId, user.id), eq(schema.items.status, "reserved"), eq(schema.items.reservedForMealId, id)));
  const changeId = await changePlan(user.id, "skip", async (tx) => {
    await tx
      .update(schema.plannedMeals)
      .set({ status: "skipped", skipReason: reason ? SKIP_REASONS[reason] : null })
      .where(eq(schema.plannedMeals.id, id));
    return { [meal.day]: reason ? `Skipped: ${SKIP_REASONS[reason].toLowerCase()}` : "Skipped" };
  });
  await logEvent(user.id, "skip_reason", "14", { day: meal.day, reason: reason || null, changeId });
  refresh();
  // The food saved for it is still reserved; the replan screen decides what happens to it.
  redirect(saved.length ? `/plan/replan?meal=${id}&change=${changeId}` : `/plan/updated?change=${changeId}`);
}

const ReplanInput = z.object({
  meal: Id,
  option: z.enum(["move", "free", "keep"]),
  to: z.union([z.literal(""), Day]),
});

/** 15: the user picks one option; nothing changes until then. */
export async function applyReplan(formData: FormData) {
  const user = await requireUser();
  const { meal: mealId, option, to } = ReplanInput.parse({
    meal: formData.get("meal"),
    option: formData.get("option"),
    to: formData.get("to") ?? "",
  });
  const meal = await ownMeal(user.id, mealId);
  if (!meal) redirect("/plan");
  const changeId = await changePlan(user.id, "replan", async (tx) => {
    if (option === "move" && to) {
      const labels: Record<string, string> = { [to]: `Moved from ${short(meal.day)}` };
      const there = await tx
        .select({ id: schema.plannedMeals.id, title: schema.plannedMeals.title })
        .from(schema.plannedMeals)
        .where(and(eq(schema.plannedMeals.userId, user.id), eq(schema.plannedMeals.day, to), eq(schema.plannedMeals.status, "planned")));
      if (there.length) {
        // The meal that was there moves to the skipped day, which is now free.
        await tx.update(schema.plannedMeals).set({ day: meal.day }).where(inArray(schema.plannedMeals.id, there.map((t) => t.id)));
        labels[meal.day] = `Moved from ${short(to)}`;
      }
      await tx.update(schema.plannedMeals).set({ day: to, status: "planned", skipReason: null }).where(eq(schema.plannedMeals.id, mealId));
      return labels;
    }
    // "free" and "keep" both release the saved food; "free" sends the user to cook with it.
    await tx
      .update(schema.items)
      .set({ status: "ready", reservedForMealId: null })
      .where(and(eq(schema.items.userId, user.id), eq(schema.items.reservedForMealId, mealId), eq(schema.items.status, "reserved")));
    return { [meal.day]: option === "free" ? "Skipped, food freed" : "Skipped" };
  });
  await logEvent(user.id, "plan_change", "15", { kind: "replan", option, day: meal.day, to: to || null, changeId });
  refresh();
  redirect(option === "free" ? "/cook" : `/plan/updated?change=${changeId}`);
}

/** 16 Undo. */
export async function undoPlanChange(formData: FormData) {
  const user = await requireUser();
  const id = Id.parse(formData.get("change"));
  const ok = await undoChange(user.id, id);
  await logEvent(user.id, "plan_change", "16", { kind: "undo", changeId: id, ok });
  refresh();
  redirect("/plan");
}
