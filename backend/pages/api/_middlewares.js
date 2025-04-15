import { apiLimiter } from "../../middleware/rateLimit";

export function applyRateLimit(handler) {
  return async (req, res) => {
    await new Promise((resolve, reject) => {
      apiLimiter(req, res, (result) => {
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result);
        }
      });
    });
    return handler(req, res);
  };
}
