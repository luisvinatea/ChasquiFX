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
        # Create a base result with query information
        base_result = {
            "currency": results.get("query", {}).get("currency", "USD"),
            "departure_id": results.get("query", {}).get("departure_id", ""),
            "arrival_id": results.get("query", {}).get("arrival_id", ""),
            "outbound_date": results.get("query", {}).get("outbound_date", ""),
            "return_date": results.get("query", {}).get("return_date", ""),
            "success": True,
        }

        # Try best_flights first
        best_flights = results.get("best_flights", {})
        if best_flights and isinstance(best_flights, dict):
            return {
                "price": best_flights.get("price", 0),
                "airlines": best_flights.get("airlines", []),
                "duration": best_flights.get("duration", ""),
                **base_result,  # Merge with base result
            }

        # Try flights data - handle different possible structures
        if "flights" in results:
            flights = results["flights"]

            # Case 1: flights is a dict
            if isinstance(flights, dict):
                return {
                    "price": flights.get("price", 0),
                    "airlines": flights.get("airlines", []),
                    "duration": flights.get("duration", ""),
                    **base_result,
                }

            # Case 2: flights is a list of dicts
            elif (
                isinstance(flights, list)
                and flights
                and isinstance(flights[0], dict)
            ):
                first_flight = flights[0]
                return {
                    "price": first_flight.get("price", 0),
                    "airlines": first_flight.get("airlines", []),
                    "duration": first_flight.get("duration", ""),
                    **base_result,
                }

            # Case 3: flights is a list of lists
            elif (
                isinstance(flights, list)
                and flights
                and isinstance(flights[0], list)
                and flights[0]
            ):
                # Try to extract data from the nested list
                if len(flights[0]) > 0:
                    if isinstance(flights[0][0], dict):
                        flight_data = flights[0][0]
                        return {
                            "price": flight_data.get("price", 0),
                            "airlines": flight_data.get("airlines", []),
                            "duration": flight_data.get("duration", ""),
                            **base_result,
                        }

        # If we couldn't extract fare data but the API call was successful,
        # return a placeholder with default values
        return {"price": 0, "airlines": [], "duration": "", **base_result}

    except Exception as e:
        logger.error(f"Error extracting best fare: {str(e)}")
        return {}


def fetch_multiple_fares(
    departure_id: str,
    arrival_ids: List[str],
    outbound_date: Optional[str] = None,
    return_date: Optional[str] = None,
    currency: str = "USD",
    max_concurrent: int = 3,  # Limit concurrent requests to avoid overwhelming the API
) -> Dict[str, Dict[str, Any]]:
    """
    Fetch flight fares for multiple destinations using concurrent execution.

    Args:
        departure_id: IATA code of departure airport
        arrival_ids: List of IATA codes for arrival airports
        outbound_date: Departure date (YYYY-MM-DD)
        return_date: Return date (YYYY-MM-DD)
        currency: Currency code
        max_concurrent: Maximum number of concurrent API requests

    Returns:
        Dictionary mapping destination airports to fare information
    """
    import concurrent.futures

    results = {}

    # Function to fetch and process a single fare
    def fetch_and_process_fare(arrival_id):
        try:
            fare_data = fetch_flight_fare(
                departure_id=departure_id,
                arrival_id=arrival_id,
                outbound_date=outbound_date,
                return_date=return_date,
                currency=currency,
            )

            # Extract best fare
            best_fare = get_best_fare(fare_data)
            return arrival_id, best_fare if best_fare else {"success": False}
        except Exception as e:
            logger.error(f"Error fetching fare for {arrival_id}: {str(e)}")
            return arrival_id, {"success": False, "error": str(e)}

    # Use ThreadPoolExecutor for concurrent execution
    with concurrent.futures.ThreadPoolExecutor(
        max_workers=max_concurrent
    ) as executor:
        # Submit all tasks
        future_to_airport = {
            executor.submit(fetch_and_process_fare, arrival_id): arrival_id
            for arrival_id in arrival_ids
        }

        # Process results as they complete
        for future in concurrent.futures.as_completed(future_to_airport):
            try:
                arrival_id, fare_data = future.result()
                results[arrival_id] = fare_data
            except Exception as e:
                arrival_id = future_to_airport[future]
                logger.error(
                    f"Failed to process fare for {arrival_id}: {str(e)}"
                )
                results[arrival_id] = {"success": False, "error": str(e)}

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
