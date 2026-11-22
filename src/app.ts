
import express from "express";
import cors from "cors";

import supplierRoutes from "./routes/suppliers";
import hotelRoutes from "./routes/hotels";

import { redisClient } from "./services/redis";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Hotel Offer Orchestrator API"
  });
});

async function supplierStatus(supplier: "supplierA" | "supplierB") {
  const port = process.env.PORT ?? "3000";
  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/${supplier}/hotels`,
      { signal: AbortSignal.timeout(2000) }
    );
    const hotels: unknown = await response.json();
    return response.ok && Array.isArray(hotels) ? "up" : "down";
  } catch {
    return "down";
  }
}

app.get("/health", async (_req, res) => {
  const [redis, supplierA, supplierB] = await Promise.all([
    redisClient.isReady
      ? redisClient.ping().catch(() => "unavailable")
      : Promise.resolve("unavailable"),
    supplierStatus("supplierA"),
    supplierStatus("supplierB")
  ]);
  const healthy = redis === "PONG" && supplierA === "up" && supplierB === "up";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "unhealthy",
    redis,
    suppliers: { supplierA, supplierB }
  });
});

app.use(supplierRoutes);
app.use(hotelRoutes);
