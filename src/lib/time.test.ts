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

describe("time helpers for screens", () => {
  it("counts days between dates", async () => {
    const { daysBetween } = await import("./time");
    expect(daysBetween("2026-11-22", "2026-11-25")).toBe(3);
    expect(daysBetween("2026-11-25", "2026-11-22")).toBe(-3);
  });

  it("formats a moment in Ann Arbor time", async () => {
    const { formatMoment } = await import("./time");
    expect(formatMoment(new Date("2026-11-23T00:42:00Z"))).toBe("Sun 7:42 pm");
  });

  it("finds Monday of the week", async () => {
    const { weekStart } = await import("./time");
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday belongs to the week that started Monday
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekStart("2026-11-26")).toBe("2026-11-23");
  });

  it("names nearby days", async () => {
    const { relativeDay } = await import("./time");
    expect(relativeDay("2026-11-22", "2026-11-22")).toBe("today");
    expect(relativeDay("2026-11-23", "2026-11-22")).toBe("tomorrow");
    expect(relativeDay("2026-11-26", "2026-11-22")).toBe("Thu");
    expect(relativeDay("2026-12-05", "2026-11-22")).toBe("Dec 5");
    expect(relativeDay("2029-11-21", "2026-11-22")).toBe("Nov 2029");
  });
});
