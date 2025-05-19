# Enhanced MongoDB Flight Schema Documentation

## Overview

This document describes the enhanced MongoDB schema for flight data in ChasquiFX. The enhanced schema provides better structure to store comprehensive flight information, enabling more efficient queries and richer analytics.

## Schema Structure

The schema is defined in `src/db/schemas.js` as `flightSchema` and is used to create the `Flight` model.

### Top-Level Fields

| Field                | Type    | Description                                              | Indexed   |
| -------------------- | ------- | -------------------------------------------------------- | --------- |
| `_source`            | String  | Original filename                                        | No        |
| `route`              | String  | Route identifier (e.g., "JFK_AMM_2025-08-10_2025-08-17") | Yes       |
| `date_imported`      | Date    | Date when the document was imported                      | Yes (TTL) |
| `raw_data_available` | Boolean | Whether the raw JSON data is available                   | No        |

### Search Metadata

The `search_metadata` object contains information about the search:

```javascript
search_metadata: {
  id: String,
  status: String,
  json_endpoint: String,
  created_at: String,
  processed_at: String,
  google_flights_url: String,
  raw_html_file: String,
  prettify_html_file: String,
  total_time_taken: Number
}
```

### Search Parameters

The `search_parameters` object contains the parameters used for the search:

```javascript
search_parameters: {
  engine: String,
  hl: String,
  gl: String,
  departure_id: String,
  arrival_id: String,
  outbound_date: String,
  return_date: String,
  currency: String
}
```

### Route Information

The `route_info` object provides quick access to the route details:

```javascript
route_info: {
  departure_airport: String,  // Indexed
  arrival_airport: String,    // Indexed
  outbound_date: String,      // Indexed
  return_date: String         // Indexed
}
```

### Best Flights Summary

The `best_flights_summary` array contains simplified information about the best flights:

```javascript
best_flights_summary: [
  {
    price: Number,
    type: String,
    total_duration: Number, // Indexed
    airline: String, // Indexed
    carbon_emissions: {
      amount: Number, // Indexed
      compared_to_typical: Number,
    },
    layover_count: Number,
    departure_time: String,
    arrival_time: String,
  },
];
```

### Best Flights

The `best_flights` array contains detailed information about the best flights:

```javascript
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
    price: Number, // Indexed
    type: String,
    airline_logo: String,
    departure_token: String,
  },
];
```

### Price Range

The `price_range` object provides quick access to the min/max prices:

```javascript
price_range: {
  min: Number,                // Indexed
  max: Number                 // Indexed
}
```

## Indexes

The schema includes several indexes to optimize common queries:

- Route: `route`
- Route details: `route_info.departure_airport`, `route_info.arrival_airport`
- Dates: `route_info.outbound_date`, `route_info.return_date`
- Prices: `price_range.min`, `price_range.max`, `best_flights.price`
- Duration: `best_flights_summary.total_duration`, `best_flights.total_duration`
- Carbon emissions: `best_flights_summary.carbon_emissions.amount`
- Airlines: `best_flights_summary.airline`

## Migration

To migrate existing flight data to use the enhanced schema, use the `migrate-data.js` script with the `--enhanced-schema` flag:

```bash
node scripts/migration/migrate-data.js --flight --enhanced-schema
```

This will process flight data files and create documents using the enhanced schema.

## Testing

To test the enhanced schema with a single file, run:

```bash
node scripts/migration/test-enhanced-schema.js
```

This will create a test document using the enhanced schema and validate it.

## Utility Functions

The following utility functions are available in `src/db/operations.js`:

- `getEnhancedFlightData(params)`: Get flight data using the enhanced schema
- `findFlightsByPriceRange({ minPrice, maxPrice })`: Find flights within a price range
- `findEcoFriendlyFlights({ departure_id, arrival_id, lowCarbon })`: Find eco-friendly flights
- `getFlightStats()`: Get statistics about flights in the database
