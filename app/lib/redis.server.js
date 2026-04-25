import IORedis from "ioredis";

const g = globalThis;

export const redis =
  g.__ioredis ??
  (g.__ioredis = new IORedis(
    process.env.REDIS_URL || "redis://localhost:6379",
    { maxRetriesPerRequest: null }
  ));
