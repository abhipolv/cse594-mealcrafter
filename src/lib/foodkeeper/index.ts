// Matches fridge items to USDA FoodKeeper storage times and estimates a use-by
// date when the item has none (update 3: a use-by date on every item). The
// estimate uses the low end of FoodKeeper's range, so it never overstates how
// long food keeps. The app shows the basis and asks the user to check; it
// never says food is safe (rule 3).
import { addDays } from "@/lib/time";
import { matchWords } from "@/lib/rules/filter";
import { GUIDELINES, type Guideline, type Span } from "./data";

export type { Guideline, Span };

export const FOODKEEPER_SOURCE = "USDA FoodKeeper";

type ItemState = "raw" | "cooked" | "leftover" | "frozen" | "pantry";

const LEFTOVERS_ID = 173;
const DAYS: Record<string, number> = { days: 1, weeks: 7, months: 30, years: 365 };

/** Best FoodKeeper entry for an item name in a given state, or null. */
export function findGuideline(name: string, state: ItemState): Guideline | null {
  let best: { g: Guideline; score: number } | null = null;
  const lower = name.toLowerCase().trim();
  for (const g of GUIDELINES) {
    if (g.states && !g.states.includes(state)) continue;
    for (const word of matchWords(name, g.match)) {
      // Longer phrases win; in English the food is usually the last word
      // ("Basil pesto" is pesto), and state-specific entries beat general ones.
      const score = word.length * 10 + (lower.endsWith(word) ? 5 : 0) + (g.states ? 1 : 0);
      if (!best || score > best.score) best = { g, score };
    }
  }
  if (best) return best.g;
  if (state === "leftover" || state === "cooked") return GUIDELINES.find((g) => g.id === LEFTOVERS_ID) ?? null;
  return null;
}

export type StorageAdvice = {
  guideline: Guideline;
  place: "fridge" | "pantry" | "freezer";
  opened: boolean;
  span: Span;
  /** "Keeps 4-6 days in the fridge" or "Follow the date on the package". */
  text: string;
  /** Low end of the range counted from purchase, preparation or opening; null for "package". */
  estimatedUseBy: string | null;
};

function spanText(span: Span): string {
  if ("note" in span) return "follow the date on the package";
  const unit = span.min === 1 && span.max === 1 ? span.unit.replace(/s$/, "") : span.unit;
  return span.min === span.max ? `${span.min} ${unit}` : `${span.min}-${span.max} ${unit}`;
}

/**
 * Storage advice for an item. `addedDay` is the local day it was added (or
 * cooked), `openedDay` the day it was opened, if known.
 */
export function storageAdvice(item: {
  name: string;
  state: ItemState;
  addedDay: string;
  openedDay?: string | null;
}): StorageAdvice | null {
  const g = findGuideline(item.name, item.state);
  if (!g) return null;
  const opened = !!item.openedDay;

  let place: StorageAdvice["place"];
  let span: Span | undefined;
  let fromOpening = false;
  if (item.state === "frozen") {
    place = "freezer";
    span = g.freezer;
  } else if (item.state === "pantry") {
    if (opened && g.pantryOpened) [place, span, fromOpening] = ["pantry", g.pantryOpened, true];
    else if (opened && g.fridgeOpened) [place, span, fromOpening] = ["fridge", g.fridgeOpened, true];
    else if (g.pantry) [place, span] = ["pantry", g.pantry];
    else [place, span] = ["fridge", g.fridge];
  } else if (opened && g.fridgeOpened) {
    [place, span, fromOpening] = ["fridge", g.fridgeOpened, true];
  } else if (g.fridge) {
    [place, span] = ["fridge", g.fridge];
  } else {
    [place, span] = ["pantry", g.pantry];
  }
  if (!span) return null;

  const base = fromOpening && item.openedDay ? item.openedDay : item.addedDay;
  const estimatedUseBy = "note" in span ? null : addDays(base, span.min * DAYS[span.unit]);
  const where = place === "fridge" ? "in the fridge" : place === "freezer" ? "in the freezer" : "in the pantry";
  const text =
    "note" in span
      ? "Follow the date on the package"
      : `${fromOpening ? "Once opened, keeps" : "Keeps"} ${spanText(span)} ${where}`;
  return { guideline: g, place, opened: fromOpening, span, text, estimatedUseBy };
}

/** True when the name alone settles what the food contains (eggs, a pepper). */
export function isPlainFood(name: string, state: ItemState): boolean {
  return findGuideline(name, state)?.plain === true;
}
