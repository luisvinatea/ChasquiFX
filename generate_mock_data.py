#!/usr/bin/env python3
"""
Generate mock data for ChasquiFX application.
This script creates sample data files for testing the application.
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Define the project directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "backend", "assets", "data")
GEO_DIR = os.path.join(ASSETS_DIR, "geo", "enriched")
FOREX_DIR = os.path.join(ASSETS_DIR, "forex", "parquet")

# Ensure directories exist
os.makedirs(GEO_DIR, exist_ok=True)
os.makedirs(FOREX_DIR, exist_ok=True)

print(f"Generating mock data in {ASSETS_DIR}...")

# Generate mock airports data
airports_data = {
    "iata_code": [
        "JFK",
        "LHR",
        "CDG",
        "SFO",
        "NRT",
        "MEX",
        "SYD",
        "GRU",
        "DXB",
        "PEK",
        "BKK",
        "AMS",
        "MAD",
        "SIN",
        "LAX",
        "MIA",
        "YVR",
        "FCO",
        "MUC",
        "ZRH",
    ],
    "name": [
        "John F. Kennedy International Airport",
        "London Heathrow Airport",
        "Charles de Gaulle Airport",
        "San Francisco International Airport",
        "Narita International Airport",
        "Mexico City International Airport",
        "Sydney Airport",
        "São Paulo–Guarulhos International Airport",
        "Dubai International Airport",
        "Beijing Capital International Airport",
        "Suvarnabhumi Airport",
        "Amsterdam Airport Schiphol",
        "Adolfo Suárez Madrid–Barajas Airport",
        "Singapore Changi Airport",
        "Los Angeles International Airport",
        "Miami International Airport",
        "Vancouver International Airport",
        "Leonardo da Vinci–Fiumicino Airport",
        "Munich Airport",
        "Zurich Airport",
    ],
    "city": [
        "New York",
        "London",
        "Paris",
        "San Francisco",
        "Tokyo",
        "Mexico City",
        "Sydney",
        "São Paulo",
        "Dubai",
        "Beijing",
        "Bangkok",
        "Amsterdam",
        "Madrid",
        "Singapore",
        "Los Angeles",
        "Miami",
        "Vancouver",
        "Rome",
        "Munich",
        "Zurich",
    ],
    "country": [
        "United States",
        "United Kingdom",
        "France",
        "United States",
        "Japan",
        "Mexico",
        "Australia",
        "Brazil",
        "United Arab Emirates",
        "China",
        "Thailand",
        "Netherlands",
        "Spain",
        "Singapore",
        "United States",
        "United States",
        "Canada",
        "Italy",
        "Germany",
        "Switzerland",
    ],
    "latitude": [
        40.641766,
        51.4700,
        49.0097,
        37.6213,
        35.7647,
        19.4363,
        -33.9499,
        -23.4356,
        25.2528,
        40.0799,
        13.6811,
        52.3086,
        40.4983,
        1.3644,
        33.9416,
        25.7932,
        49.1951,
        41.8003,
        48.3538,
        47.4647,
    ],
    "longitude": [
        -73.778925,
        -0.4543,
        2.5479,
        -122.3790,
        140.3864,
        -99.0721,
        151.1819,
        -46.4731,
        55.3644,
        116.6031,
        100.7473,
        4.7639,
        -3.5676,
        103.9915,
        -118.4085,
        -80.2906,
        -123.1785,
        12.2389,
        11.7861,
        8.5554,
    ],
    "currency": [
        "USD",
        "GBP",
        "EUR",
        "USD",
        "JPY",
        "MXN",
        "AUD",
        "BRL",
        "AED",
        "CNY",
        "THB",
        "EUR",
        "EUR",
        "SGD",
        "USD",
        "USD",
        "CAD",
        "EUR",
        "EUR",
        "CHF",
    ],
}

airports_df = pd.DataFrame(airports_data)
airports_df.to_parquet(os.path.join(GEO_DIR, "airports.parquet"))
print(f"Created airports data with {len(airports_df)} entries")

# Generate mock routes data
routes = []
for i, origin in enumerate(airports_data["iata_code"]):
    # Each airport connects to 3-10 random destinations
    num_destinations = np.random.randint(3, 11)
    destinations = np.random.choice(
        [code for j, code in enumerate(airports_data["iata_code"]) if j != i],
        size=num_destinations,
        replace=False,
    )

    for dest in destinations:
        distance = np.random.randint(500, 10000)
        fare = 200 + distance * 0.1 + np.random.randint(-100, 301)
        flights_per_week = np.random.randint(1, 22)

        routes.append(
            {
                "origin": origin,
                "destination": dest,
                "distance": distance,
                "fare": fare,
                "flights_per_week": flights_per_week,
            }
        )

routes_df = pd.DataFrame(routes)
routes_df.to_parquet(os.path.join(GEO_DIR, "routes.parquet"))
print(f"Created routes data with {len(routes_df)} entries")

# Generate mock forex data for various currency pairs
currencies = [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "AUD",
    "CAD",
    "CHF",
    "CNY",
    "MXN",
    "BRL",
    "SGD",
    "AED",
    "THB",
]
base_currency = "USD"

# Start date for historical data (3 months ago)
start_date = datetime.now() - timedelta(days=90)
dates = pd.date_range(start=start_date, periods=90, freq="D")

for currency in currencies:
    if currency == base_currency:
        continue

    # Generate random exchange rates with a trend
    base_rate = np.random.uniform(0.5, 150)
    if currency == "JPY" or currency == "THB":  # Higher values for these currencies
        base_rate = np.random.uniform(80, 150)
    elif currency == "AED" or currency == "MXN":
        base_rate = np.random.uniform(10, 30)

    # Add some randomness and trend
    trend = np.random.uniform(-0.1, 0.1)
    noise = np.random.normal(0, 0.02, size=len(dates))
    rates = [base_rate * (1 + trend * i / 90 + noise[i]) for i in range(len(dates))]

    # Create DataFrame for this currency pair
    forex_data = pd.DataFrame(
        {
            "Date": dates,
            "BaseCurrency": base_currency,
            "QuoteCurrency": currency,
            "ExchangeRate": rates,
        }
    )

    # Save to parquet
    pair_name = f"{base_currency}_{currency}"
    forex_data.to_parquet(os.path.join(FOREX_DIR, f"{pair_name}.parquet"))
    print(f"Created forex data for {pair_name}")

print("Mock data generation complete!")
