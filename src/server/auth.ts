import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "@clerk/backend";
import type { Database } from "./db/index.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export function registerAuth(app: { addHook: (name: "preHandler", hook: (request: FastifyRequest, reply: FastifyReply) => Promise<void>) => void }, db: Database, secretKey: string) {
  app.addHook("preHandler", async (request, reply) => {
    if (request.url === "/api/health" || request.url.startsWith("/api/public")) return;
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      reply.code(401).send({ error: "Authentication required" });
      return;
    }
    let userId: string | undefined;
    try {
      const claims = await verifyToken(token, { secretKey });
      userId = claims.sub;
      if (!userId) throw new Error("Missing subject");
    } catch {
      reply.code(401).send({ error: "Invalid session" });
      return;
    }

    request.userId = userId;
    try {
      await db.users.updateOne({ id: userId }, { $setOnInsert: { id: userId, email: null, timezone: "UTC", createdAt: new Date() } }, { upsert: true });
    } catch {
      reply.code(503).send({ error: "Unhookd cannot reach its database. Check the server database configuration, then try again." });
      return;
    }
  });
}

export async function ensureUser(db: Database, userId: string, email?: string | null) {
  await db.users.updateOne({ id: userId }, { $setOnInsert: { id: userId, email: email ?? null, timezone: "UTC", createdAt: new Date() } }, { upsert: true });
  return db.users.findOne({ id: userId });
}
