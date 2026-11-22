
import { proxyActivities } from "@temporalio/workflow";

import type * as activities from "./activities";

import type { HotelOffer } from "../types/hotel";

import { deduplicateHotels } from "../services/hotelDeduplication";

const {
  fetchSupplierA,
  fetchSupplierB
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "5 seconds",
    maximumAttempts: 3
  }
});

export async function hotelWorkflow(
  city: string
): Promise<HotelOffer[]> {

  // Fetch both suppliers concurrently.
  const [supplierA, supplierB] =
    await Promise.all([
      fetchSupplierA(city),
      fetchSupplierB(city)
    ]);

  // Select the cheapest offer per hotel.
  const hotels = deduplicateHotels(
    supplierA,
    supplierB
  );

  return hotels;
}
