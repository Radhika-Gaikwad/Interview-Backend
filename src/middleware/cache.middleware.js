import crypto from "crypto";
import redis from "../config/redis.js";

// Generate ETag
export const generateETag = (data) => {
  return crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");
};

// Redis Cache Middleware
export const cacheMiddleware = (keyPrefix, ttl = 300) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || "guest";
      const key = `${keyPrefix}:${userId}`;

      const cached = await redis.get(key);

      if (cached) {
        const parsed = JSON.parse(cached);
        const etag = generateETag(parsed);

        // ETag check
        if (req.headers["if-none-match"] === etag) {
          return res.status(304).end();
        }

        res.setHeader("ETag", etag);
        return res.json(parsed);
      }

      // Override res.json to cache response
      const originalJson = res.json.bind(res);

      res.json = async (body) => {
        const etag = generateETag(body);

        await redis.setex(key, ttl, JSON.stringify(body));

        res.setHeader("ETag", etag);
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("Cache middleware error:", err);
      next();
    }
  };
};