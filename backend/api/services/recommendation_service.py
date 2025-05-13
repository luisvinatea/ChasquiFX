"""
Recommendation service for ChasquiFX.
Combines forex and flight data to provide destination recommendations.
"""

import logging
from typing import Optional, Tuple
import pandas as pd

from backend.api.models.schemas import (
    DestinationRecommendation,
    RecommendationsResponse,
)
from backend.api.services.forex_service import get_exchange_rate
from backend.api.services.geo_service import (
    get_airport_country_map,
    get_routes_for_airport,
)
from backend.api.services.flight_service import fetch_multiple_fares

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def calculate_trend(
    forex_data: pd.DataFrame, currency_pair: str, days: int = 30
) -> float:
    """
    Calculate the trend of a currency pair over a specified number of days.

    Args:
        forex_data: DataFrame containing forex data
        currency_pair: Currency pair code (e.g., 'USDEUR=X')
        days: Number of days to calculate trend for

    Returns:
        Trend value between -1 and 1 (-1 being downward, 1 being upward)
    """
    if forex_data.empty or currency_pair not in forex_data.index:
        return 0.0

    try:
        # Get the last N days of data
        pair_data = (
            forex_data.loc[currency_pair]
            .sort_index(ascending=False)
            .head(days)
        )

        if len(pair_data) < 2:
            return 0.0

        # Calculate trend using linear regression slope
        y = pair_data["Close"].values
        x = list(range(len(y)))  # Convert range to list
        n = len(y)

        # Calculate slope using simple linear regression formula
        # Convert to lists for element-wise multiplication
        m = (
            n * sum(x_i * y_i for x_i, y_i in zip(x, y)) - sum(x) * sum(y)
        ) / (n * sum(x_i * x_i for x_i in x) - sum(x) ** 2)

        # Normalize to range [-1, 1]
        avg_price = pair_data["Close"].mean()
        normalized_slope = m * days / avg_price

        # Clamp to range [-1, 1]
        return max(min(normalized_slope, 1.0), -1.0)
    except Exception as e:
        logger.error(f"Error calculating trend: {e}")
        return 0.0


def get_exchange_rate_with_trend(
    forex_data: pd.DataFrame, base_currency: str, quote_currency: str
) -> Tuple[float, float]:
    """
    Get exchange rate and trend for a currency pair.

    Args:
        forex_data: DataFrame containing forex data
        base_currency: Base currency code (e.g., 'USD')
        quote_currency: Quote currency code (e.g., 'EUR')

    Returns:
        Tuple of (exchange_rate, trend)
    """
    currency_pair = f"{base_currency}{quote_currency}=X"
    inverse_pair = f"{quote_currency}{base_currency}=X"

    if forex_data.empty:
        logger.warning("No forex data available")
        return (1.0, 0.0)

    # Check if direct pair exists
    if currency_pair in forex_data.index:
        rate = forex_data.loc[currency_pair, "Close"]
        # Ensure rate is a float
        rate_float = float(str(rate))
        trend = calculate_trend(forex_data, currency_pair)
        return (rate_float, trend)

    # Check if inverse pair exists
    elif inverse_pair in forex_data.index:
        inverse_value = forex_data.loc[inverse_pair, "Close"]
        # Convert to float through string representation for safety
        inverse_float = float(str(inverse_value))
        rate_float = 1.0 / inverse_float
        trend = -calculate_trend(
            forex_data, inverse_pair
        )  # Negate trend for inverse
        return (rate_float, trend)

    # Try to calculate using USD as intermediate
    else:
        base_usd = get_exchange_rate(base_currency, "USD")
        usd_quote = get_exchange_rate("USD", quote_currency)

        if base_usd and usd_quote:
            rate = base_usd * usd_quote
            # We can't calculate trend in this case
            return (rate, 0.0)

    logger.warning(
        f"Exchange rate not found for {base_currency}/{quote_currency}"
    )
    return (1.0, 0.0)


def get_recommendations(
    departure_airport: str,
    base_currency: str,
    limit: int = 10,
    min_trend: float = -1.0,
    include_fares: bool = False,
    outbound_date: Optional[str] = None,
    return_date: Optional[str] = None,
) -> RecommendationsResponse:
    """
    Get destination recommendations based on forex trends and available routes.

    Args:
        departure_airport: IATA code of departure airport
        base_currency: Base currency code (e.g., 'USD')
        limit: Maximum number of recommendations to return
        min_trend: Minimum trend value to include (-1 to 1)
        include_fares: Whether to include flight fares
        outbound_date: Departure date in YYYY-MM-DD format
        return_date: Return date in YYYY-MM-DD format

    Returns:
        RecommendationsResponse object
    """
    logger.info(
        f"Generating recommendations for {departure_airport} in {base_currency}"
    )

    # Get available routes
    routes = get_routes_for_airport(departure_airport)

    if not routes:
        logger.warning(f"No routes found for {departure_airport}")
        return RecommendationsResponse(
            recommendations=[], base_currency=base_currency
        )

    # Get airport-country mapping
    airport_country_map = get_airport_country_map()

    # Get forex data
    forex_data = (
        pd.DataFrame()
    )  # In real implementation, load the actual forex data

    recommendations = []
    for route in routes[:100]:  # Limit initial processing to 100 routes
        arrival_airport = route.get("Destination airport")
        if not arrival_airport or arrival_airport not in airport_country_map:
            continue

        country = airport_country_map.get(arrival_airport)
        if not country:
            continue

        # Generate destination recommendation
        try:
            # Get local currency for destination country
            # This would be a lookup from country to currency code
            # For demo, we're using a simple mapping
            destination_currency = (
                "EUR"
                if country in ["FR", "DE", "IT", "ES"]
                else "GBP"
                if country == "GB"
                else "USD"
            )

            # Skip if same currency
            if destination_currency == base_currency:
                continue

            # Get exchange rate and trend
            rate, trend = get_exchange_rate_with_trend(
                forex_data, base_currency, destination_currency
            )

            # Skip if trend is below minimum
            if trend < min_trend:
                continue

            # Calculate score (higher is better)
            # Score is based on trend and exchange rate movement
            score = trend * 5 + (1 if trend > 0 else -1) * (abs(rate - 1) / 10)

            # Create recommendation object
            recommendation = DestinationRecommendation(
                departure_airport=departure_airport,
                arrival_airport=arrival_airport,
                city=route.get("Destination city", ""),
                country=country,
                exchange_rate=rate,
                exchange_rate_trend=trend,
                flight_route=route,
                score=score,
                fare=None,  # Will be filled later if include_fares is True
            )

            recommendations.append(recommendation)
        except Exception as e:
            logger.error(f"Error processing recommendation: {e}")
            continue

    # Sort by score (descending) and limit results
    recommendations.sort(key=lambda x: x.score, reverse=True)
    recommendations = recommendations[:limit]

    # Fetch flight fares if requested
    if include_fares and recommendations and outbound_date and return_date:
        arrival_airports = [rec.arrival_airport for rec in recommendations]
        fares = fetch_multiple_fares(
            departure_airport=departure_airport,
            arrival_airports=arrival_airports,
            outbound_date=outbound_date,
            return_date=return_date,
            currency=base_currency,
        )

        # Add fares to recommendations
        for rec in recommendations:
            rec.fare = fares.get(rec.arrival_airport)

    return RecommendationsResponse(
        recommendations=recommendations,
        base_currency=base_currency,
    )
