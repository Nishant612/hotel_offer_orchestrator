
import "dotenv/config";

import {
  NativeConnection,
  Worker
} from "@temporalio/worker";

import * as activities from "./activities";

const address =
  process.env.TEMPORAL_ADDRESS ??
  "localhost:7233";

async function connectWithRetry(): Promise<NativeConnection> {
  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `Connecting to Temporal: attempt ${attempt}`
      );

      return await NativeConnection.connect({
        address
      });
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise(resolve =>
        setTimeout(resolve, 3000)
      );
    }
  }

  throw new Error("Temporal connection failed");
}

async function main() {
  const connection = await connectWithRetry();

  try {
    const worker = await Worker.create({
      connection,
      namespace: "default",
      taskQueue: "hotel-task-queue",
      workflowsPath: require.resolve("./workflows"),
      activities
    });

    console.log("Temporal worker started");

    await worker.run();
  } finally {
    await connection.close();
  }
}

main().catch(error => {
  console.error("Worker error:", error);
  process.exit(1);
});
