import { describe, expect, it } from "vitest";
import { mockRecognize } from "@/lib/ai/mock";
import { itemsFromRecognition, itemsFromTyped, parseTyped } from "./scan";
import type { RuleContext } from "./items";

const sam: RuleContext = { tags: ["peanuts", "tree_nuts"], customWords: [], fridgeShared: true };
const none: RuleContext = { tags: [], customWords: [], fridgeShared: false };

describe("itemsFromRecognition", () => {
  const rec = mockRecognize({ images: [{ data: Buffer.from(""), mediaType: "image/jpeg" }], source: "video", ruleTags: sam.tags });
  const items = itemsFromRecognition(rec, ["m0"], sam);
  const by = (name: string) => items.find((i) => i.name === name)!;

  it("adds plainly seen food as ready, with its photo and box", () => {
    expect(by("Bell peppers")).toMatchObject({ status: "ready", evidence: { mediaId: "m0", where: "left drawer" } });
    expect(by("Bell peppers").evidence.box).toBeDefined();
  });

  it("holds anything uncertain or rule-related for a check", () => {
    expect(by("Basil pesto").status).toBe("needs_check");
    expect(by("Greek yogurt").status).toBe("needs_check");
    expect(by("Glass container, brown food").status).toBe("needs_check");
  });

  it("keeps what it could not identify as unclear", () => {
    expect(by("Bag behind the jam")).toMatchObject({ status: "unclear", confidence: "cant_see" });
  });

  it("adds the rule tags found in the name even if the model missed them", () => {
    const r = itemsFromRecognition(
      {
        items: [{ ...rec.items[0], name: "Almond yogurt", may_contain: [], confidence: "high", contents_known: true, check_reason: null }],
        unclear: [],
        skipped_private: 0,
      },
      ["m0"],
      sam,
    );
    expect(r[0].status).toBe("needs_check");
    expect(r[0].mayContain).toContain("tree_nuts");
  });
});

describe("parseTyped", () => {
  it("reads quantities before or after the name", () => {
    expect(parseTyped("eggs x12\n2 cups cooked rice\n- milk\n\nApples 6")).toEqual([
      { name: "Eggs", quantity: "x12", line: "eggs x12" },
      { name: "Cooked rice", quantity: "2 cups", line: "2 cups cooked rice" },
      { name: "Milk", quantity: null, line: "milk" },
      { name: "Apples", quantity: "6", line: "Apples 6" },
    ]);
  });
});

describe("itemsFromTyped", () => {
  it("is ready for plain food and checked for mixtures when the user has rules", () => {
    const items = itemsFromTyped(parseTyped("eggs\ncookies"), "raw", sam);
    expect(items.map((i) => i.status)).toEqual(["ready", "needs_check"]);
    expect(itemsFromTyped(parseTyped("cookies"), "pantry", none)[0].status).toBe("ready");
  });
});
