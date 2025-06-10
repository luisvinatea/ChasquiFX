/**
 * User Searches Management API Route
 * Handles user search history and saved searches
 */

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase, createLogger } from "../../../lib/mongodb.js";
import { verifyAuthToken } from "../../../../lib/auth.js";

const logger = createLogger();

// GET - Get user's search history
export async function GET(request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (authResult.error) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = parseInt(searchParams.get("offset")) || 0;

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const searchesCollection = db.collection("user_searches");

    // Get user's searches
    const searches = await searchesCollection
      .find({ userId: authResult.user.id })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const totalCount = await searchesCollection.countDocuments({
      userId: authResult.user.id,
    });

    return NextResponse.json({
      searches: searches.map((search) => ({
        id: search._id,
        from: search.from,
        to: search.to,
        departureDate: search.departureDate,
        returnDate: search.returnDate,
        passengers: search.passengers,
        resultsCount: search.resultsCount || 0,
        createdAt: search.createdAt,
        savedAt: search.savedAt,
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    logger.error("Get user searches error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Save a new search
export async function POST(request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (authResult.error) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { from, to, departureDate, returnDate, passengers, results } =
      await request.json();

    // Validate required fields
    if (!from || !to || !departureDate) {
      return NextResponse.json(
        { message: "From, to, and departure date are required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const searchesCollection = db.collection("user_searches");

    // Create search record
    const searchData = {
      userId: authResult.user.id,
      from: from.trim(),
      to: to.trim(),
      departureDate: new Date(departureDate),
      returnDate: returnDate ? new Date(returnDate) : null,
      passengers: passengers || 1,
      resultsCount: results ? results.length : 0,
      results: results || [], // Store actual results if provided
      createdAt: new Date(),
      savedAt: new Date(),
    };

    // Insert search
    const result = await searchesCollection.insertOne(searchData);

    if (!result.insertedId) {
      throw new Error("Failed to save search");
    }

    logger.info(
      `Search saved for user: ${authResult.user.email}, ${from} to ${to}`
    );

    return NextResponse.json(
      {
        message: "Search saved successfully",
        searchId: result.insertedId,
        search: {
          id: result.insertedId,
          from: searchData.from,
          to: searchData.to,
          departureDate: searchData.departureDate,
          returnDate: searchData.returnDate,
          passengers: searchData.passengers,
          resultsCount: searchData.resultsCount,
          createdAt: searchData.createdAt,
          savedAt: searchData.savedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Save search error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a saved search
export async function DELETE(request) {
  try {
    const authResult = await verifyAuthToken(request);

    if (authResult.error) {
      return NextResponse.json(
        { message: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get("searchId");

    if (!searchId) {
      return NextResponse.json(
        { message: "Search ID is required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(searchId)) {
      return NextResponse.json(
        { message: "Invalid search ID format" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const searchesCollection = db.collection("user_searches");

    // Delete search (only if it belongs to the authenticated user)
    const result = await searchesCollection.deleteOne({
      _id: new ObjectId(searchId),
      userId: authResult.user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Search not found or access denied" },
        { status: 404 }
      );
    }

    logger.info(
      `Search deleted for user: ${authResult.user.email}, ID: ${searchId}`
    );

    return NextResponse.json({
      message: "Search deleted successfully",
      searchId: searchId,
    });
  } catch (error) {
    logger.error("Delete search error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
