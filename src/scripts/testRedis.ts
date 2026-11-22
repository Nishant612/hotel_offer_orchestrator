
import "dotenv/config";

import { randomUUID } from "node:crypto";

import { createTemporalClient } from "../temporal/client";
import { hotelWorkflow } from "../temporal/workflows";

import {
  saveHotels,
  isHotelCacheReady,
  getHotelsByPrice
} from "../services/hotelCache";

import {
  connectRedis,
  redisClient
} from "../services/redis";

async function main() {

  await connectRedis();
  await redisClient.set(
  "debug:connection",
  "hotel-orchestrator",
  { EX: 300 }
);

console.log(
  "Debug key:",
  await redisClient.get("debug:connection")
);

  const client = await createTemporalClient();

  console.log("Fetching hotels through Temporal...");

  const hotels = await client.workflow.execute(
    hotelWorkflow,
    {
      taskQueue: "hotel-task-queue",
      workflowId: `redis-test-${randomUUID()}`,
      args: ["delhi"],
      workflowExecutionTimeout: "45 seconds"
    }
  );

  console.log("Workflow returned:", hotels.length);

  // Save deduplicated results in Redis.
  await saveHotels("delhi", hotels);

  // Verify the cache exists.
  const ready = await isHotelCacheReady("delhi");

  console.log("Cache ready:", ready);

  // Filter hotels inside Redis.
  const filtered = await getHotelsByPrice(
    "delhi",
    5000,
    6000
  );

  console.log("Filtered hotels:");

  console.log(JSON.stringify(filtered, null, 2));

  console.log("Total filtered hotels:", filtered.length);
}

main()
  .catch(error => {
    console.error("Redis test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });
