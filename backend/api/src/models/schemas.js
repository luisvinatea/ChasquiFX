/**
 * Data schemas for ChasquiFX Node.js backend
 */

class FlightFare {
  /**
   * Create a FlightFare instance
   * @param {Object} options - Flight fare options
   * @param {number} options.price - Flight price
   * @param {string} options.currency - Currency code
   * @param {Array<string>} options.airlines - List of airlines
   * @param {string} options.duration - Flight duration (e.g. "2h 30m")
   * @param {string} options.outboundDate - Departure date (YYYY-MM-DD)
   * @param {string} options.returnDate - Return date (YYYY-MM-DD)
   * @param {string|null} [options.carbonEmissions=null] - Carbon emissions info
   */
  constructor({
    price,
    currency,
    airlines,
    duration,
    outboundDate,
    returnDate,
    carbonEmissions = null,
  }) {
    this.price = parseFloat(price) || 0.0;
    this.currency = currency || "USD";
    this.airlines = Array.isArray(airlines)
      ? airlines
      : [airlines].filter(Boolean);
    this.duration = duration || "";
    this.outboundDate = outboundDate;
    this.returnDate = returnDate;
    this.carbonEmissions = carbonEmissions;
  }

  toJSON() {
    return {
      price: this.price,
      currency: this.currency,
      airlines: this.airlines,
      duration: this.duration,
      outbound_date: this.outboundDate,
      return_date: this.returnDate,
      carbon_emissions: this.carbonEmissions,
    };
  }
}

class DestinationRecommendation {
  /**
   * Create a DestinationRecommendation instance
   * @param {Object} options - Recommendation options
   * @param {string} options.departureAirport - IATA code of departure airport
   * @param {string} options.arrivalAirport - IATA code of arrival airport
   * @param {string} options.city - Destination city name
   * @param {string} options.country - Destination country code
   * @param {number} options.exchangeRate - Current exchange rate
   * @param {number} options.exchangeRateTrend - Exchange rate trend (-1 to 1)
   * @param {Object} options.flightRoute - Flight route information
   * @param {number} options.score - Recommendation score
   * @param {FlightFare|null} [options.fare=null] - Flight fare information
   */
  constructor({
    departureAirport,
    arrivalAirport,
    city,
    country,
    exchangeRate,
    exchangeRateTrend,
    flightRoute,
    score,
    fare = null,
  }) {
    this.departureAirport = departureAirport;
    this.arrivalAirport = arrivalAirport;
    this.city = city;
    this.country = country;
    this.exchangeRate = parseFloat(exchangeRate) || 1.0;
    this.exchangeRateTrend = parseFloat(exchangeRateTrend) || 0.0;
    this.flightRoute = flightRoute || {};
    this.score = parseFloat(score) || 0.0;
    this.fare = fare;
  }

  toJSON() {
    return {
      departure_airport: this.departureAirport,
      arrival_airport: this.arrivalAirport,
      city: this.city,
      country: this.country,
      exchange_rate: this.exchangeRate,
      exchange_rate_trend: this.exchangeRateTrend,
      flight_route: this.flightRoute,
      score: this.score,
      fare: this.fare ? this.fare.toJSON() : null,
    };
  }
}

class RecommendationsResponse {
  /**
   * Create a RecommendationsResponse instance
   * @param {Object} options - Response options
   * @param {Array<DestinationRecommendation>} options.recommendations - List of recommendations
   * @param {string} options.baseCurrency - Base currency code
   */
  constructor({ recommendations, baseCurrency }) {
    this.recommendations = recommendations || [];
    this.baseCurrency = baseCurrency || "USD";
  }

  toJSON() {
    return {
      recommendations: this.recommendations.map((rec) => rec.toJSON()),
      base_currency: this.baseCurrency,
    };
  }
}

module.exports = {
  FlightFare,
  DestinationRecommendation,
  RecommendationsResponse,
};
