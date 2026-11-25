import { describe, expect, it } from "vitest";
import { applyAnswer, groupFridge, reviewQuestion, sortForReview, expiryOf, type ItemLike, type RuleContext } from "./items";

const sam: RuleContext = { tags: ["peanuts", "tree_nuts"], customWords: [], fridgeShared: true };

const item = (over: Partial<ItemLike>): ItemLike => ({
  id: over.name ?? "x",
  name: "Thing",
  quantity: null,
  state: "raw",
  status: "needs_check",
  confidence: "medium",
  mayContain: [],
  contentsKnown: true,
  checkReason: null,
  useBy: null,
  openedAt: null,
  addedDay: "2026-11-22",
  ...over,
});

const pesto = item({ name: "Basil pesto", mayContain: ["tree_nuts"], contentsKnown: false, checkReason: "Pesto often has nuts. Does this one?" });
const yogurt = item({ name: "Greek yogurt", mayContain: ["milk"], checkReason: "Shared fridge: is this yours?" });
const box = item({ name: "Glass container, brown food", state: "leftover", confidence: "cant_see", contentsKnown: false });

describe("reviewQuestion", () => {
  it("asks one rule question with answers worded as answers", () => {
    const q = reviewQuestion(pesto, sam);
    expect(q.kind).toBe("rules");
    expect(q.question).toBe("Does it have tree nuts?");
    expect(q.answers.map((a) => a.label)).toEqual(["Has tree nuts", "No tree nuts", "Not sure"]);
  });

  it("asks about every rule when the contents are unknown", () => {
    const q = reviewQuestion(item({ name: "Snack bag", contentsKnown: false }), sam);
    expect(q.question).toBe("Does it have peanuts or tree nuts?");
  });

  it("asks who owns it in a shared fridge, and what it is when unseen", () => {
    expect(reviewQuestion(yogurt, sam).kind).toBe("owner");
    expect(reviewQuestion(yogurt, { ...sam, fridgeShared: false }).kind).toBe("confirm");
    expect(reviewQuestion(box, sam).kind).toBe("identify");
  });

  it("puts rule-related cards first", () => {
    expect(sortForReview([yogurt, pesto, box], sam).map((i) => i.name)).toEqual([
      "Glass container, brown food",
      "Basil pesto",
      "Greek yogurt",
    ]);
  });
});

describe("applyAnswer", () => {
  const q = reviewQuestion(pesto, sam);

  it("clears only the asked tag on 'No tree nuts'", () => {
    expect(applyAnswer(pesto, sam, q, "none")).toEqual({ status: "ready", contentsKnown: true, mayContain: [] });
  });

  it("keeps the item out of meals on 'Has' and 'Not sure'", () => {
    expect(applyAnswer(pesto, sam, q, "has")).toMatchObject({ status: "ready", mayContain: ["tree_nuts"] });
    expect(applyAnswer(pesto, sam, q, "unsure")).toEqual({ status: "ready", contentsKnown: false });
  });

  it("asks the rules question next after naming unknown food", () => {
    const patch = applyAnswer(box, sam, reviewQuestion(box, sam), "rename", "Beef chili");
    expect(patch).toMatchObject({ name: "Beef chili", confidence: "high", status: "needs_check" });
  });

  it("is ready after naming a plain food", () => {
    const patch = applyAnswer(box, sam, reviewQuestion(box, sam), "rename", "Carrots");
    expect(patch).toMatchObject({ name: "Carrots", contentsKnown: true, status: "ready" });
  });

  it("marks not mine and not in the fridge", () => {
    expect(applyAnswer(yogurt, sam, reviewQuestion(yogurt, sam), "not_mine")).toEqual({ status: "not_mine" });
    expect(applyAnswer(yogurt, sam, reviewQuestion(yogurt, sam), "not_here")).toEqual({ status: "rejected" });
  });
});

describe("use-by and fridge sections", () => {
  it("estimates a use-by date from FoodKeeper when none is set", () => {
    const u = expiryOf(item({ name: "Cooked rice", state: "leftover", addedDay: "2026-11-20" }));
    expect(u).toMatchObject({ day: "2026-11-24", estimated: true });
    expect(expiryOf(item({ name: "Feta", useBy: "2026-12-01" }))).toMatchObject({ day: "2026-12-01", estimated: false });
  });

  it("sorts ready food by use-by and keeps ruled-out food apart", () => {
    const g = groupFridge(
      [
        item({ name: "Eggs", status: "ready", mayContain: ["egg"], useBy: "2026-12-10" }),
        item({ name: "Cooked rice", status: "ready", state: "leftover", useBy: "2026-11-24" }),
        item({ name: "Granola", status: "ready", mayContain: ["tree_nuts"] }),
        item({ name: "Leftover curry", status: "ready", contentsKnown: false }),
        pesto,
      ],
      sam,
    );
    expect(g.ready.map((i) => i.name)).toEqual(["Cooked rice", "Eggs"]);
    expect(g.keptOut.map((k) => k.reason)).toEqual(["May have tree nuts", "What is in it is unknown"]);
    expect(g.toCheck).toHaveLength(1);
  });
});
