
import express from "express";
import cors from "cors";

import { supplierRouter } from "./routes/suppliers";
import { hotelRouter } from "./routes/hotels";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Hotel Offer Orchestrator API"
  });
});

app.use(supplierRouter);
app.use(hotelRouter);
