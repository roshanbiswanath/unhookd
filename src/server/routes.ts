import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import {
  activityProgressSchema, completeSessionSchema, conversationRequestSchema, defaultOnboardingDraft, draftUpdateSchema, mergeDraft, mergeObservedProgress, notificationActionSchema, pushSubscriptionSchema,
} from "../shared/contracts.js";
import type { Database, DraftDocument } from "./db/index.js";
import type { OpenAIService } from "./services/openai.js";
import type { GeminiService } from "./services/gemini.js";

type RouteServices = { db: Database; openai: OpenAIService; gemini: GeminiService; vapidPublicKey: string };

async function getDraft(db: Database, userId: string): Promise<DraftDocument> {
  const existing = await db.onboardingDrafts.findOne({ userId });
  if (existing) return existing;
  const data = defaultOnboardingDraft();
  await db.onboardingDrafts.updateOne({ userId }, { $setOnInsert: { userId, data, version: 0, updatedAt: new Date() } }, { upsert: true });
  const created = await db.onboardingDrafts.findOne({ userId });
  if (!created) throw new Error("Could not create an onboarding draft");
  return created;
}

export async function registerRoutes(app: FastifyInstance, services: RouteServices) {
  const { db, openai, gemini } = services;
  app.get("/api/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  app.get("/api/onboarding", async (request) => {
    const draft = await getDraft(db, request.userId);
    const messages = await db.conversationMessages.find({ userId: request.userId }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
    return { draft: draft.data, version: draft.version, messages };
  });

  app.patch("/api/onboarding", async (request, reply) => {
    const input = draftUpdateSchema.parse(request.body);
    const current = await getDraft(db, request.userId);
    if (input.version !== current.version) return reply.code(409).send({ error: "This plan changed in another view", current });
    const data = mergeDraft(current.data, input.patch);
    const updated = await db.onboardingDrafts.findOneAndUpdate({ userId: request.userId, version: current.version }, { $set: { data, updatedAt: new Date() }, $inc: { version: 1 } }, { returnDocument: "after" });
    if (!updated) return reply.code(409).send({ error: "This plan changed in another view" });
    return { draft: updated.data, version: updated.version };
  });

  app.post("/api/onboarding/message", async (request, reply) => {
    const input = conversationRequestSchema.parse(request.body);
    const current = await getDraft(db, request.userId);
    if (input.version !== current.version) return reply.code(409).send({ error: "This plan changed in another view", current });
    const history = await db.conversationMessages.find({ userId: request.userId }, { projection: { _id: 0, role: 1, content: 1 } }).sort({ createdAt: -1 }).limit(12).toArray();
    const result = await openai.continueOnboarding(input.message, current.data, history.reverse());
    const data = mergeDraft(current.data, result.draftPatch);
    const updated = await db.onboardingDrafts.findOneAndUpdate({ userId: request.userId, version: current.version }, { $set: { data, updatedAt: new Date() }, $inc: { version: 1 } }, { returnDocument: "after" });
    if (!updated) return reply.code(409).send({ error: "This plan changed in another view" });
    await db.conversationMessages.insertMany([{ id: randomUUID(), userId: request.userId, role: "user", content: input.message, createdAt: new Date() }, { id: randomUUID(), userId: request.userId, role: "assistant", content: result.assistantMessage, createdAt: new Date() }]);
    return { assistantMessage: result.assistantMessage, draft: data, version: updated.version };
  });

  app.post("/api/usage-import", async (request, reply) => {
    if (!request.isMultipart()) return reply.code(415).send({ error: "Use multipart form data" });
    const images: Buffer[] = [];
    for await (const part of request.parts()) {
      if (part.type !== "file") continue;
      if (images.length >= 6) return reply.code(413).send({ error: "Upload no more than six screenshots" });
      const input = await part.toBuffer();
      const metadata = await sharp(input).metadata();
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > 32_000_000) return reply.code(422).send({ error: "One screenshot is too large" });
      images.push(await sharp(input).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer());
    }
    if (!images.length) return reply.code(400).send({ error: "Add at least one screenshot" });
    const candidates = await openai.extractUsage(images);
    images.fill(Buffer.alloc(0));
    return { candidates };
  });

  app.post("/api/onboarding/activate", async (request, reply) => {
    const current = await getDraft(db, request.userId);
    const draft = current.data;
    if (!draft.hooks.length || !draft.windows.length) return reply.code(422).send({ error: "Select a hook and at least one Unhook window" });
    const now = new Date();
    await db.hooks.deleteMany({ userId: request.userId });
    await db.unhookWindows.deleteMany({ userId: request.userId });
    await db.hooks.insertMany(draft.hooks.map((hook) => ({ ...hook, userId: request.userId, createdAt: now })));
    await db.unhookWindows.insertMany(draft.windows.map((window) => ({ ...window, userId: request.userId, active: true })));
    await db.users.updateOne({ id: request.userId }, { $set: { timezone: draft.timezone } });
    await db.onboardingDrafts.updateOne({ userId: request.userId }, { $set: { data: { ...draft, completed: true }, updatedAt: now }, $inc: { version: 1 } });
    return { activated: true };
  });

  app.get("/api/dashboard", async (request) => {
    const draft = await getDraft(db, request.userId);
    const [windows, recentSessions, protectedCount] = await Promise.all([db.unhookWindows.find({ userId: request.userId, active: true }, { projection: { _id: 0 } }).toArray(), db.sessions.find({ userId: request.userId }, { projection: { _id: 0 } }).sort({ startedAt: -1 }).limit(8).toArray(), db.protectedWindows.countDocuments({ userId: request.userId })]);
    return { onboardingComplete: draft.data.completed, windows, sessions: recentSessions, protectedCount };
  });

  app.post("/api/live-sessions", async (request, reply) => {
    const body = (request.body ?? {}) as { windowId?: string; pullBefore?: number | null };
    const draft = await getDraft(db, request.userId);
    if (!draft.data.completed) return reply.code(422).send({ error: "Activate your plan first" });
    const recent = await db.sessions.find({ userId: request.userId }, { projection: { activity: 1, helpfulness: 1 } }).sort({ startedAt: -1 }).limit(5).toArray();
    const activity = await openai.planActivity(draft.data, recent.map((item) => ({ title: item.activity.title, helpfulness: item.helpfulness ?? "unknown" })), body.pullBefore ?? null);
    const session = { id: randomUUID(), userId: request.userId, windowId: body.windowId ?? null, activity, status: "active", observed: 0, pullBefore: body.pullBefore ?? null, pullAfter: null, helpfulness: null, startedAt: new Date(), completedAt: null };
    await db.sessions.insertOne(session);
    const live = draft.data.cameraEnabled ? await gemini.createEphemeralToken(activity) : null;
    return { session, ephemeralToken: live?.token ?? null, liveModel: live?.model ?? null };
  });

  app.post("/api/live-sessions/:id/progress", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = activityProgressSchema.parse(request.body);
    const current = await db.sessions.findOne({ id, userId: request.userId });
    if (!current) return reply.code(404).send({ error: "Session not found" });
    const observed = mergeObservedProgress(current.observed, input);
    await db.progressEvents.updateOne({ id: input.eventId }, { $setOnInsert: { id: input.eventId, userId: request.userId, sessionId: id, observed: Math.round(observed), confidence: Math.round(input.confidence * 100), note: input.note, createdAt: new Date() } }, { upsert: true });
    await db.sessions.updateOne({ id, userId: request.userId }, { $set: { observed: Math.round(observed), status: observed >= input.target ? "observed_complete" : "active" } });
    return { observed, complete: observed >= input.target };
  });

  app.post("/api/live-sessions/:id/complete", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = completeSessionSchema.parse(request.body);
    const session = await db.sessions.findOneAndUpdate({ id, userId: request.userId }, { $set: { status: input.confirmed ? "confirmed" : "abandoned", pullBefore: input.pullBefore, pullAfter: input.pullAfter, helpfulness: input.helpfulness, completedAt: new Date() } }, { returnDocument: "after" });
    if (!session) return reply.code(404).send({ error: "Session not found" });
    return { session };
  });

  app.post("/api/push/subscriptions", async (request) => {
    const input = pushSubscriptionSchema.parse(request.body);
    await db.pushSubscriptions.updateOne({ endpoint: input.endpoint }, { $set: { userId: request.userId, p256dh: input.keys.p256dh, auth: input.keys.auth }, $setOnInsert: { id: randomUUID(), endpoint: input.endpoint, createdAt: new Date() } }, { upsert: true });
    return { subscribed: true, publicKey: services.vapidPublicKey };
  });
  app.get("/api/push/public-key", async () => ({ publicKey: services.vapidPublicKey }));
  app.post("/api/notification-actions", async (request) => { const input = notificationActionSchema.parse(request.body); if (input.action === "good") await db.protectedWindows.insertOne({ id: randomUUID(), userId: request.userId, windowId: input.windowId, scheduledFor: new Date(input.scheduledFor), createdAt: new Date() }); return { recorded: true, action: input.action }; });
  app.delete("/api/account", async (request) => { const userId = request.userId; await Promise.all([db.onboardingDrafts.deleteMany({ userId }), db.conversationMessages.deleteMany({ userId }), db.hooks.deleteMany({ userId }), db.unhookWindows.deleteMany({ userId }), db.sessions.deleteMany({ userId }), db.progressEvents.deleteMany({ userId }), db.protectedWindows.deleteMany({ userId }), db.pushSubscriptions.deleteMany({ userId }), db.notificationDeliveries.deleteMany({ userId }), db.users.deleteOne({ id: userId })]); return { deleted: true }; });
}
