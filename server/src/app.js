import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import datasetRoutes from "./routes/datasets.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { env } from "./config/env.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, ai: Boolean(env.anthropicKey) }));
  app.use("/api/datasets", datasetRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
