import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";

/**
 * Get currency analysis between two currencies
 */
export async function GET(request, { params }) {
  try {
    const { from, to } = params;

    if (!from || !to) {
      return NextResponse.json(
        {
          error: "Both origin and destination currencies are required",
        },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Get forex data for both currencies
    const fromCurrencyData = await db.collection("forex").findOne({
      currency_pair: { $regex: `^${from}-`, $options: "i" },
    });

    const toCurrencyData = await db.collection("forex").findOne({
      currency_pair: { $regex: `^${to}-`, $options: "i" },
    });

    // Calculate forex advantage and overvaluation
    // This is a simplified calculation - in production you'd use real PPP data
    const calculateOvervaluation = (currencyCode) => {
      // Mock overvaluation data based on common economic indicators
      const overvaluationData = {
        USD: -2.5,
        EUR: 8.2,
        GBP: 12.1,
        JPY: -15.3,
        CAD: 3.7,
        AUD: -5.8,
        CHF: 18.9,
        CNY: -8.4,
        SEK: 6.1,
        NZD: -3.2,
        MXN: -12.7,
        SGD: 4.3,
        HKD: -1.9,
        NOK: 7.8,
        TRY: -25.6,
        RUB: -35.2,
        INR: -18.9,
        BRL: -22.3,
        ZAR: -28.1,
        KRW: -11.4,
      };

      return overvaluationData[currencyCode] || 0;
    };

    const getCurrencyName = (code) => {
      const currencyNames = {
        USD: "US Dollar",
        EUR: "Euro",
        GBP: "British Pound",
        JPY: "Japanese Yen",
        CAD: "Canadian Dollar",
        AUD: "Australian Dollar",
        CHF: "Swiss Franc",
        CNY: "Chinese Yuan",
        SEK: "Swedish Krona",
        NZD: "New Zealand Dollar",
        MXN: "Mexican Peso",
        SGD: "Singapore Dollar",
        HKD: "Hong Kong Dollar",
        NOK: "Norwegian Krone",
        TRY: "Turkish Lira",
        RUB: "Russian Ruble",
        INR: "Indian Rupee",
        BRL: "Brazilian Real",
        ZAR: "South African Rand",
        KRW: "South Korean Won",
      };
      return currencyNames[code] || code;
    };

    const originOvervaluation = calculateOvervaluation(from);
    const destinationOvervaluation = calculateOvervaluation(to);

    // Calculate forex advantage (positive means good time to travel)
    const forexAdvantage = originOvervaluation - destinationOvervaluation;

    const recommendation = forexAdvantage > 5 ? "favorable" : "unfavorable";

    const analysis = {
      origin: {
        code: from,
        name: getCurrencyName(from),
        overvaluationPercentage: originOvervaluation,
      },
      destination: {
        code: to,
        name: getCurrencyName(to),
        overvaluationPercentage: destinationOvervaluation,
      },
      forexAdvantage,
      recommendation,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    console.error("Currency analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze currencies",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
