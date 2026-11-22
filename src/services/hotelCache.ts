
import "dotenv/config";

import { redisClient } from "./redis";

import type { HotelOffer } from "../types/hotel";

const CACHE_TTL_SECONDS = Number(
  process.env.CACHE_TTL_SECONDS ?? 300
);

function getCacheKeys(city: string) {
  const normalizedCity = city.trim().toLowerCase();

  return {
    prices: `hotels:${normalizedCity}`,
    data: `hotels:${normalizedCity}:data`,
    ready: `hotels:${normalizedCity}:ready`
  };
}

function normalizeHotelName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Save the deduplicated hotel list.
export async function saveHotels(
  city: string,
  hotels: HotelOffer[]
): Promise<void> {

  const keys = getCacheKeys(city);

  const transaction = redisClient.multi();

  // Remove any previous cached version.
  transaction.del([keys.prices, keys.data, keys.ready]);

  if (hotels.length > 0) {
    // Price index: hotel name -> price
    transaction.zAdd(
      keys.prices,
      hotels.map(hotel => ({
        score: hotel.price,
        value: normalizeHotelName(hotel.name)
      }))
    );

    // Full hotel details: name -> JSON
    const hotelData: Record<string, string> = {};

    for (const hotel of hotels) {
      hotelData[normalizeHotelName(hotel.name)] =
        JSON.stringify(hotel);
    }

    transaction.hSet(keys.data, hotelData);

    transaction.expire(
      keys.prices,
      CACHE_TTL_SECONDS
    );

    transaction.expire(
      keys.data,
      CACHE_TTL_SECONDS
    );
  }

  // This marker also represents a valid empty result.
  transaction.set(keys.ready, "1", {
    EX: CACHE_TTL_SECONDS
  });

  await transaction.exec();

  console.log(
    `Cached ${hotels.length} hotels for ${city}`
  );
}

// Check whether a complete cache exists.
export async function isHotelCacheReady(
  city: string
): Promise<boolean> {

  const keys = getCacheKeys(city);

  return (await redisClient.exists(keys.ready)) === 1;
}

// Retrieve hotels using Redis-side price filtering.
export async function getHotelsByPrice(
  city: string,
  minPrice = 0,
  maxPrice = Infinity
): Promise<HotelOffer[]> {

  const keys = getCacheKeys(city);

  const hotelNames = await redisClient.zRangeByScore(
    keys.prices,
    minPrice,
    maxPrice
  );

  if (hotelNames.length === 0) {
    return [];
  }

  const hotelJson = await redisClient.hmGet(
    keys.data,
    hotelNames
  );

  const hotels: HotelOffer[] = [];

  for (const item of hotelJson) {
    if (item !== null) {
      hotels.push(JSON.parse(item) as HotelOffer);
    }
  }

  return hotels;
}
