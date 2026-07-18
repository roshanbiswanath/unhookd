import Fastify from "fastify";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDatabase } from "./db/index.js";
import { registerAuth } from "./auth.js";
import { registerRoutes } from "./routes.js";
import { OpenAIService } from "./services/openai.js";
import { GeminiService } from "./services/gemini.js";
import { startScheduler } from "./services/scheduler.js";
import type { Env } from "./env.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: { redact: ["req.headers.authorization", "req.body.message"] },
    bodyLimit: 12 * 1024 * 1024,
    trustProxy: true,
  });
  const { db, client } = await createDatabase(env.MONGODB_URI);
  const openai = new OpenAIService(env.OPENAI_MODEL, env.OPENAI_API_KEY);
  const gemini = new GeminiService(env.GEMINI_LIVE_MODEL, env.GEMINI_API_KEY);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(multipart, { limits: { files: 6, fileSize: 8 * 1024 * 1024, fields: 4 } });
  registerAuth(app, db, env.CLERK_SECRET_KEY);
  await registerRoutes(app, { db, openai, gemini, vapidPublicKey: env.VAPID_PUBLIC_KEY });

  let stopScheduler = () => {};
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    stopScheduler = startScheduler(db, { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY });
  }

  if (env.NODE_ENV === "production") {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const clientDir = join(currentDir, "../../client");
    await app.register(fastifyStatic, { root: clientDir });
    app.setNotFoundHandler((request, reply) => request.url.startsWith("/api/") ? reply.code(404).send({ error: "Not found" }) : reply.sendFile("index.html"));
  }

  app.addHook("onClose", async () => {
    stopScheduler();
    await client.close();
  });
  return app;
}
