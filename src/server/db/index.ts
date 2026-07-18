import { MongoClient, type Collection } from "mongodb";
import type { ActivityContract, OnboardingDraft } from "../../shared/contracts.js";

export type UserDocument = { id: string; email: string | null; timezone: string; createdAt: Date };
export type DraftDocument = { userId: string; data: OnboardingDraft; version: number; updatedAt: Date };
export type MessageDocument = { id: string; userId: string; role: string; content: string; createdAt: Date };
export type HookDocument = { id: string; userId: string; name: string; source: string; durationMinutes: number | null; createdAt: Date };
export type WindowDocument = { id: string; userId: string; hookId: string; days: number[]; startTime: string; endTime: string; active: boolean };
export type SessionDocument = { id: string; userId: string; windowId: string | null; activity: ActivityContract; status: string; observed: number; pullBefore: number | null; pullAfter: number | null; helpfulness: "yes" | "somewhat" | "no" | null; startedAt: Date; completedAt: Date | null };
export type ProgressEventDocument = { id: string; userId: string; sessionId: string; observed: number; confidence: number; note: string; createdAt: Date };
export type ProtectedWindowDocument = { id: string; userId: string; windowId: string | null; scheduledFor: Date; createdAt: Date };
export type PushSubscriptionDocument = { id: string; userId: string; endpoint: string; p256dh: string; auth: string; createdAt: Date };
export type DeliveryDocument = { id: string; userId: string; windowId: string; scheduledFor: Date; deliveredAt: Date };

export type Database = {
  users: Collection<UserDocument>;
  onboardingDrafts: Collection<DraftDocument>;
  conversationMessages: Collection<MessageDocument>;
  hooks: Collection<HookDocument>;
  unhookWindows: Collection<WindowDocument>;
  sessions: Collection<SessionDocument>;
  progressEvents: Collection<ProgressEventDocument>;
  protectedWindows: Collection<ProtectedWindowDocument>;
  pushSubscriptions: Collection<PushSubscriptionDocument>;
  notificationDeliveries: Collection<DeliveryDocument>;
};

export async function createDatabase(url: string) {
  const client = new MongoClient(url);
  await client.connect();
  const database = client.db();
  const db: Database = {
    users: database.collection("users"), onboardingDrafts: database.collection("onboarding_drafts"), conversationMessages: database.collection("conversation_messages"), hooks: database.collection("hooks"), unhookWindows: database.collection("unhook_windows"), sessions: database.collection("sessions"), progressEvents: database.collection("progress_events"), protectedWindows: database.collection("protected_windows"), pushSubscriptions: database.collection("push_subscriptions"), notificationDeliveries: database.collection("notification_deliveries"),
  };
  await Promise.all([
    db.users.createIndex({ id: 1 }, { unique: true }), db.onboardingDrafts.createIndex({ userId: 1 }, { unique: true }), db.conversationMessages.createIndex({ userId: 1, createdAt: 1 }), db.hooks.createIndex({ id: 1 }, { unique: true }), db.unhookWindows.createIndex({ id: 1 }, { unique: true }), db.sessions.createIndex({ id: 1 }, { unique: true }), db.sessions.createIndex({ userId: 1, startedAt: -1 }), db.progressEvents.createIndex({ id: 1 }, { unique: true }), db.pushSubscriptions.createIndex({ endpoint: 1 }, { unique: true }), db.notificationDeliveries.createIndex({ windowId: 1, scheduledFor: 1 }, { unique: true }),
  ]);
  return { db, client };
}
