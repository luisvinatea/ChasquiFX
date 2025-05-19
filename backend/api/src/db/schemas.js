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

// Enhanced schema for flight data with detailed structure
const flightSchema = new mongoose.Schema({
  // Source file information
  _source: {
    type: String,
    required: true,
  },
  route: {
    type: String,
    required: true,
    index: true,
  },
  date_imported: {
    type: Date,
    default: Date.now,
  },
  raw_data_available: {
    type: Boolean,
    default: true,
  },

  // Search metadata
  search_metadata: {
    id: String,
    status: String,
    json_endpoint: String,
    created_at: String,
    processed_at: String,
    google_flights_url: String,
    raw_html_file: String,
    prettify_html_file: String,
    total_time_taken: Number,
  },

  // Search parameters
  search_parameters: {
    engine: String,
    hl: String,
    gl: String,
    departure_id: String,
    arrival_id: String,
    outbound_date: String,
    return_date: String,
    currency: String,
  },

  // Route details
  route_info: {
    departure_airport: {
      type: String,
      index: true,
    },
    arrival_airport: {
      type: String,
      index: true,
    },
    outbound_date: {
      type: String,
      index: true,
    },
    return_date: {
      type: String,
      index: true,
    },
  },

  // Best flights summary (for quick access to most important data)
  best_flights_summary: [
    {
      price: Number,
      type: String,
      total_duration: Number,
      airline: String,
      carbon_emissions: {
        amount: Number,
        compared_to_typical: Number,
      },
      layover_count: Number,
      departure_time: String,
      arrival_time: String,
    },
  ],

  // Complete best flights data
  best_flights: [
    {
      flights: [
        {
          departure_airport: {
            name: String,
            id: String,
            time: String,
          },
          arrival_airport: {
            name: String,
            id: String,
            time: String,
          },
          duration: Number,
          airplane: String,
          airline: String,
          airline_logo: String,
          travel_class: String,
          flight_number: String,
          legroom: String,
          extensions: [String],
          overnight: Boolean,
          often_delayed_by_over_30_min: Boolean,
        },
      ],
      layovers: [
        {
          duration: Number,
          name: String,
          id: String,
        },
      ],
      total_duration: Number,
      carbon_emissions: {
        this_flight: Number,
        typical_for_this_route: Number,
        difference_percent: Number,
      },
      price: {
        type: Number,
        index: true,
      },
      type: String,
      airline_logo: String,
      departure_token: String,
    },
  ],

  // Other flights count
  other_flights_count: Number,

  // Price range
  price_range: {
    min: {
      type: Number,
      index: true,
    },
    max: {
      type: Number,
      index: true,
    },
  },
});

// Add indexes for common query patterns
flightSchema.index({
  "route_info.departure_airport": 1,
  "route_info.arrival_airport": 1,
});
flightSchema.index({ "price_range.min": 1 });
flightSchema.index({ "best_flights_summary.total_duration": 1 });
flightSchema.index({ "best_flights_summary.carbon_emissions.amount": 1 });

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
  // Unique fingerprint to prevent duplicate logs
  fingerprint: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values (for backwards compatibility)
  },
});

// Create models
const ForexCache = mongoose.model("ForexCache", forexCacheSchema);
const FlightCache = mongoose.model("FlightCache", flightCacheSchema);
const ApiCallLog = mongoose.model("ApiCallLog", apiCallLogSchema);
const Flight = mongoose.model("Flight", flightSchema);

module.exports = {
  ForexCache,
  FlightCache,
  ApiCallLog,
  Flight,
};
