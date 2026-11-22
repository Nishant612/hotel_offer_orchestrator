
import "dotenv/config";

import {
  Client,
  Connection
} from "@temporalio/client";

let clientPromise: Promise<Client> | null = null;

export async function createTemporalClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const connection = await Connection.connect({
        address:
          process.env.TEMPORAL_ADDRESS ??
          "localhost:7233"
      });

      return new Client({
        connection,
        namespace: "default"
      });
    })().catch(error => {
      // Allow a later request to retry a failed connection.
      clientPromise = null;
      throw error;
    });
  }

  return clientPromise;
}
