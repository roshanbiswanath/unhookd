import { describe, expect, it } from "vitest";
import { activityContractSchema, defaultOnboardingDraft, mergeDraft, mergeObservedProgress } from "./contracts";

describe("onboarding contracts", () => {
  it("merges a valid draft patch without discarding existing choices", () => {
    const current = defaultOnboardingDraft();
    const merged = mergeDraft(current, { limitations: "Avoid floor exercises", cameraEnabled: false });

    expect(merged.limitations).toBe("Avoid floor exercises");
    expect(merged.cameraEnabled).toBe(false);
    expect(merged.approvedActivities).toEqual(current.approvedActivities);
  });

  it("keeps activity progress cumulative and capped", () => {
    const event = { eventId: "3c7b5f17-fb2f-4bf3-9f54-0376a57bf77d", metric: "count" as const, observed: 12, target: 10, confidence: 0.8, note: "Observed" };
    expect(mergeObservedProgress(7, event)).toBe(10);
    expect(mergeObservedProgress(9, { ...event, observed: 3 })).toBe(9);
  });

  it("rejects unsafe or unconstrained activity contracts", () => {
    expect(() => activityContractSchema.parse({ title: "Walk", instructions: [], metric: "duration", target: 300, unit: "seconds", observableCriteria: ["Moving"], maximumDurationSeconds: 300 })).toThrow();
  });
});
