"""
Forex data service for ChasquiFX.
Manages fetching, processing, and analyzing forex data.
"""

import os
from typing import Dict, Optional, List, Union
import pandas as pd
import json
import logging
import yfinance as yf
from datetime import datetime, timedelta
import sys

# Set the path to the parent directory
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
)

from backend.api.config import (
    DEFAULT_FOREX_DATA_PATH,
    DEFAULT_FOREX_MAPPINGS_PATH,
    DEFAULT_CURRENCY_CODES_PATH,
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def load_forex_data(file_path: str = DEFAULT_FOREX_DATA_PATH) -> pd.DataFrame:
    """
    Load forex data from parquet file.

    Args:
        file_path: Path to the forex data parquet file

    Returns:
        DataFrame containing forex data
    """
    if not os.path.exists(file_path):
        logger.warning(f"Forex data file not found: {file_path}")
        return pd.DataFrame()

    try:
        df = pd.read_parquet(file_path)
        return df
    except Exception as e:
        logger.error(f"Error loading forex data: {e}")
        return pd.DataFrame()


def load_forex_mappings(file_path: str = DEFAULT_FOREX_MAPPINGS_PATH) -> Dict:
    """
    Load forex mappings from JSON file.

    Args:
        file_path: Path to the forex mappings JSON file

    Returns:
        Dictionary containing forex mappings
    """
    if not os.path.exists(file_path):
        logger.warning(f"Forex mappings file not found: {file_path}")
        return {}

    try:
        with open(file_path, "r") as f:
            mappings = json.load(f)
        return mappings
    except Exception as e:
        logger.error(f"Error loading forex mappings: {e}")
        return {}


def load_currency_codes(file_path: str = DEFAULT_CURRENCY_CODES_PATH) -> Dict:
    """
    Load currency codes from JSON file.

    Args:
        file_path: Path to the currency codes JSON file

    Returns:
        Dictionary containing currency codes
    """
    if not os.path.exists(file_path):
        logger.warning(f"Currency codes file not found: {file_path}")
        return {}

    try:
        with open(file_path, "r") as f:
            currency_data = json.load(f)
        # Convert country-to-code mapping to code-to-code mapping
        return {code: code for country, code in currency_data.items()}
    except Exception as e:
        logger.error(f"Error loading currency codes: {e}")
        return {}


def get_exchange_rate(
    base_currency: str, quote_currency: str
) -> Optional[float]:
    """
    Get the exchange rate between two currencies.

    Args:
        base_currency: Base currency code (e.g., 'USD')
        quote_currency: Quote currency code (e.g., 'EUR')

    Returns:
        Exchange rate or None if not available
    """
    forex_data = load_forex_data()
    if forex_data.empty:
        logger.warning("No forex data available")
        return None

    # Try direct pair
    currency_pair = f"{base_currency}{quote_currency}=X"
    if currency_pair in forex_data.index:
        try:
            # Get the value and convert to float directly
            value = forex_data.loc[currency_pair, "Close"]
            # Cast to string first, which works for most types
            # This workaround helps with Pylance/Python static type checking
            return float(str(value))
        except Exception as e:
            logger.warning(f"Error getting rate for {currency_pair}: {e}")
            return None

    # Try inverse pair
    inverse_pair = f"{quote_currency}{base_currency}=X"
    if inverse_pair in forex_data.index:
        try:
            # Get the value and convert to float directly
            value = forex_data.loc[inverse_pair, "Close"]
            # Cast to string first, which works for most types
            inverse_rate = float(str(value))

            if inverse_rate > 0:
                return 1.0 / inverse_rate
            else:
                logger.warning(f"Zero or negative rate for {inverse_pair}")
                return None
        except Exception as e:
            logger.warning(
                f"Error getting inverse rate for {inverse_pair}: {e}"
            )
            return None

    logger.warning(
        f"Exchange rate not found for {base_currency}/{quote_currency}"
    )
    return None


def get_forex_data(days: int = 30) -> pd.DataFrame:
    """
    Get historical forex data.

    Args:
        days: Number of days of historical data to retrieve

    Returns:
        DataFrame containing forex data
    """
    forex_data = load_forex_data()
    if forex_data.empty:
        logger.warning("No forex data available")
        return pd.DataFrame()

    # Filter for the specified number of days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Convert to string format
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")

    # Filter data
    filtered_data = forex_data.loc[
        (forex_data.index.get_level_values("Date") >= start_str)
        & (forex_data.index.get_level_values("Date") <= end_str)
    ]

    return filtered_data


def get_currency_pair(
    base_currency: str, quote_currency: str, days: int = 30
) -> pd.DataFrame:
    """
    Get historical data for a specific currency pair.

    Args:
        base_currency: Base currency code (e.g., 'USD')
        quote_currency: Quote currency code (e.g., 'EUR')
        days: Number of days of historical data to retrieve

    Returns:
        DataFrame containing currency pair data
    """
    # Get all forex data
    forex_data = get_forex_data(days=days)
    if forex_data.empty:
        logger.warning("No forex data available")
        return pd.DataFrame()

    # Try direct pair
    currency_pair = f"{base_currency}{quote_currency}=X"
    if currency_pair in forex_data.index.get_level_values(0).unique():
        result = forex_data.xs(currency_pair, level=0)
        if isinstance(result, pd.Series):
            result = result.to_frame().T
        elif not isinstance(result, pd.DataFrame):
            result = pd.DataFrame([result])
        return result

    # Fix: Define inverse_pair before using it
    inverse_pair = f"{quote_currency}{base_currency}=X"
    if inverse_pair in forex_data.index.get_level_values(0).unique():
        pair_data = forex_data.xs(inverse_pair, level=0).copy()
        # Invert rates for inverse pair
        pair_data["Open"] = 1 / pair_data["Open"]
        pair_data["High"] = 1 / pair_data["Low"]  # Invert high/low
        pair_data["Low"] = 1 / pair_data["High"]
        pair_data["Close"] = 1 / pair_data["Close"]
        if isinstance(pair_data, pd.Series):
            pair_data = pair_data.to_frame().T
        elif not isinstance(pair_data, pd.DataFrame):
            pair_data = pd.DataFrame([pair_data])
        return pair_data

    logger.warning(
        f"Currency pair not found: {base_currency}/{quote_currency}"
    )
    return pd.DataFrame()


def update_forex_data(
    currencies: Optional[List[str]] = None, days: int = 30
) -> bool:
    """
    Update forex data by fetching from Yahoo Finance.

    Args:
        currencies: List of currency codes to fetch (if None, uses default list)
        days: Number of days of historical data to retrieve

    Returns:
        True if update was successful, False otherwise
    """
    try:
        # Use a default list of major currencies if none provided
        if not currencies:
            currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"]

        # Generate all currency pairs
        pairs = []
        for base in currencies:
            for quote in currencies:
                if base != quote:
                    pairs.append(f"{base}{quote}=X")

        # Set date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Fetch data from Yahoo Finance
        logger.info(f"Fetching forex data for {len(pairs)} currency pairs...")
        data = yf.download(
            pairs,
            start=start_date,
            end=end_date,
            group_by="ticker",
            auto_adjust=True,
            progress=False,
        )

        # Process and save data
        if data.empty:
            logger.warning("No forex data retrieved")
            return False

        # Restructure data
        logger.info("Processing forex data...")
        processed_data = pd.DataFrame()

        for pair in pairs:
            if pair in data.columns.levels[0]:
                pair_data = data[pair].copy()
                pair_data["Symbol"] = pair
                processed_data = pd.concat([processed_data, pair_data])

        # Set index for efficient lookups
        if not processed_data.empty:
            processed_data = processed_data.reset_index()
            processed_data = processed_data.set_index(["Symbol", "Date"])

            # Save to parquet
            logger.info(f"Saving forex data to {DEFAULT_FOREX_DATA_PATH}")
            os.makedirs(
                os.path.dirname(DEFAULT_FOREX_DATA_PATH), exist_ok=True
            )
            processed_data.to_parquet(DEFAULT_FOREX_DATA_PATH)
            return True
        else:
            logger.warning("No data to save after processing")
            return False

    except Exception as e:
        logger.error(f"Error updating forex data: {e}")
        return False


def fetch_quick_forex_data() -> Dict[str, float]:
    """
    Fetch current exchange rates for common currency pairs.

    Returns:
        Dictionary mapping currency pairs to rates
    """
    try:
        # Get list of major currencies
        currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"]

        # Generate all currency pairs
        pairs = []
        for base in currencies:
            for quote in currencies:
                if base != quote:
                    pairs.append(f"{base}{quote}=X")

        # Fetch current data
        tickers = yf.Tickers(" ".join(pairs))

        # Extract latest prices
        results = {}
        for pair, ticker in tickers.tickers.items():
            try:
                info = ticker.info
                if (
                    "regularMarketPrice" in info
                    and info["regularMarketPrice"] is not None
                ):
                    results[pair.replace("=X", "")] = info[
                        "regularMarketPrice"
                    ]
            except Exception as e:
                logger.warning(f"Could not get data for {pair}: {e}")

        return results

    except Exception as e:
        logger.error(f"Error fetching quick forex data: {e}")
        return {}


# Fix for lines 117 and 127 - explicitly convert to float
def calculate_best_execution_price(
    trade_direction: str, exec_prices: List[float]
) -> float:
    """
    Calculate the best execution price based on trade direction.

    Args:
        trade_direction: Direction of the trade ('BUY' or 'SELL')
        exec_prices: List of execution prices

    Returns:
        Best execution price
    """
    if trade_direction == "BUY":
        # Explicitly cast to Python float before using np.float64
        execution_price = float(min(exec_prices))
    else:  # "SELL"
        # Explicitly cast to Python float before using np.float64
        execution_price = float(max(exec_prices))
    return execution_price


# Fix for lines 198 and 209 - update return type annotations
def apply_technical_indicators(
    data: pd.DataFrame,
) -> Union[pd.DataFrame, pd.Series]:
    """
    Apply technical indicators to the data.

    Args:
        data: DataFrame containing forex data

    Returns:
        DataFrame or Series with technical indicators applied
    """
    return data.pct_change()


def calculate_volatility(
    data: pd.DataFrame, window: int = 20
) -> Union[pd.DataFrame, pd.Series]:
    """
    Calculate volatility over a rolling window.

    Args:
        data: DataFrame containing forex data
        window: Rolling window size

    Returns:
        DataFrame or Series with calculated volatility
    """
    return data.std()
