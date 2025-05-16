"""
Script to generate sample airlines data for ChasquiFX.
This creates an airlines.parquet file in the enriched directory.
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
    {"IATA": "LX", "Name": "Swiss International Air Lines", "Country": "CH"},
    {"IATA": "EK", "Name": "Emirates", "Country": "AE"},
    {"IATA": "QF", "Name": "Qantas", "Country": "AU"},
    {"IATA": "SQ", "Name": "Singapore Airlines", "Country": "SG"},
    {"IATA": "CX", "Name": "Cathay Pacific", "Country": "HK"},
    {"IATA": "NH", "Name": "All Nippon Airways", "Country": "JP"},
    {"IATA": "JL", "Name": "Japan Airlines", "Country": "JP"},
    {"IATA": "AC", "Name": "Air Canada", "Country": "CA"},
    {"IATA": "TK", "Name": "Turkish Airlines", "Country": "TR"},
    {"IATA": "EY", "Name": "Etihad Airways", "Country": "AE"},
    {"IATA": "QR", "Name": "Qatar Airways", "Country": "QA"},
]

# Create DataFrame
airlines_df = pd.DataFrame(airlines_data)

# Save as parquet
airlines_path = os.path.join(ENRICHED_DIR, "airlines.parquet")
airlines_df.to_parquet(airlines_path, index=False)

print(f"Sample airlines data saved to {airlines_path}")
print(f"Generated {len(airlines_data)} sample airlines")
