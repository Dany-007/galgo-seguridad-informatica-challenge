import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import { revealRateLimiter } from "../middleware/rateLimiter";
import { listUsuarios, getUsuarioById, revealSensitiveFields } from "../services/usuarios.service";
import { recordAudit } from "../services/audit.service";

export const usuariosRouter = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const revealBodySchema = z.object({
  reason: z.string().min(10, "Debe indicar una justificacion de al menos 10 caracteres"),
});

// Cualquier rol autenticado puede listar/consultar (dato ya enmascarado).
usuariosRouter.get(
  "/",
  authenticate,
  requireRole("admin", "analyst", "viewer", "service"),
  validate("query", listQuerySchema),
  async (req, res) => {
    const { page, pageSize, search } = req.query as unknown as z.infer<typeof listQuerySchema>;
    const result = await listUsuarios({ page, pageSize, search });
    await recordAudit({
      actor: req.auth!.actor,
      actorRole: req.auth!.role,
      action: "LIST_USUARIOS",
      ip: req.ip,
    });
    res.json(result);
  }
);

usuariosRouter.get(
  "/:id",
  authenticate,
  requireRole("admin", "analyst", "viewer", "service"),
  validate("params", idParamSchema),
  async (req, res) => {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const usuario = await getUsuarioById(id);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(usuario);
  }
);

// Revelacion de datos sensibles en claro: solo admin, requiere justificacion, rate-limit estricto
// y queda registrada en auditoria de forma obligatoria (no opcional / no silenciable).
usuariosRouter.post(
  "/:id/reveal",
  authenticate,
  requireRole("admin"),
  revealRateLimiter,
  validate("params", idParamSchema),
  validate("body", revealBodySchema),
  async (req, res) => {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const { reason } = req.body as z.infer<typeof revealBodySchema>;

    const data = await revealSensitiveFields(id);

    await recordAudit({
      actor: req.auth!.actor,
      actorRole: req.auth!.role,
      action: "REVEAL_SENSITIVE_FIELDS",
      resource: `usuario:${id}`,
      reason,
      ip: req.ip,
      success: !!data,
    });

    if (!data) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(data);
  }
);
