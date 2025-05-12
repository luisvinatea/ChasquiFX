"""
main.py
Integrates flight route data with forex data to provide destination recommendations
based on favorable exchange rates and available flight routes.
"""

import os
import sys
from typing import Dict, List, Any, Tuple, Optional
import pandas as pd
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel

# Add parent directory to path to enable imports
sys.path.insert(
    0,
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ),
)

# Import from other modules
import backend.api.mapper as mapper
from backend.api.data_ingestor import (
    get_forex_data,
    get_currency_pair,
    update_forex_data,  # noqa: F401
)
from backend.api.forex_calculator import (
    get_exchange_rate_with_trend,
    calculate_cross_rate,  # noqa: F401
    calculate_trend,  # noqa: F401
)
from backend.api.mapper import route_mapper, get_complete_route_info
from backend.api.ticket_fare_fetcher import (
    fetch_flight_fare,
    fetch_multiple_fares,
    get_best_fare,
)

# Initialize FastAPI
app = FastAPI(
    title="ChasquiForex API",
    description="API for flight and forex recommendations",
    version="1.0.0",
)

# Define data directories with absolute paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA_DIR = os.path.join(BASE_DIR, "backend/assets/data")
FOREX_DIR = os.path.join(DATA_DIR, "forex")
GEO_DIR = os.path.join(DATA_DIR, "geo")
ENRICHED_DIR = os.path.join(GEO_DIR, "enriched")

# Override mapper module paths with absolute paths
mapper.DATA_DIR = GEO_DIR
mapper.JSON_DIR = os.path.join(GEO_DIR, "json")
mapper.PARQUET_DIR = os.path.join(GEO_DIR, "parquet")
mapper.OUTPUT_DIR = ENRICHED_DIR

# Ensure directories exist
os.makedirs(ENRICHED_DIR, exist_ok=True)


# Define data models
class FlightFare(BaseModel):
    price: float
    currency: str
    airlines: List[str] = []
    duration: str = ""
    outbound_date: str
    return_date: str


class DestinationRecommendation(BaseModel):
    departure_airport: str
    arrival_airport: str
    city: str
    country: str
    exchange_rate: float
    exchange_rate_trend: float
    flight_route: Dict[str, Any]
    score: float
    fare: Optional[FlightFare] = None  # New field for fare data


class RecommendationsResponse(BaseModel):
    recommendations: List[DestinationRecommendation]
    base_currency: str


def get_airport_country_map() -> Dict[str, str]:
    """Get mapping of airports to country codes."""
    try:
        airports_path = os.path.join(ENRICHED_DIR, "airports.parquet")
        airports_df = pd.read_parquet(airports_path)
        return dict(zip(airports_df["IATA"], airports_df["Country"]))
    except Exception as e:
        print(f"Error loading airports data: {e}")
        # Return a basic demo map for common airports
        return {
            "JFK": "US",
            "LGA": "US",
            "LAX": "US",
            "SFO": "US",
            "ORD": "US",
            "DFW": "US",
            "MIA": "US",
            "ATL": "US",
            "LHR": "GB",
            "LGW": "GB",
            "CDG": "FR",
            "FRA": "DE",
            "MAD": "ES",
            "FCO": "IT",
            "NRT": "JP",
            "HND": "JP",
            "PEK": "CN",
            "PVG": "CN",
            "SYD": "AU",
            "MEL": "AU",
            "YYZ": "CA",
            "YVR": "CA",
            "GRU": "BR",
            "MEX": "MX",
            "DEL": "IN",
            "DXB": "AE",
            "HKG": "HK",
            "SIN": "SG",
            "ZRH": "CH",
            "AMS": "NL",
        }


def get_country_currency_map() -> Dict[str, str]:
    """Get mapping of countries to currencies."""
    try:
        currency_path = os.path.join(FOREX_DIR, "json/currency_codes.json")
        with open(currency_path, "r") as f:
            currency_data = pd.read_json(f, orient="index")
            # Create a dictionary mapping countries to currency codes
            return dict(zip(currency_data.index, currency_data.iloc[:, 0]))
    except Exception as e:
        print(f"Error loading currency map: {e}")
        # Return a basic demo map if file doesn't exist
        return {
            "US": "USD",
            "GB": "GBP",
            "FR": "EUR",
            "DE": "EUR",
            "IT": "EUR",
            "ES": "EUR",
            "JP": "JPY",
            "CN": "CNY",
            "AU": "AUD",
            "CA": "CAD",
            "CH": "CHF",
            "MX": "MXN",
            "BR": "BRL",
            "IN": "INR",
            "ZA": "ZAR",
            "RU": "RUB",
            "HK": "HKD",
            "SG": "SGD",
            "NZ": "NZD",
            "SE": "SEK",
        }


def get_exchange_rate_trend(
    base_currency: str, quote_currency: str, days: int = 7
) -> Tuple[float, float]:
    """
    Calculate exchange rate and trend for a currency pair.

    Returns:
        Tuple of (current_rate, trend_percentage)
    """
    # Special case: same currency, return 1.0 and 0.0 trend
    if base_currency == quote_currency:
        print(
            f"Same currency pair {base_currency}/{quote_currency}, using 1.0 exchange rate"
        )
        return 1.0, 0.0

    print(f"Calculating exchange rate for {base_currency}/{quote_currency}")

    # First, try to get direct rate and trend using the new forex_calculator
    current_rate, trend_pct = get_exchange_rate_with_trend(
        base_currency, quote_currency, days
    )

    if current_rate > 0:
        print(
            f"Found rate using forex_calculator: {current_rate:.4f}, trend: {trend_pct:.2f}%"
        )
        return current_rate, trend_pct

    print("No rate found using forex_calculator, trying fallback method")

    # Fall back to original method if new method fails
    forex_file = os.path.join(
        FOREX_DIR, "parquet/yahoo_finance_forex_data.parquet"
    )
    mapping_file = os.path.join(FOREX_DIR, "json/forex_mappings.json")

    # Try to fetch fresh data (only for the specific pair to avoid too many requests)
    symbols = [f"{base_currency}{quote_currency}=X"]
    try:
        print(f"Fetching fresh data for {base_currency}{quote_currency}=X")
        get_forex_data(symbols=symbols)
        print(f"Successfully fetched data for {symbols[0]}")
    except Exception as e:
        print(
            f"Warning: Could not fetch fresh data for {base_currency}{quote_currency}: {e}"
        )

    pair_data = get_currency_pair(
        base_currency, quote_currency, forex_file, mapping_file
    )

    if pair_data.empty:
        print(f"No data found for {base_currency}/{quote_currency} pair")
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

        print(
            f"Found rate using fallback method: {current_rate:.4f}, trend: {trend_pct:.2f}%"
        )
        return current_rate, trend_pct

    print(
        f"No 'Close' column found in pair data for {base_currency}/{quote_currency}"
    )
    return 0.0, 0.0


def calculate_destination_score(
    exchange_rate: float,
    trend_pct: float,
    route_quality: float,
    fare_price: float = 0.0,
    base_price: float = 500.0,
) -> float:
    """
    Calculate destination score based on exchange rate, trend, route quality, and fare price.
    Higher score means better destination.

    Args:
        exchange_rate: Current exchange rate
        trend_pct: Exchange rate trend percentage
        route_quality: Quality of route (0-1)
        fare_price: Flight fare price (0 if unavailable)
        base_price: Base price for fare comparison ($500 by default)

    Returns:
        Score from 0-100
    """
    # Normalize factors
    rate_factor = (
        min(1.0, exchange_rate / 10) * 30
    )  # 30% weight (reduced from 40%)
    trend_factor = (
        (trend_pct + 10) / 20 * 30
    )  # 30% weight (reduced from 40%) (assumes trend between -10% and +10%)
    route_factor = route_quality * 20  # 20% weight

    # Add fare factor (if fare data available)
    fare_factor = 0
    if fare_price > 0:
        # Lower price is better - invert the score
        # 0 score for prices >= 2x base price, 20 score for price = 0
        fare_factor = max(0, min(20, 20 * (1 - fare_price / (base_price * 2))))
    else:
        # No fare data, neutral score
        fare_factor = 10  # Middle score if no fare data available

    # Clamp values
    trend_factor = max(0, min(30, trend_factor))

    return rate_factor + trend_factor + route_factor + fare_factor


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
    try:
        route_mapper()

        # Load the enriched route data
        routes_path = os.path.join(ENRICHED_DIR, "enriched_routes.parquet")
        airports_path = os.path.join(ENRICHED_DIR, "airports.parquet")

        routes_df = pd.read_parquet(routes_path)
        airports_df = pd.read_parquet(airports_path)
    except Exception as e:
        print(f"Error loading routes or airports data: {e}")
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
        try:
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
                        "route_info": route_info["direct"].to_dict("records")[
                            0
                        ]
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
        except Exception as e:
            print(
                f"Error processing route {departure_airport} to {airport}: {e}"
            )
            continue

    # Limit results
    return results[:max_results]


def fetch_fares_for_destinations(
    departure_airport: str,
    destinations: List[Dict[str, Any]],
    currency: str = "USD",
) -> Dict[str, Dict[str, Any]]:
    """
    Fetch flight fares for a list of destination airports.

    Args:
        departure_airport: IATA code of departure airport
        destinations: List of destination dictionaries
        currency: Currency for fare prices

    Returns:
        Dictionary mapping arrival airports to fare data
    """
    # Extract arrival airport codes
    arrival_airports = [dest["arrival_airport"] for dest in destinations]

    # Fetch fares for all destinations
    fares = fetch_multiple_fares(
        departure_id=departure_airport,
        arrival_ids=arrival_airports[
            :10
        ],  # Limit to top 10 to avoid API rate limits
        currency=currency,
    )

    return fares


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
    use_realtime_data: bool = Query(
        True, description="Fetch real-time forex data for destinations"
    ),
    include_fares: bool = Query(
        True, description="Include flight fare data from SerpAPI"
    ),
    outbound_date: str = Query(
        None,
        description="Departure date (YYYY-MM-DD, default: 3 months from now)",
    ),
    return_date: str = Query(
        None,
        description="Return date (YYYY-MM-DD, default: 1 week after outbound)",
    ),
):
    """
    Get destination recommendations based on favorable exchange rates and flight fares.
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
            status_code=404,
            detail=f"No routes found from {departure_airport}",
        )

    # For USD currency departures, prioritize non-USD currency destinations
    non_usd_destinations = []
    for dest in destinations:
        country = dest["country"]
        quote_currency = (
            country_currency_map.get(country, "USD") if country else "USD"
        )
        if quote_currency != "USD":
            non_usd_destinations.append(dest)

    if non_usd_destinations:
        destinations = non_usd_destinations

    # Fetch real-time forex data for all destinations if requested
    forex_data = None
    if use_realtime_data:
        print(
            f"Fetching real-time forex data for destinations from {departure_airport}"
        )
        forex_data = fetch_realtime_forex_data(
            base_currency, destinations, country_currency_map
        )
        if not forex_data.empty:
            print(
                f"Successfully fetched real-time forex data with shape {forex_data.shape}"
            )
        else:
            print(
                "Could not fetch real-time forex data, falling back to cached data"
            )

    # Fetch flight fares if requested
    fare_data = {}
    if include_fares:
        try:
            fare_data = fetch_fares_for_destinations(
                departure_airport=departure_airport,
                destinations=destinations,
                currency=base_currency,
            )
            print(
                f"Successfully fetched fare data for {len(fare_data)} destinations"
            )
        except Exception as e:
            print(f"Error fetching flight fares: {e}")
            # Continue without fare data

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

        # Check if we have demo exchange rates
        if "demo_rate" in dest and "demo_trend" in dest:
            exchange_rate = dest["demo_rate"]
            trend = dest["demo_trend"]
            print(
                f"Using demo rate for {arrival_airport}: {exchange_rate:.4f}, trend: {trend:.2f}%"
            )
        else:
            # Get exchange rate and trend using real-time data if available
            if forex_data is not None and not forex_data.empty:
                # Use in-memory forex data that was just fetched
                from backend.api.forex_calculator import (
                    calculate_cross_rate,
                    calculate_trend,
                )

                exchange_rate, is_direct = calculate_cross_rate(
                    base_currency, quote_currency, forex_data, use_cache=False
                )
                trend = calculate_trend(
                    base_currency, quote_currency, 7, forex_data
                )
                print(
                    f"Real-time rate for {arrival_airport} ({quote_currency}): {exchange_rate:.4f}, trend: {trend:.2f}%"
                )
            else:
                # Fall back to the existing method
                exchange_rate, trend = get_exchange_rate_trend(
                    base_currency, quote_currency
                )

        # Skip if no exchange rate data
        if exchange_rate == 0:
            continue

        # Check if we have fare data for this destination
        fare_info = fare_data.get(arrival_airport, {})
        fare_price = (
            float(fare_info.get("price", 0))
            if fare_info.get("success", False)
            else 0
        )

        # Calculate destination score (now including fare if available)
        score = calculate_destination_score(
            exchange_rate, trend, dest["route_quality"], fare_price
        )

        # Create fare object if data exists
        fare_obj = None
        if fare_info.get("success", False):
            fare_obj = FlightFare(
                price=fare_price,
                currency=fare_info.get("currency", base_currency),
                airlines=fare_info.get("airlines", []),
                duration=fare_info.get("duration", ""),
                outbound_date=fare_info.get(
                    "outbound_date", outbound_date or ""
                ),
                return_date=fare_info.get("return_date", return_date or ""),
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
            fare=fare_obj,
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
    Get flight route information between airports.
    """
    # Ensure we have the route data
    try:
        route_mapper()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error mapping routes: {str(e)}"
        )

    try:
        route_info = get_complete_route_info(start_airport, end_airport)

        # Format the results
        result = {
            "start_airport": start_airport,
            "end_airport": end_airport,
            "direct_routes": route_info["direct"].to_dict("records")
            if not route_info["direct"].empty
            else [],
            "one_stop_routes": route_info["one_stop"].to_dict("records")
            if not route_info["one_stop"].empty
            else [],
            "two_stop_routes": route_info["two_stop"].to_dict("records")
            if not route_info["two_stop"].empty
            else [],
        }

        if include_details:
            # Add airport details
            airports_path = os.path.join(ENRICHED_DIR, "airports.parquet")
            try:
                airports_df = pd.read_parquet(airports_path)

                # Add departure airport details
                dep_airport = airports_df[airports_df["IATA"] == start_airport]
                if not dep_airport.empty:
                    result["departure_details"] = dep_airport.iloc[0].to_dict()

                # Add arrival airport details
                arr_airport = airports_df[airports_df["IATA"] == end_airport]
                if not arr_airport.empty:
                    result["arrival_details"] = arr_airport.iloc[0].to_dict()

            except Exception as e:
                print(f"Warning: Could not load airport details: {e}")

        return result

    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Error finding route from {start_airport} to {end_airport}: {str(e)}",
        )


@app.get("/flight_fare/{departure_airport}/{arrival_airport}")
def get_flight_fare(
    departure_airport: str,
    arrival_airport: str,
    outbound_date: str = Query(
        None, description="Departure date (YYYY-MM-DD)"
    ),
    return_date: str = Query(None, description="Return date (YYYY-MM-DD)"),
    currency: str = Query("USD", description="Currency for fare prices"),
):
    """
    Get flight fare information between two airports using SerpAPI.
    """
    try:
        fare_data = fetch_flight_fare(
            departure_id=departure_airport,
            arrival_id=arrival_airport,
            outbound_date=outbound_date,
            return_date=return_date,
            currency=currency,
        )

        if not fare_data.get("success", False):
            raise HTTPException(
                status_code=404,
                detail=f"Could not fetch fare data: {fare_data.get('error', 'Unknown error')}",
            )

        return fare_data

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching flight fare: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    # Run the FastAPI app with reload=True for development
    print("Starting ChasquiForex API server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
