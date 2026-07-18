import { randomUUID } from "node:crypto";
import webpush from "web-push";
import type { Database, WindowDocument } from "../db/index.js";

export function scheduledMinute(now: Date) { const minute = new Date(now); minute.setUTCSeconds(0, 0); return minute; }
export function isWindowDue(window: Pick<WindowDocument, "days" | "startTime">, timezone: string, now: Date) {
  try { const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now); const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value; const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value("weekday") ?? ""); return weekday >= 0 && window.days.includes(weekday) && `${value("hour")}:${value("minute")}` === window.startTime; } catch { return false; }
}
export function startScheduler(db: Database, vapid: { subject: string; publicKey: string; privateKey: string }) {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const tick = async () => { const now = new Date(); const windows = await db.unhookWindows.find({ active: true }).toArray(); for (const window of windows) { const user = await db.users.findOne({ id: window.userId }); if (!user || !isWindowDue(window, user.timezone, now)) continue; const subscriptions = await db.pushSubscriptions.find({ userId: window.userId }).toArray(); if (!subscriptions.length) continue; const scheduledFor = scheduledMinute(now); try { await db.notificationDeliveries.insertOne({ id: randomUUID(), userId: window.userId, windowId: window.id, scheduledFor, deliveredAt: new Date() }); } catch { continue; } await Promise.allSettled(subscriptions.map((subscription) => webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: "Your 60-second unhook is ready", body: "Choose a short activity that helps you come back to yourself.", data: { url: `/today?windowId=${window.id}` }, tag: `unhook-${window.id}` })))); } };
  const timer = setInterval(() => void tick(), 60_000); void tick(); return () => clearInterval(timer);
}
