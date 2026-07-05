import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { verifyAccessToken } from "../auth/jwt";
import { prisma } from "../db/prisma";
import type { Role } from "@prisma/client";

export interface AuthContext {
  actor: string;
  role: Role;
  authMethod: "jwt" | "apiKey";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Autentica la request via:
 *  - Bearer JWT (usuarios humanos: dashboard, Swagger "Authorize")
 *  - Header X-API-Key (consumo servicio-a-servicio de otros equipos/aplicaciones)
 * Ambas rutas son requeridas para acceder a cualquier endpoint de datos: no hay acceso anonimo.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.header("x-api-key");

  try {
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      const payload = verifyAccessToken(token);
      req.auth = { actor: payload.sub, role: payload.role, authMethod: "jwt" };
      return next();
    }

    if (apiKeyHeader) {
      const keyHash = crypto.createHash("sha256").update(apiKeyHeader).digest("hex");
      const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
      if (!apiKey || !apiKey.isActive) {
        return res.status(401).json({ error: "API key invalida o inactiva" });
      }
      await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
      req.auth = { actor: `apikey:${apiKey.name}`, role: apiKey.role, authMethod: "apiKey" };
      return next();
    }

    return res.status(401).json({ error: "Autenticacion requerida (Bearer token o X-API-Key)" });
  } catch {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }
}

/** Autorizacion por rol (RBAC). Se usa despues de authenticate(). */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "No autenticado" });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "No tiene permisos suficientes para este recurso" });
    }
    return next();
  };
}
