"""
Configuration settings for the ChasquiFX application.
Contains path configurations and other settings.
"""

import os

# Define data directories with absolute paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DATA_DIR = os.path.join(BASE_DIR, "backend/assets/data")
FOREX_DIR = os.path.join(DATA_DIR, "forex")
GEO_DIR = os.path.join(DATA_DIR, "geo")
JSON_DIR = os.path.join(GEO_DIR, "json")
PARQUET_DIR = os.path.join(GEO_DIR, "parquet")
ENRICHED_DIR = os.path.join(GEO_DIR, "enriched")
LOGS_DIR = os.path.join(BASE_DIR, "logs")

# Forex specific paths
FOREX_JSON_DIR = os.path.join(FOREX_DIR, "json")
FOREX_PARQUET_DIR = os.path.join(FOREX_DIR, "parquet")

# Default file paths
DEFAULT_FOREX_DATA_PATH = os.path.join(
    FOREX_PARQUET_DIR, "yahoo_finance_forex_data.parquet"
)
DEFAULT_FOREX_MAPPINGS_PATH = os.path.join(
    FOREX_JSON_DIR, "forex_mappings.json"
)
DEFAULT_CURRENCY_CODES_PATH = os.path.join(
    FOREX_JSON_DIR, "currency_codes.json"
)

# API settings
API_TIMEOUT_SECONDS = 20
API_HOST = "0.0.0.0"
API_PORT = 8000

# Ensure directories exist
os.makedirs(ENRICHED_DIR, exist_ok=True)
os.makedirs(FOREX_JSON_DIR, exist_ok=True)
os.makedirs(FOREX_PARQUET_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
