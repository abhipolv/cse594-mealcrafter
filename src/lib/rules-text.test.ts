import { describe, expect, it } from "vitest";
import { dollars, fitsText, rulesList } from "./rules-text";

describe("rules text", () => {
  it("joins rules in plain English", () => {
    expect(fitsText(["peanuts", "tree_nuts"], [])).toBe("No peanuts or tree nuts");
    expect(fitsText(["pork", "gelatin"], ["mango"])).toBe("No pork, gelatin or mango");
    expect(fitsText([], [])).toBeNull();
    expect(rulesList(["meat"], [])).toBe("no meat");
  });

  it("formats money", () => {
    expect(dollars(7000)).toBe("$70");
    expect(dollars(150)).toBe("$1.50");
  });
});

describe("humanizeReason", () => {
  it("explains why a meal was not shown", async () => {
    const { humanizeReason } = await import("./rules-text");
    expect(humanizeReason("Basil pesto: not checked yet")).toBe("uses the basil pesto, which you have not checked yet");
    expect(humanizeReason("Granola: may contain tree nuts")).toBe("the granola may contain tree nuts");
    expect(humanizeReason("Basil pesto: tree nuts")).toBe("uses the basil pesto, which can have tree nuts");
  });
});
