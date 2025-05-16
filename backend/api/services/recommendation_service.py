"""
Recommendation service for ChasquiFX.
Combines forex and flight data to provide destination recommendations.
"""

import logging
from typing import Optional, Tuple
import pandas as pd
import os
import sys

# Set the path to the parent directory
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
)

from backend.api.models.schemas import (  # noqa: E402
    DestinationRecommendation,
    RecommendationsResponse,
)
from backend.api.services.forex_service import (  # noqa: E402
    get_exchange_rate,
    load_consolidated_forex_data,
)  # noqa: E402
from backend.api.services.geo_service import (  # noqa: E402
    get_airport_country_map,
    get_routes_for_airport,
)
from backend.api.services.flight_service import (  # noqa: E402
    fetch_multiple_fares,  # noqa: E402
)

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
    if forex_data.empty:
        return 0.0

    try:
        # Check if the currency pair exists in the data
        if currency_pair not in forex_data.index.unique(level=0):
            logger.warning(
                f"Currency pair {currency_pair} not found in forex data"
            )
            return 0.0

        # Get the data for this pair
        pair_data = forex_data.loc[currency_pair]

        # Handle both Series and DataFrame cases
        if isinstance(pair_data, pd.Series):
            # If we only have one data point, can't calculate trend
            return 0.0

        # Make sure we have ExchangeRate column, if not try Close
        rate_column = (
            "ExchangeRate" if "ExchangeRate" in pair_data.columns else "Close"
        )

        if rate_column not in pair_data.columns:
            logger.warning(
                "Neither 'ExchangeRate' nor 'Close' column found in data"
            )
            return 0.0

        # Sort by date in ascending order
        pair_data = pair_data.sort_values("Date", ascending=True)

        # Limit to the specified number of days
        pair_data = pair_data.tail(days)

        if len(pair_data) < 2:
            return 0.0

        # Calculate trend using linear regression slope
        y = pair_data[rate_column].values
        x = list(range(len(y)))  # Convert range to list
        n = len(y)

        # Calculate slope using simple linear regression formula
        # Convert to lists for element-wise multiplication
        m = (
            n * sum(x_i * y_i for x_i, y_i in zip(x, y)) - sum(x) * sum(y)
        ) / (n * sum(x_i * x_i for x_i in x) - sum(x) ** 2)

        # Normalize to range [-1, 1]
        avg_price = pair_data[rate_column].mean()
        normalized_slope = m * days / avg_price

        # Clamp to range [-1, 1]
        return max(min(normalized_slope, 1.0), -1.0)
    except Exception as e:
        logger.error(f"Error calculating trend for {currency_pair}: {e}")
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

    try:
        # Check if direct pair exists in the data
        pair_exists = currency_pair in forex_data.index.unique(level=0)
        inverse_exists = inverse_pair in forex_data.index.unique(level=0)

        # Direct pair found
        if pair_exists:
            # Get the data for this pair
            pair_data = forex_data.loc[currency_pair]

            # Determine which column contains the exchange rate
            rate_column = (
                "ExchangeRate"
                if "ExchangeRate" in pair_data.columns
                else "Close"
            )

            if rate_column not in pair_data.columns:
                logger.warning(f"No rate column found for {currency_pair}")
                return (1.0, 0.0)

            # Handle both single row and multiple row results
            if isinstance(pair_data, pd.Series):
                rate = pair_data[rate_column]
            else:  # DataFrame
                # Sort by date (descending) and take the most recent
                pair_data = pair_data.sort_values("Date", ascending=False)
                rate = pair_data[rate_column].iloc[0]

            # Ensure rate is a float
            rate_float = float(str(rate))

            # Calculate trend using our trend function
            trend = calculate_trend(forex_data, currency_pair)

            return (rate_float, trend)

        # Check if inverse pair exists
        elif inverse_exists:
            # Get the data for inverse pair
            pair_data = forex_data.loc[inverse_pair]

            # Determine which column contains the exchange rate
            rate_column = (
                "ExchangeRate"
                if "ExchangeRate" in pair_data.columns
                else "Close"
            )

            if rate_column not in pair_data.columns:
                logger.warning(f"No rate column found for {inverse_pair}")
                return (1.0, 0.0)

            # Handle both single row and multiple row results
            if isinstance(pair_data, pd.Series):
                inverse_value = pair_data[rate_column]
            else:  # DataFrame
                # Sort by date (descending) and take the most recent
                pair_data = pair_data.sort_values("Date", ascending=False)
                inverse_value = pair_data[rate_column].iloc[0]

            # Convert to float through string representation for safety
            inverse_float = float(str(inverse_value))

            # Invert the rate
            if inverse_float != 0:
                rate_float = 1.0 / inverse_float
            else:
                logger.warning(f"Zero exchange rate found for {inverse_pair}")
                rate_float = 1.0

            # Calculate trend of inverse pair and negate it for our pair
            inverse_trend = calculate_trend(forex_data, inverse_pair)
            trend = -inverse_trend  # Invert the trend

            return (rate_float, trend)

        # Try to calculate using USD as intermediate
        else:
            base_usd_pair = f"{base_currency}USD=X"
            usd_quote_pair = f"USD{quote_currency}=X"

            base_usd = None
            usd_quote = None

            # Try to get base/USD pair data
            if base_usd_pair in forex_data.index.unique(level=0):
                base_usd_data = forex_data.loc[base_usd_pair]
                rate_column = (
                    "ExchangeRate"
                    if "ExchangeRate" in base_usd_data.columns
                    else "Close"
                )
                if isinstance(base_usd_data, pd.Series):
                    base_usd = base_usd_data[rate_column]
                else:
                    base_usd_data = base_usd_data.sort_values(
                        "Date", ascending=False
                    )
                    base_usd = base_usd_data[rate_column].iloc[0]
                base_usd = float(str(base_usd))

            # Try to get USD/quote pair data
            if usd_quote_pair in forex_data.index.unique(level=0):
                usd_quote_data = forex_data.loc[usd_quote_pair]
                rate_column = (
                    "ExchangeRate"
                    if "ExchangeRate" in usd_quote_data.columns
                    else "Close"
                )
                if isinstance(usd_quote_data, pd.Series):
                    usd_quote = usd_quote_data[rate_column]
                else:
                    usd_quote_data = usd_quote_data.sort_values(
                        "Date", ascending=False
                    )
                    usd_quote = usd_quote_data[rate_column].iloc[0]
                usd_quote = float(str(usd_quote))

            # If direct pairs not found, try the API
            if base_usd is None:
                base_usd = get_exchange_rate(base_currency, "USD")

            if usd_quote is None:
                usd_quote = get_exchange_rate("USD", quote_currency)

            if base_usd and usd_quote:
                rate = base_usd * usd_quote
                # We can't calculate accurate trend in this case
                return (rate, 0.0)

            logger.warning(
                f"Exchange rate not found for {base_currency}/{quote_currency}"
            )
            return (1.0, 0.0)

    except Exception as e:
        logger.error(
            (
                f"Error getting exchange rate for {base_currency}/"
                f"{quote_currency}: {e}"
            )
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
        (
            f"Generating recommendations for {departure_airport} "
            f"in {base_currency}"
        )
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
    forex_data = load_consolidated_forex_data()

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
