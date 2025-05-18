"""
Flight data service for ChasquiFX.
Handles flight fare fetching and processing using SerpAPI.
"""

import logging
import os
import sys
import json
from typing import Dict, List, Optional
import requests
from dotenv import load_dotenv

# Set the path to the parent directory
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
)
from backend.api.models.schemas import FlightFare  # noqa: E402
from backend.api.db.operations import (  # noqa: E402
    get_cached_flight_data,
    log_api_call,
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file in the parent directory
env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
)

# Only try to load .env if not in Vercel environment
if not os.getenv("VERCEL_DEPLOYMENT"):
    try:
        load_dotenv(env_path)
    except Exception as e:
        logger.warning(f"Could not load .env file: {e}")

# Get API key from environment variables
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")
if not SERPAPI_KEY:
    logger.warning(
        (
            "SERPAPI_API_KEY not found in environment variables. "
            "Flight fare queries will use simulated data."
        )
    )
else:
    logger.info("SERPAPI_API_KEY loaded successfully.")


def check_quota_status():
    """
    Check if SerpAPI quota has been exceeded based on status file

    Returns:
        bool: True if quota is exceeded, False otherwise
    """
    try:
        # Try to read quota status from temporary file created by forex_service
        quota_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "assets",
            "data",
            "forex",
            "serpapi_quota_status.json",
        )
        if os.path.exists(quota_file):
            with open(quota_file, "r") as f:
                quota_data = json.load(f)

                # Check if the quota exceeded status is recent (within 1 hour)
                if "timestamp" in quota_data:
                    try:
                        from datetime import datetime

                        quota_time = datetime.fromisoformat(
                            quota_data["timestamp"]
                        )
                        current_time = datetime.now()
                        time_diff = current_time - quota_time

                        # If quota exceeded in the last hour,
                        # consider it still active
                        if time_diff.total_seconds() < 3600:  # 1 hour
                            return quota_data.get("quota_exceeded", False)
                    except Exception as e:
                        logger.warning(f"Error parsing quota timestamp: {e}")

                # No timestamp or parsing failed, just return the status
                return quota_data.get("quota_exceeded", False)
    except Exception as e:
        logger.warning(f"Error checking quota status: {e}")

    return False  # Default: assume quota is not exceeded


async def fetch_flight_fare(
    departure_airport: str,
    arrival_airport: str,
    outbound_date: str,
    return_date: str,
    currency: str = "USD",
    user_id: Optional[str] = None,
) -> Optional[FlightFare]:
    """
    Fetch flight fare data using SerpAPI's Google Flights search.
    First checks the database cache before making an API call.
    Logs API usage for analytics.

    Args:
        departure_airport: IATA code of departure airport
        arrival_airport: IATA code of arrival airport
        outbound_date: Departure date in YYYY-MM-DD format
        return_date: Return date in YYYY-MM-DD format
        currency: Currency code for fare prices
        user_id: Optional user ID for logging

    Returns:
        FlightFare object or None if not available
    """
    logger.info(
        f"Fetching fare for {departure_airport}-{arrival_airport} "
        f"({outbound_date} to {return_date})"
    )

    # Check cache first
    cached_data = await get_cached_flight_data(
        departure_airport, arrival_airport
    )
    if cached_data:
        logger.info(
            f"Using cached flight data for "
            f"{departure_airport}-{arrival_airport}"
        )
        # Convert cached data back to FlightFare object
        try:
            # Convert possibly single airline string to list for consistency
            airlines = cached_data.get("airlines", [])
            if isinstance(airlines, str):
                airlines = [airlines]
            elif not airlines and "airline" in cached_data:
                airlines = [cached_data.get("airline", "Unknown")]

            return FlightFare(
                price=cached_data.get("price", 0.0),
                currency=cached_data.get("currency", "USD"),
                airlines=airlines,
                duration=cached_data.get("duration", ""),
                outbound_date=outbound_date,
                return_date=return_date,
                carbon_emissions=cached_data.get("carbon_emissions"),
            )
        except Exception as e:
            logger.error(f"Error parsing cached flight data: {e}")

    # Use SerpAPI if API key is available and quota is not exceeded
    if SERPAPI_KEY and not check_quota_status():
        try:
            logger.info("Using SerpAPI to fetch flight data")

            # Build the SerpAPI request URL
            base_url = "https://serpapi.com/search"
            params = {
                "engine": "google_flights",
                "departure_id": departure_airport,
                "arrival_id": arrival_airport,
                "outbound_date": outbound_date,
                "return_date": return_date,
                "currency": currency,
                "hl": "en",
                "api_key": SERPAPI_KEY,
            }

            # Log API call (without exposing API key)
            request_log = {
                "endpoint": "google_flights",
                "origin": departure_airport,
                "destination": arrival_airport,
                "dates": f"{outbound_date} to {return_date}",
            }

            # Log the API call to Supabase
            await log_api_call(
                endpoint="serpapi/google_flights",
                request_data=request_log,
                response_status=200,
                user_id=user_id,
            )

            response = requests.get(base_url, params=params)

            if response.status_code == 200:
                data = response.json()

                # Process the SerpAPI response
                flight_data = None

                # First check best_flights section
                if "best_flights" in data and data["best_flights"]:
                    flight_data = data["best_flights"][0]
                # If no best_flights, check other_flights section
                elif "other_flights" in data and data["other_flights"]:
                    flight_data = data["other_flights"][0]

                if flight_data:
                    # Extract price - SerpAPI returns this as a numeric value
                    price_value = flight_data.get("price", 0)
                    if isinstance(price_value, str):
                        try:
                            # Handle string price format just in case
                            price_str = (
                                price_value.replace(currency, "")
                                .replace("$", "")
                                .replace(",", "")
                                .strip()
                            )
                            price_value = float(price_str)
                        except ValueError:
                            logger.warning(
                                (
                                    f"Could not parse "
                                    f"price string: {price_value}, "
                                    f"using default"
                                )
                            )
                            price_value = 100.0

                    # Extract airline information - SerpAPI may provide this in
                    # different formats
                    airlines = []

                    # Check if there are multiple flights in the itinerary
                    if "flights" in flight_data and flight_data["flights"]:
                        # Collect airlines from all flight segments
                        for flight in flight_data["flights"]:
                            if (
                                "airline" in flight
                                and flight["airline"] not in airlines
                            ):
                                airlines.append(flight["airline"])
                    # Single airline for the entire itinerary
                    elif "airline" in flight_data:
                        airlines.append(flight_data["airline"])
                    # Explicit airlines list
                    elif "airlines" in flight_data:
                        airlines = flight_data["airlines"]

                    # Extract duration - SerpAPI provides total_duration in
                    # minutes
                    if "total_duration" in flight_data:
                        # Convert minutes to hours and minutes format
                        total_minutes = flight_data["total_duration"]
                        hours = total_minutes // 60
                        minutes = total_minutes % 60
                        duration = f"{hours}h {minutes}m"
                    else:
                        duration = "Unknown"

                    # Extract any additional useful information
                    carbon_emissions = None
                    if "carbon_emissions" in flight_data:
                        carbon_info = flight_data["carbon_emissions"]
                        carbon_emissions = carbon_info.get("this_flight")

                    logger.info(
                        f"Successfully fetched flight data from SerpAPI: "
                        f"{price_value} {currency}, duration: {duration}"
                    )

                    return FlightFare(
                        price=price_value,
                        currency=currency,
                        airlines=airlines,
                        duration=duration,
                        outbound_date=outbound_date,
                        return_date=return_date,
                        carbon_emissions=carbon_emissions,
                    )
                else:
                    logger.warning(
                        "No flight data found in SerpAPI response, "
                        "falling back to simulated data"
                    )
            else:
                error_message = (
                    f"SerpAPI request failed with status code "
                    f"{response.status_code}"
                )
                try:
                    error_data = response.json()
                    if "error" in error_data:
                        error_message += f": {error_data['error']}"
                except Exception as json_err:
                    logger.debug(f"Could not parse error response: {json_err}")
                logger.warning(
                    f"{error_message}, falling back to simulated data"
                )

        except Exception as e:
            logger.error(f"Error fetching flight fare from SerpAPI: {e}")
            logger.info("Falling back to simulated data")

    # For demo purposes or if API key is missing or API call fails,
    # generate simulated fare data
    try:
        logger.info("Generating simulated flight fare data")

        # Simulated fare data generation based on airport codes
        base_price = (
            ord(departure_airport[0]) + ord(arrival_airport[0])
        ) * 2.5
        price = round(
            base_price * (1 + (hash(arrival_airport) % 100) / 100), 2
        )

        # Add some variety to the airlines
        airlines_options = [
            ["Air Sample", "ConnectFly"],
            ["GlobalAir", "RegionExpress"],
            ["SkyWings", "OceanAir", "MountainJet"],
        ]
        airlines = airlines_options[
            hash(departure_airport + arrival_airport) % len(airlines_options)
        ]

        # Generate flight duration based on airport codes
        hours = 1 + (ord(departure_airport[0]) + ord(arrival_airport[0])) % 10
        minutes = (ord(departure_airport[1]) + ord(arrival_airport[1])) % 60
        duration = f"{hours}h {minutes}m"

        return FlightFare(
            price=price,
            currency=currency,
            airlines=airlines,
            duration=duration,
            outbound_date=outbound_date,
            return_date=return_date,
        )

    except Exception as e:
        logger.error(f"Error generating simulated flight fare: {e}")
        return None


def fetch_multiple_fares(
    departure_airport: str,
    arrival_airports: List[str],
    outbound_date: str,
    return_date: str,
    currency: str = "USD",
) -> Dict[str, Optional[FlightFare]]:
    """
    Fetch multiple flight fares in parallel.

    Args:
        departure_airport: IATA code of departure airport
        arrival_airports: List of IATA codes for arrival airports
        outbound_date: Departure date in YYYY-MM-DD format
        return_date: Return date in YYYY-MM-DD format
        currency: Currency code for fare prices

    Returns:
        Dictionary mapping airport codes to FlightFare objects
    """
    logger.info(f"Fetching fares for {len(arrival_airports)} destinations")

    results = {}
    for airport in arrival_airports:
        fare = fetch_flight_fare(
            departure_airport=departure_airport,
            arrival_airport=airport,
            outbound_date=outbound_date,
            return_date=return_date,
            currency=currency,
        )
        results[airport] = fare

    return results
