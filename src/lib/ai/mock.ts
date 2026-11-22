// Recorded responses for AI_MODE=mock. They follow the Sam persona from the
// Stage 2 prototype, so the demo flow and tests behave the same every time.
import type { Recognition, RecognizeInput, SuggestedMeal, SuggestInput } from "./types";

export function mockRecognize(input: RecognizeInput): Recognition {
  if (input.source === "receipt") {
    return {
      items: [
        {
          name: "Granola",
          quantity: null,
          state: "pantry",
          where: null,
          confidence: "medium",
          may_contain: ["tree_nuts"],
          contents_known: false,
          evidence_text: "KIND GRANOLA ALMND 4.99",
          image_index: 0,
          box: null,
          check_reason: "The receipt line may say almond. Does it have tree nuts?",
        },
        {
          name: "Shredded cheddar",
          quantity: null,
          state: "raw",
          where: null,
          confidence: "high",
          may_contain: ["milk"],
          contents_known: true,
          evidence_text: "SHRD CHDR 8OZ 3.49",
          image_index: 0,
          box: null,
          check_reason: null,
        },
      ],
      unclear: [],
      skipped_private: 0,
    };
  }
  return {
    items: [
      item("Bell peppers", "x2", "raw", "left drawer", "high", [], true, { x: 0.08, y: 0.7, w: 0.3, h: 0.2 }),
      item("Eggs", "x7", "raw", "middle shelf", "high", ["egg"], true, { x: 0.5, y: 0.4, w: 0.35, h: 0.15 }),
      item("Milk, opened", null, "raw", "door", "high", ["milk"], true, { x: 0.8, y: 0.1, w: 0.15, h: 0.35 }),
      {
        ...item("Basil pesto", null, "raw", "top shelf", "medium", ["tree_nuts"], false, { x: 0.3, y: 0.1, w: 0.15, h: 0.15 }),
        evidence_text: "...basil, olive oil, cashews, pine nuts...",
        check_reason: "Pesto often has nuts. Does this one?",
      },
      {
        ...item("Greek yogurt", null, "raw", "top shelf", "medium", ["milk"], true, { x: 0.55, y: 0.1, w: 0.15, h: 0.15 }),
        check_reason: "Shared fridge: is this yours?",
      },
      {
        ...item("Glass container, brown food", null, "leftover", "bottom shelf", "cant_see", [], false, { x: 0.2, y: 0.55, w: 0.25, h: 0.12 }),
        check_reason: "I can't tell what this is. What's in it?",
      },
    ],
    unclear: [{ description: "Bag behind the jam", where: "door", image_index: 0 }],
    skipped_private: input.images.length > 0 ? 1 : 0,
  };
}

function item(
  name: string,
  quantity: string | null,
  state: Recognition["items"][number]["state"],
  where: string,
  confidence: Recognition["items"][number]["confidence"],
  mayContain: Recognition["items"][number]["may_contain"],
  contentsKnown: boolean,
  box: { x: number; y: number; w: number; h: number },
): Recognition["items"][number] {
  return {
    name,
    quantity,
    state,
    where,
    confidence,
    may_contain: mayContain,
    contents_known: contentsKnown,
    evidence_text: null,
    image_index: 0,
    box,
    check_reason: null,
  };
}

export function mockSuggest(input: SuggestInput): SuggestedMeal[] {
  const find = (word: string) =>
    input.inventory.find((i) => i.name.toLowerCase().includes(word))?.id ?? null;
  const meals: SuggestedMeal[] = [
    {
      title: "Veggie egg fried rice",
      minutes: 15,
      pans: 1,
      servings: 2,
      leftovers: "1 portion for lunch",
      ingredients: [
        { name: "Cooked rice", quantity: "2 cups", item_id: find("rice") },
        { name: "Eggs", quantity: "2", item_id: find("egg") },
        { name: "Bell pepper", quantity: "1", item_id: find("pepper") },
        { name: "Soy sauce", quantity: "1 tbsp", item_id: find("soy") },
      ],
      steps: [
        "Dice the pepper and fry it for 3 minutes.",
        "Push it aside, scramble the eggs.",
        "Add the rice and soy sauce, fry until hot.",
      ],
      extra_cost_cents: 0,
      why: "Uses the rice before it gets old, one pan.",
    },
    {
      title: "Pepper and cheese quesadillas",
      minutes: 12,
      pans: 1,
      servings: 1,
      leftovers: null,
      ingredients: [
        { name: "Flour tortillas", quantity: "2", item_id: find("tortilla") },
        { name: "Shredded cheddar", quantity: "1 cup", item_id: find("cheddar") },
        { name: "Bell pepper", quantity: "1", item_id: find("pepper") },
      ],
      steps: ["Slice the pepper.", "Fill the tortillas with cheese and pepper.", "Toast 2 minutes per side."],
      extra_cost_cents: 0,
      why: "Fastest option, nothing to thaw.",
    },
    {
      title: "Pesto pasta",
      minutes: 15,
      pans: 1,
      servings: 2,
      leftovers: null,
      ingredients: [
        { name: "Pasta", quantity: "200 g", item_id: null },
        { name: "Basil pesto", quantity: "3 tbsp", item_id: find("pesto") },
      ],
      steps: ["Boil the pasta.", "Stir in the pesto."],
      extra_cost_cents: 150,
      why: "Quick, uses the pesto. (The rule filter should remove this for Sam.)",
    },
  ];
  return meals.filter((m) => m.minutes <= input.minutes).slice(0, Math.max(input.count, 3));
}
