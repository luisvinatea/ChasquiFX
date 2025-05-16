#!/usr/bin/env python
"""
Script to generate consolidated forex data for ChasquiFX.
This script combines individual forex parquet files into a single
consolidated file.
"""

import os
import sys
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("forex_data_generator")

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(current_dir, "..", "..", "..")))

# Import settings
from backend.api.config.settings import FOREX_PARQUET_DIR  # noqa: E402


def generate_forex_data():
    """
    Combine individual forex parquet files into one consolidated file.
    Also generates synthetic data for missing pairs.
    """
    # First, check if there are individual forex files
    forex_files = [
        f for f in os.listdir(FOREX_PARQUET_DIR) if f.endswith(".parquet")
    ]

    if not forex_files:
        logger.warning(
            "No forex parquet files found. Creating synthetic data."
        )
        return generate_synthetic_forex_data()

    # Load each forex file and combine them
    logger.info(f"Found {len(forex_files)} forex files. Combining them.")

    combined_data = pd.DataFrame()

    for forex_file in forex_files:
        try:
            file_path = os.path.join(FOREX_PARQUET_DIR, forex_file)
            df = pd.read_parquet(file_path)

            # Extract currency pair from filename
            # (e.g., USD_EUR.parquet -> USDEUR=X)
            pair = forex_file.replace(".parquet", "").replace("_", "") + "=X"

            # Set the pair as the index for this dataframe
            df["Pair"] = pair

            # Append to the combined dataframe
            if combined_data.empty:
                combined_data = df
            else:
                combined_data = pd.concat([combined_data, df])

            logger.info(f"Loaded data for {pair}")
        except Exception as e:
            logger.error(f"Error loading {forex_file}: {e}")

    # Set index for easier lookup
    if not combined_data.empty and "Pair" in combined_data.columns:
        combined_data = combined_data.set_index("Pair")

    # Save the combined data
    output_path = os.path.join(
        FOREX_PARQUET_DIR, "consolidated_forex_data.parquet"
    )
    combined_data.to_parquet(output_path)
    logger.info(f"Saved consolidated forex data to {output_path}")

    return combined_data


def generate_synthetic_forex_data():
    """
    Generate synthetic forex data for demo purposes.
    """
    logger.info("Generating synthetic forex data")

    # Create a date range for the last 90 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    date_range = pd.date_range(start=start_date, end=end_date, freq="D")

    # Define common currency pairs
    pairs = [
        "USDEUR=X",
        "USDGBP=X",
        "USDJPY=X",
        "USDCHF=X",
        "USDCAD=X",
        "USDAUD=X",
        "USDBRL=X",
        "USDMXN=X",
        "USDCNY=X",
        "USDINR=X",
        "USDHKD=X",
        "USDSGD=X",
        "USDZAR=X",
        "USDRUB=X",
        "USDTRY=X",
    ]

    # Starting rates for each pair
    base_rates = {
        "USDEUR=X": 0.85,
        "USDGBP=X": 0.75,
        "USDJPY=X": 110.0,
        "USDCHF=X": 0.92,
        "USDCAD=X": 1.25,
        "USDAUD=X": 1.30,
        "USDBRL=X": 5.20,
        "USDMXN=X": 20.0,
        "USDCNY=X": 6.50,
        "USDINR=X": 73.0,
        "USDHKD=X": 7.80,
        "USDSGD=X": 1.35,
        "USDZAR=X": 14.5,
        "USDRUB=X": 74.0,
        "USDTRY=X": 8.5,
    }

    # Create a dataframe to hold all pairs and their data
    all_data = []

    # Generate synthetic data for each pair
    for pair in pairs:
        base_rate = base_rates.get(pair, 1.0)

        # Create random walk from base rate with small daily changes (±0.5%)
        rates = [base_rate]
        for i in range(1, len(date_range)):
            change = rates[-1] * (
                0.995 + 0.01 * np.random.random()
            )  # -0.5% to +0.5%
            rates.append(change)

        # Create a dataframe for this pair
        pair_data = pd.DataFrame(
            {
                "Date": date_range,
                "Open": rates,
                "High": [r * (1 + 0.005 * np.random.random()) for r in rates],
                "Low": [r * (1 - 0.005 * np.random.random()) for r in rates],
                "Close": [
                    r * (1 + 0.002 * (np.random.random() - 0.5)) for r in rates
                ],
                "Volume": [int(1000000 * np.random.random()) for _ in rates],
                "Pair": [pair] * len(rates),
            }
        )

        all_data.append(pair_data)

    # Combine all pair data
    combined_data = pd.concat(all_data)

    # Create reverse pairs as well (e.g., EURUSD=X)
    reverse_data = []
    for pair in pairs:
        base_curr = pair[0:3]
        quote_curr = pair[3:6]
        reverse_pair = f"{quote_curr}{base_curr}=X"

        # Filter data for the original pair
        original_pair_data = combined_data[
            combined_data["Pair"] == pair
        ].copy()

        # Calculate inverse rates
        original_pair_data["Open"] = 1.0 / original_pair_data["Open"]
        original_pair_data["High"] = (
            1.0 / original_pair_data["Low"]
        )  # High becomes inverse of Low
        original_pair_data["Low"] = (
            1.0 / original_pair_data["High"]
        )  # Low becomes inverse of High
        original_pair_data["Close"] = 1.0 / original_pair_data["Close"]
        original_pair_data["Pair"] = reverse_pair

        reverse_data.append(original_pair_data)

    # Add reverse pairs to the combined data
    final_data = pd.concat([combined_data] + reverse_data)

    # Set index for easier lookup
    final_data = final_data.set_index("Pair")

    # Save the combined data
    output_path = os.path.join(
        FOREX_PARQUET_DIR, "consolidated_forex_data.parquet"
    )
    final_data.to_parquet(output_path)
    logger.info(f"Saved synthetic forex data to {output_path}")

    return final_data


def main():
    """Main function to run the script."""
    try:
        generate_forex_data()
        return True
    except Exception as e:
        logger.error(f"Error generating forex data: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
