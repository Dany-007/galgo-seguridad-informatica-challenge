import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { verifyPassword } from "../auth/password";
import { signAccessToken } from "../auth/jwt";
import { validate } from "../middleware/validate";
import { loginRateLimiter } from "../middleware/rateLimiter";
import { recordAudit } from "../services/audit.service";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

authRouter.post("/login", loginRateLimiter, validate("body", loginSchema), async (req, res) => {
  const { username, password } = req.body as z.infer<typeof loginSchema>;
  const ip = req.ip;

  const user = await prisma.user.findUnique({ where: { username } });

  // Respuesta generica en ambos casos (usuario no existe / password incorrecta) para no filtrar
  // que usernames existen (evita enumeracion de cuentas).
  if (!user || !user.isActive || !(await verifyPassword(user.passwordHash, password))) {
    await recordAudit({
      actor: username,
      actorRole: "viewer",
      action: "LOGIN",
      success: false,
      ip,
    });
    return res.status(401).json({ error: "Usuario o contrasena invalidos" });
  }

  const token = signAccessToken({ sub: user.username, role: user.role });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({ actor: user.username, actorRole: user.role, action: "LOGIN", success: true, ip });

  res.json({ token, role: user.role, expiresIn: process.env.JWT_EXPIRES_IN ?? "15m" });
});
