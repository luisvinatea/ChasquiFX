import { NextResponse } from "next/server";
import { connectToDatabase } from "../../lib/mongodb";

/**
 * Get forex exchange rates
 */
async function getForexRates(from_currency, to_currency) {
  try {
    if (!from_currency || !to_currency) {
      throw new Error(
        "Both from_currency and to_currency parameters are required"
      );
    }

    const currencyPair = `${from_currency}-${to_currency}`;

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Check the cache in MongoDB
    const cachedData = await db.collection("forex").findOne({
      currency_pair: currencyPair,
      expiresAt: { $gt: new Date() },
    });

    if (cachedData) {
      return {
        status: "success",
        data: cachedData,
        source: "cache",
      };
    }

    // If no cache found, query the main forex collection
    const forexData = await db.collection("forex").findOne({
      currency_pair: currencyPair,
    });

    if (!forexData) {
      throw new Error(
        `Forex data not found for currency pair: ${currencyPair}`
      );
    }

    // Return the data
    return {
      status: "success",
      data: forexData,
      source: "database",
    };
  } catch (error) {
    console.error("Error getting forex rates:", error);
    throw error;
  }
}

/**
 * Get forex service status
 */
async function getForexStatus() {
  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Get the most recent updates
    const latestUpdates = await db
      .collection("forex")
      .find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();

    // Count total entries
    const totalEntries = await db.collection("forex").countDocuments();

    // Get collection stats
    const stats = await db.command({ collStats: "forex" });

    return {
      status: "success",
      serviceStatus: "online",
      databaseStatus: "connected",
      updateInfo: {
        totalEntries,
        sizeInMB: Math.round((stats.size / 1024 / 1024) * 100) / 100,
        latestUpdates: latestUpdates.map((entry) => ({
          currency_pair: entry.currency_pair,
          rate: entry.rate,
          updatedAt: entry.updatedAt,
        })),
      },
    };
  } catch (error) {
    console.error("Error getting forex status:", error);
    throw error;
  }
}

export async function GET(request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const rates = searchParams.get("rates");
    const from_currency = searchParams.get("from_currency");
    const to_currency = searchParams.get("to_currency");

    // Handle different endpoints
    if (rates !== null) {
      // Check required parameters
      if (!from_currency || !to_currency) {
        return NextResponse.json(
          {
            status: "error",
            message:
              "Both from_currency and to_currency parameters are required",
          },
          { status: 400 }
        );
      }

      const result = await getForexRates(from_currency, to_currency);
      return NextResponse.json(result);
    } else {
      const result = await getForexStatus();
      return NextResponse.json(result);
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
