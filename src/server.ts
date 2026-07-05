import { env } from "./config/env";
import { logger } from "./config/logger";
import { createApp } from "./app";
import { startIngestionScheduler } from "./jobs/scheduler";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API escuchando en http://0.0.0.0:${env.PORT} (entorno=${env.NODE_ENV})`);
});

startIngestionScheduler();

function shutdown(signal: string) {
  logger.info(`Señal ${signal} recibida, cerrando servidor...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
