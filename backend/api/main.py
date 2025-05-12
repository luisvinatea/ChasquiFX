"""
main.py
Integrates flight route data with forex data to provide destination recommendations
based on favorable exchange rates and available flight routes.
"""

import os
import sys
from typing import Dict, List, Any, Tuple
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
    debug_forex_data,
    list_available_currencies,
)
from backend.api.mapper import route_mapper, get_complete_route_info

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
    # First, try to get direct rate and trend using the new forex_calculator
    current_rate, trend_pct = get_exchange_rate_with_trend(
        base_currency, quote_currency, days
    )

    if current_rate > 0:
        return current_rate, trend_pct

    # Fall back to original method if new method fails
    forex_file = os.path.join(
        FOREX_DIR, "parquet/yahoo_finance_forex_data.parquet"
    )
    mapping_file = os.path.join(FOREX_DIR, "json/forex_mappings.json")

    # Try to fetch fresh data (only for the specific pair to avoid too many requests)
    symbols = [f"{base_currency}{quote_currency}=X"]
    try:
        get_forex_data(symbols=symbols)
    except Exception as e:
        print(
            f"Warning: Could not fetch fresh data for {base_currency}{quote_currency}: {e}"
        )

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


def get_demo_destinations(departure_airport: str) -> List[Dict[str, Any]]:
    """
    Create demo destinations data for testing when route data is not available.

    Args:
        departure_airport: IATA code of departure airport

    Returns:
        List of demo destinations
    """
    print("Creating demo destinations for testing...")

    # Common international destinations with different currencies
    demo_data = [
        {"iata": "LHR", "city": "London", "country": "GB", "currency": "GBP"},
        {"iata": "CDG", "city": "Paris", "country": "FR", "currency": "EUR"},
        {"iata": "NRT", "city": "Tokyo", "country": "JP", "currency": "JPY"},
        {"iata": "SYD", "city": "Sydney", "country": "AU", "currency": "AUD"},
        {
            "iata": "MEX",
            "city": "Mexico City",
            "country": "MX",
            "currency": "MXN",
        },
        {"iata": "YYZ", "city": "Toronto", "country": "CA", "currency": "CAD"},
        {
            "iata": "HKG",
            "city": "Hong Kong",
            "country": "HK",
            "currency": "HKD",
        },
        {"iata": "ZRH", "city": "Zurich", "country": "CH", "currency": "CHF"},
        {"iata": "PEK", "city": "Beijing", "country": "CN", "currency": "CNY"},
        {
            "iata": "JNB",
            "city": "Johannesburg",
            "country": "ZA",
            "currency": "ZAR",
        },
        {
            "iata": "GRU",
            "city": "Sao Paulo",
            "country": "BR",
            "currency": "BRL",
        },
        {
            "iata": "DEL",
            "city": "New Delhi",
            "country": "IN",
            "currency": "INR",
        },
        {
            "iata": "IST",
            "city": "Istanbul",
            "country": "TR",
            "currency": "TRY",
        },
        {"iata": "BKK", "city": "Bangkok", "country": "TH", "currency": "THB"},
        {
            "iata": "AKL",
            "city": "Auckland",
            "country": "NZ",
            "currency": "NZD",
        },
        {
            "iata": "SGN",
            "city": "Ho Chi Minh City",
            "country": "VN",
            "currency": "VND",
        },
        {
            "iata": "CPT",
            "city": "Cape Town",
            "country": "ZA",
            "currency": "ZAR",
        },
        {
            "iata": "KUL",
            "city": "Kuala Lumpur",
            "country": "MY",
            "currency": "MYR",
        },
        {"iata": "MNL", "city": "Manila", "country": "PH", "currency": "PHP"},
        {"iata": "BOG", "city": "Bogotá", "country": "CO", "currency": "COP"},
    ]

    # Get country currency map for filtering
    airport_country_map = get_airport_country_map()
    country_currency_map = get_country_currency_map()

    # Determine base currency
    departure_country = airport_country_map.get(departure_airport, "US")
    base_currency = country_currency_map.get(departure_country, "USD")

    # Filter out destinations that use the same currency
    filtered_data = [d for d in demo_data if d["currency"] != base_currency]

    # If we filtered everything, just use original list
    if not filtered_data:
        filtered_data = demo_data

    print(
        f"Generated {len(filtered_data)} demo destinations with currencies different from {base_currency}"
    )

    results = []

    for dest in filtered_data:
        # Create a demo route info structure
        route_info = {
            "Departure-IATA": departure_airport,
            "Arrival-IATA": dest["iata"],
            "Airline": "Demo Airline",
            "Distance-km": 5000,  # Demo distance
            "Equipment": "B777",  # Demo equipment
            "Stops": 0,  # Direct flight
        }

        result = {
            "arrival_airport": dest["iata"],
            "country": dest["country"],
            "city": dest["city"],
            "currency": dest["currency"],  # Include the currency in the result
            "route_info": route_info,
            "route_quality": 1.0,  # Direct flight quality
        }

        results.append(result)

    return results


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
        # Try demo destinations as a fallback
        destinations = get_demo_destinations(departure_airport)
        if not destinations:
            raise HTTPException(
                status_code=404,
                detail=f"No routes found from {departure_airport}",
            )

    # For USD currency departures, prioritize non-USD currency destinations
    if base_currency == "USD":
        # Filter destinations to only include those with non-USD currencies
        non_usd_destinations = []
        for dest in destinations:
            country = dest["country"]
            quote_currency = (
                country_currency_map.get(country, "USD") if country else "USD"
            )
            if quote_currency != "USD":
                non_usd_destinations.append(dest)

        # If we found non-USD destinations, use those instead
        if non_usd_destinations:
            destinations = non_usd_destinations

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

    # Calculate current rate and trend using the new forex calculator
    exchange_rate, trend = get_exchange_rate_trend(
        base_currency, quote_currency, days
    )

    if exchange_rate == 0:
        # Try to fetch fresh data if rate not found
        symbols = [
            f"{base_currency}USD=X",
            f"USD{base_currency}=X",
            f"{quote_currency}USD=X",
            f"USD{quote_currency}=X",
        ]
        get_forex_data(symbols=symbols)
        # Try again with fresh data
        exchange_rate, trend = get_exchange_rate_trend(
            base_currency, quote_currency, days
        )

        if exchange_rate == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No forex data found for {base_currency}/{quote_currency}",
            )

    # If the pair data is empty but we calculated a rate, the rate was derived from USD pairs
    if pair_data.empty:
        # Just return the calculated rate without history
        return {
            "base_currency": base_currency,
            "quote_currency": quote_currency,
            "current_rate": exchange_rate,
            "trend_percentage": trend,
            "history": [],
            "derived": True,
        }

    # Limit to requested days
    if len(pair_data) > days:
        pair_data = pair_data.iloc[-days:]

    return {
        "base_currency": base_currency,
        "quote_currency": quote_currency,
        "current_rate": exchange_rate,
        "trend_percentage": trend,
        "history": pair_data.reset_index().to_dict("records")
        if not pair_data.empty
        else [],
        "derived": False,
    }


@app.get("/debug/forex")
def debug_forex():
    """
    Debug endpoint for forex data.
    """
    # Load forex file path
    forex_file = os.path.join(
        FOREX_DIR, "parquet/yahoo_finance_forex_data.parquet"
    )

    # Check if file exists
    file_exists = os.path.exists(forex_file)

    # Get debug info
    debug_info = debug_forex_data()

    # Get available currencies
    currencies = list_available_currencies()

    return {
        "forex_file": forex_file,
        "file_exists": file_exists,
        "file_size_bytes": os.path.getsize(forex_file) if file_exists else 0,
        "debug_info": debug_info,
        "available_currencies": currencies,
    }


@app.get("/debug/currency-map")
def debug_currency_map():
    """
    Debug endpoint for currency mapping data.
    """
    country_currency = get_country_currency_map()
    airport_country = get_airport_country_map()

    # Get sample of airport to currency mapping
    sample_airports = list(airport_country.keys())[:20]
    airport_currency = {}

    for airport in sample_airports:
        country = airport_country.get(airport, "")
        currency = country_currency.get(country, "USD") if country else "USD"
        airport_currency[airport] = {"country": country, "currency": currency}

    return {
        "country_to_currency_count": len(country_currency),
        "airport_to_country_count": len(airport_country),
        "sample_airport_mappings": airport_currency,
    }


def test_destination_recommendations(
    departure_airport: str = "JFK", max_results: int = 10
):
    """
    Test function to demonstrate the integration of forex data and flight routes.

    Args:
        departure_airport: IATA code of departure airport
        max_results: Maximum number of recommendations to return

    Returns:
        List of destination recommendations sorted by favorable exchange rates
    """
    print(
        f"Finding top {max_results} destinations from {departure_airport} based on forex rates..."
    )

    # Step 1: Update forex data to get the latest exchange rates
    print("Checking forex data...")
    try:
        # Instead of updating all forex data (which can lead to many 404s),
        # we'll use the existing data and only update when needed
        forex_file = os.path.join(
            FOREX_DIR, "parquet/yahoo_finance_forex_data.parquet"
        )
        if not os.path.exists(forex_file):
            print("Forex data file not found, downloading essential data...")
            # Download only major currency pairs to avoid excessive API calls
            major_currencies = [
                "USD",
                "EUR",
                "GBP",
                "JPY",
                "CAD",
                "AUD",
                "CHF",
            ]
            symbols = [
                f"{a}{b}=X"
                for a in major_currencies
                for b in major_currencies
                if a != b
            ]
            get_forex_data(symbols=symbols)  # type: ignore
            print("Basic forex data downloaded")
        else:
            print("Using existing forex data")
    except Exception as e:
        print(f"Warning: Error checking forex data: {e}")
        print("Continuing with existing data...")

    # Step 2: Get airport to country and country to currency mappings
    airport_country_map = get_airport_country_map()
    country_currency_map = get_country_currency_map()

    if departure_airport not in airport_country_map:
        print(f"Error: Airport {departure_airport} not found")
        return None

    # Step 3: Get departure country and base currency
    departure_country = airport_country_map.get(departure_airport, "")
    base_currency = country_currency_map.get(departure_country, "USD")

    print(
        f"Departure country: {departure_country}, Base currency: {base_currency}"
    )

    # Step 4: Find flight destinations
    print("Finding flight destinations...")
    destinations = find_flight_destinations(
        departure_airport, max_results * 2, direct_only=False
    )

    # If no destinations found, try using demo data
    if not destinations:
        print("No destinations found, using demo data for testing purposes...")
        destinations = get_demo_destinations(departure_airport)

    use_demo_data = False

    # Special handling for USD currency: only include non-USD currency destinations
    if base_currency == "USD":
        print(
            "USD departure airport detected: Will only recommend destinations with different currencies"
        )
        # Filter destinations to only include those with non-USD currencies
        non_usd_destinations = []
        for dest in destinations:
            country = dest["country"]
            quote_currency = (
                country_currency_map.get(country, "USD") if country else "USD"
            )
            if quote_currency != "USD":
                non_usd_destinations.append(dest)
                print(
                    f"  - Including {dest['arrival_airport']} ({country}): Uses {quote_currency} currency"
                )
            else:
                print(
                    f"  - Excluding {dest['arrival_airport']} ({country}): Uses USD currency"
                )

        # If we have filtered out all destinations, use demo data as a fallback
        if not non_usd_destinations:
            print("No non-USD destinations found, using demo data...")
            use_demo_data = True
            destinations = get_demo_destinations(departure_airport)
        else:
            destinations = non_usd_destinations

    recommendations = []

    # Step 5: Process destinations
    print("Processing destinations...")
    for dest in destinations:
        arrival_airport = dest["arrival_airport"]
        country = dest["country"]

        # Get currency for destination country
        quote_currency = (
            country_currency_map.get(country, "USD") if country else "USD"
        )

        # If we're using demo data, get the currency from the demo data
        if use_demo_data and "currency" in dest:
            quote_currency = dest["currency"]

        # Skip if same currency as base
        if quote_currency == base_currency:
            print(
                f"  - Skipping {arrival_airport} ({country}): Same currency as base ({base_currency})"
            )
            continue

        print(
            f"  - Processing {arrival_airport} ({country}): {base_currency}/{quote_currency}"
        )

        # Get exchange rate and trend
        try:
            exchange_rate, trend = get_exchange_rate_trend(
                base_currency, quote_currency
            )

            # Skip if no exchange rate data
            if exchange_rate == 0:
                # Try direct Yahoo Finance symbol fetch as a last resort
                try:
                    symbols = [f"{base_currency}{quote_currency}=X"]
                    get_forex_data(symbols=symbols)
                    exchange_rate, trend = get_exchange_rate_trend(
                        base_currency, quote_currency
                    )
                except Exception as e:
                    print(f"    Error fetching direct rate: {e}")

            if exchange_rate == 0:
                print(
                    f"    No exchange rate available for {base_currency}/{quote_currency}"
                )
                continue

            print(f"    Rate: {exchange_rate:.4f}, Trend: {trend:.2f}%")

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
        except Exception as e:
            print(
                f"    Error processing {base_currency}/{quote_currency}: {e}"
            )
            continue

    # Sort by score (descending)
    recommendations.sort(key=lambda x: x.score, reverse=True)
    recommendations = recommendations[:max_results]

    # Step 6: Print results
    print(
        f"\nTop {len(recommendations)} destinations from {departure_airport} based on forex rates:"
    )
    print(
        f"{'Rank':<5} {'Airport':<8} {'City, Country':<25} {'Exchange Rate':<15} {'Trend %':<10} {'Score':<10}"
    )
    print("-" * 80)
    for i, rec in enumerate(recommendations, 1):
        print(
            f"{i:<5} {rec.arrival_airport:<8} {rec.city}, {rec.country:<15} {rec.exchange_rate:<15.4f} {rec.exchange_rate_trend:<10.2f} {rec.score:<10.2f}"
        )

    # Step 7: Get detailed route info for the top recommendation
    if recommendations:
        top_dest = recommendations[0]
        print(
            f"\nDetailed route info for top recommendation: {top_dest.city}, {top_dest.country} ({top_dest.arrival_airport})"
        )
        route_info = get_complete_route_info(
            departure_airport, top_dest.arrival_airport
        )

        if not route_info["direct"].empty:
            print("\nDirect flights available:")
            print(route_info["direct"].to_string())
        elif not route_info["one_stop"].empty:
            print("\nOne-stop connections available:")
            print(route_info["one_stop"].to_string())
        elif not route_info["two_stop"].empty:
            print("\nTwo-stop connections available:")
            print(route_info["two_stop"].to_string())

    return recommendations


if __name__ == "__main__":
    # Run the test for JFK airport (New York) to demonstrate functionality
    print("Running ChasquiForex test case...")

    # Check forex data availability first
    print("Checking forex data availability...")
    debug_info = debug_forex_data()
    print(
        f"Available currencies: {debug_info.get('available_currencies', [])}"
    )
    print(f"Data shape: {debug_info.get('shape', (0, 0))}")

    # Can also try with other airports:
    # LIM - Lima, Peru
    # MEX - Mexico City, Mexico
    # GRU - Sao Paulo, Brazil
    # MAD - Madrid, Spain
    test_destination_recommendations(departure_airport="JFK", max_results=10)

    # To run the FastAPI server, use the command:
    # uvicorn backend.api.main:app --reload --host 0.0.0.0 --port 8000
