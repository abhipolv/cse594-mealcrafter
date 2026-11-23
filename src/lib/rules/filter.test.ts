import { describe, expect, it } from "vitest";
import { checkMeal, matchTags, matchWords, type FilterItem } from "./filter";

const inv = (items: FilterItem[]) => new Map(items.map((i) => [i.id, i]));

const ready = (id: string, name: string, extra: Partial<FilterItem> = {}): FilterItem => ({
  id,
  name,
  status: "ready",
  mayContain: [],
  contentsKnown: true,
  ...extra,
});

describe("matchTags", () => {
  it("matches whole words only", () => {
    expect(matchTags("Basil pesto", ["tree_nuts"])).toEqual(["tree_nuts"]);
    expect(matchTags("Coconut milk", ["tree_nuts"])).toEqual([]); // "nut" inside "coconut" is not a word
    expect(matchTags("Peanut butter", ["peanuts", "tree_nuts"])).toEqual(["peanuts"]);
  });

  it("covers the often-forgotten rules", () => {
    expect(matchTags("Gummy bears", ["gelatin"])).toEqual(["gelatin"]);
    expect(matchTags("Splash of mirin", ["alcohol"])).toEqual(["alcohol"]);
    expect(matchTags("Bacon bits", ["pork"])).toEqual(["pork"]);
  });
});

describe("checkMeal", () => {
  it("allows a meal with nothing ruled out", () => {
    const items = inv([ready("rice", "Cooked rice"), ready("egg", "Eggs")]);
    const r = checkMeal(
      [{ name: "Cooked rice", itemId: "rice" }, { name: "Eggs", itemId: "egg" }],
      ["tree_nuts", "peanuts"],
      items,
    );
    expect(r).toEqual({ allowed: true, reasons: [] });
  });

  it("removes a meal whose ingredient name breaks a rule", () => {
    const r = checkMeal([{ name: "Pine nuts" }], ["tree_nuts"], new Map());
    expect(r.allowed).toBe(false);
  });

  it("removes a meal that uses an unchecked item, even if its name looks safe", () => {
    const items = inv([ready("p", "Basil sauce", { status: "needs_check" })]);
    const r = checkMeal([{ name: "Basil sauce", itemId: "p" }], ["tree_nuts"], items);
    expect(r.allowed).toBe(false);
    expect(r.reasons[0]).toMatch(/not checked/);
  });

  it("uses what the recognizer flagged on the item", () => {
    const items = inv([ready("g", "Granola", { mayContain: ["tree_nuts"] })]);
    const r = checkMeal([{ name: "Granola", itemId: "g" }], ["tree_nuts"], items);
    expect(r.allowed).toBe(false);
  });

  it("removes prepared food with unknown contents when the user has rules", () => {
    const items = inv([ready("l", "Leftover curry", { contentsKnown: false })]);
    expect(checkMeal([{ name: "Leftover curry", itemId: "l" }], ["pork"], items).allowed).toBe(false);
    expect(checkMeal([{ name: "Leftover curry", itemId: "l" }], [], items).allowed).toBe(true); // no rules, nothing to verify
  });

  it("never uses items that are not mine", () => {
    const items = inv([ready("y", "Greek yogurt", { status: "not_mine" })]);
    expect(checkMeal([{ name: "Greek yogurt", itemId: "y" }], [], items).allowed).toBe(false);
  });
});

describe("checkMeal gaps found in review", () => {
  it("checks the linked item's own name, not only the ingredient label", () => {
    const items = inv([ready("g", "Almond granola")]);
    const r = checkMeal([{ name: "crunchy topping", itemId: "g" }], ["tree_nuts"], items);
    expect(r.allowed).toBe(false);
  });

  it("removes any item with unknown contents when the user has rules", () => {
    const items = inv([ready("l", "Leftover curry", { contentsKnown: false, mayContain: ["milk"] })]);
    expect(checkMeal([{ name: "Leftover curry", itemId: "l" }], ["pork"], items).allowed).toBe(false);
  });
});

describe("custom rules typed under + Other", () => {
  it("matches whole words only", () => {
    expect(matchWords("Mango salsa", ["mango"])).toEqual(["mango"]);
    expect(matchWords("Mangosteen", ["mango"])).toEqual([]);
    expect(matchWords("Anything", ["  "])).toEqual([]);
  });

  it("removes a meal whose ingredient or linked item names the word", () => {
    expect(checkMeal([{ name: "Diced mango" }], [], new Map(), ["mango"]).allowed).toBe(false);
    const items = inv([ready("s", "Mango chutney")]);
    expect(checkMeal([{ name: "chutney", itemId: "s" }], [], items, ["mango"]).allowed).toBe(false);
  });

  it("treats a custom rule like any rule for items with unknown contents", () => {
    const items = inv([ready("l", "Leftover curry", { contentsKnown: false })]);
    expect(checkMeal([{ name: "Leftover curry", itemId: "l" }], [], items, ["mango"]).allowed).toBe(false);
  });
});

describe("pescatarian", () => {
  it("rules out chicken but not salmon", () => {
    expect(matchTags("Chicken thighs", ["land_meat"])).toEqual(["land_meat"]);
    expect(matchTags("Salmon fillet", ["land_meat"])).toEqual([]);
  });
});
