"""
ticket_fare_fetcher.py
Fetches flight fare data using the SerpAPI Google Flights API.
"""

import os
from dotenv import load_dotenv
from serpapi import GoogleSearch
import datetime
import logging
from typing import Dict, Any, Optional, List

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()


def fetch_flight_fare(
    departure_id: str,
    arrival_id: str,
    outbound_date: Optional[str] = None,
    return_date: Optional[str] = None,
    currency: str = "USD",
) -> Dict[str, Any]:
    """
    Fetch flight fare data from SerpAPI Google Flights.

    Args:
        departure_id: IATA code of departure airport
        arrival_id: IATA code of arrival airport
        outbound_date: Departure date in YYYY-MM-DD format (defaults to 3 months from now)
        return_date: Return date in YYYY-MM-DD format (defaults to 1 week after outbound)
        currency: Currency code for fare prices

    Returns:
        Dictionary containing flight fare data or error information
    """
    try:
        # Set default dates if not provided
        if not outbound_date:
            # Default to 3 months from now
            future_date = datetime.datetime.now() + datetime.timedelta(days=90)
            outbound_date = future_date.strftime("%Y-%m-%d")

        if not return_date:
            # Default to 1 week after outbound date
            outbound_dt = datetime.datetime.strptime(outbound_date, "%Y-%m-%d")
            return_dt = outbound_dt + datetime.timedelta(days=7)
            return_date = return_dt.strftime("%Y-%m-%d")

        # Get API key from environment
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            logger.error("SERPAPI_API_KEY not found in environment variables")
            return {"error": "API key not configured", "success": False}

        params = {
            "engine": "google_flights",
            "departure_id": departure_id,
            "arrival_id": arrival_id,
            "outbound_date": outbound_date,
            "return_date": return_date,
            "currency": currency,
            "hl": "en",
            "api_key": api_key,
        }

        logger.info(
            f"Fetching flight fare from {departure_id} to {arrival_id} for {outbound_date}"
        )
        search = GoogleSearch(params)
        results = search.get_dict()

        if "error" in results:
            logger.error(f"SerpAPI error: {results['error']}")
            return {"error": results["error"], "success": False}

        # Add metadata to results
        results["query"] = {
            "departure_id": departure_id,
            "arrival_id": arrival_id,
            "outbound_date": outbound_date,
            "return_date": return_date,
            "currency": currency,
        }
        results["success"] = True

        return results

    except Exception as e:
        logger.error(f"Error fetching flight fare: {str(e)}")
        return {"error": str(e), "success": False}


def get_best_fare(results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract the best (cheapest) fare from the API results.

    Args:
        results: SerpAPI response dictionary

    Returns:
        Dictionary with best fare information or empty dict if not found
    """
    if not results.get("success", False):
        return {}

    try:
        best_flights = results.get("best_flights", {})
        if best_flights:
            return {
                "price": best_flights.get("price", 0),
                "currency": results.get("query", {}).get("currency", "USD"),
                "departure_id": results.get("query", {}).get(
                    "departure_id", ""
                ),
                "arrival_id": results.get("query", {}).get("arrival_id", ""),
                "outbound_date": results.get("query", {}).get(
                    "outbound_date", ""
                ),
                "return_date": results.get("query", {}).get("return_date", ""),
                "airlines": best_flights.get("airlines", []),
                "duration": best_flights.get("duration", ""),
                "success": True,
            }

        # If no best_flights, try other locations in the response
        if "flights" in results and results["flights"]:
            first_flight = results["flights"][0]
            return {
                "price": first_flight.get("price", 0),
                "currency": results.get("query", {}).get("currency", "USD"),
                "departure_id": results.get("query", {}).get(
                    "departure_id", ""
                ),
                "arrival_id": results.get("query", {}).get("arrival_id", ""),
                "outbound_date": results.get("query", {}).get(
                    "outbound_date", ""
                ),
                "return_date": results.get("query", {}).get("return_date", ""),
                "airlines": first_flight.get("airlines", []),
                "duration": first_flight.get("duration", ""),
                "success": True,
            }

        return {}

    except Exception as e:
        logger.error(f"Error extracting best fare: {str(e)}")
        return {}


def fetch_multiple_fares(
    departure_id: str,
    arrival_ids: List[str],
    outbound_date: Optional[str] = None,
    return_date: Optional[str] = None,
    currency: str = "USD",
) -> Dict[str, Dict[str, Any]]:
    """
    Fetch flight fares for multiple destinations.

    Args:
        departure_id: IATA code of departure airport
        arrival_ids: List of IATA codes for arrival airports
        outbound_date: Departure date (YYYY-MM-DD)
        return_date: Return date (YYYY-MM-DD)
        currency: Currency code

    Returns:
        Dictionary mapping destination airports to fare information
    """
    results = {}

    for arrival_id in arrival_ids:
        fare_data = fetch_flight_fare(
            departure_id=departure_id,
            arrival_id=arrival_id,
            outbound_date=outbound_date,
            return_date=return_date,
            currency=currency,
        )

        # Extract best fare
        best_fare = get_best_fare(fare_data)

        # Store in results dictionary
        results[arrival_id] = best_fare if best_fare else {"success": False}

    return results


# If run directly, execute a test query
if __name__ == "__main__":
    params = {
        "engine": "google_flights",
        "departure_id": "PEK",
        "arrival_id": "AUS",
        "outbound_date": "2025-05-13",
        "return_date": "2025-05-19",
        "currency": "USD",
        "hl": "en",
        "api_key": os.getenv("SERPAPI_API_KEY"),
    }

    search = GoogleSearch(params)
    results = search.get_dict()
    print("Example query results:", results.keys())

    # Test the function
    test_results = fetch_flight_fare("JFK", "LAX")
    print(
        "Function test results:",
        test_results.keys() if test_results.get("success") else test_results,
    )
