import "server-only";
import { and, asc, eq, gt, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PlanRow, Recipe } from "@/lib/db/schema";
import { addDays, today as todayIso } from "@/lib/time";
import { expiryOf } from "@/lib/items";
import { mealForDay, thawNeeds } from "@/lib/plan-logic";
import { getItems } from "./items";

export type Meal = typeof schema.plannedMeals.$inferSelect;

/**
 * The 7 days shown on 12: yesterday (what was cooked) through 5 days ahead.
 * A rolling window, so on a Sunday the coming week is visible instead of a
 * week that is almost over.
 */
export function planWeek(todayDay = todayIso()): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(todayDay, i - 1));
}

/** Meals in the visible week plus the next one, so moves past Sunday still show. */
export async function getMeals(userId: string, from: string, to: string): Promise<Meal[]> {
  return db
    .select()
    .from(schema.plannedMeals)
    .where(and(eq(schema.plannedMeals.userId, userId), gte(schema.plannedMeals.day, from), lte(schema.plannedMeals.day, to)))
    .orderBy(asc(schema.plannedMeals.day), asc(schema.plannedMeals.createdAt));
}

/** Items saved for the given meals, with their meal. */
export async function reservedFor(userId: string, mealIds: string[]) {
  if (mealIds.length === 0) return [];
  return db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.userId, userId), eq(schema.items.status, "reserved"), inArray(schema.items.reservedForMealId, mealIds)));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function snapshot(tx: Tx, userId: string) {
  const meals = await tx.select().from(schema.plannedMeals).where(eq(schema.plannedMeals.userId, userId));
  const reservations = await tx
    .select({ itemId: schema.items.id, status: schema.items.status, mealId: schema.items.reservedForMealId })
    .from(schema.items)
    .where(and(eq(schema.items.userId, userId), isNotNull(schema.items.reservedForMealId)));
  const rows: PlanRow[] = meals.map((m) => ({ id: m.id, day: m.day, title: m.title, status: m.status, skipReason: m.skipReason }));
  return { meals: rows, reservations };
}

/**
 * Runs one plan change inside a transaction and records it with the state
 * before it, so 16 can show what changed and Undo can put it back.
 */
export async function changePlan(
  userId: string,
  kind: (typeof schema.planChanges.$inferInsert)["kind"],
  change: (tx: Tx) => Promise<Record<string, string>>,
): Promise<string> {
  return db.transaction(async (tx) => {
    const before = await snapshot(tx, userId);
    const labels = await change(tx);
    const [row] = await tx.insert(schema.planChanges).values({ userId, kind, before, labels }).returning({ id: schema.planChanges.id });
    return row.id;
  });
}

/** Undo: restore every meal and reservation as it was, and remove meals added by the change. */
export async function undoChange(userId: string, changeId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [change] = await tx
      .select()
      .from(schema.planChanges)
      .where(and(eq(schema.planChanges.id, changeId), eq(schema.planChanges.userId, userId)));
    if (!change || change.undoneAt) return false;
    const keep = new Set(change.before.meals.map((m) => m.id));
    const added = await tx
      .select({ id: schema.plannedMeals.id })
      .from(schema.plannedMeals)
      .where(and(eq(schema.plannedMeals.userId, userId), gt(schema.plannedMeals.createdAt, change.createdAt)));
    const toDelete = added.map((a) => a.id).filter((id) => !keep.has(id));
    // Items reserved now but not before go back to ready.
    await tx
      .update(schema.items)
      .set({ status: "ready", reservedForMealId: null })
      .where(and(eq(schema.items.userId, userId), eq(schema.items.status, "reserved")));
    if (toDelete.length) await tx.delete(schema.plannedMeals).where(inArray(schema.plannedMeals.id, toDelete));
    for (const m of change.before.meals) {
      await tx
        .update(schema.plannedMeals)
        .set({ day: m.day, title: m.title, status: m.status, skipReason: m.skipReason })
        .where(and(eq(schema.plannedMeals.id, m.id), eq(schema.plannedMeals.userId, userId)));
    }
    for (const r of change.before.reservations) {
      await tx
        .update(schema.items)
        .set({ status: r.status as "reserved", reservedForMealId: r.mealId })
        .where(and(eq(schema.items.id, r.itemId), eq(schema.items.userId, userId), inArray(schema.items.status, ["ready", "reserved"])));
    }
    await tx.update(schema.planChanges).set({ undoneAt: new Date() }).where(eq(schema.planChanges.id, changeId));
    return true;
  });
}

/** Adds a meal to a day, replacing the planned meal there (kept as "moved" so Undo can bring it back). */
export async function putMealOnDay(tx: Tx, userId: string, day: string, title: string, recipe: Recipe | null) {
  const existing = await tx
    .select({ id: schema.plannedMeals.id })
    .from(schema.plannedMeals)
    .where(and(eq(schema.plannedMeals.userId, userId), eq(schema.plannedMeals.day, day), eq(schema.plannedMeals.status, "planned")));
  if (existing.length) {
    await tx
      .update(schema.plannedMeals)
      .set({ status: "moved" })
      .where(inArray(schema.plannedMeals.id, existing.map((e) => e.id)));
    await tx
      .update(schema.items)
      .set({ status: "ready", reservedForMealId: null })
      .where(and(eq(schema.items.userId, userId), inArray(schema.items.reservedForMealId, existing.map((e) => e.id))));
  }
  const [meal] = await tx.insert(schema.plannedMeals).values({ userId, day, title, recipe }).returning({ id: schema.plannedMeals.id });
  // Save the fridge food the recipe needs for this meal; pantry staples stay free.
  const ids = (recipe?.ingredients ?? []).map((i) => i.itemId).filter((x): x is string => !!x);
  if (ids.length) {
    const items = await tx
      .select({ id: schema.items.id, state: schema.items.state, status: schema.items.status })
      .from(schema.items)
      .where(and(eq(schema.items.userId, userId), inArray(schema.items.id, ids)));
    const reserve = items.filter((i) => i.status === "ready" && i.state !== "pantry").map((i) => i.id);
    if (reserve.length) {
      await tx.update(schema.items).set({ status: "reserved", reservedForMealId: meal.id }).where(inArray(schema.items.id, reserve));
    }
  }
  return { mealId: meal.id, replaced: existing.length > 0 };
}

export type DayRow = {
  day: string;
  meal: Meal | null;
  saved: { name: string; useBy: string | null }[];
  thaw: string[];
};

/** Everything 12, 13 and 16 show: one row per day of this week. */
export async function getWeekView(userId: string) {
  const today = todayIso();
  const days = planWeek(today);
  const [meals, items] = await Promise.all([getMeals(userId, days[0], days[6]), getItems(userId, ["ready", "reserved"])]);
  const planItems = items.map((i) => ({ ...i, useByDay: expiryOf(i).day }));
  const thaw = thawNeeds(meals, planItems, today);
  const rows: DayRow[] = days.map((day) => {
    const meal = mealForDay(meals, day);
    return {
      day,
      meal,
      saved: meal ? planItems.filter((i) => i.status === "reserved" && i.reservedForMealId === meal.id).map((i) => ({ name: i.name, useBy: i.useByDay })) : [],
      thaw: meal ? thaw.filter((t) => t.meal.id === meal.id).map((t) => t.item.name) : [],
    };
  });
  return { today, days, rows, meals, items: planItems };
}
