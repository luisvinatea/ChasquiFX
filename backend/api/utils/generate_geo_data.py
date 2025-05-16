#!/usr/bin/env python
"""
Utility script to generate all required sample geographic data for ChasquiFX.
This script will create routes.parquet, airports.parquet, and airlines.parquet
in the enriched directory.
"""

import os
import sys
import logging
import pandas as pd

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("chasquifx_data_generator")

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(current_dir, "..", "..", "..")))

# Import settings
from backend.api.config.settings import ENRICHED_DIR  # noqa: E402


def create_routes():
    """Generate sample routes data and save to parquet file."""
    # Ensure enriched directory exists
    os.makedirs(ENRICHED_DIR, exist_ok=True)

    # Sample routes data - Major international airports with JFK connections
    # This is a simplified dataset for demonstration purposes
    routes_data = [
        # Routes from JFK (New York)
        {
            "Route ID": "JFK_LHR_001",
            "Source airport": "JFK",
            "Destination airport": "LHR",
            "Airline": "BA",
            "Distance": 5541,
            "Destination city": "London",
            "Destination country": "GB",
        },
        {
            "Route ID": "JFK_CDG_001",
            "Source airport": "JFK",
            "Destination airport": "CDG",
            "Airline": "AF",
            "Distance": 5831,
            "Destination city": "Paris",
            "Destination country": "FR",
        },
        {
            "Route ID": "JFK_FRA_001",
            "Source airport": "JFK",
            "Destination airport": "FRA",
            "Airline": "LH",
            "Distance": 6173,
            "Destination city": "Frankfurt",
            "Destination country": "DE",
        },
        {
            "Route ID": "JFK_MAD_001",
            "Source airport": "JFK",
            "Destination airport": "MAD",
            "Airline": "IB",
            "Distance": 5786,
            "Destination city": "Madrid",
            "Destination country": "ES",
        },
        {
            "Route ID": "JFK_FCO_001",
            "Source airport": "JFK",
            "Destination airport": "FCO",
            "Airline": "AZ",
            "Distance": 6912,
            "Destination city": "Rome",
            "Destination country": "IT",
        },
        {
            "Route ID": "JFK_AMS_001",
            "Source airport": "JFK",
            "Destination airport": "AMS",
            "Airline": "KL",
            "Distance": 5838,
            "Destination city": "Amsterdam",
            "Destination country": "NL",
        },
        {
            "Route ID": "JFK_ZRH_001",
            "Source airport": "JFK",
            "Destination airport": "ZRH",
            "Airline": "LX",
            "Distance": 6323,
            "Destination city": "Zurich",
            "Destination country": "CH",
        },
        {
            "Route ID": "JFK_DXB_001",
            "Source airport": "JFK",
            "Destination airport": "DXB",
            "Airline": "EK",
            "Distance": 10944,
            "Destination city": "Dubai",
            "Destination country": "AE",
        },
        {
            "Route ID": "JFK_HKG_001",
            "Source airport": "JFK",
            "Destination airport": "HKG",
            "Airline": "CX",
            "Distance": 12980,
            "Destination city": "Hong Kong",
            "Destination country": "HK",
        },
        {
            "Route ID": "JFK_NRT_001",
            "Source airport": "JFK",
            "Destination airport": "NRT",
            "Airline": "NH",
            "Distance": 10854,
            "Destination city": "Tokyo",
            "Destination country": "JP",
        },
    ]

    # Create DataFrame
    routes_df = pd.DataFrame(routes_data)

    # Save as parquet
    routes_path = os.path.join(ENRICHED_DIR, "routes.parquet")
    routes_df.to_parquet(routes_path, index=False)

    logger.info(f"Sample routes data saved to {routes_path}")
    logger.info(f"Generated {len(routes_data)} sample routes")
    return routes_df


def create_airlines():
    """Generate sample airlines data and save to parquet file."""
    # Ensure enriched directory exists
    os.makedirs(ENRICHED_DIR, exist_ok=True)

    # Sample airlines data
    airlines_data = [
        {"IATA": "AA", "Name": "American Airlines", "Country": "US"},
        {"IATA": "UA", "Name": "United Airlines", "Country": "US"},
        {"IATA": "DL", "Name": "Delta Air Lines", "Country": "US"},
        {"IATA": "BA", "Name": "British Airways", "Country": "GB"},
        {"IATA": "LH", "Name": "Lufthansa", "Country": "DE"},
        {"IATA": "AF", "Name": "Air France", "Country": "FR"},
        {"IATA": "KL", "Name": "KLM Royal Dutch Airlines", "Country": "NL"},
        {"IATA": "IB", "Name": "Iberia", "Country": "ES"},
        {"IATA": "AZ", "Name": "Alitalia", "Country": "IT"},
        {
            "IATA": "LX",
            "Name": "Swiss International Air Lines",
            "Country": "CH",
        },
        {"IATA": "EK", "Name": "Emirates", "Country": "AE"},
        {"IATA": "CX", "Name": "Cathay Pacific", "Country": "HK"},
        {"IATA": "NH", "Name": "All Nippon Airways", "Country": "JP"},
        {"IATA": "SQ", "Name": "Singapore Airlines", "Country": "SG"},
    ]

    # Create DataFrame
    airlines_df = pd.DataFrame(airlines_data)

    # Save as parquet
    airlines_path = os.path.join(ENRICHED_DIR, "airlines.parquet")
    airlines_df.to_parquet(airlines_path, index=False)

    logger.info(f"Sample airlines data saved to {airlines_path}")
    logger.info(f"Generated {len(airlines_data)} sample airlines")
    return airlines_df


def create_airports():
    """Generate sample airports data and save to parquet file."""
    # Ensure enriched directory exists
    os.makedirs(ENRICHED_DIR, exist_ok=True)

    # Sample airports data - Major international airports
    airports_data = [
        {
            "IATA": "JFK",
            "Name": "John F. Kennedy International Airport",
            "City": "New York",
            "Country": "US",
            "Latitude": 40.6413,
            "Longitude": -73.7781,
        },
        {
            "IATA": "LHR",
            "Name": "London Heathrow Airport",
            "City": "London",
            "Country": "GB",
            "Latitude": 51.4700,
            "Longitude": -0.4543,
        },
        {
            "IATA": "CDG",
            "Name": "Paris Charles de Gaulle Airport",
            "City": "Paris",
            "Country": "FR",
            "Latitude": 49.0097,
            "Longitude": 2.5479,
        },
        {
            "IATA": "FRA",
            "Name": "Frankfurt Airport",
            "City": "Frankfurt",
            "Country": "DE",
            "Latitude": 50.0379,
            "Longitude": 8.5622,
        },
        {
            "IATA": "MAD",
            "Name": "Adolfo Suárez Madrid–Barajas Airport",
            "City": "Madrid",
            "Country": "ES",
            "Latitude": 40.4983,
            "Longitude": -3.5676,
        },
        {
            "IATA": "FCO",
            "Name": "Leonardo da Vinci International Airport",
            "City": "Rome",
            "Country": "IT",
            "Latitude": 41.8003,
            "Longitude": 12.2389,
        },
        {
            "IATA": "AMS",
            "Name": "Amsterdam Airport Schiphol",
            "City": "Amsterdam",
            "Country": "NL",
            "Latitude": 52.3105,
            "Longitude": 4.7683,
        },
        {
            "IATA": "ZRH",
            "Name": "Zurich Airport",
            "City": "Zurich",
            "Country": "CH",
            "Latitude": 47.4582,
            "Longitude": 8.5555,
        },
        {
            "IATA": "DXB",
            "Name": "Dubai International Airport",
            "City": "Dubai",
            "Country": "AE",
            "Latitude": 25.2532,
            "Longitude": 55.3657,
        },
        {
            "IATA": "HKG",
            "Name": "Hong Kong International Airport",
            "City": "Hong Kong",
            "Country": "HK",
            "Latitude": 22.3080,
            "Longitude": 113.9185,
        },
        {
            "IATA": "NRT",
            "Name": "Narita International Airport",
            "City": "Tokyo",
            "Country": "JP",
            "Latitude": 35.7719,
            "Longitude": 140.3929,
        },
    ]

    # Create DataFrame
    airports_df = pd.DataFrame(airports_data)

    # Save as parquet
    airports_path = os.path.join(ENRICHED_DIR, "airports.parquet")
    airports_df.to_parquet(airports_path, index=False)

    logger.info(f"Sample airports data saved to {airports_path}")
    logger.info(f"Generated {len(airports_data)} sample airports")
    return airports_df


def main():
    """Generate all sample geographic data."""
    logger.info("Starting to generate sample geographic data")

    try:
        # Generate airports data
        logger.info("Generating airports data")
        create_airports()

        # Generate airlines data
        logger.info("Generating airlines data")
        create_airlines()

        # Generate routes data
        logger.info("Generating routes data")
        create_routes()

        logger.info("Successfully generated all sample geographic data")
        return True
    except Exception as e:
        logger.error(f"Error generating sample data: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
