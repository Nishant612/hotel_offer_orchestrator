
import { redisClient } from "./redis";
import { HotelOffer } from "../types/hotel";
import { randomUUID } from "node:crypto";

const TTL = Number(
  process.env.CACHE_TTL_SECONDS ?? 300
);

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function cityKey(city: string): string {
  return `hotels:${city.toLowerCase()}`;
}

export async function saveHotels(
  city: string,
  hotels: HotelOffer[]
): Promise<void> {
  const key = cityKey(city);
  const dataKey = `${key}:data`;
  const readyKey = `${key}:ready`;

  // Prevent concurrent cache writes for the same city.
  const lockKey = `${key}:lock`;
  const lockToken = randomUUID();

  const locked = await redisClient.set(
    lockKey,
    lockToken,
    { NX: true, PX: 10000 }
  );

  if (locked !== "OK") {
    throw new Error("Cache update already in progress");
  }

  try {
    // Mark the cache as unavailable while replacing it.
    await redisClient.del(readyKey);

    const transaction = redisClient.multi();

    transaction.del(key);
    transaction.del(dataKey);

    for (const hotel of hotels) {
      const member = normalizeName(hotel.name);

      transaction.zAdd(key, {
        score: hotel.price,
        value: member
      });

      transaction.hSet(
        dataKey,
        member,
        JSON.stringify(hotel)
      );
    }

    transaction.expire(key, TTL);
    transaction.expire(dataKey, TTL);
    transaction.set(readyKey, "1", {
      EX: TTL
    });

    await transaction.exec();
  } finally {
    // Release only the lock owned by this operation.
    await redisClient.eval(
      `if redis.call("GET", KEYS[1]) == ARGV[1]
       then return redis.call("DEL", KEYS[1])
       else return 0 end`,
      {
        keys: [lockKey],
        arguments: [lockToken]
      }
    );
  }
}

export async function getHotelsByPrice(
  city: string,
  minPrice = 0,
  maxPrice = Number.POSITIVE_INFINITY
): Promise<HotelOffer[] | null> {
  const key = cityKey(city);
  const dataKey = `${key}:data`;
  const readyKey = `${key}:ready`;

  if (!(await redisClient.exists(readyKey))) {
    return null;
  }

  // Filtering happens in Redis.
  const hotelNames = await redisClient.zRangeByScore(
    key,
    minPrice,
    maxPrice
  );

  if (hotelNames.length === 0) {
    return [];
  }

  const values = await redisClient.hmGet(
    dataKey,
    hotelNames
  );

  return values
    .filter((value): value is string => value !== null)
    .map(value => JSON.parse(value) as HotelOffer);
}
