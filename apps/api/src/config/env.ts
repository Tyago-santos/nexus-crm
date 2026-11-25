import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  JWT_SECRET: z.string().min(16).default("nexus-dev-secret-change-me-please"),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DEMO_MODE: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),

  // Processamento síncrono na API — sem filas/Redis/worker.
  CRON_SECRET: z.string().min(8).default("nexus-cron-dev-secret"),
  WEBHOOK_SECRET: z.string().min(8).default("nexus-webhook-dev-secret"),

  // WhatsApp: em Render Free use "meta_cloud" (webhook stateless).
  // "baileys" exige processo persistente e é indicado para ambiente local/VPS.
  WHATSAPP_PROVIDER: z.enum(["disabled", "baileys", "meta_cloud"]).default("disabled"),
  WHATSAPP_SESSIONS_DIR: z.string().default("./.sessions"),
  SESSION_ENCRYPTION_KEY: z.string().min(16).default("nexus-dev-session-key-change-me"),
  META_WA_PHONE_NUMBER_ID: z.string().optional(),
  META_WA_ACCESS_TOKEN: z.string().optional(),

  // IA (Gemini)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_KEY_FALLBACKS: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3-flash-preview"),
});

export const env = envSchema.parse(process.env);
