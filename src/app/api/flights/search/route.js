import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";

/**
 * Search for flights with forex analysis
 */
export async function POST(request) {
  try {
    const searchData = await request.json();
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = 1,
      originCurrency,
      destinationCurrency,
    } = searchData;

    // Validate required parameters
    if (
      !origin ||
      !destination ||
      !departureDate ||
      !originCurrency ||
      !destinationCurrency
    ) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          required: [
            "origin",
            "destination",
            "departureDate",
            "originCurrency",
            "destinationCurrency",
          ],
        },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // For now, return mock flight data with forex calculations
    // In a production environment, this would integrate with flight APIs
    const mockFlights = [
      {
        id: "FL001",
        airline: "Delta Airlines",
        flightNumber: "DL123",
        price: 450,
        currency: "USD",
        departureTime: "08:00",
        arrivalTime: "11:30",
        duration: 210, // minutes
        stops: 0,
        aircraft: "Boeing 737",
        departureAirport: origin,
        arrivalAirport: destination,
        departureDate: departureDate,
        returnDate: returnDate,
      },
      {
        id: "FL002",
        airline: "American Airlines",
        flightNumber: "AA456",
        price: 520,
        currency: "USD",
        departureTime: "14:15",
        arrivalTime: "17:45",
        duration: 210,
        stops: 1,
        aircraft: "Airbus A320",
        departureAirport: origin,
        arrivalAirport: destination,
        departureDate: departureDate,
        returnDate: returnDate,
      },
      {
        id: "FL003",
        airline: "JetBlue",
        flightNumber: "B6789",
        price: 380,
        currency: "USD",
        departureTime: "19:30",
        arrivalTime: "23:00",
        duration: 210,
        stops: 0,
        aircraft: "Airbus A321",
        departureAirport: origin,
        arrivalAirport: destination,
        departureDate: departureDate,
        returnDate: returnDate,
      },
    ];

    // Get exchange rates for forex analysis
    let exchangeRate = 1;
    let forexAdvantage = 0;

    try {
      const forexData = await db.collection("forex").findOne({
        currency_pair: `${originCurrency}-${destinationCurrency}`,
        expiresAt: { $gt: new Date() },
      });

      if (forexData) {
        exchangeRate = forexData.exchange_rate || 1;
        forexAdvantage = forexData.forex_advantage || 0;
      }
    } catch (forexError) {
      console.warn("Could not fetch forex data:", forexError);
    }

    // Calculate forex-enhanced flight data
    const enhancedFlights = mockFlights.map((flight) => {
      const priceInOriginCurrency = flight.price / exchangeRate;
      const totalSavings = Math.max(0, flight.price * (forexAdvantage / 100));

      return {
        ...flight,
        priceInOriginCurrency: Math.round(priceInOriginCurrency * 100) / 100,
        exchangeRate,
        forexAdvantage,
        totalSavings: Math.round(totalSavings * 100) / 100,
        searchData: {
          origin,
          destination,
          departureDate,
          returnDate,
          passengers,
          originCurrency,
          destinationCurrency,
        },
      };
    });

    // Sort by best value (price + forex consideration)
    enhancedFlights.sort((a, b) => {
      const valueA = a.priceInOriginCurrency - a.totalSavings;
      const valueB = b.priceInOriginCurrency - b.totalSavings;
      return valueA - valueB;
    });

    // Log search for analytics
    try {
      await db.collection("flight_searches").insertOne({
        searchData,
        resultCount: enhancedFlights.length,
        timestamp: new Date(),
        ip: request.headers.get("x-forwarded-for") || "unknown",
      });
    } catch (logError) {
      console.warn("Could not log search:", logError);
    }

    return NextResponse.json(
      {
        flights: enhancedFlights,
        searchData,
        metadata: {
          resultCount: enhancedFlights.length,
          exchangeRate,
          forexAdvantage,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Flight search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search flights",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get recent flight searches
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();

    const recentSearches = await db
      .collection("flight_searches")
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    // Remove sensitive data and format for display
    const formattedSearches = recentSearches.map((search) => ({
      id: search._id,
      origin: search.searchData?.origin,
      destination: search.searchData?.destination,
      departureDate: search.searchData?.departureDate,
      passengers: search.searchData?.passengers,
      timestamp: search.timestamp,
    }));

    return NextResponse.json(formattedSearches, { status: 200 });
  } catch (error) {
    console.error("Recent searches error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch recent searches",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
