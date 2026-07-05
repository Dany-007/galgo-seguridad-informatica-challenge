import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";
import { env } from "../config/env";

// Manejador de errores centralizado: nunca se devuelve el stack trace ni detalles internos al
// cliente en produccion (evita fuga de informacion / OWASP A05 Security Misconfiguration).
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  logger.error({ err, path: req.path, method: req.method }, "Error no controlado");

  const message = env.NODE_ENV === "development" && err instanceof Error ? err.message : "Error interno del servidor";

  res.status(500).json({ error: message });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Recurso no encontrado" });
}
