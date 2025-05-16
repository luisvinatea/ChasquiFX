#!/usr/bin/env python3
"""
Generates synthetic forex data as a fallback when API data retrieval fails
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("synthetic_forex")

# Add parent directory to path
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
)

try:
    from backend.api.config import DEFAULT_FOREX_DATA_PATH
except ImportError:
    logger.warning("Could not import config, using default path")
    DEFAULT_FOREX_DATA_PATH = os.path.join(
        os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ),
        "backend/assets/data/forex/parquet/forex_data.parquet",
    )


def generate_synthetic_forex_data(days=30, volatility=0.005, trend=0.0002):
    """
    Generate synthetic forex data for testing and fallback purposes

    Args:
        days: Number of days of history to generate
        volatility: Daily volatility as a fraction (e.g., 0.005 = 0.5%)
        trend: Daily trend as a fraction (e.g., 0.0002 = 0.02%)

    Returns:
        DataFrame with synthetic forex data
    """
    # Create date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    date_range = pd.date_range(start=start_date, end=end_date, freq="D")

    # List of major currency pairs to generate
    currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"]

    # Initial exchange rates (approximate real values as of 2025)
    base_rates = {
        "USDEUR": 0.91,
        "USDGBP": 0.78,
        "USDJPY": 110.0,
        "USDCAD": 1.36,
        "USDAUD": 1.50,
        "USDCHF": 0.94,
        "USDCNY": 7.15,
        "EURUSD": 1.10,
        "EURGBP": 0.86,
        "EURJPY": 121.0,
        "EURCAD": 1.50,
        "EURAUD": 1.65,
        "EURCHF": 1.03,
        "EURCNY": 7.85,
        "GBPUSD": 1.28,
        "GBPEUR": 1.16,
        "GBPJPY": 141.0,
        "GBPCAD": 1.74,
        "GBPAUD": 1.92,
        "GBPCHF": 1.20,
        "GBPCNY": 9.15,
    }

    all_data = []

    # Generate data for each currency pair
    for base in currencies:
        for quote in currencies:
            if base == quote:
                continue

            pair = f"{base}{quote}"
            symbol = f"{pair}=X"

            # Get base rate or generate one if not in the predefined list
            if pair in base_rates:
                initial_rate = base_rates[pair]
            else:
                # Generate a reasonable synthetic rate
                initial_rate = np.random.uniform(0.5, 2.0)
                if pair.startswith("JPY") or pair.endswith("JPY"):
                    initial_rate *= 100  # JPY pairs have higher nominal values

            # Generate price series with random walk
            rates = [initial_rate]
            for _ in range(1, len(date_range)):
                # Random component: volatility scaled by sqrt(time)
                random_change = np.random.normal(0, volatility) * initial_rate
                # Trend component
                trend_change = trend * initial_rate
                # New rate
                new_rate = rates[-1] * (1 + random_change + trend_change)
                rates.append(max(0.001, new_rate))  # Ensure rate is positive

            # Create DataFrame for this pair
            pair_data = pd.DataFrame(
                {
                    "Symbol": symbol,
                    "Date": date_range,
                    "Open": rates,
                    "High": [
                        rate * (1 + np.random.uniform(0, volatility))
                        for rate in rates
                    ],
                    "Low": [
                        rate * (1 - np.random.uniform(0, volatility))
                        for rate in rates
                    ],
                    "Close": rates,
                    "Volume": np.random.randint(
                        1000, 10000, size=len(date_range)
                    ),
                }
            )

            all_data.append(pair_data)

    # Combine all pairs into one DataFrame
    synthetic_data = pd.concat(all_data, ignore_index=True)

    # Set index for efficient lookups
    synthetic_data = synthetic_data.set_index(["Symbol", "Date"])

    return synthetic_data


def save_synthetic_data(data, output_path=None, consolidated=True):
    """
    Save synthetic forex data to parquet format

    Args:
        data: DataFrame with synthetic forex data
        output_path: Path to save the data (defaults to config path)
        consolidated: Whether to save as consolidated format
    """
    if output_path is None:
        output_path = DEFAULT_FOREX_DATA_PATH

    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save data
    data.to_parquet(output_path)
    logger.info(f"Saved synthetic forex data to {output_path}")

    # Save consolidated format if requested
    if consolidated:
        consolidated_path = os.path.join(
            os.path.dirname(output_path), "consolidated_forex_data.parquet"
        )
        data.to_parquet(consolidated_path)
        logger.info(
            f"Saved consolidated synthetic forex data to {consolidated_path}"
        )


def main():
    logger.info(
        "Generating synthetic forex data as Yahoo Finance API fallback"
    )

    # Generate data
    synthetic_data = generate_synthetic_forex_data(
        days=90
    )  # 90 days of history
    logger.info(
        (
            "Generated synthetic data for "
            f"{len(synthetic_data.index.get_level_values(0).unique())} "
            "currency pairs"
        )
    )

    # Save data
    save_synthetic_data(synthetic_data)

    logger.info("Synthetic forex data generation complete")


if __name__ == "__main__":
    main()
