/**
 * Flight Fare Model
 *
 * Defines the schema for flight fare data
 */

/**
 * Class representing a flight fare
 */
export class FlightFare {
  /**
   * Create a FlightFare instance
   * @param {Object} options - Flight fare options
   * @param {number} options.price - Flight price
   * @param {string} options.currency - Currency code
   * @param {Array<string>} options.airlines - List of airlines
   * @param {string} options.duration - Flight duration (e.g. "2h 30m")
   * @param {string} options.outboundDate - Departure date (YYYY-MM-DD)
   * @param {string} options.returnDate - Return date (YYYY-MM-DD)
   * @param {number|null} [options.carbonEmissions=null] - Carbon emissions in kg
   * @param {Object|null} [options.additionalDetails=null] - Any additional flight details
   */
  constructor({
    price,
    currency,
    airlines,
    duration,
    outboundDate,
    returnDate,
    carbonEmissions = null,
    additionalDetails = null,
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
    this.additionalDetails = additionalDetails;

    // Add timestamp
    this.timestamp = new Date().toISOString();
  }

  /**
   * Calculate the price in a different currency
   * @param {string} targetCurrency - Target currency code
   * @param {number} exchangeRate - Exchange rate from current to target currency
   * @returns {number} Price in target currency
   */
  getPriceInCurrency(targetCurrency, exchangeRate) {
    if (!exchangeRate || exchangeRate <= 0) {
      throw new Error("Invalid exchange rate");
    }

    return parseFloat((this.price * exchangeRate).toFixed(2));
  }

  /**
   * Get carbon emissions per passenger
   * @param {number} [passengers=1] - Number of passengers
   * @returns {number|null} Carbon emissions per passenger or null if not available
   */
  getCarbonEmissionsPerPassenger(passengers = 1) {
    if (!this.carbonEmissions || passengers <= 0) {
      return null;
    }

    return parseFloat((this.carbonEmissions / passengers).toFixed(2));
  }

  /**
   * Get average price per airline
   * @returns {Object} Mapping of airlines to their price (assuming equal distribution)
   */
  getPricePerAirline() {
    if (!this.airlines.length) {
      return {};
    }

    const pricePerAirline = this.price / this.airlines.length;
    const result = {};

    this.airlines.forEach((airline) => {
      result[airline] = parseFloat(pricePerAirline.toFixed(2));
    });

    return result;
  }

  /**
   * Calculate price per hour of flight
   * @returns {number} Price per hour
   */
  getPricePerHour() {
    // Parse duration in format "Xh Ym"
    const durationMatch = this.duration.match(/(\d+)h\s+(\d+)m/);

    if (!durationMatch) {
      return this.price;
    }

    const hours = parseInt(durationMatch[1], 10);
    const minutes = parseInt(durationMatch[2], 10);
    const totalHours = hours + minutes / 60;

    if (totalHours <= 0) {
      return this.price;
    }

    return parseFloat((this.price / totalHours).toFixed(2));
  }

  /**
   * Convert to JSON for API responses
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      price: this.price,
      currency: this.currency,
      airlines: this.airlines,
      duration: this.duration,
      outbound_date: this.outboundDate,
      return_date: this.returnDate,
      carbon_emissions: this.carbonEmissions,
      timestamp: this.timestamp,
    };
  }

  /**
   * Create a FlightFare from raw data
   * @param {Object} data - Raw data object
   * @returns {FlightFare} FlightFare instance
   */
  static fromData(data) {
    if (!data) {
      throw new Error("No data provided");
    }

    return new FlightFare({
      price: data.price || 0,
      currency: data.currency || "USD",
      airlines: data.airlines || data.airline || "Unknown",
      duration: data.duration || "Unknown",
      outboundDate: data.outbound_date || data.outboundDate || "",
      returnDate: data.return_date || data.returnDate || "",
      carbonEmissions: data.carbon_emissions || data.carbonEmissions || null,
      additionalDetails: data.additionalDetails || null,
    });
  }
}
