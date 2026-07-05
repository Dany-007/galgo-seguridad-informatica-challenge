import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { generalRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { usuariosRouter } from "./routes/usuarios.routes";
import { ingestionRouter } from "./routes/ingestion.routes";
import { healthRouter } from "./routes/health.routes";

export function createApp() {
  const app = express();

  // Cabeceras de seguridad HTTP (X-Frame-Options, X-Content-Type-Options, CSP basica, HSTS, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://cdn.fakercloud.com", "http://placeimg.com"],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  // CORS restringido: solo origenes explicitamente autorizados pueden consumir la API desde un navegador.
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:8443,https://localhost:8443")
    .split(",")
    .map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origen no permitido por CORS"));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));
  app.use(generalRateLimiter);
  app.disable("x-powered-by");

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/api/v1/usuarios", usuariosRouter);
  app.use("/api/v1/ingestion", ingestionRouter);

  try {
    const openapiDocument = YAML.load(path.join(__dirname, "..", "openapi.yaml"));
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
  } catch (error) {
    logger.warn({ error }, "No se pudo cargar openapi.yaml, /docs deshabilitado");
  }

  // Dashboard estatico de consumo (solo assets; llama a la API con su propio JWT desde el navegador).
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
