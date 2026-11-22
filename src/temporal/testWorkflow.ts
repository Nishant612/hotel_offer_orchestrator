
import "dotenv/config";

import { randomUUID } from "node:crypto";

import { createTemporalClient } from "./client";

import { hotelWorkflow } from "./workflows";

async function main() {

  const client = await createTemporalClient();

  console.log("Starting hotel workflow...");

  const hotels = await client.workflow.execute(
    hotelWorkflow,
    {
      taskQueue: "hotel-task-queue",
      workflowId: `hotel-test-${randomUUID()}`,
      args: ["delhi"],
      workflowExecutionTimeout: "45 seconds"
    }
  );

  console.log("Workflow completed successfully!");

  console.log(
    JSON.stringify(hotels, null, 2)
  );

  console.log("Total unique hotels:", hotels.length);
}

main().catch(error => {
  console.error("Workflow test failed:", error);
  process.exit(1);
});
