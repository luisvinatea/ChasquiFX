"""
Geographical data service for ChasquiFX.
Handles airport, route, and location data operations.
"""

import os
import pandas as pd
from typing import Dict, List, Any
import logging
from backend.api.config import ENRICHED_DIR
import sys

# Set the path to the parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def load_airports_data() -> pd.DataFrame:
    """
    Load airports data from parquet file.

    Returns:
        DataFrame containing airports data
    """
    airports_path = os.path.join(ENRICHED_DIR, "airports.parquet")
    try:
        if os.path.exists(airports_path):
            return pd.read_parquet(airports_path)
        else:
            logger.warning(f"Airports data file not found: {airports_path}")
            return pd.DataFrame()
    except Exception as e:
        logger.error(f"Error loading airports data: {e}")
        return pd.DataFrame()


def load_routes_data() -> pd.DataFrame:
    """
    Load routes data from parquet file.

    Returns:
        DataFrame containing routes data
    """
    routes_path = os.path.join(ENRICHED_DIR, "routes.parquet")
    try:
        if os.path.exists(routes_path):
            return pd.read_parquet(routes_path)
        else:
            logger.warning(f"Routes data file not found: {routes_path}")
            return pd.DataFrame()
    except Exception as e:
        logger.error(f"Error loading routes data: {e}")
        return pd.DataFrame()


def load_airlines_data() -> pd.DataFrame:
    """
    Load airlines data from parquet file.

    Returns:
        DataFrame containing airlines data
    """
    airlines_path = os.path.join(ENRICHED_DIR, "airlines.parquet")
    try:
        if os.path.exists(airlines_path):
            return pd.read_parquet(airlines_path)
        else:
            logger.warning(f"Airlines data file not found: {airlines_path}")
            return pd.DataFrame()
    except Exception as e:
        logger.error(f"Error loading airlines data: {e}")
        return pd.DataFrame()


def get_airport_country_map() -> Dict[str, str]:
    """
    Get mapping of airports to country codes.

    Returns:
        Dictionary mapping airport IATA codes to country codes
    """
    try:
        airports_df = load_airports_data()
        if (
            not airports_df.empty
            and "IATA" in airports_df.columns
            and "Country" in airports_df.columns
        ):
            return dict(zip(airports_df["IATA"], airports_df["Country"]))
        else:
            logger.warning("Airport data missing required columns")
            # Return a basic demo map for common airports
            return {
                "JFK": "US",
                "LHR": "GB",
                "CDG": "FR",
                "FRA": "DE",
                "AMS": "NL",
                "MAD": "ES",
                "FCO": "IT",
                "DXB": "AE",
            }
    except Exception as e:
        logger.error(f"Error creating airport-country map: {e}")
        return {}


def get_routes_for_airport(departure_airport: str) -> List[Any]:
    """
    Get all available routes for a given departure airport.

    Args:
        departure_airport: IATA code of departure airport

    Returns:
        List of route dictionaries
    """
    try:
        routes_df = load_routes_data()
        if routes_df.empty:
            logger.warning("Routes data is empty")
            return []

        # Filter routes for the given departure airport
        filtered_routes = routes_df[
            routes_df["Source airport"] == departure_airport
        ]

        if filtered_routes.empty:
            logger.warning(f"No routes found for {departure_airport}")
            return []

        # Convert to list of dictionaries
        route_list = filtered_routes.to_dict(orient="records")
        return route_list

    except Exception as e:
        logger.error(f"Error getting routes for {departure_airport}: {e}")
        return []


def get_complete_route_info(route_id: str) -> Dict[str, Any]:
    """
    Get complete information for a route including airport and airline details.

    Args:
        route_id: Unique identifier for the route

    Returns:
        Dictionary with complete route information
    """
    try:
        # Load all required data
        routes_df = load_routes_data()
        airports_df = load_airports_data()
        airlines_df = load_airlines_data()

        if routes_df.empty or airports_df.empty:
            logger.warning("Required data not available")
            return {}

        # Find the specific route
        route = routes_df[routes_df["Route ID"] == route_id]
        if route.empty:
            logger.warning(f"Route {route_id} not found")
            return {}

        route_dict = route.iloc[0].to_dict()

        # Enrich with source airport information
        src_airport = airports_df[
            airports_df["IATA"] == route_dict["Source airport"]
        ]
        if not src_airport.empty:
            route_dict["Source airport name"] = src_airport.iloc[0]["Name"]
            route_dict["Source city"] = src_airport.iloc[0]["City"]
            route_dict["Source country"] = src_airport.iloc[0]["Country"]

        # Enrich with destination airport information
        dst_airport = airports_df[
            airports_df["IATA"] == route_dict["Destination airport"]
        ]
        if not dst_airport.empty:
            route_dict["Destination airport name"] = dst_airport.iloc[0][
                "Name"
            ]
            route_dict["Destination city"] = dst_airport.iloc[0]["City"]
            route_dict["Destination country"] = dst_airport.iloc[0]["Country"]

        # Enrich with airline information
        if not airlines_df.empty and "Airline" in route_dict:
            airline = airlines_df[airlines_df["IATA"] == route_dict["Airline"]]
            if not airline.empty:
                route_dict["Airline name"] = airline.iloc[0]["Name"]

        return route_dict

    except Exception as e:
        logger.error(f"Error getting complete route info for {route_id}: {e}")
        return {}
