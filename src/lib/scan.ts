// Turns recognizer output (or typed lines) into fridge items. Pure, so the
// rules for "ready" versus "needs your check" are tested without a model.
import type { Recognition } from "@/lib/ai/types";
import type { Evidence } from "@/lib/db/schema";
import { RULE_TAGS, type RuleTag } from "@/lib/rules/taxonomy";
import { matchTags } from "@/lib/rules/filter";
import { isPlainFood } from "@/lib/foodkeeper";
import { ruleHits, type ItemLike, type RuleContext } from "@/lib/items";

export type NewItem = {
  name: string;
  quantity: string | null;
  state: ItemLike["state"];
  status: "ready" | "needs_check" | "unclear";
  confidence: ItemLike["confidence"];
  mayContain: RuleTag[];
  contentsKnown: boolean;
  evidence: Evidence;
  checkReason: string | null;
};

function needsCheck(item: Omit<NewItem, "status">, ctx: RuleContext): boolean {
  if (item.confidence !== "high" || item.checkReason) return true;
  if (ruleHits(item, ctx).length > 0) return true;
  return (ctx.tags.length > 0 || ctx.customWords.length > 0) && !item.contentsKnown;
}

/**
 * Recognized items become "ready" only when the recognizer was sure, nothing
 * about them touches the user's rules, and it had no question. Everything else
 * waits for a review card (F2, F3, N3). Things it could not identify are kept
 * as "unclear" and never go into meals.
 */
export function itemsFromRecognition(r: Recognition, mediaIds: string[], ctx: RuleContext): NewItem[] {
  const items: NewItem[] = r.items.map((x) => {
    const mayContain = [...new Set([...x.may_contain, ...matchTags(x.name, RULE_TAGS)])];
    const base = {
      name: x.name.trim().slice(0, 80),
      quantity: x.quantity?.trim().slice(0, 40) || null,
      state: x.state,
      confidence: x.confidence,
      mayContain,
      contentsKnown: x.contents_known,
      evidence: {
        mediaId: mediaIds[x.image_index],
        ...(x.box ? { box: x.box } : {}),
        ...(x.evidence_text ? { text: x.evidence_text } : {}),
        ...(x.where ? { where: x.where } : {}),
      },
      checkReason: x.check_reason,
    };
    return { ...base, status: needsCheck(base, ctx) ? "needs_check" : "ready" };
  });
  for (const u of r.unclear) {
    items.push({
      name: u.description.trim().slice(0, 80),
      quantity: null,
      state: "raw",
      status: "unclear",
      confidence: "cant_see",
      mayContain: [],
      contentsKnown: false,
      evidence: { mediaId: mediaIds[u.image_index], ...(u.where ? { where: u.where } : {}) },
      checkReason: null,
    });
  }
  return items;
}

const QTY_FIRST = /^(\d+(?:[.,]\d+)?\s*(?:x|cups?|lbs?|pounds?|oz|ounces?|g|grams?|kg|bags?|cans?|bottles?|jars?|boxes?|packs?|cartons?|loaves?|heads?|bunch(?:es)?|dozen)?)\s+(.+)$/i;
const QTY_LAST = /^(.+?)[\s,]+(x\s?\d+|\d+\s?x|\d+)$/i;

/** "eggs x12", "2 cups rice", "milk" -> name and quantity. Empty lines are skipped. */
export function parseTyped(text: string): { name: string; quantity: string | null; line: string }[] {
  return text
    .split(/\r?\n|;/)
    .map((l) => l.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((line) => {
      const first = line.match(QTY_FIRST);
      if (first) return { name: cap(first[2]), quantity: first[1].trim(), line };
      const last = line.match(QTY_LAST);
      if (last) return { name: cap(last[1]), quantity: last[2].replace(/\s/g, "").replace(/^(\d+)x$/i, "x$1"), line };
      return { name: cap(line), quantity: null, line };
    })
    .map((x) => ({ ...x, name: x.name.slice(0, 80) }));
}

function cap(s: string) {
  const t = s.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Typed items: the user named them, but what is inside a mixed food still needs a check under rules. */
export function itemsFromTyped(lines: ReturnType<typeof parseTyped>, state: NewItem["state"], ctx: RuleContext): NewItem[] {
  return lines.map(({ name, quantity, line }) => {
    const base = {
      name,
      quantity,
      state,
      confidence: "high" as const,
      mayContain: matchTags(name, RULE_TAGS),
      contentsKnown: isPlainFood(name, state),
      evidence: { text: line },
      checkReason: null,
    };
    const asked = needsCheck(base, ctx);
    return {
      ...base,
      status: asked ? "needs_check" : "ready",
      checkReason: asked ? "You typed it in, but I can't tell what is in it." : null,
    };
  });
}
