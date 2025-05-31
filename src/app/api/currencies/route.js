import { NextResponse } from "next/server";

/**
 * Get available currencies for the application
 */
export async function GET() {
  try {
    // Common currencies used in travel and forex with overvaluation data
    // This data would typically come from economic indicators and PPP calculations
    const currencies = [
      { code: "USD", name: "US Dollar", overvaluationPercentage: -2.5 },
      { code: "EUR", name: "Euro", overvaluationPercentage: 8.2 },
      { code: "GBP", name: "British Pound", overvaluationPercentage: 12.1 },
      { code: "JPY", name: "Japanese Yen", overvaluationPercentage: -15.3 },
      { code: "CAD", name: "Canadian Dollar", overvaluationPercentage: 3.7 },
      {
        code: "AUD",
        name: "Australian Dollar",
        overvaluationPercentage: -5.8,
      },
      { code: "CHF", name: "Swiss Franc", overvaluationPercentage: 18.9 },
      { code: "CNY", name: "Chinese Yuan", overvaluationPercentage: -8.4 },
      { code: "SEK", name: "Swedish Krona", overvaluationPercentage: 6.1 },
      {
        code: "NZD",
        name: "New Zealand Dollar",
        overvaluationPercentage: -3.2,
      },
      { code: "MXN", name: "Mexican Peso", overvaluationPercentage: -12.7 },
      { code: "SGD", name: "Singapore Dollar", overvaluationPercentage: 4.3 },
      { code: "HKD", name: "Hong Kong Dollar", overvaluationPercentage: -1.9 },
      { code: "NOK", name: "Norwegian Krone", overvaluationPercentage: 7.8 },
      { code: "TRY", name: "Turkish Lira", overvaluationPercentage: -25.6 },
      { code: "RUB", name: "Russian Ruble", overvaluationPercentage: -35.2 },
      { code: "INR", name: "Indian Rupee", overvaluationPercentage: -18.9 },
      { code: "BRL", name: "Brazilian Real", overvaluationPercentage: -22.3 },
      {
        code: "ZAR",
        name: "South African Rand",
        overvaluationPercentage: -28.1,
      },
      {
        code: "KRW",
        name: "South Korean Won",
        overvaluationPercentage: -11.4,
      },
      { code: "PLN", name: "Polish Zloty", overvaluationPercentage: 2.1 },
      { code: "CZK", name: "Czech Koruna", overvaluationPercentage: -4.7 },
      {
        code: "HUF",
        name: "Hungarian Forint",
        overvaluationPercentage: -13.2,
      },
      { code: "ILS", name: "Israeli Shekel", overvaluationPercentage: 5.9 },
      { code: "CLP", name: "Chilean Peso", overvaluationPercentage: -7.8 },
      { code: "PHP", name: "Philippine Peso", overvaluationPercentage: -16.4 },
      { code: "AED", name: "UAE Dirham", overvaluationPercentage: 1.2 },
      { code: "COP", name: "Colombian Peso", overvaluationPercentage: -19.6 },
      { code: "SAR", name: "Saudi Riyal", overvaluationPercentage: -0.8 },
      {
        code: "MYR",
        name: "Malaysian Ringgit",
        overvaluationPercentage: -9.3,
      },
      { code: "THB", name: "Thai Baht", overvaluationPercentage: -6.5 },
      { code: "TWD", name: "Taiwan Dollar", overvaluationPercentage: -2.1 },
      { code: "DKK", name: "Danish Krone", overvaluationPercentage: 9.4 },
      { code: "PEN", name: "Peruvian Sol", overvaluationPercentage: -8.7 },
      { code: "EGP", name: "Egyptian Pound", overvaluationPercentage: -31.2 },
      { code: "VND", name: "Vietnamese Dong", overvaluationPercentage: -20.5 },
      { code: "BGN", name: "Bulgarian Lev", overvaluationPercentage: 4.8 },
      { code: "HRK", name: "Croatian Kuna", overvaluationPercentage: 3.2 },
      { code: "ISK", name: "Icelandic Krona", overvaluationPercentage: 11.7 },
      { code: "RON", name: "Romanian Leu", overvaluationPercentage: -1.4 },
    ];

    return NextResponse.json(currencies, { status: 200 });
  } catch (error) {
    console.error("Currency API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch currencies",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
