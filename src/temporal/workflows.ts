
import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities";
import {
  SupplierHotel,
  HotelOffer
} from "../types/hotel";

const {
  fetchSupplierA,
  fetchSupplierB
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1 second",
    backoffCoefficient: 2
  }
});

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function hotelWorkflow(
  city: string
): Promise<HotelOffer[]> {
  // Run supplier requests concurrently.
  const [offersA, offersB] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city)
  ]);

  const bestOffers = new Map<string, HotelOffer>();

  const allOffers: {
    hotel: SupplierHotel;
    supplier: string;
  }[] = [
    ...offersA.map(hotel => ({
      hotel,
      supplier: "Supplier A"
    })),
    ...offersB.map(hotel => ({
      hotel,
      supplier: "Supplier B"
    }))
  ];

  for (const { hotel, supplier } of allOffers) {
    const key = normalizeName(hotel.name);

    const existing = bestOffers.get(key);

    if (!existing || hotel.price < existing.price) {
      bestOffers.set(key, {
        name: hotel.name,
        price: hotel.price,
        supplier,
        commissionPct: hotel.commissionPct
      });
    }
  }

  return [...bestOffers.values()].sort(
    (a, b) =>
      a.price - b.price ||
      a.name.localeCompare(b.name)
  );
}
