import { describe, expect, it } from "vitest";
import { findGuideline, isPlainFood, storageAdvice } from "./index";

describe("findGuideline", () => {
  it("picks the entry for the food, not a word before it", () => {
    expect(findGuideline("Basil pesto", "raw")?.label).toBe("Pesto");
    expect(findGuideline("Shredded cheddar", "raw")?.label).toBe("Shredded cheese");
    expect(findGuideline("Almond milk", "raw")?.label).toBe("Almond milk");
  });

  it("uses the item state to tell cooked rice from dry rice", () => {
    expect(findGuideline("Cooked rice", "leftover")?.label).toBe("Cooked rice");
    expect(findGuideline("Jasmine rice", "pantry")?.label).toBe("Rice");
    expect(findGuideline("Chicken thighs", "frozen")?.label).toBe("Chicken thighs or legs");
    expect(findGuideline("Chicken curry", "leftover")?.label).toBe("Cooked chicken dishes");
  });

  it("falls back to leftovers for unknown cooked food, and to nothing otherwise", () => {
    expect(findGuideline("Glass container, brown food", "leftover")?.label).toBe("Leftovers");
    expect(findGuideline("Feta", "raw")).toBeNull();
  });
});

describe("storageAdvice", () => {
  it("counts from the day added and uses the low end of the range", () => {
    const a = storageAdvice({ name: "Cooked rice", state: "leftover", addedDay: "2026-11-22" });
    expect(a?.text).toBe("Keeps 4-6 days in the fridge");
    expect(a?.estimatedUseBy).toBe("2026-11-26");
  });

  it("counts from opening when FoodKeeper has an after-opening time", () => {
    const a = storageAdvice({ name: "Soy sauce", state: "pantry", addedDay: "2026-11-01", openedDay: "2026-11-20" });
    expect(a?.text).toBe("Once opened, keeps 1 month in the fridge");
    expect(a?.estimatedUseBy).toBe("2026-12-20");
  });

  it("uses the freezer time for frozen items", () => {
    expect(storageAdvice({ name: "Chicken thighs", state: "frozen", addedDay: "2026-11-01" })?.place).toBe("freezer");
  });

  it("defers to the package date when FoodKeeper does", () => {
    const a = storageAdvice({ name: "Milk", state: "raw", addedDay: "2026-11-20" });
    expect(a?.text).toBe("Follow the date on the package");
    expect(a?.estimatedUseBy).toBeNull();
  });
});

describe("isPlainFood", () => {
  it("knows single-ingredient foods but not mixtures", () => {
    expect(isPlainFood("Eggs", "raw")).toBe(true);
    expect(isPlainFood("Bell peppers", "raw")).toBe(true);
    expect(isPlainFood("Granola", "pantry")).toBe(false);
    expect(isPlainFood("Cookies", "pantry")).toBe(false);
  });
});
