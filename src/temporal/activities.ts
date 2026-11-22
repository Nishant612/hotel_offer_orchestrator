
import type { SupplierHotel } from "../types/hotel";

const BASE_URL =
  process.env.SUPPLIER_BASE_URL ??
  "http://localhost:3000";

async function fetchHotels(
  supplier: "supplierA" | "supplierB",
  city: string
): Promise<SupplierHotel[]> {

  const url = new URL(
    `/${supplier}/hotels`,
    BASE_URL
  );

  url.searchParams.set("city", city);

  console.log(`Fetching hotels from ${supplier}`);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(
      `${supplier} failed with HTTP ${response.status}`
    );
  }

  const hotels =
    (await response.json()) as SupplierHotel[];

  if (!Array.isArray(hotels)) {
    throw new Error(
      `Invalid response from ${supplier}`
    );
  }

  return hotels;
}

export async function fetchSupplierA(
  city: string
): Promise<SupplierHotel[]> {
  return fetchHotels("supplierA", city);
}

export async function fetchSupplierB(
  city: string
): Promise<SupplierHotel[]> {
  return fetchHotels("supplierB", city);
}
