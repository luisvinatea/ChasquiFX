"""
main.py
Integrates flight route data with forex data to provide destination recommendations
based on favorable exchange rates and available flight routes.
"""

import os
from typing import Dict, List, Any, Tuple
import pandas as pd
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel

# Import from other modules
from data_ingestor import get_forex_data, get_currency_pair
from mapper import route_mapper, get_complete_route_info

# Initialize FastAPI
app = FastAPI(
    title="ChasquiForex API",
    description="API for flight and forex recommendations",
    version="1.0.0",
)

# Define data directories
DATA_DIR = "../assets/data"
FOREX_DIR = os.path.join(DATA_DIR, "forex")
GEO_DIR = os.path.join(DATA_DIR, "geo")
ENRICHED_DIR = os.path.join(GEO_DIR, "enriched")

# Ensure directories exist
os.makedirs(ENRICHED_DIR, exist_ok=True)


# Define data models
class DestinationRecommendation(BaseModel):
    departure_airport: str
    arrival_airport: str
    city: str
    country: str
    exchange_rate: float
    exchange_rate_trend: float
    flight_route: Dict[str, Any]
    score: float


class RecommendationsResponse(BaseModel):
    recommendations: List[DestinationRecommendation]
    base_currency: str


def get_airport_country_map() -> Dict[str, str]:
    """Get mapping of airports to country codes."""
    try:
        airports_path = os.path.join(ENRICHED_DIR, "airports.parquet")
        airports_df = pd.read_parquet(airports_path)
        return dict(zip(airports_df["IATA"], airports_df["Country"]))
    except Exception:
        # Return empty dict if file doesn't exist or has issues
        return {}


def get_country_currency_map() -> Dict[str, str]:
    """Get mapping of countries to currencies."""
    try:
        currency_path = os.path.join(FOREX_DIR, "json/currency_codes.json")
        currency_df = pd.read_json(currency_path)
        return dict(zip(currency_df["country"], currency_df["code"]))
    except Exception:
        # Return empty dict if file doesn't exist or has issues
        return {}


def get_exchange_rate_trend(
    base_currency: str, quote_currency: str, days: int = 7
) -> Tuple[float, float]:
    """
    Calculate exchange rate and trend for a currency pair.

    Returns:
        Tuple of (current_rate, trend_percentage)
    """
    forex_file = os.path.join(
        FOREX_DIR, "parquet/yahoo_finance_forex_data.parquet"
    )
    mapping_file = os.path.join(FOREX_DIR, "json/forex_mappings.json")

    # Get forex data for the pair
    pair_data = get_currency_pair(
        base_currency, quote_currency, forex_file, mapping_file
    )

    if pair_data.empty:
        # Try to fetch fresh data
        symbols = [f"{base_currency}{quote_currency}=X"]
        get_forex_data(symbols=symbols)
        pair_data = get_currency_pair(
            base_currency, quote_currency, forex_file, mapping_file
        )

        if pair_data.empty:
            return 0.0, 0.0

    # Get the closing prices
    if "Close" in pair_data.columns:
        close_prices = pair_data["Close"]

        # Calculate current rate and trend
        current_rate = close_prices.iloc[-1]

        # Calculate trend (percentage change over specified days)
        if len(close_prices) > days:
            previous_rate = close_prices.iloc[-days]
            trend_pct = ((current_rate - previous_rate) / previous_rate) * 100
        else:
            trend_pct = 0.0

        return current_rate, trend_pct

    return 0.0, 0.0


def calculate_destination_score(
    exchange_rate: float, trend_pct: float, route_quality: float
) -> float:
    """
    Calculate destination score based on exchange rate, trend, and route quality.
    Higher score means better destination.

    Args:
        exchange_rate: Current exchange rate
        trend_pct: Exchange rate trend percentage
        route_quality: Quality of route (0-1)

    Returns:
        Score from 0-100
    """
    # Normalize factors
    rate_factor = min(1.0, exchange_rate / 10) * 40  # 40% weight
    trend_factor = (
        (trend_pct + 10) / 20 * 40
    )  # 40% weight (assumes trend between -10% and +10%)
    route_factor = route_quality * 20  # 20% weight

    # Clamp values
    trend_factor = max(0, min(40, trend_factor))

    return rate_factor + trend_factor + route_factor


def find_flight_destinations(
    departure_airport: str, max_results: int = 5, direct_only: bool = False
) -> List[Dict[str, Any]]:
    """
    Find potential flight destinations from departure airport.

    Args:
        departure_airport: IATA code of departure airport
        max_results: Maximum number of results to return
        direct_only: Whether to include only direct flights

    Returns:
        List of potential destinations with flight info
    """
    # Ensure we have the route data
    route_mapper()

    # Load the enriched route data
    routes_path = os.path.join(ENRICHED_DIR, "enriched_routes.parquet")
    airports_path = os.path.join(ENRICHED_DIR, "airports.parquet")

    try:
        routes_df = pd.read_parquet(routes_path)
        airports_df = pd.read_parquet(airports_path)
    except Exception:
        return []

    # Get direct flights from departure airport
    direct_routes = routes_df[routes_df["Departure-IATA"] == departure_airport]

    if direct_routes.empty:
        return []

    # Get unique arrival airports
    arrival_airports = direct_routes["Arrival-IATA"].unique()

    # Get airport details
    results = []

    for airport in arrival_airports[
        : max_results * 2
    ]:  # Get more than needed to filter later
        # Get complete route info
        route_info = get_complete_route_info(departure_airport, airport)

        if not direct_only or not route_info["direct"].empty:
            # Get airport details
            airport_details = airports_df[airports_df["IATA"] == airport]

            if not airport_details.empty:
                country = airport_details["Country"].iloc[0]
                city = airport_details["City"].iloc[0]

                result = {
                    "arrival_airport": airport,
                    "country": country,
                    "city": city,
                    "route_info": route_info["direct"].to_dict("records")[0]
                    if not route_info["direct"].empty
                    else None,
                }

                # Calculate route quality (1.0 for direct routes, 0.8 for one-stop, 0.5 for two-stop)
                if not route_info["direct"].empty:
                    result["route_quality"] = 1.0
                elif not route_info["one_stop"].empty:
                    result["route_quality"] = 0.8
                    result["route_info"] = route_info["one_stop"].to_dict(
                        "records"
                    )[0]
                else:
                    result["route_quality"] = 0.5

                results.append(result)

    # Limit results
    return results[:max_results]


@app.get("/")
def read_root():
    return {"message": "Welcome to ChasquiForex API"}


@app.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    departure_airport: str = Query(
        ..., description="IATA code of departure airport"
    ),
    max_results: int = Query(
        5, description="Maximum number of recommendations"
    ),
    direct_only: bool = Query(
        False, description="Only consider direct flights"
    ),
):
    """
    Get destination recommendations based on favorable exchange rates.
    """
    # Get airport to country map
    airport_country_map = get_airport_country_map()

    # Get country to currency map
    country_currency_map = get_country_currency_map()

    # Validate departure airport
    if departure_airport not in airport_country_map:
        raise HTTPException(
            status_code=404, detail=f"Airport {departure_airport} not found"
        )

    # Get country and currency for departure airport
    departure_country = airport_country_map.get(departure_airport, "")
    base_currency = (
        country_currency_map.get(departure_country, "USD")
        if departure_country
        else "USD"
    )

    # Find possible flight destinations
    destinations = find_flight_destinations(
        departure_airport, max_results * 2, direct_only
    )

    if not destinations:
        raise HTTPException(
            status_code=404, detail=f"No routes found from {departure_airport}"
        )

    recommendations = []

    for dest in destinations:
        arrival_airport = dest["arrival_airport"]
        country = dest["country"]

        # Get currency for destination country
        quote_currency = (
            country_currency_map.get(country, "USD") if country else "USD"
        )

        # Skip if same currency as base
        if quote_currency == base_currency:
            continue

        # Get exchange rate and trend
        exchange_rate, trend = get_exchange_rate_trend(
            base_currency, quote_currency
        )

        # Skip if no exchange rate data
        if exchange_rate == 0:
            continue

        # Calculate destination score
        score = calculate_destination_score(
            exchange_rate, trend, dest["route_quality"]
        )

        recommendation = DestinationRecommendation(
            departure_airport=departure_airport,
            arrival_airport=arrival_airport,
            city=dest["city"],
            country=country,
            exchange_rate=exchange_rate,
            exchange_rate_trend=trend,
            flight_route=dest["route_info"] if dest["route_info"] else {},
            score=score,
        )

        recommendations.append(recommendation)

    # Sort by score (descending)
    recommendations.sort(key=lambda x: x.score, reverse=True)

    return RecommendationsResponse(
        recommendations=recommendations[:max_results],
        base_currency=base_currency,
    )


@app.get("/routes/{start_airport}/{end_airport}")
def get_routes(
    start_airport: str,
    end_airport: str,
    include_details: bool = Query(
        True, description="Include detailed airport information"
    ),
):
    """
    Get route options between two airports.
    """
    route_info = get_complete_route_info(start_airport, end_airport)

    if (
        route_info["direct"].empty
        and route_info["one_stop"].empty
        and route_info["two_stop"].empty
    ):
        raise HTTPException(
            status_code=404,
            detail=f"No routes found from {start_airport} to {end_airport}",
        )

    return {
        "direct": route_info["direct"].to_dict("records")
        if not route_info["direct"].empty
        else [],
        "one_stop": route_info["one_stop"].to_dict("records")
        if not route_info["one_stop"].empty
        else [],
        "two_stop": route_info["two_stop"].to_dict("records")
        if not route_info["two_stop"].empty
        else [],
    }


@app.get("/forex/{base_currency}/{quote_currency}")
def get_forex(
    base_currency: str,
    quote_currency: str,
    days: int = Query(30, description="Number of days of history"),
):
    """
    Get forex data for a currency pair.
    """
    forex_file = os.path.join(
        FOREX_DIR, "parquet/yahoo_finance_forex_data.parquet"
    )
    mapping_file = os.path.join(FOREX_DIR, "json/forex_mappings.json")

    # Get forex data for the pair
    pair_data = get_currency_pair(
        base_currency, quote_currency, forex_file, mapping_file
    )

    if pair_data.empty:
        # Try to fetch fresh data
        symbols = [f"{base_currency}{quote_currency}=X"]
        get_forex_data(symbols=symbols)
        pair_data = get_currency_pair(
            base_currency, quote_currency, forex_file, mapping_file
        )

        if pair_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {base_currency}/{quote_currency}",
            )

    # Limit to requested days
    if len(pair_data) > days:
        pair_data = pair_data.iloc[-days:]

    # Calculate current rate and trend
    exchange_rate, trend = get_exchange_rate_trend(
        base_currency, quote_currency
    )

    return {
        "base_currency": base_currency,
        "quote_currency": quote_currency,
        "current_rate": exchange_rate,
        "trend_percentage": trend,
        "history": pair_data.reset_index().to_dict("records"),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
