import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// redis is for cache maintenance

const redisClient = () => {
  if (process.env.REDIS_URL) {
    console.log("REDIS CONNECTED");
    return process.env.REDIS_URL;
  }
  throw new Error("Redis connection failed");
};

export const redis = new Redis(redisClient());
