import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  MASTER_KEK_BASE64: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, {
      message: "MASTER_KEK_BASE64 debe decodificar a exactamente 32 bytes",
    }),
  PROVIDER_API_URL: z.string().url(),
  INGESTION_CRON: z.string().default("*/30 * * * *"),
  SEED_ADMIN_USERNAME: z.string().default("admin"),
  SEED_ADMIN_PASSWORD: z.string().min(8),
  SEED_ANALYST_USERNAME: z.string().default("analyst"),
  SEED_ANALYST_PASSWORD: z.string().min(8),
  SEED_VIEWER_USERNAME: z.string().default("viewer"),
  SEED_VIEWER_PASSWORD: z.string().min(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuracion invalida en variables de entorno:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
