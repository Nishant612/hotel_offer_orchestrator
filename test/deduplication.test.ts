import assert from "node:assert/strict";
import { test } from "node:test";
import { deduplicateHotels } from "../src/services/hotelDeduplication";
import type { SupplierHotel } from "../src/types/hotel";

function offer(name: string, price: number, commissionPct: number): SupplierHotel {
  return { hotelId: name, name, price, city: "delhi", commissionPct };
}

test("compares normalized hotel names and preserves the winning commission", () => {
  const result = deduplicateHotels(
    [offer("  Sea   View  ", 6000, 10)],
    [offer("sea view", 5300, 20)]
  );

  assert.deepEqual(result, [
    { name: "sea view", price: 5300, supplier: "Supplier B", commissionPct: 20 }
  ]);
});

test("uses Supplier A as the tie-breaker for the same hotel", () => {
  const result = deduplicateHotels(
    [offer("Holtin", 5340, 10)],
    [offer("Holtin", 5340, 20)]
  );

  assert.deepEqual(result, [
    { name: "Holtin", price: 5340, supplier: "Supplier A", commissionPct: 10 }
  ]);
});

test("keeps exclusive hotels and sorts by ascending price", () => {
  const result = deduplicateHotels(
    [offer("Taj Palace", 8500, 15)],
    [offer("The Grand", 7200, 18)]
  );

  assert.deepEqual(result, [
    { name: "The Grand", price: 7200, supplier: "Supplier B", commissionPct: 18 },
    { name: "Taj Palace", price: 8500, supplier: "Supplier A", commissionPct: 15 }
  ]);
});

test("returns an empty list when both suppliers have no offers", () => {
  assert.deepEqual(deduplicateHotels([], []), []);
});
