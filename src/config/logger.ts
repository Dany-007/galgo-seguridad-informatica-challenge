import pino from "pino";
import { env } from "./env";

// Redaccion de campos sensibles en logs (nunca deben aparecer PAN, CCV, passwords ni tokens en claro).
export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.creditCardNum",
      "*.credit_card_num",
      "*.creditCardCcv",
      "*.credit_card_ccv",
      "*.cuentaNumero",
      "*.token",
      "*.jwt",
    ],
    censor: "[REDACTED]",
  },
});
