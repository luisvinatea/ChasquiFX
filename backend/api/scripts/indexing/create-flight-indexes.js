/**
 * Create MongoDB indexes for the Flight collection
 * This script ensures all necessary indexes are created for optimized queries
 */

require("dotenv").config();
import { connection } from "mongoose";
import { connectToDatabase } from "../../src/db/mongodb";
import { Flight } from "../../src/db/schemas";

async function createIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await connectToDatabase();

    console.log("Creating indexes for Flight collection...");

    // Route-based indexes
    await Flight.collection.createIndex({ route: 1 }, { background: true });
    await Flight.collection.createIndex(
      { "route_info.departure_airport": 1, "route_info.arrival_airport": 1 },
      { background: true }
    );
    await Flight.collection.createIndex(
      { "route_info.outbound_date": 1 },
      { background: true }
    );
    await Flight.collection.createIndex(
      { "route_info.return_date": 1 },
      { background: true }
    );

    // Price-based indexes
    await Flight.collection.createIndex(
      { "price_range.min": 1 },
      { background: true }
    );
    await Flight.collection.createIndex(
      { "price_range.max": 1 },
      { background: true }
    );
    await Flight.collection.createIndex(
      { "best_flights.price": 1 },
      { background: true }
    );

    // Duration-based indexes
    await Flight.collection.createIndex(
      { "best_flights_summary.total_duration": 1 },
      { background: true }
    );
    await Flight.collection.createIndex(
      { "best_flights.total_duration": 1 },
      { background: true }
    );

    // Carbon emissions index
    await Flight.collection.createIndex(
      { "best_flights_summary.carbon_emissions.amount": 1 },
      { background: true }
    );

    // Date-based indexes
    await Flight.collection.createIndex(
      { date_imported: 1 },
      { background: true, expireAfterSeconds: 30 * 24 * 60 * 60 }
    ); // TTL index - 30 days

    // Airline index
    await Flight.collection.createIndex(
      { "best_flights_summary.airline": 1 },
      { background: true }
    );

    console.log("Indexes created successfully!");

    // Close the connection
    await connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error creating indexes:", error);
    process.exit(1);
  }
}

// Run the index creation
createIndexes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
