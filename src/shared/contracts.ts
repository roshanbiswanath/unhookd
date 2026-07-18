import { z } from "zod";

export const daySchema = z.number().int().min(0).max(6);

export const usageCandidateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  durationMinutes: z.number().int().nonnegative().nullable(),
  opens: z.number().int().nonnegative().nullable(),
  observedDate: z.string().nullable(),
  peakWindow: z
    .object({ start: z.string(), end: z.string() })
    .nullable(),
  confidence: z.number().min(0).max(1),
  sourceImages: z.array(z.number().int().nonnegative()),
});

export const activityContractSchema = z.object({
  title: z.string().min(2).max(80),
  instructions: z.array(z.string().min(2).max(180)).min(1).max(5),
  metric: z.enum(["count", "duration", "binary"]),
  target: z.number().positive().max(180),
  unit: z.string().min(1).max(24),
  observableCriteria: z.array(z.string().min(2).max(160)).min(1).max(4),
  maximumDurationSeconds: z.number().int().min(30).max(180),
});

export const hookSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  source: z.enum(["manual", "screenshot", "conversation"]),
  durationMinutes: z.number().int().nonnegative().nullable().default(null),
});

export const unhookWindowSchema = z.object({
  id: z.string(),
  hookId: z.string(),
  days: z.array(daySchema).min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const onboardingDraftSchema = z.object({
  timezone: z.string().min(1).max(80),
  hooks: z.array(hookSchema).max(3),
  windows: z.array(unhookWindowSchema).max(6),
  approvedActivities: z.array(z.string().min(2).max(80)).max(12),
  limitations: z.string().max(500),
  cameraEnabled: z.boolean(),
  notificationsEnabled: z.boolean(),
  completed: z.boolean(),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
export type UsageCandidate = z.infer<typeof usageCandidateSchema>;
export type ActivityContract = z.infer<typeof activityContractSchema>;

export const defaultOnboardingDraft = (): OnboardingDraft => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  hooks: [],
  windows: [],
  approvedActivities: ["Push-ups", "Stretching", "Take a short walk"],
  limitations: "",
  cameraEnabled: true,
  notificationsEnabled: true,
  completed: false,
});

export const draftPatchSchema = onboardingDraftSchema.partial();

export const conversationRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  version: z.number().int().nonnegative(),
});

export const draftUpdateSchema = z.object({
  patch: draftPatchSchema,
  version: z.number().int().nonnegative(),
});

export const activityProgressSchema = z.object({
  eventId: z.string().uuid(),
  metric: z.enum(["count", "duration", "binary"]),
  observed: z.number().nonnegative(),
  target: z.number().positive().max(180),
  confidence: z.number().min(0).max(1),
  note: z.string().max(240),
});

export const completeSessionSchema = z.object({
  confirmed: z.boolean(),
  pullBefore: z.number().int().min(0).max(5).nullable(),
  pullAfter: z.number().int().min(0).max(5).nullable(),
  helpfulness: z.enum(["yes", "somewhat", "no"]).nullable(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const notificationActionSchema = z.object({
  windowId: z.string().uuid(),
  action: z.enum(["start", "good", "snooze"]),
  scheduledFor: z.string().datetime(),
});

export function mergeDraft(current: OnboardingDraft, patch: Partial<OnboardingDraft>) {
  return onboardingDraftSchema.parse({ ...current, ...patch });
}

export function mergeObservedProgress(previous: number, next: z.infer<typeof activityProgressSchema>) {
  return Math.min(next.target, Math.max(previous, next.observed));
}
