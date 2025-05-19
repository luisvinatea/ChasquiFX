/**
 * MongoDB schemas for ChasquiFX cache
 * Defines the schemas for caching API responses
 */

const mongoose = require("mongoose");

// Schema for forex data cache
const forexCacheSchema = new mongoose.Schema({
  // File naming based on q and created_at from file_renamer.py
  cacheKey: {
    type: String,
    required: true,
    unique: true,
  },
  searchParameters: {
    q: String, // Currency pair (e.g., "USD-EUR")
  },
  searchMetadata: {
    created_at: Date, // Creation timestamp
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // The actual forex data
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index to automatically remove expired documents
  },
  importedAt: {
    type: Date,
    default: Date.now,
  },
});

// Schema for flight data cache
const flightCacheSchema = new mongoose.Schema({
  // File naming based on departure_id, arrival_id, outbound_date, return_date from file_renamer.py
  cacheKey: {
    type: String,
    required: true,
    unique: true,
  },
  searchParameters: {
    departure_id: String,
    arrival_id: String,
    outbound_date: String,
    return_date: String,
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // The actual flight data
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index to automatically remove expired documents
  },
  importedAt: {
    type: Date,
    default: Date.now,
  },
});

// Schema for API call logs
const apiCallLogSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true,
  },
  requestData: {
    type: mongoose.Schema.Types.Mixed,
  },
  responseStatus: {
    type: Number,
  },
  userId: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create models
const ForexCache = mongoose.model("ForexCache", forexCacheSchema);
const FlightCache = mongoose.model("FlightCache", flightCacheSchema);
const ApiCallLog = mongoose.model("ApiCallLog", apiCallLogSchema);

module.exports = {
  ForexCache,
  FlightCache,
  ApiCallLog,
};
