"""
Script to generate sample airports data for ChasquiFX.
This creates an airports.parquet file in the enriched directory.
"""

import os
import pandas as pd
import sys

sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
)

from backend.api.config.settings import ENRICHED_DIR  # noqa: E402

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
        "IATA": "LGA",
        "Name": "LaGuardia Airport",
        "City": "New York",
        "Country": "US",
        "Latitude": 40.7769,
        "Longitude": -73.8740,
    },
    {
        "IATA": "EWR",
        "Name": "Newark Liberty International Airport",
        "City": "Newark",
        "Country": "US",
        "Latitude": 40.6895,
        "Longitude": -74.1745,
    },
    {
        "IATA": "LAX",
        "Name": "Los Angeles International Airport",
        "City": "Los Angeles",
        "Country": "US",
        "Latitude": 33.9416,
        "Longitude": -118.4085,
    },
    {
        "IATA": "SFO",
        "Name": "San Francisco International Airport",
        "City": "San Francisco",
        "Country": "US",
        "Latitude": 37.6213,
        "Longitude": -122.3790,
    },
    {
        "IATA": "ORD",
        "Name": "O'Hare International Airport",
        "City": "Chicago",
        "Country": "US",
        "Latitude": 41.9742,
        "Longitude": -87.9073,
    },
    {
        "IATA": "DFW",
        "Name": "Dallas/Fort Worth International Airport",
        "City": "Dallas",
        "Country": "US",
        "Latitude": 32.8998,
        "Longitude": -97.0403,
    },
    {
        "IATA": "MIA",
        "Name": "Miami International Airport",
        "City": "Miami",
        "Country": "US",
        "Latitude": 25.7932,
        "Longitude": -80.2906,
    },
    {
        "IATA": "ATL",
        "Name": "Hartsfield-Jackson Atlanta International Airport",
        "City": "Atlanta",
        "Country": "US",
        "Latitude": 33.6407,
        "Longitude": -84.4277,
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
        "IATA": "LGW",
        "Name": "London Gatwick Airport",
        "City": "London",
        "Country": "GB",
        "Latitude": 51.1537,
        "Longitude": -0.1821,
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
        "IATA": "AMS",
        "Name": "Amsterdam Airport Schiphol",
        "City": "Amsterdam",
        "Country": "NL",
        "Latitude": 52.3105,
        "Longitude": 4.7683,
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
        "IATA": "ZRH",
        "Name": "Zurich Airport",
        "City": "Zurich",
        "Country": "CH",
        "Latitude": 47.4582,
        "Longitude": 8.5555,
    },
    {
        "IATA": "IST",
        "Name": "Istanbul Airport",
        "City": "Istanbul",
        "Country": "TR",
        "Latitude": 41.2766,
        "Longitude": 28.7258,
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
        "IATA": "SIN",
        "Name": "Singapore Changi Airport",
        "City": "Singapore",
        "Country": "SG",
        "Latitude": 1.3644,
        "Longitude": 103.9915,
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
        "IATA": "PVG",
        "Name": "Shanghai Pudong International Airport",
        "City": "Shanghai",
        "Country": "CN",
        "Latitude": 31.1443,
        "Longitude": 121.8083,
    },
    {
        "IATA": "PEK",
        "Name": "Beijing Capital International Airport",
        "City": "Beijing",
        "Country": "CN",
        "Latitude": 40.0799,
        "Longitude": 116.6031,
    },
    {
        "IATA": "NRT",
        "Name": "Narita International Airport",
        "City": "Tokyo",
        "Country": "JP",
        "Latitude": 35.7719,
        "Longitude": 140.3929,
    },
    {
        "IATA": "HND",
        "Name": "Tokyo Haneda Airport",
        "City": "Tokyo",
        "Country": "JP",
        "Latitude": 35.5494,
        "Longitude": 139.7798,
    },
    {
        "IATA": "SYD",
        "Name": "Sydney Airport",
        "City": "Sydney",
        "Country": "AU",
        "Latitude": -33.9399,
        "Longitude": 151.1753,
    },
    {
        "IATA": "MEL",
        "Name": "Melbourne Airport",
        "City": "Melbourne",
        "Country": "AU",
        "Latitude": -37.6690,
        "Longitude": 144.8410,
    },
    {
        "IATA": "GRU",
        "Name": "São Paulo/Guarulhos International Airport",
        "City": "São Paulo",
        "Country": "BR",
        "Latitude": -23.4356,
        "Longitude": -46.4731,
    },
    {
        "IATA": "EZE",
        "Name": "Ministro Pistarini International Airport",
        "City": "Buenos Aires",
        "Country": "AR",
        "Latitude": -34.8222,
        "Longitude": -58.5358,
    },
    {
        "IATA": "YYZ",
        "Name": "Toronto Pearson International Airport",
        "City": "Toronto",
        "Country": "CA",
        "Latitude": 43.6777,
        "Longitude": -79.6248,
    },
]

# Create DataFrame
airports_df = pd.DataFrame(airports_data)

# Save as parquet
airports_path = os.path.join(ENRICHED_DIR, "airports.parquet")
airports_df.to_parquet(airports_path, index=False)

print(f"Sample airports data saved to {airports_path}")
print(f"Generated {len(airports_data)} sample airports")
