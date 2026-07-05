import crypto from "node:crypto";
import { prisma } from "../db/prisma";
import { hashPassword } from "../auth/password";
import { env } from "../config/env";

async function upsertUser(username: string, password: string, role: "admin" | "analyst" | "viewer") {
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role, isActive: true },
    create: { username, passwordHash, role },
  });
  console.log(`Usuario listo: ${username} (rol=${role})`);
}

async function ensureServiceApiKey() {
  const existing = await prisma.apiKey.findFirst({ where: { name: "equipo-consumidor-default" } });
  if (existing) {
    console.log("API key de servicio ya existe (no se muestra de nuevo el valor en claro).");
    return;
  }
  const rawKey = crypto.randomBytes(32).toString("hex");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  await prisma.apiKey.create({
    data: { name: "equipo-consumidor-default", keyHash, role: "service" },
  });
  console.log("=====================================================");
  console.log("API KEY generada (guardela ahora, no se vuelve a mostrar):");
  console.log(rawKey);
  console.log("Uso: header 'X-API-Key: <valor>' en las llamadas a la API");
  console.log("=====================================================");
}

async function main() {
  await upsertUser(env.SEED_ADMIN_USERNAME, env.SEED_ADMIN_PASSWORD, "admin");
  await upsertUser(env.SEED_ANALYST_USERNAME, env.SEED_ANALYST_PASSWORD, "analyst");
  await upsertUser(env.SEED_VIEWER_USERNAME, env.SEED_VIEWER_PASSWORD, "viewer");
  await ensureServiceApiKey();
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
