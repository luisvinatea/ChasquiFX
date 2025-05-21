import { Router } from "express";
import { forexRoutesV2 } from "./forex-v2.js";
import { recommendationsRoutesV2 } from "./recommendations-routes.js";
import flightRoutes from "./flights.js";
import authRoutes from "./auth-routes.js";
import apiKeyRoutes from "./api-key-routes.js";

export function setupRoutes(app) {
  // API v2 Router with modularized implementation
  const apiRouterV2 = Router();

  // Mount v2 route modules
  apiRouterV2.use("/forex", forexRoutesV2); // Use MongoDB implementation
  apiRouterV2.use("/recommendations", recommendationsRoutesV2);
  apiRouterV2.use("/flights", flightRoutes);
  apiRouterV2.use("/auth", authRoutes); // Authentication routes
  apiRouterV2.use("/api-keys", apiKeyRoutes); // API key management

  // API v2
  app.use("/api/v2", apiRouterV2);
}
