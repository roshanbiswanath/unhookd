import { z } from "zod";
import "dotenv/config";

const optional = (fallback = "") => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().default(fallback),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: optional("gpt-5.6-terra"),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_LIVE_MODEL: optional("gemini-3.1-flash-live-preview"),
  VAPID_PUBLIC_KEY: optional(),
  VAPID_PRIVATE_KEY: optional(),
  VAPID_SUBJECT: optional("mailto:admin@example.com"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${missing}`);
  }
  return result.data;
}
