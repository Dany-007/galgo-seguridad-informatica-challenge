import rateLimit from "express-rate-limit";

// Login: proteccion contra fuerza bruta / credential stuffing (OWASP ASVS 2.2.1).
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de login, intente nuevamente en unos minutos" },
});

// Reveal de datos sensibles: limite estricto porque es la operacion de mayor riesgo/impacto.
export const revealRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de operaciones de revelacion de datos alcanzado para esta hora" },
});

// Limite general para el resto de la API.
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
