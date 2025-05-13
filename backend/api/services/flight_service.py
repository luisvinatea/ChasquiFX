"""
Flight data service for ChasquiFX.
Handles flight fare fetching and processing.
"""

import logging
from typing import Dict, List, Optional

from backend.api.models.schemas import FlightFare

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def fetch_flight_fare(
    departure_airport: str,
    arrival_airport: str,
    outbound_date: str,
    return_date: str,
    currency: str = "USD",
) -> Optional[FlightFare]:
    """
    Fetch flight fare data using an external API.

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

    # For demo purposes, generate simulated fare data
    # In a production environment, this would call an actual flight search API
    try:
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
        logger.error(f"Error fetching flight fare: {e}")
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
