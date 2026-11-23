import { describe, expect, it } from "vitest";
import { mealForDay, moveTarget, thawNeeds, type PlanItem, type PlanMeal } from "./plan-logic";

const at = new Date("2026-11-20T12:00:00Z");
const meal = (id: string, day: string, title: string, status: PlanMeal["status"] = "planned"): PlanMeal => ({ id, day, title, status, createdAt: at });
const days = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];

describe("mealForDay", () => {
  it("prefers a cooked or planned meal and ignores replaced ones", () => {
    const meals = [meal("a", "2026-11-24", "Old", "moved"), meal("b", "2026-11-24", "New")];
    expect(mealForDay(meals, "2026-11-24")?.id).toBe("b");
    expect(mealForDay(meals, "2026-11-25")).toBeNull();
  });
});

describe("thawNeeds", () => {
  it("links frozen chicken to tomorrow's chicken tacos", () => {
    const chicken: PlanItem = { id: "c", name: "Chicken thighs", state: "frozen", status: "ready", reservedForMealId: null, useByDay: null };
    const tacos = meal("t", "2026-11-24", "Chicken tacos");
    expect(thawNeeds([tacos], [chicken], "2026-11-23")).toHaveLength(1);
    expect(thawNeeds([tacos], [chicken], "2026-11-20")).toHaveLength(0); // too far ahead
  });
});

describe("moveTarget", () => {
  const pasta = meal("p", "2026-11-26", "Spinach and feta pasta", "skipped");
  const spinach: PlanItem = { id: "s", name: "Spinach", state: "raw", status: "reserved", reservedForMealId: "p", useByDay: "2026-11-28" };

  it("moves to the next free day before the food's use-by date", () => {
    const t = moveTarget(pasta, days, [pasta, meal("l", "2026-11-27", "Leftovers")], [spinach], new Set(["p"]), "2026-11-23");
    expect(t).toMatchObject({ day: "2026-11-27", usesEverything: true });
    expect(t?.displaced?.title).toBe("Leftovers");
  });

  it("finds nothing when the food would be past its date", () => {
    const early = { ...spinach, useByDay: "2026-11-26" };
    expect(moveTarget(pasta, days, [pasta], [early], new Set(["p"]), "2026-11-23")).toBeNull();
  });
});
