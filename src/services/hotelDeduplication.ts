
import type {
  SupplierHotel,
  HotelOffer
} from "../types/hotel";

export function deduplicateHotels(
  supplierA: SupplierHotel[],
  supplierB: SupplierHotel[]
): HotelOffer[] {

  const hotelMap = new Map<string, HotelOffer>();

  function processHotels(
    hotels: SupplierHotel[],
    supplier: string
  ) {
    for (const hotel of hotels) {

      const normalizedName = hotel.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

      const offer: HotelOffer = {
        name: hotel.name.trim(),
        price: hotel.price,
        supplier,
        commissionPct: hotel.commissionPct
      };

      const existingOffer =
        hotelMap.get(normalizedName);

      if (
        !existingOffer ||
        offer.price < existingOffer.price
      ) {
        hotelMap.set(normalizedName, offer);
      }
    }
  }

  // Supplier A is processed first.
  processHotels(supplierA, "Supplier A");

  // Supplier B replaces A only if cheaper.
  processHotels(supplierB, "Supplier B");

  return Array.from(hotelMap.values())
    .sort((a, b) =>
      a.price - b.price ||
      a.name.localeCompare(b.name)
    );
}
