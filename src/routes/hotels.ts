
import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { Connection, Client } from "@temporalio/client";

import { hotelWorkflow } from "../temporal/workflows";
import {
  saveHotels,
  getHotelsByPrice
} from "../services/hotelCache";

export const hotelRouter = Router();

const querySchema = z.object({
  city: z.string().trim().min(1),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional()
}).refine(
  data =>
    data.minPrice === undefined ||
    data.maxPrice === undefined ||
    data.minPrice <= data.maxPrice,
  {
    message: "minPrice must not exceed maxPrice"
  }
);

let temporalClient: Client | undefined;

async function getTemporalClient(): Promise<Client> {
  if (!temporalClient) {
    const connection = await Connection.connect({
      address:
        process.env.TEMPORAL_ADDRESS ??
        "localhost:7233"
    });

    temporalClient = new Client({ connection });
  }

  return temporalClient;
}

hotelRouter.get("/api/hotels", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid query parameters",
      details: parsed.error.flatten()
    });
    return;
  }

  const { minPrice, maxPrice } = parsed.data;
  const city = parsed.data.city.toLowerCase();

  try {
    let hotels = await getHotelsByPrice(
      city,
      minPrice,
      maxPrice
    );

    if (hotels === null) {
      const client = await getTemporalClient();

      const results = await client.workflow.execute(
        hotelWorkflow,
        {
          taskQueue: "hotel-task-queue",
          workflowId: `hotel-${city}-${randomUUID()}`,
          args: [city],
          workflowExecutionTimeout: "45 seconds"
        }
      );

      await saveHotels(city, results);

      hotels = await getHotelsByPrice(
        city,
        minPrice,
        maxPrice
      );
    }

    if (hotels === null) {
      throw new Error("Hotel cache unavailable");
    }

    res.json(hotels);
  } catch (error) {
    console.error("Hotel search failed:", error);

    res.status(503).json({
      error: "Hotel search temporarily unavailable"
    });
  }
});
