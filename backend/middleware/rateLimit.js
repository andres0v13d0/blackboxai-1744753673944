import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: {
    error: "Demasiadas solicitudes, por favor intente de nuevo más tarde.",
  },
});
