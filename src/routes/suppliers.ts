
import { Router } from "express";

import {
  supplierAHotels,
  supplierBHotels
} from "../data/hotel";

const router = Router();

// Supplier A API
router.get("/supplierA/hotels", (req, res) => {
  const city = String(req.query.city ?? "")
    .trim()
    .toLowerCase();

  const hotels = city
    ? supplierAHotels.filter(
        hotel => hotel.city.toLowerCase() === city
      )
    : supplierAHotels;

  res.json(hotels);
});

// Supplier B API
router.get("/supplierB/hotels", (req, res) => {
  const city = String(req.query.city ?? "")
    .trim()
    .toLowerCase();

  const hotels = city
    ? supplierBHotels.filter(
        hotel => hotel.city.toLowerCase() === city
      )
    : supplierBHotels;

  res.json(hotels);
});

export default router;
