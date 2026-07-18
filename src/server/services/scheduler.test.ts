import { describe, expect, it } from "vitest";
import { isWindowDue, scheduledMinute } from "./scheduler";

describe("isWindowDue", () => {
  const weekdayWindow = { days: [1, 2, 3, 4, 5], startTime: "09:30" };

  it("matches the exact local weekday and minute", () => {
    expect(isWindowDue(weekdayWindow, "Asia/Kolkata", new Date("2026-07-20T04:00:45.000Z"))).toBe(true);
    expect(isWindowDue(weekdayWindow, "Asia/Kolkata", new Date("2026-07-20T04:01:00.000Z"))).toBe(false);
  });

  it("uses the user's timezone rather than UTC", () => {
    expect(isWindowDue({ days: [0], startTime: "20:30" }, "America/New_York", new Date("2026-07-20T00:30:00.000Z"))).toBe(true);
  });

  it("handles daylight-saving offsets through Intl", () => {
    const window = { days: [0], startTime: "03:30" };
    expect(isWindowDue(window, "America/New_York", new Date("2026-03-08T07:30:00.000Z"))).toBe(true);
  });

  it("rounds delivery timestamps to the UTC minute for unique delivery keys", () => {
    const first = scheduledMinute(new Date("2026-07-20T04:00:12.999Z"));
    const retry = scheduledMinute(new Date("2026-07-20T04:00:59.000Z"));
    expect(first.toISOString()).toBe("2026-07-20T04:00:00.000Z");
    expect(retry).toEqual(first);
  });
});
