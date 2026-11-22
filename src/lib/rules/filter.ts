// The rule filter: plain code, no AI. Every meal suggestion passes through
// checkMeal() before the user sees it. A meal is removed when
//   1. an ingredient name matches a keyword for one of the user's rules, or
//   2. an ingredient comes from an inventory item that may contain a ruled-out
//      tag, or
//   3. an ingredient comes from an item the user has not checked, or whose
//      contents are unknown while the user has any rule (we cannot verify it).
//      The recognizer marks single plain foods (eggs, a pepper) and readable
//      labels as contents_known; answering a review card should set it too.
// This is what lets us claim N1 (zero rule violations) even when a model is wrong.
import { RULE_KEYWORDS, RULE_LABELS, type RuleTag } from "./taxonomy";

export type FilterIngredient = { name: string; itemId?: string };

export type FilterItem = {
  id: string;
  name: string;
  status: string;
  mayContain: RuleTag[];
  contentsKnown: boolean;
};

export type FilterResult = { allowed: boolean; reasons: string[] };

function normalize(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Tags from `tags` whose keywords appear as whole words in `text`. */
export function matchTags(text: string, tags: readonly RuleTag[]): RuleTag[] {
  const hay = normalize(text);
  return tags.filter((tag) =>
    RULE_KEYWORDS[tag].some((kw) => hay.includes(normalize(kw))),
  );
}

const STATUS_REASON: Record<string, string> = {
  needs_check: "not checked yet",
  reserved: "saved for a planned meal",
  not_mine: "not yours",
  unclear: "not identified",
  rejected: "not in your fridge",
  used: "already used",
};

export function checkMeal(
  ingredients: FilterIngredient[],
  userTags: readonly RuleTag[],
  inventory: Map<string, FilterItem>,
): FilterResult {
  const reasons: string[] = [];

  for (const ing of ingredients) {
    for (const tag of matchTags(ing.name, userTags)) {
      reasons.push(`${ing.name}: ${RULE_LABELS[tag].toLowerCase()}`);
    }

    if (!ing.itemId) continue;
    const item = inventory.get(ing.itemId);
    if (!item) {
      reasons.push(`${ing.name}: not in your fridge`);
      continue;
    }
    if (item.status !== "ready") {
      reasons.push(`${item.name}: ${STATUS_REASON[item.status] ?? "not available"}`);
      continue;
    }
    for (const tag of matchTags(item.name, userTags)) {
      reasons.push(`${item.name}: ${RULE_LABELS[tag].toLowerCase()}`);
    }
    for (const tag of item.mayContain.filter((t) => userTags.includes(t))) {
      reasons.push(`${item.name}: may contain ${RULE_LABELS[tag].toLowerCase()}`);
    }
    if (userTags.length > 0 && !item.contentsKnown) {
      reasons.push(`${item.name}: ingredients unknown`);
    }
  }

  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] };
}
