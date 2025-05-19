/**
 * Airport and Geo Data Models
 *
 * Defines schemas and interfaces for airport and geographical data
 */

/**
 * Airport data structure
 */
export class Airport {
  /**
   * Create a new Airport instance
   * @param {Object} data - Airport data
   */
  constructor(data = {}) {
    this.iataCode = data.iataCode || data.iata_code || null;
    this.name = data.name || "";
    this.city = data.city || "";
    this.country = data.country || "";
    this.continent = data.continent || "";
    this.latitude = data.latitude || data.lat || 0;
    this.longitude = data.longitude || data.lng || 0;
    this.popularity = data.popularity || 0;
    this.timezone = data.timezone || "";
  }

  /**
   * Check if this airport has valid coordinates
   * @returns {boolean} Whether the airport has valid coordinates
   */
  hasValidCoordinates() {
    return this.latitude !== 0 && this.longitude !== 0;
  }

  /**
   * Get a display name for the airport
   * @returns {string} A formatted display name
   */
  getDisplayName() {
    if (this.city && this.country) {
      return `${this.city}, ${this.country} (${this.iataCode})`;
    }
    return `${this.name} (${this.iataCode})`;
  }

  /**
   * Calculate distance to another airport
   * @param {Airport} otherAirport - The other airport
   * @returns {number} Distance in kilometers
   */
  distanceTo(otherAirport) {
    if (!this.hasValidCoordinates() || !otherAirport.hasValidCoordinates()) {
      return -1;
    }

    // Implementation of the Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = this._toRadians(otherAirport.latitude - this.latitude);
    const dLon = this._toRadians(otherAirport.longitude - this.longitude);
    const lat1 = this._toRadians(this.latitude);
    const lat2 = this._toRadians(otherAirport.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) *
        Math.sin(dLon / 2) *
        Math.cos(lat1) *
        Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  /**
   * Convert degrees to radians
   * @private
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  _toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }
}

/**
 * Flight route between two airports
 */
export class FlightRoute {
  /**
   * Create a new FlightRoute instance
   * @param {Object} data - Route data
   */
  constructor(data = {}) {
    this.origin = data.origin || null;
    this.destination = data.destination || null;
    this.departureAirport = data.departureAirport || null;
    this.destinationAirport = data.destinationAirport || null;
    this.distance = data.distance || 0;
    this.averageFare = data.averageFare || 0;
    this.popularity = data.popularity || 0;
    this.seasonality = data.seasonality || {
      winter: 1.0,
      spring: 1.0,
      summer: 1.0,
      autumn: 1.0,
    };
  }

  /**
   * Get an estimate of fare for a particular date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {number} Estimated fare
   */
  estimateFareForDate(date) {
    if (!date) return this.averageFare;

    // Parse date to determine season
    const month = new Date(date).getMonth();

    // Apply seasonality factor
    let seasonFactor = 1.0;

    // Northern hemisphere seasons
    if (month >= 0 && month <= 1)
      seasonFactor = this.seasonality.winter; // Jan-Feb
    else if (month >= 2 && month <= 4)
      seasonFactor = this.seasonality.spring; // Mar-May
    else if (month >= 5 && month <= 7)
      seasonFactor = this.seasonality.summer; // Jun-Aug
    else if (month >= 8 && month <= 10)
      seasonFactor = this.seasonality.autumn; // Sep-Nov
    else seasonFactor = this.seasonality.winter; // Dec

    return Math.round(this.averageFare * seasonFactor);
  }
}

/**
 * Currency information for a country
 */
export class CountryCurrency {
  /**
   * Create a new CountryCurrency instance
   * @param {Object} data - Currency data
   */
  constructor(data = {}) {
    this.country = data.country || "";
    this.currencyCode = data.currencyCode || "";
    this.currencyName = data.currencyName || "";
    this.symbol = data.symbol || "";
  }
}

/**
 * Recommendation result
 */
export class Recommendation {
  /**
   * Create a new Recommendation instance
   * @param {Object} data - Recommendation data
   */
  constructor(data = {}) {
    this.destination = data.destination || {
      airportCode: "",
      city: "",
      country: "",
    };
    this.exchangeRate = data.exchangeRate || {
      rate: 0,
      baseCurrency: "",
      targetCurrency: "",
      trend: 0,
    };
    this.flight = data.flight || {
      departureAirport: "",
      destinationAirport: "",
      outboundDate: null,
      returnDate: null,
      estimatedFare: 0,
    };
    this.score = data.score || 0;
  }
}

// Export a mappings of country codes to currencies
export const COUNTRY_CURRENCY_MAP = {
  US: { code: "USD", name: "US Dollar", symbol: "$" },
  GB: { code: "GBP", name: "British Pound", symbol: "£" },
  AU: { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  JP: { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  CA: { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  CH: { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  CN: { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  IN: { code: "INR", name: "Indian Rupee", symbol: "₹" },
  BR: { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  RU: { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  KR: { code: "KRW", name: "South Korean Won", symbol: "₩" },
  SG: { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  NZ: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  MX: { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  SE: { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  NO: { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  DK: { code: "DKK", name: "Danish Krone", symbol: "kr" },
  PL: { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  ZA: { code: "ZAR", name: "South African Rand", symbol: "R" },
  TR: { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  // Euro countries
  DE: { code: "EUR", name: "Euro", symbol: "€" },
  FR: { code: "EUR", name: "Euro", symbol: "€" },
  IT: { code: "EUR", name: "Euro", symbol: "€" },
  ES: { code: "EUR", name: "Euro", symbol: "€" },
  NL: { code: "EUR", name: "Euro", symbol: "€" },
  BE: { code: "EUR", name: "Euro", symbol: "€" },
  AT: { code: "EUR", name: "Euro", symbol: "€" },
  GR: { code: "EUR", name: "Euro", symbol: "€" },
  PT: { code: "EUR", name: "Euro", symbol: "€" },
  IE: { code: "EUR", name: "Euro", symbol: "€" },
  FI: { code: "EUR", name: "Euro", symbol: "€" },
};

// Added country name to currency code mapping
export const COUNTRY_NAME_TO_CURRENCY = {
  "United States": "USD",
  "United Kingdom": "GBP",
  Australia: "AUD",
  Japan: "JPY",
  Canada: "CAD",
  Switzerland: "CHF",
  China: "CNY",
  India: "INR",
  Brazil: "BRL",
  Russia: "RUB",
  "South Korea": "KRW",
  Singapore: "SGD",
  "New Zealand": "NZD",
  Mexico: "MXN",
  Sweden: "SEK",
  Norway: "NOK",
  Denmark: "DKK",
  Poland: "PLN",
  "South Africa": "ZAR",
  Turkey: "TRY",
  Germany: "EUR",
  France: "EUR",
  Italy: "EUR",
  Spain: "EUR",
  Netherlands: "EUR",
  Belgium: "EUR",
  Austria: "EUR",
  Greece: "EUR",
  Portugal: "EUR",
  Ireland: "EUR",
  Finland: "EUR",
  // More countries can be added as needed
};
