import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { runIngestion } from "../ingestion/ingestService";
import { prisma } from "../db/prisma";
import { recordAudit } from "../services/audit.service";

export const ingestionRouter = Router();

ingestionRouter.get("/status", authenticate, requireRole("admin", "analyst", "service"), async (_req, res) => {
  const lastRuns = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 5,
  });
  res.json({ lastRuns });
});

// Disparo manual de la ingesta (ademas del cron programado). Solo admin/service para evitar abuso.
ingestionRouter.post("/run", authenticate, requireRole("admin", "service"), async (req, res, next) => {
  try {
    const result = await runIngestion();
    await recordAudit({
      actor: req.auth!.actor,
      actorRole: req.auth!.role,
      action: "INGEST_RUN",
      ip: req.ip,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
