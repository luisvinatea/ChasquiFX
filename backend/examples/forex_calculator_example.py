"""
Example script showing how to use the forex_calculator module
to get exchange rates and trends between currencies.
"""

import os
import sys
from typing import Dict
import pandas as pd

# Add parent directory to path to enable imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import from our modules
from api.forex_calculator import (
    calculate_cross_rate,
    get_exchange_rate_with_trend,
    load_forex_data,
)
from api.data_ingestor import get_forex_data, update_forex_data

# Define data directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "assets/data")
FOREX_DIR = os.path.join(DATA_DIR, "forex")
JSON_DIR = os.path.join(FOREX_DIR, "json")

# Default file paths
CURRENCY_CODES_FILE = os.path.join(JSON_DIR, "currency_codes.json")


def get_country_currency_map() -> Dict[str, str]:
    """Get mapping of countries to currencies."""
    try:
        currency_path = CURRENCY_CODES_FILE
        with open(currency_path, "r") as f:
            currency_data = pd.read_json(f, orient="index")
            # Create a dictionary mapping countries to currency codes
            return dict(zip(currency_data.index, currency_data.iloc[:, 0]))
    except Exception as e:
        print(f"Error loading currency map: {e}")
        # Return empty dict if file doesn't exist or has issues
        return {}


def main():
    """Main function to demonstrate the forex calculator."""
    print("ChasquiForex Currency Calculator Example")
    print("=======================================")

    # Update forex data
    print("Updating forex data...")
    try:
        update_forex_data(days=30)
        print("Forex data updated successfully")
    except Exception as e:
        print(f"Error updating forex data: {e}")
        print("Continuing with existing data...")

    # Test with some common currencies
    test_currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"]

    # Load forex data once to reuse
    df = load_forex_data()

    print("\nDirect Exchange Rates:")
    print("====================")
    print(f"{'Base':<5} {'Quote':<5} {'Rate':<10} {'Trend %':<10} {'Method'}")
    print("-" * 45)

    for base in test_currencies:
        for quote in test_currencies:
            if base == quote:
                continue

            # Use our forex calculator to get rate and trend
            rate, is_direct = calculate_cross_rate(base, quote, df)
            trend = 0.0

            if rate > 0:
                # Get the full rate with trend
                full_rate, trend = get_exchange_rate_with_trend(
                    base,
                    quote,
                    df=df,  # type: ignore
                )
                method = "Direct" if is_direct else "Via USD"
                print(
                    f"{base:<5} {quote:<5} {full_rate:<10.4f} {trend:<10.2f} {method}"
                )

    print("\nCalculating a few cross rates without going through USD...")
    # Try some unusual pairs that might not be directly available
    unusual_pairs = [
        ("MXN", "BRL"),  # Mexican Peso to Brazilian Real
        ("SEK", "NOK"),  # Swedish Krona to Norwegian Krone
        ("NZD", "SGD"),  # New Zealand Dollar to Singapore Dollar
    ]

    for base, quote in unusual_pairs:
        # First try to get direct rate
        symbol = f"{base}{quote}=X"
        get_forex_data(symbols=[symbol])

        # Now calculate using our optimized method
        rate, trend = get_exchange_rate_with_trend(base, quote)
        method = "Could not be calculated" if rate == 0 else "Calculated"
        print(f"{base}/{quote}: {rate:.4f} (Trend: {trend:.2f}%) - {method}")

    print("\nDone!")


if __name__ == "__main__":
    main()
