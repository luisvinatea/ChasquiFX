/**
 * MongoDB schemas for ChasquiFX Node.js backend
 * Mongoose models for database operations
 */

import mongoose from "mongoose";
import { forexCacheSchema, flightCacheSchema, apiCallLogSchema } from "./mongodb-schemas.js";

// Create models from schemas
const ForexCache = mongoose.model("ForexCache", forexCacheSchema);
const FlightCache = mongoose.model("FlightCache", flightCacheSchema);
const ApiCallLog = mongoose.model("ApiCallLog", apiCallLogSchema);

export { ForexCache, FlightCache, ApiCallLog };
