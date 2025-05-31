import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";

/**
 * Get recent flight searches for the current user
 */
export async function GET() {
  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Get recent searches from the database
    // For now, return mock data until we implement user sessions
    const recentSearches = await db
      .collection("flight_searches")
      .find({})
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    // If no searches found, return mock data
    if (recentSearches.length === 0) {
      const mockSearches = [
        {
          id: "search_1",
          origin: "JFK",
          destination: "LHR",
          departure_date: "2025-06-15",
          origin_currency: "USD",
          destination_currency: "GBP",
          created_at: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          id: "search_2",
          origin: "LAX",
          destination: "NRT",
          departure_date: "2025-07-20",
          origin_currency: "USD",
          destination_currency: "JPY",
          created_at: new Date(Date.now() - 172800000), // 2 days ago
        },
        {
          id: "search_3",
          origin: "MIA",
          destination: "CDG",
          departure_date: "2025-08-10",
          origin_currency: "USD",
          destination_currency: "EUR",
          created_at: new Date(Date.now() - 259200000), // 3 days ago
        },
      ];

      return NextResponse.json(mockSearches, { status: 200 });
    }

    return NextResponse.json(recentSearches, { status: 200 });
  } catch (error) {
    console.error("Recent searches API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch recent searches",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Save a new flight search
 */
export async function POST(request) {
  try {
    const searchData = await request.json();
    const { db } = await connectToDatabase();

    const searchRecord = {
      ...searchData,
      id: `search_${Date.now()}`,
      created_at: new Date(),
    };

    await db.collection("flight_searches").insertOne(searchRecord);

    return NextResponse.json(
      { message: "Search saved successfully", id: searchRecord.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Save search error:", error);
    return NextResponse.json(
      {
        error: "Failed to save search",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
