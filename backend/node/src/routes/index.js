import { Router } from "express";
import { forexRoutes } from "./forex.js";
import { recommendationRoutes } from "./recommendations.js";

export function setupRoutes(app) {
  const apiRouter = Router();

  // Mount route modules
  apiRouter.use("/forex", forexRoutes);
  apiRouter.use("/recommendations", recommendationRoutes);

  // API version
  app.use("/api/v1", apiRouter);
}
