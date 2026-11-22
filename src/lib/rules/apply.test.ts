import { describe, expect, it } from "vitest";
import { mockSuggest } from "@/lib/ai/mock";
import { applyRuleFilter } from "./apply";
import type { FilterItem } from "./filter";

// Sam's fridge from the seed, reduced to what the filter needs.
const sam: FilterItem[] = [
  { id: "rice", name: "Cooked rice", status: "ready", mayContain: [], contentsKnown: true },
  { id: "eggs", name: "Eggs", status: "ready", mayContain: ["egg"], contentsKnown: true },
  { id: "pep", name: "Bell peppers", status: "ready", mayContain: [], contentsKnown: true },
  { id: "ched", name: "Shredded cheddar", status: "ready", mayContain: ["milk"], contentsKnown: true },
  { id: "tort", name: "Flour tortillas", status: "ready", mayContain: ["wheat_gluten"], contentsKnown: true },
  { id: "soy", name: "Soy sauce", status: "ready", mayContain: ["soy", "wheat_gluten"], contentsKnown: true },
  { id: "pesto", name: "Basil pesto", status: "needs_check", mayContain: ["tree_nuts"], contentsKnown: false },
];

describe("applyRuleFilter on Sam's mock suggestions", () => {
  const meals = mockSuggest({
    minutes: 20,
    readyOnly: true,
    ruleLabels: ["Peanuts", "Tree nuts"],
    inventory: sam.map((i) => ({ id: i.id, name: i.name, quantity: null, state: "raw", useBy: null })),
    count: 3,
  });
  const { shown, filteredOut } = applyRuleFilter(meals, ["peanuts", "tree_nuts"], sam);

  it("removes the pesto pasta and says why", () => {
    expect(filteredOut.map((m) => m.title)).toEqual(["Pesto pasta"]);
    expect(filteredOut[0].reasons.join(" ")).toMatch(/pesto/i);
  });

  it("keeps the fried rice and quesadillas", () => {
    expect(shown.map((m) => m.title)).toEqual(["Veggie egg fried rice", "Pepper and cheese quesadillas"]);
  });
});
