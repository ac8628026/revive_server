import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

const defaultJobOptions = {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  }

export const extractionQueue = new Queue("extraction-queue", {
   connection: redisConnection,
   defaultJobOptions,
});
