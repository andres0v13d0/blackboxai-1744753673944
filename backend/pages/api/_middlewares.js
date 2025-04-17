const rateLimit = require("../../middleware/rateLimit.cjs");

const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minuto
  uniqueTokenPerInterval: 500,
});

function applyRateLimit(handler) {
  return async (req, res) => {
    try {
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      await apiLimiter.check(res, 10, clientIp);
      return handler(req, res);
    } catch {
      return res.status(429).json({ error: "Demasiadas peticiones. Intenta más tarde." });
    }
  };
}

module.exports = { applyRateLimit };
