"""
Script to generate sample routes data for ChasquiFX.
This creates a routes.parquet file in the enriched directory.
"""

import os
import pandas as pd
import sys
import logging

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
)

from backend.api.config.settings import ENRICHED_DIR  # noqa: E402

# Set up logging
logger = logging.getLogger(__name__)


def main():
    """Generate sample routes data and save to parquet file"""
    # Ensure enriched directory exists
    os.makedirs(ENRICHED_DIR, exist_ok=True)

    # Sample routes data - Major international airports
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
        # Routes from LHR (London)
        {
            "Route ID": "LHR_JFK_001",
            "Source airport": "LHR",
            "Destination airport": "JFK",
            "Airline": "BA",
            "Distance": 5541,
            "Destination city": "New York",
            "Destination country": "US",
        },
        {
            "Route ID": "LHR_CDG_001",
            "Source airport": "LHR",
            "Destination airport": "CDG",
            "Airline": "BA",
            "Distance": 343,
            "Destination city": "Paris",
            "Destination country": "FR",
        },
        {
            "Route ID": "LHR_FRA_001",
            "Source airport": "LHR",
            "Destination airport": "FRA",
            "Airline": "BA",
            "Distance": 654,
            "Destination city": "Frankfurt",
            "Destination country": "DE",
        },
        # Routes from LAX (Los Angeles)
        {
            "Route ID": "LAX_JFK_001",
            "Source airport": "LAX",
            "Destination airport": "JFK",
            "Airline": "AA",
            "Distance": 3983,
            "Destination city": "New York",
            "Destination country": "US",
        },
        {
            "Route ID": "LAX_LHR_001",
            "Source airport": "LAX",
            "Destination airport": "LHR",
            "Airline": "BA",
            "Distance": 8770,
            "Destination city": "London",
            "Destination country": "GB",
        },
        {
            "Route ID": "LAX_NRT_001",
            "Source airport": "LAX",
            "Destination airport": "NRT",
            "Airline": "NH",
            "Distance": 8926,
            "Destination city": "Tokyo",
            "Destination country": "JP",
        },
        # Routes from SFO (San Francisco)
        {
            "Route ID": "SFO_JFK_001",
            "Source airport": "SFO",
            "Destination airport": "JFK",
            "Airline": "UA",
            "Distance": 4139,
            "Destination city": "New York",
            "Destination country": "US",
        },
        {
            "Route ID": "SFO_LHR_001",
            "Source airport": "SFO",
            "Destination airport": "LHR",
            "Airline": "UA",
            "Distance": 8636,
            "Destination city": "London",
            "Destination country": "GB",
        },
        # Routes from DFW (Dallas)
        {
            "Route ID": "DFW_JFK_001",
            "Source airport": "DFW",
            "Destination airport": "JFK",
            "Airline": "AA",
            "Distance": 2099,
            "Destination city": "New York",
            "Destination country": "US",
        },
        {
            "Route ID": "DFW_LHR_001",
            "Source airport": "DFW",
            "Destination airport": "LHR",
            "Airline": "AA",
            "Distance": 7759,
            "Destination city": "London",
            "Destination country": "GB",
        },
        # Additional international routes
        {
            "Route ID": "SIN_HKG_001",
            "Source airport": "SIN",
            "Destination airport": "HKG",
            "Airline": "SQ",
            "Distance": 2572,
            "Destination city": "Hong Kong",
            "Destination country": "HK",
        },
        {
            "Route ID": "SIN_NRT_001",
            "Source airport": "SIN",
            "Destination airport": "NRT",
            "Airline": "SQ",
            "Distance": 5323,
            "Destination city": "Tokyo",
            "Destination country": "JP",
        },
        {
            "Route ID": "SYD_SIN_001",
            "Source airport": "SYD",
            "Destination airport": "SIN",
            "Airline": "QF",
            "Distance": 6288,
            "Destination city": "Singapore",
            "Destination country": "SG",
        },
        {
            "Route ID": "SYD_LAX_001",
            "Source airport": "SYD",
            "Destination airport": "LAX",
            "Airline": "QF",
            "Distance": 12051,
            "Destination city": "Los Angeles",
            "Destination country": "US",
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


if __name__ == "__main__":
    # Set up logging when run directly
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    main()
