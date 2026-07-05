import { prisma } from "../db/prisma";
import { logger } from "../config/logger";
import type { Role } from "@prisma/client";

interface AuditParams {
  actor: string;
  actorRole: Role;
  action: string;
  resource?: string;
  reason?: string;
  ip?: string;
  success?: boolean;
}

/**
 * Registro de auditoria inmutable (append-only) para acciones sensibles: login, listado y
 * especialmente revelacion de datos en claro. Requerido por PCI DSS req. 10 (registrar y
 * monitorear todo acceso a datos de tarjetahabientes) y util para trazabilidad forense.
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: params.actor,
        actorRole: params.actorRole,
        action: params.action,
        resource: params.resource,
        reason: params.reason,
        ip: params.ip,
        success: params.success ?? true,
      },
    });
  } catch (error) {
    // La auditoria no debe tumbar la request principal, pero si debe quedar visible en logs.
    logger.error({ error, params }, "No se pudo escribir el registro de auditoria");
  }
}
