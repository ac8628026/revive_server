import IORedis from "ioredis";
import 'dotenv/config'

export const redisConnection = new (IORedis as any)({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});
