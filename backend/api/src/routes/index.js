import { Router } from "express";
import { forexRoutes } from "./forex.js";
import { forexRoutesV2 } from "./forex-v2.js";
import { recommendationRoutes } from "./recommendations.js";
import { recommendationsRoutesV2 } from "./recommendations-v2.js";
import flightRoutes from "./flights.js";

export function setupRoutes(app) {
  // API v1 Router
  const apiRouterV1 = Router();

  // Mount v1 route modules
  apiRouterV1.use("/forex", forexRoutes);
  apiRouterV1.use("/recommendations", recommendationRoutes);

  // API v1
  app.use("/api/v1", apiRouterV1);

  // API v2 Router with modularized implementation
  const apiRouterV2 = Router();

  // Mount v2 route modules
  apiRouterV2.use("/forex", forexRoutesV2); // Use MongoDB implementation
  apiRouterV2.use("/recommendations", recommendationsRoutesV2);
  apiRouterV2.use("/flights", flightRoutes);

  // API v2
  app.use("/api/v2", apiRouterV2);
}
