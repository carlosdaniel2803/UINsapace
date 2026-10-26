import rateLimit from "express-rate-limit";

/**
 * Limits login attempts per IP to slow down brute force attacks.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.",
  },
});

/**
 * Limits public registrations per IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Demasiados registros desde esta conexión. Intenta de nuevo más tarde.",
  },
});
