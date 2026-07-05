import cron from "node-cron";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { runIngestion } from "../ingestion/ingestService";

/** Programa la ingesta periodica del proveedor externo (por defecto cada 30 minutos, ver .env). */
export function startIngestionScheduler() {
  if (!cron.validate(env.INGESTION_CRON)) {
    logger.warn({ cron: env.INGESTION_CRON }, "Expresion cron invalida, scheduler deshabilitado");
    return;
  }

  cron.schedule(env.INGESTION_CRON, async () => {
    try {
      await runIngestion();
    } catch (error) {
      logger.error({ error }, "Fallo la ingesta programada");
    }
  });

  logger.info({ cron: env.INGESTION_CRON }, "Scheduler de ingesta iniciado");
}
