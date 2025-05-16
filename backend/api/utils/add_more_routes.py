#!/usr/bin/env python
"""
Utility script to add routes for more airports in the ChasquiFX system.
This will update the existing routes.parquet file with additional routes.
"""

import os
import sys
import pandas as pd
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("add_more_routes")

# Add the parent directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(current_dir, "..", "..", "..")))

from backend.api.config.settings import ENRICHED_DIR  # noqa: E402


def add_more_routes():
    """Add routes for additional airports to the routes.parquet file."""
    routes_path = os.path.join(ENRICHED_DIR, "routes.parquet")

    # Load existing routes if the file exists
    if os.path.exists(routes_path):
        existing_routes = pd.read_parquet(routes_path)
        logger.info(f"Loaded {len(existing_routes)} existing routes")
    else:
        existing_routes = pd.DataFrame()
        logger.info("No existing routes file found, creating new one")

    # Define additional routes to add
    additional_routes = [
        # Routes from NRT (Tokyo)
        {
            "Route ID": "NRT_JFK_001",
            "Source airport": "NRT",
            "Destination airport": "JFK",
            "Airline": "NH",
            "Distance": 10854,
            "Destination city": "New York",
            "Destination country": "US",
        },
        {
            "Route ID": "NRT_LAX_001",
            "Source airport": "NRT",
            "Destination airport": "LAX",
            "Airline": "NH",
            "Distance": 8926,
            "Destination city": "Los Angeles",
            "Destination country": "US",
        },
        {
            "Route ID": "NRT_LHR_001",
            "Source airport": "NRT",
            "Destination airport": "LHR",
            "Airline": "NH",
            "Distance": 9559,
            "Destination city": "London",
            "Destination country": "GB",
        },
        {
            "Route ID": "NRT_CDG_001",
            "Source airport": "NRT",
            "Destination airport": "CDG",
            "Airline": "AF",
            "Distance": 9721,
            "Destination city": "Paris",
            "Destination country": "FR",
        },
        {
            "Route ID": "NRT_SIN_001",
            "Source airport": "NRT",
            "Destination airport": "SIN",
            "Airline": "NH",
            "Distance": 5324,
            "Destination city": "Singapore",
            "Destination country": "SG",
        },
        # Routes from CDG (Paris)
        {
            "Route ID": "CDG_JFK_001",
            "Source airport": "CDG",
            "Destination airport": "JFK",
            "Airline": "AF",
            "Distance": 5831,
            "Destination city": "New York",
            "Destination country": "US",
        },
        {
            "Route ID": "CDG_LHR_001",
            "Source airport": "CDG",
            "Destination airport": "LHR",
            "Airline": "AF",
            "Distance": 346,
            "Destination city": "London",
            "Destination country": "GB",
        },
        {
            "Route ID": "CDG_FRA_001",
            "Source airport": "CDG",
            "Destination airport": "FRA",
            "Airline": "AF",
            "Distance": 461,
            "Destination city": "Frankfurt",
            "Destination country": "DE",
        },
        {
            "Route ID": "CDG_MAD_001",
            "Source airport": "CDG",
            "Destination airport": "MAD",
            "Airline": "AF",
            "Distance": 1054,
            "Destination city": "Madrid",
            "Destination country": "ES",
        },
        {
            "Route ID": "CDG_FCO_001",
            "Source airport": "CDG",
            "Destination airport": "FCO",
            "Airline": "AF",
            "Distance": 1107,
            "Destination city": "Rome",
            "Destination country": "IT",
        },
        # Routes from SFO (San Francisco)
        {
            "Route ID": "SFO_LAX_001",
            "Source airport": "SFO",
            "Destination airport": "LAX",
            "Airline": "UA",
            "Distance": 543,
            "Destination city": "Los Angeles",
            "Destination country": "US",
        },
        {
            "Route ID": "SFO_NRT_001",
            "Source airport": "SFO",
            "Destination airport": "NRT",
            "Airline": "UA",
            "Distance": 8260,
            "Destination city": "Tokyo",
            "Destination country": "JP",
        },
        {
            "Route ID": "SFO_HKG_001",
            "Source airport": "SFO",
            "Destination airport": "HKG",
            "Airline": "UA",
            "Distance": 11135,
            "Destination city": "Hong Kong",
            "Destination country": "HK",
        },
        {
            "Route ID": "SFO_SIN_001",
            "Source airport": "SFO",
            "Destination airport": "SIN",
            "Airline": "UA",
            "Distance": 13573,
            "Destination city": "Singapore",
            "Destination country": "SG",
        },
        {
            "Route ID": "SFO_CDG_001",
            "Source airport": "SFO",
            "Destination airport": "CDG",
            "Airline": "AF",
            "Distance": 8984,
            "Destination city": "Paris",
            "Destination country": "FR",
        },
        # More routes for LHR (London) to complete connections
        {
            "Route ID": "LHR_MAD_001",
            "Source airport": "LHR",
            "Destination airport": "MAD",
            "Airline": "BA",
            "Distance": 1246,
            "Destination city": "Madrid",
            "Destination country": "ES",
        },
        {
            "Route ID": "LHR_FCO_001",
            "Source airport": "LHR",
            "Destination airport": "FCO",
            "Airline": "BA",
            "Distance": 1435,
            "Destination city": "Rome",
            "Destination country": "IT",
        },
        {
            "Route ID": "LHR_AMS_001",
            "Source airport": "LHR",
            "Destination airport": "AMS",
            "Airline": "BA",
            "Distance": 370,
            "Destination city": "Amsterdam",
            "Destination country": "NL",
        },
        {
            "Route ID": "LHR_NRT_001",
            "Source airport": "LHR",
            "Destination airport": "NRT",
            "Airline": "BA",
            "Distance": 9559,
            "Destination city": "Tokyo",
            "Destination country": "JP",
        },
        {
            "Route ID": "LHR_HKG_001",
            "Source airport": "LHR",
            "Destination airport": "HKG",
            "Airline": "BA",
            "Distance": 9648,
            "Destination city": "Hong Kong",
            "Destination country": "HK",
        },
    ]

    # Convert to DataFrame
    new_routes_df = pd.DataFrame(additional_routes)

    # Combine with existing routes
    if existing_routes.empty:
        combined_routes = new_routes_df
    else:
        # Check for duplicates by Route ID
        existing_ids = set(existing_routes["Route ID"])
        new_routes_df = new_routes_df[
            ~new_routes_df["Route ID"].isin(existing_ids)
        ]

        # Combine DataFrames
        combined_routes = pd.concat(
            [existing_routes, new_routes_df], ignore_index=True
        )

    logger.info(f"Added {len(new_routes_df)} new routes")
    logger.info(f"Total routes: {len(combined_routes)}")

    # Save to parquet
    combined_routes.to_parquet(routes_path, index=False)
    logger.info(f"Saved routes to {routes_path}")

    return combined_routes


if __name__ == "__main__":
    add_more_routes()
