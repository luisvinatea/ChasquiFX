"""
Flight data service for ChasquiFX.
Handles flight fare fetching and processing using SerpAPI.
"""

import logging
import os
import sys
from typing import Dict, List, Optional
import requests
from dotenv import load_dotenv

# Set the path to the parent directory
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
)
from backend.api.models.schemas import FlightFare  # noqa: E402

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
load_dotenv(env_path)

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


def fetch_flight_fare(
    departure_airport: str,
    arrival_airport: str,
    outbound_date: str,
    return_date: str,
    currency: str = "USD",
) -> Optional[FlightFare]:
    """
    Fetch flight fare data using SerpAPI's Google Flights search.

    Args:
        departure_airport: IATA code of departure airport
        arrival_airport: IATA code of arrival airport
        outbound_date: Departure date in YYYY-MM-DD format
        return_date: Return date in YYYY-MM-DD format
        currency: Currency code for fare prices

    Returns:
        FlightFare object or None if not available
    """
    logger.info(
        f"Fetching fare for {departure_airport}-{arrival_airport} "
        f"({outbound_date} to {return_date})"
    )

    # Use SerpAPI if API key is available
    if SERPAPI_KEY:
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

            response = requests.get(base_url, params=params)

            if response.status_code == 200:
                data = response.json()

                # Process the SerpAPI response
                if "best_flights" in data and data["best_flights"]:
                    best_flight = data["best_flights"][0]

                    price_value = best_flight.get("price", 0)
                    # Handle different price formats from SerpAPI
                    if isinstance(price_value, str):
                        try:
                            # Try to extract numeric value from string
                            # (e.g. "$123", "USD 123", "123 USD")
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
                                    f"Could not "
                                    f"parse price string: "
                                    f"{price_value}, "
                                    f"using default"
                                )
                            )
                            price_value = 100.0

                    # Extract airline info
                    airlines = []
                    if "airline" in best_flight:
                        airlines.append(best_flight["airline"])
                    elif "airlines" in best_flight:
                        airlines = best_flight["airlines"]

                    # Extract duration
                    duration = best_flight.get("duration", "Unknown")

                    logger.info(
                        f"Successfully fetched flight data from SerpAPI: "
                        f"{price_value} {currency}"
                    )

                    return FlightFare(
                        price=price_value,
                        currency=currency,
                        airlines=airlines,
                        duration=duration,
                        outbound_date=outbound_date,
                        return_date=return_date,
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
