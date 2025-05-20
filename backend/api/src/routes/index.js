import { Router } from "express";
import { forexRoutesV2 } from "./forex-v2.js";
import { recommendationsRoutesV2 } from "./recommendations-v2.js";
import flightRoutes from "./flights.js";

export function setupRoutes(app) {
  // API v2 Router with modularized implementation
  const apiRouterV2 = Router();

  // Mount v2 route modules
  apiRouterV2.use("/forex", forexRoutesV2); // Use MongoDB implementation
  apiRouterV2.use("/recommendations", recommendationsRoutesV2);
  apiRouterV2.use("/flights", flightRoutes);

  // API v2
  app.use("/api/v2", apiRouterV2);
}
