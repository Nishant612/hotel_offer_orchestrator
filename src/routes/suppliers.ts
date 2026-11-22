
import { Router } from "express";
import { supplierA, supplierB } from "../data/hotel";

export const supplierRouter = Router();

supplierRouter.get("/supplierA/hotels", (req, res) => {
  const city = String(req.query.city ?? "")
    .trim()
    .toLowerCase();

  res.json(
    supplierA.filter(hotel => hotel.city === city)
  );
});

supplierRouter.get("/supplierB/hotels", (req, res) => {
  const city = String(req.query.city ?? "")
    .trim()
    .toLowerCase();

  res.json(
    supplierB.filter(hotel => hotel.city === city)
  );
});
