
import "dotenv/config";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function main() {
  const connection = await NativeConnection.connect({
    address:
      process.env.TEMPORAL_ADDRESS ??
      "localhost:7233"
  });

  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: "hotel-task-queue",
    workflowsPath: require.resolve("./workflows"),
    activities
  });

  console.log("Temporal worker started");

  await worker.run();
}

main().catch(error => {
  console.error("Worker failed:", error);
  process.exit(1);
});
