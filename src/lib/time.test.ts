import { describe, expect, it } from "vitest";
import { addDays, localHour, today } from "./time";

describe("time", () => {
  it("7 pm in Ann Arbor is still today, even though it is midnight UTC", () => {
    const sevenPmEst = new Date("2026-11-25T00:00:00Z"); // Nov 24, 7 pm EST
    expect(today(sevenPmEst)).toBe("2026-11-24");
    expect(localHour(sevenPmEst)).toBe(19);
  });

  it("adds days across a month boundary", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
  });
});
