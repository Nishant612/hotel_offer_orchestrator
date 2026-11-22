
import { Router } from "express";
import { randomUUID } from "node:crypto";

import { createTemporalClient } from "../temporal/client";
import { hotelWorkflow } from "../temporal/workflows";

import {
  isHotelCacheReady,
  saveHotels,
  getHotelsByPrice
} from "../services/hotelCache";

const router = Router();

const pendingCities = new Map<string, Promise<void>>();

function parsePrice(
  value: unknown,
  name: string,
  defaultValue: number
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new Error(`${name} must be a valid number`);
  }

  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(
      `${name} must be a non-negative finite number`
    );
  }

  return price;
}

async function populateCache(city: string): Promise<void> {
  const existing = pendingCities.get(city);

  if (existing) {
    return existing;
  }

  const task = (async () => {
    // Recheck in case another request populated the cache.
    if (await isHotelCacheReady(city)) {
      return;
    }

    const client = await createTemporalClient();

    const hotels = await client.workflow.execute(
      hotelWorkflow,
      {
        taskQueue: "hotel-task-queue",
        workflowId: `hotels-${city}-${randomUUID()}`,
        args: [city],
        workflowExecutionTimeout: "45 seconds"
      }
    );

    await saveHotels(city, hotels);
  })();

  pendingCities.set(city, task);

  try {
    await task;
  } finally {
    if (pendingCities.get(city) === task) {
      pendingCities.delete(city);
    }
  }
}

router.get("/api/hotels", async (req, res) => {
  const rawCity = req.query.city;

  if (
    typeof rawCity !== "string" ||
    rawCity.trim().length === 0
  ) {
    res.status(400).json({
      error: "city is required"
    });
    return;
  }

  const city = rawCity.trim().toLowerCase();

  let minPrice: number;
  let maxPrice: number;

  try {
    minPrice = parsePrice(
      req.query.minPrice,
      "minPrice",
      0
    );

    maxPrice = parsePrice(
      req.query.maxPrice,
      "maxPrice",
      Infinity
    );
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Invalid price parameters"
    });
    return;
  }

  if (minPrice > maxPrice) {
    res.status(400).json({
      error: "minPrice cannot exceed maxPrice"
    });
    return;
  }

  try {
    const cacheHit = await isHotelCacheReady(city);

    if (!cacheHit) {
      await populateCache(city);
    }

    const hotels = await getHotelsByPrice(
      city,
      minPrice,
      maxPrice
    );

    res.set("X-Cache", cacheHit ? "HIT" : "MISS");
    res.status(200).json(hotels);
  } catch (error) {
    console.error("Hotel API error:", error);

    res.status(503).json({
      error: "Hotel service temporarily unavailable"
    });
  }
});

export default router;
