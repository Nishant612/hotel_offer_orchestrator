
import "dotenv/config";
import { app } from "./app";
import { connectRedis } from "./services/redis";

const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  await connectRedis();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running on port ${PORT}`);
  });
}

main().catch(error => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
