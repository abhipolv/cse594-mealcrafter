// Pure item logic shared by the fridge (G12, G13), review cards (G11) and
// scan results (G10). No database access, so it can be unit-tested.
import { RULE_LABELS, RULE_TAGS, type RuleTag } from "@/lib/rules/taxonomy";
import { matchTags } from "@/lib/rules/filter";
import { isPlainFood, storageAdvice, type StorageAdvice } from "@/lib/foodkeeper";
import { daysBetween } from "@/lib/time";

export type Confidence = "high" | "medium" | "low" | "cant_see";
export type ItemState = "raw" | "cooked" | "leftover" | "frozen" | "pantry";

/** The fields of an item that the logic below needs. */
export type ItemLike = {
  id: string;
  name: string;
  quantity: string | null;
  state: ItemState;
  status: string;
  confidence: Confidence;
  mayContain: RuleTag[];
  contentsKnown: boolean;
  checkReason: string | null;
  useBy: string | null;
  openedAt: string | null;
  addedDay: string;
};

export type RuleContext = {
  tags: RuleTag[];
  customWords: string[];
  fridgeShared: boolean;
};

// ---------- Confidence (update 4: distinct levels) ----------

export const CONFIDENCE: Record<Confidence, { label: string; bars: number }> = {
  high: { label: "High confidence", bars: 3 },
  medium: { label: "Medium confidence", bars: 2 },
  low: { label: "Low confidence", bars: 1 },
  cant_see: { label: "Can't see clearly", bars: 0 },
};

export const STATE_LABEL: Record<ItemState, string> = {
  raw: "Raw",
  cooked: "Cooked",
  leftover: "Leftover",
  frozen: "Frozen",
  pantry: "Pantry",
};

export function itemTitle(item: Pick<ItemLike, "name" | "quantity">): string {
  return item.quantity ? `${item.name}, ${item.quantity.replace(/^x/, "")}` : item.name;
}

// ---------- Rules on one item ----------

function hasRules(ctx: RuleContext) {
  return ctx.tags.length > 0 || ctx.customWords.length > 0;
}

/** Rule tags of the user's that this item may contain. */
export function ruleHits(item: Pick<ItemLike, "name" | "mayContain">, ctx: RuleContext): RuleTag[] {
  const hits = new Set<RuleTag>([...item.mayContain.filter((t) => ctx.tags.includes(t)), ...matchTags(item.name, ctx.tags)]);
  return ctx.tags.filter((t) => hits.has(t));
}

/** Why a ready item still cannot go into meals, or null when it can. Mirrors the rule filter. */
export function keptOutReason(item: Pick<ItemLike, "name" | "mayContain" | "contentsKnown">, ctx: RuleContext): string | null {
  const hits = ruleHits(item, ctx);
  if (hits.length) return `May have ${listLabels(hits)}`;
  const words = ctx.customWords.filter((w) => item.name.toLowerCase().includes(w.toLowerCase()));
  if (words.length) return `Has ${words.join(", ")}`;
  if (hasRules(ctx) && !item.contentsKnown) return "What is in it is unknown";
  return null;
}

function listLabels(tags: RuleTag[]): string {
  const names = tags.map((t) => RULE_LABELS[t].replace(/ \(.*\)$/, "").toLowerCase());
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

// ---------- Review cards (update 1: one question per card, answers as buttons) ----------

export type QuestionKind = "identify" | "rules" | "owner" | "confirm";

export type Answer = { value: "has" | "none" | "unsure" | "mine" | "not_mine" | "yes" | "rename"; label: string; primary?: boolean };

export type ReviewQuestion = {
  kind: QuestionKind;
  question: string;
  why: string;
  answers: Answer[];
  /** Rule tags the rules question asks about. */
  tags: RuleTag[];
  /** True when the card concerns the user's food rules; these come first. */
  ruleRelated: boolean;
};

const OWNER_HINT = /\b(yours|mine|shared|whose|roommates?)\b/i;

export function reviewQuestion(item: ItemLike, ctx: RuleContext): ReviewQuestion {
  if (item.confidence === "cant_see") {
    return {
      kind: "identify",
      question: "What is it?",
      why: item.checkReason ?? "I can't tell what this is, so I keep it out of your meals.",
      answers: [],
      tags: [],
      ruleRelated: hasRules(ctx),
    };
  }

  const hits = ruleHits(item, ctx);
  const unknownContents = hasRules(ctx) && !item.contentsKnown;
  if (hits.length > 0 || unknownContents) {
    const tags = hits.length > 0 ? hits : ctx.tags;
    const words = hits.length > 0 ? [] : ctx.customWords;
    const what = [listLabels(tags), ...words].filter(Boolean).join(" or ");
    return {
      kind: "rules",
      question: `Does it have ${what}?`,
      why: item.checkReason ?? `It could affect your rules. I keep it out of meals until you answer.`,
      answers: [
        { value: "has", label: `Has ${what}` },
        { value: "none", label: `No ${what}`, primary: true },
        { value: "unsure", label: "Not sure" },
      ],
      tags,
      ruleRelated: true,
    };
  }

  if (ctx.fridgeShared && item.checkReason && OWNER_HINT.test(item.checkReason)) {
    return {
      kind: "owner",
      question: "Is this yours?",
      why: item.checkReason,
      answers: [
        { value: "mine", label: "Yes, mine", primary: true },
        { value: "not_mine", label: "Not mine" },
      ],
      tags: [],
      ruleRelated: false,
    };
  }

  return {
    kind: "confirm",
    question: `Is this ${item.name.toLowerCase()}?`,
    why: item.checkReason ?? "I wasn't sure what I saw.",
    answers: [
      { value: "yes", label: `Yes, ${item.name.toLowerCase()}`, primary: true },
      { value: "rename", label: "No, something else" },
    ],
    tags: [],
    ruleRelated: false,
  };
}

/** Rule-related cards first, then by how unsure the recognizer was (update 4). */
export function sortForReview<T extends ItemLike>(items: T[], ctx: RuleContext): T[] {
  const rank: Record<Confidence, number> = { cant_see: 0, low: 1, medium: 2, high: 3 };
  return [...items].sort((a, b) => {
    const ra = reviewQuestion(a, ctx).ruleRelated ? 0 : 1;
    const rb = reviewQuestion(b, ctx).ruleRelated ? 0 : 1;
    return ra - rb || rank[a.confidence] - rank[b.confidence] || a.name.localeCompare(b.name);
  });
}

export type ItemStatus = "ready" | "needs_check" | "reserved" | "not_mine" | "rejected" | "used" | "unclear";

export type ItemPatch = Partial<Pick<ItemLike, "name" | "confidence" | "mayContain" | "contentsKnown">> & { status?: ItemStatus };

/**
 * What an answer changes on the item. The rule filter then decides meals:
 * "Has nuts" keeps the tag (filtered out), "No nuts" clears it, "Not sure"
 * leaves the contents unknown (filtered out while the user has rules).
 */
export function applyAnswer(
  item: ItemLike,
  ctx: RuleContext,
  q: Pick<ReviewQuestion, "kind" | "tags">,
  answer: string,
  newName?: string,
): ItemPatch {
  if (answer === "not_mine") return { status: "not_mine" };
  if (answer === "not_here") return { status: "rejected" };

  if (q.kind === "rules") {
    if (answer === "has") {
      return { status: "ready", contentsKnown: true, mayContain: [...new Set([...item.mayContain, ...q.tags])] };
    }
    if (answer === "none") {
      return { status: "ready", contentsKnown: true, mayContain: item.mayContain.filter((t) => !q.tags.includes(t)) };
    }
    if (answer === "unsure") return { status: "ready", contentsKnown: false };
  }

  if (q.kind === "owner" && answer === "mine") return { status: "ready" };
  if (q.kind === "confirm" && answer === "yes") return { status: "ready", confidence: "high" };

  if ((q.kind === "identify" || q.kind === "confirm") && answer === "rename" && newName?.trim()) {
    const name = newName.trim().slice(0, 80);
    const renamed: ItemLike = {
      ...item,
      name,
      confidence: "high",
      contentsKnown: isPlainFood(name, item.state),
      mayContain: [...new Set([...item.mayContain, ...matchTags(name, RULE_TAGS)])],
    };
    // Naming it may raise a rules question next; otherwise it is ready.
    const next = reviewQuestion({ ...renamed, checkReason: null }, ctx);
    return {
      name,
      confidence: "high",
      contentsKnown: renamed.contentsKnown,
      mayContain: renamed.mayContain,
      status: next.kind === "rules" ? "needs_check" : "ready",
    };
  }
  return {};
}

// ---------- Use-by dates (update 3) ----------

export type UseBy = { day: string; estimated: boolean; advice: StorageAdvice | null } | { day: null; estimated: false; advice: StorageAdvice | null };

export function expiryOf(item: Pick<ItemLike, "name" | "state" | "useBy" | "openedAt" | "addedDay">): UseBy {
  const advice = storageAdvice({ name: item.name, state: item.state, addedDay: item.addedDay, openedDay: item.openedAt });
  if (item.useBy) return { day: item.useBy, estimated: false, advice };
  if (advice?.estimatedUseBy) return { day: advice.estimatedUseBy, estimated: true, advice };
  return { day: null, estimated: false, advice };
}

/** Soonest use-by first; items without a date last. */
export function sortByUseBy<T extends Pick<ItemLike, "name" | "state" | "useBy" | "openedAt" | "addedDay">>(items: T[]): T[] {
  const key = (i: T) => expiryOf(i).day ?? "9999-12-31";
  return [...items].sort((a, b) => key(a).localeCompare(key(b)) || a.name.localeCompare(b.name));
}

/** "past" when the date has passed, "soon" within 2 days, otherwise "ok". */
export function urgencyOf(day: string | null, todayIso: string): "past" | "soon" | "ok" | "none" {
  if (!day) return "none";
  const d = daysBetween(todayIso, day);
  if (d < 0) return "past";
  if (d <= 2) return "soon";
  return "ok";
}

// ---------- Fridge sections (G12) ----------

export type FridgeSections<T> = {
  toCheck: T[];
  ready: T[];
  reserved: T[];
  keptOut: { item: T; reason: string }[];
  unclear: T[];
  notMine: T[];
};

export function groupFridge<T extends ItemLike>(items: T[], ctx: RuleContext): FridgeSections<T> {
  const s: FridgeSections<T> = { toCheck: [], ready: [], reserved: [], keptOut: [], unclear: [], notMine: [] };
  for (const item of items) {
    if (item.status === "needs_check") s.toCheck.push(item);
    else if (item.status === "reserved") s.reserved.push(item);
    else if (item.status === "unclear") s.unclear.push(item);
    else if (item.status === "not_mine") s.notMine.push(item);
    else if (item.status === "ready") {
      const reason = keptOutReason(item, ctx);
      if (reason) s.keptOut.push({ item, reason });
      else s.ready.push(item);
    }
  }
  s.ready = sortByUseBy(s.ready);
  s.reserved = sortByUseBy(s.reserved);
  return s;
}
