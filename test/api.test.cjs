const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const delhiHotels = [
  { name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 },
  { name: "Radison", price: 5900, supplier: "Supplier A", commissionPct: 13 },
  { name: "The Grand", price: 7200, supplier: "Supplier B", commissionPct: 18 },
  { name: "Taj Palace", price: 8500, supplier: "Supplier A", commissionPct: 15 }
];

async function get(path, expectedStatus = 200) {
  const response = await fetch(new URL(path, baseUrl), {
    signal: AbortSignal.timeout(50_000)
  });
  const body = await response.json();
  assert.equal(response.status, expectedStatus, `${path} returned ${JSON.stringify(body)}`);
  return { body, cache: response.headers.get("x-cache") };
}

test("health reports Redis and both mock suppliers", async () => {
  const { body } = await get("/health");
  assert.equal(body.status, "healthy");
  assert.equal(body.redis, "PONG");
  assert.deepEqual(body.suppliers, { supplierA: "up", supplierB: "up" });
});

test("mock suppliers expose overlapping Delhi records at different prices", async () => {
  const [a, b] = await Promise.all([
    get("/supplierA/hotels?city=delhi"),
    get("/supplierB/hotels?city=delhi")
  ]);
  assert.equal(a.body.length, 3);
  assert.equal(b.body.length, 3);
  assert.ok([...a.body, ...b.body].every((hotel) => hotel.city === "delhi"));
  assert.equal(a.body.find((hotel) => hotel.name === "Holtin")?.price, 6000);
  assert.equal(b.body.find((hotel) => hotel.name === "Holtin")?.price, 5340);
});

test("unfiltered Delhi search returns a JSON array with four unique cheapest offers", async () => {
  const { body } = await get("/api/hotels?city=Delhi");
  assert.deepEqual(body, delhiHotels);
});

test("Redis includes both price boundaries", async () => {
  const { body } = await get("/api/hotels?city=delhi&minPrice=5340&maxPrice=5900");
  assert.deepEqual(body, delhiHotels.slice(0, 2));
});

test("the price range excludes quotes discarded during deduplication", async () => {
  const { body } = await get("/api/hotels?city=delhi&minPrice=6000&maxPrice=6200");
  assert.deepEqual(body, []);
});

test("unknown city returns an empty array and is cached from MISS to HIT", async () => {
  const path = `/api/hotels?city=phase8-${randomUUID()}`;
  assert.deepEqual(await get(path), { body: [], cache: "MISS" });
  assert.deepEqual(await get(path), { body: [], cache: "HIT" });
});

test("rejects missing or repeated cities and invalid or reversed price bounds", async () => {
  for (const path of [
    "/api/hotels",
    "/api/hotels?city=delhi&city=mumbai",
    "/api/hotels?city=delhi&minPrice=abc",
    "/api/hotels?city=delhi&minPrice=-1",
    "/api/hotels?city=delhi&minPrice=6000&maxPrice=5000"
  ]) {
    const { body } = await get(path, 400);
    assert.equal(typeof body.error, "string");
  }
});
