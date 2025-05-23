import { NextResponse } from "next/server";
import { connectToDatabase, createLogger } from "../../lib/mongodb";

const logger = createLogger();

export async function GET() {
  try {
    // Check if we're in build time (no MongoDB URI available)
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        {
          status: "not_configured",
          message: "Database connection not configured during build",
          timestamp: new Date().toISOString(),
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const { db } = await connectToDatabase();

    // Get collections info
    const collections = await db.listCollections().toArray();
    const collectionStats = await Promise.all(
      collections.map(async (collection) => {
        try {
          const stats = await db.command({ collStats: collection.name });
          return {
            name: collection.name,
            count: stats.count,
            size: Math.round((stats.size / 1024 / 1024) * 100) / 100 + " MB",
          };
        } catch (error) {
          logger.error(
            `Error getting stats for collection ${collection.name}:`,
            error
          );
          return {
            name: collection.name,
            error: error.message,
          };
        }
      })
    );

    // Database stats
    const dbStats = await db.stats();

    return NextResponse.json(
      {
        status: "connected",
        database: {
          name: db.databaseName,
          size:
            Math.round((dbStats.dataSize / 1024 / 1024) * 100) / 100 + " MB",
          collections: dbStats.collections,
        },
        collections: collectionStats,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    logger.error("Database connection error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to connect to database",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
