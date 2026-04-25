import { Queue } from "bullmq";
import { redis } from "./redis.server.js";

const g = globalThis;

export const restockAlertsQueue =
  g.__restockAlertsQueue ??
  (g.__restockAlertsQueue = new Queue("restock-alerts", { connection: redis }));

export const sendAlertQueue =
  g.__sendAlertQueue ??
  (g.__sendAlertQueue = new Queue("send-alert", { connection: redis }));
