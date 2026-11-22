
import { SupplierHotel } from "../types/hotel";

async function fetchSupplier(
  supplier: "A" | "B",
  city: string
): Promise<SupplierHotel[]> {
  const baseUrl =
    process.env.SUPPLIER_BASE_URL ??
    "http://localhost:3000";

  const url = new URL(
    `/supplier${supplier}/hotels`,
    baseUrl
  );

  url.searchParams.set("city", city);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(
      `Supplier ${supplier} returned ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid supplier response");
  }

  return data as SupplierHotel[];
}

export async function fetchSupplierA(
  city: string
): Promise<SupplierHotel[]> {
  return fetchSupplier("A", city);
}

export async function fetchSupplierB(
  city: string
): Promise<SupplierHotel[]> {
  return fetchSupplier("B", city);
}
