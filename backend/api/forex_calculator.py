"""
forex_calculator.py
Utility module for calculating cross rates between currency pairs
by using USD as an intermediate currency.
"""

import os
import pandas as pd
from typing import Tuple, Optional, List, Dict
import json
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Define constants from data_ingestor
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "assets/data")
FOREX_DIR = os.path.join(DATA_DIR, "forex")
JSON_DIR = os.path.join(FOREX_DIR, "json")
PARQUET_DIR = os.path.join(FOREX_DIR, "parquet")

# Default file paths
FOREX_DATA_FILE = os.path.join(PARQUET_DIR, "yahoo_finance_forex_data.parquet")
FOREX_MAPPINGS_FILE = os.path.join(JSON_DIR, "forex_mappings.json")
CROSS_RATES_CACHE_FILE = os.path.join(JSON_DIR, "cross_rates_cache.json")


def load_forex_data(file_path: str = FOREX_DATA_FILE) -> pd.DataFrame:
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


def get_latest_rate(df: pd.DataFrame, symbol: str) -> float:
    """
    Get latest exchange rate for a symbol from the dataframe.

    Args:
        df: DataFrame containing forex data
        symbol: Forex symbol (e.g., 'EURUSD=X')

    Returns:
        Latest exchange rate or 0.0 if not found
    """
    if df.empty:
        return 0.0

    try:
        # Check if df.columns is MultiIndex
        if isinstance(df.columns, pd.MultiIndex):
            if symbol in df.columns.get_level_values(0):
                # Get 'Close' price for the symbol
                symbol_data = df.xs(symbol, axis=1, level=0)
                if "Close" in symbol_data.columns:
                    return symbol_data["Close"].iloc[-1]
                elif "Adj Close" in symbol_data.columns:
                    return symbol_data["Adj Close"].iloc[-1]

        # Handle flattened column names (symbol_Close)
        flat_close_col = f"{symbol}_Close"
        flat_adj_close_col = f"{symbol}_Adj Close"

        if flat_close_col in df.columns:
            return df[flat_close_col].iloc[-1]
        elif flat_adj_close_col in df.columns:
            return df[flat_adj_close_col].iloc[-1]

        return 0.0
    except (KeyError, IndexError) as e:
        logger.error(f"Error getting rate for {symbol}: {e}")
        return 0.0


def calculate_cross_rate(
    base_currency: str,
    quote_currency: str,
    df: Optional[pd.DataFrame] = None,
    use_cache: bool = True,
) -> Tuple[float, bool]:
    """
    Calculate exchange rate between two currencies using USD as intermediate.

    Args:
        base_currency: Base currency code (e.g., 'EUR')
        quote_currency: Quote currency code (e.g., 'JPY')
        df: DataFrame containing forex data (will be loaded if None)
        use_cache: Whether to use cached rates

    Returns:
        Tuple of (exchange_rate, is_direct)
        where is_direct indicates if the rate was directly available
    """
    # If same currency, rate is 1.0
    if base_currency == quote_currency:
        return 1.0, True

    # Check if we can load from cache
    if use_cache:
        rate = get_cached_rate(base_currency, quote_currency)
        if rate > 0:
            return rate, False

    # Load forex data if not provided
    if df is None:
        df = load_forex_data()

    if df.empty:
        logger.warning("Empty forex dataframe, cannot calculate rates")
        return 0.0, False

    # Try direct rate first
    direct_symbol = f"{base_currency}{quote_currency}=X"
    direct_rate = get_latest_rate(df, direct_symbol)

    if direct_rate > 0:
        # Cache the rate
        cache_rate(base_currency, quote_currency, direct_rate)
        return direct_rate, True

    # Try reverse rate
    reverse_symbol = f"{quote_currency}{base_currency}=X"
    reverse_rate = get_latest_rate(df, reverse_symbol)

    if reverse_rate > 0:
        calculated_rate = 1 / reverse_rate
        # Cache the rate
        cache_rate(base_currency, quote_currency, calculated_rate)
        return calculated_rate, True

    # If neither direct nor reverse rate is available, try via USD
    base_usd_symbol = f"{base_currency}USD=X"
    base_usd_rate = get_latest_rate(df, base_usd_symbol)

    # If base/USD not available, try USD/base
    if base_usd_rate == 0:
        usd_base_symbol = f"USD{base_currency}=X"
        usd_base_rate = get_latest_rate(df, usd_base_symbol)
        if usd_base_rate > 0:
            base_usd_rate = 1 / usd_base_rate
        else:
            logger.warning(f"No rate available for {base_currency}/USD")
            return 0.0, False

    quote_usd_symbol = f"{quote_currency}USD=X"
    quote_usd_rate = get_latest_rate(df, quote_usd_symbol)

    # If quote/USD not available, try USD/quote
    if quote_usd_rate == 0:
        usd_quote_symbol = f"USD{quote_currency}=X"
        usd_quote_rate = get_latest_rate(df, usd_quote_symbol)
        if usd_quote_rate > 0:
            quote_usd_rate = 1 / usd_quote_rate
        else:
            logger.warning(f"No rate available for {quote_currency}/USD")
            return 0.0, False

    # Calculate cross rate through USD
    if base_usd_rate > 0 and quote_usd_rate > 0:
        cross_rate = base_usd_rate / quote_usd_rate
        # Cache the calculated rate
        cache_rate(base_currency, quote_currency, cross_rate)
        return cross_rate, False

    logger.warning(
        f"Could not calculate cross rate for {base_currency}/{quote_currency}"
    )
    return 0.0, False


def get_cached_rate(base_currency: str, quote_currency: str) -> float:
    """
    Get cached exchange rate if available and not expired.

    Args:
        base_currency: Base currency code
        quote_currency: Quote currency code

    Returns:
        Cached rate or 0.0 if not found
    """
    if not os.path.exists(CROSS_RATES_CACHE_FILE):
        return 0.0

    try:
        with open(CROSS_RATES_CACHE_FILE, "r") as f:
            cache = json.load(f)

        pair_key = f"{base_currency}{quote_currency}"
        if pair_key in cache:
            return cache[pair_key]

        return 0.0
    except Exception as e:
        logger.error(f"Error reading cache: {e}")
        return 0.0


def cache_rate(base_currency: str, quote_currency: str, rate: float) -> None:
    """
    Cache calculated exchange rate.

    Args:
        base_currency: Base currency code
        quote_currency: Quote currency code
        rate: Exchange rate
    """
    try:
        cache = {}
        if os.path.exists(CROSS_RATES_CACHE_FILE):
            with open(CROSS_RATES_CACHE_FILE, "r") as f:
                cache = json.load(f)

        pair_key = f"{base_currency}{quote_currency}"
        cache[pair_key] = rate

        with open(CROSS_RATES_CACHE_FILE, "w") as f:
            json.dump(cache, f)
    except Exception as e:
        logger.error(f"Error writing to cache: {e}")


def calculate_trend(
    base_currency: str,
    quote_currency: str,
    days: int = 7,
    df: Optional[pd.DataFrame] = None,
) -> float:
    """
    Calculate the trend (percentage change) for a currency pair.

    Args:
        base_currency: Base currency code
        quote_currency: Quote currency code
        days: Number of days to calculate trend over
        df: DataFrame containing forex data (will be loaded if None)

    Returns:
        Trend as percentage change
    """
    # Load forex data if not provided
    if df is None:
        df = load_forex_data()

    if df.empty:
        return 0.0

    # Try direct rate first
    direct_symbol = f"{base_currency}{quote_currency}=X"

    try:
        if isinstance(df.columns, pd.MultiIndex):
            if direct_symbol in df.columns.get_level_values(0):
                symbol_data = df.xs(direct_symbol, axis=1, level=0)
                if "Close" in symbol_data.columns:
                    close_prices = symbol_data["Close"]
                elif "Adj Close" in symbol_data.columns:
                    close_prices = symbol_data["Adj Close"]
                else:
                    return 0.0

                if len(close_prices) > days:
                    current_rate = close_prices.iloc[-1]
                    previous_rate = close_prices.iloc[-days]
                    if previous_rate > 0:
                        return (
                            (current_rate - previous_rate) / previous_rate
                        ) * 100
                return 0.0

        # Handle flattened column names
        flat_close_col = f"{direct_symbol}_Close"
        flat_adj_close_col = f"{direct_symbol}_Adj Close"

        if flat_close_col in df.columns:
            close_prices = df[flat_close_col]
        elif flat_adj_close_col in df.columns:
            close_prices = df[flat_adj_close_col]
        else:
            # Try reverse rate
            reverse_symbol = f"{quote_currency}{base_currency}=X"
            reverse_close_col = f"{reverse_symbol}_Close"
            reverse_adj_close_col = f"{reverse_symbol}_Adj Close"

            if reverse_close_col in df.columns:
                close_prices = 1 / df[reverse_close_col]
            elif reverse_adj_close_col in df.columns:
                close_prices = 1 / df[reverse_adj_close_col]
            else:
                # Try via USD
                trend_via_usd = calculate_cross_trend(
                    base_currency, quote_currency, days, df
                )
                return trend_via_usd

        if len(close_prices) > days:
            current_rate = close_prices.iloc[-1]
            previous_rate = close_prices.iloc[-days]
            if previous_rate > 0:
                return ((current_rate - previous_rate) / previous_rate) * 100
        return 0.0

    except Exception as e:
        logger.error(
            f"Error calculating trend for {base_currency}/{quote_currency}: {e}"
        )
        return 0.0


def calculate_cross_trend(
    base_currency: str,
    quote_currency: str,
    days: int = 7,
    df: Optional[pd.DataFrame] = None,
) -> float:
    """
    Calculate trend for cross rates through USD.

    Args:
        base_currency: Base currency code
        quote_currency: Quote currency code
        days: Number of days for trend calculation
        df: DataFrame with forex data

    Returns:
        Trend percentage
    """
    if df is None:
        df = load_forex_data()

    if df.empty:
        return 0.0

    # Calculate base/USD rate and trend
    base_usd_trend = 0.0
    quote_usd_trend = 0.0

    # Try different symbol combinations for base/USD
    for symbol in [f"{base_currency}USD=X", f"USD{base_currency}=X"]:
        is_inverse = symbol.startswith("USD")
        for col_suffix in ["Close", "Adj Close"]:
            col_name = f"{symbol}_{col_suffix}"
            if col_name in df.columns:
                if len(df) > days:
                    current = df[col_name].iloc[-1]
                    previous = df[col_name].iloc[-days]
                    if previous > 0:
                        if is_inverse:
                            # If USD/BASE, we need to invert the trend
                            current_rate = 1 / current
                            previous_rate = 1 / previous
                        else:
                            current_rate = current
                            previous_rate = previous
                        base_usd_trend = (
                            (current_rate - previous_rate) / previous_rate
                        ) * 100
                        break
        if base_usd_trend != 0.0:
            break

    # Calculate quote/USD rate and trend
    for symbol in [f"{quote_currency}USD=X", f"USD{quote_currency}=X"]:
        is_inverse = symbol.startswith("USD")
        for col_suffix in ["Close", "Adj Close"]:
            col_name = f"{symbol}_{col_suffix}"
            if col_name in df.columns:
                if len(df) > days:
                    current = df[col_name].iloc[-1]
                    previous = df[col_name].iloc[-days]
                    if previous > 0:
                        if is_inverse:
                            # If USD/QUOTE, we need to invert the trend
                            current_rate = 1 / current
                            previous_rate = 1 / previous
                        else:
                            current_rate = current
                            previous_rate = previous
                        quote_usd_trend = (
                            (current_rate - previous_rate) / previous_rate
                        ) * 100
                        break
        if quote_usd_trend != 0.0:
            break

    # Calculate cross trend (BASE/QUOTE)
    if base_usd_trend != 0.0 and quote_usd_trend != 0.0:
        # When BASE/USD goes up and QUOTE/USD goes up less (or down), BASE/QUOTE goes up
        return base_usd_trend - quote_usd_trend

    return 0.0


def get_exchange_rate_with_trend(
    base_currency: str, quote_currency: str, days: int = 7
) -> Tuple[float, float]:
    """
    Get exchange rate and trend for a currency pair.

    Args:
        base_currency: Base currency code
        quote_currency: Quote currency code
        days: Number of days for trend calculation

    Returns:
        Tuple of (exchange_rate, trend_percentage)
    """
    # If same currency, rate is 1.0 and trend is 0%
    if base_currency == quote_currency:
        return 1.0, 0.0

    # Load forex data
    df = load_forex_data()

    # Calculate exchange rate
    rate, is_direct = calculate_cross_rate(base_currency, quote_currency, df)

    # Calculate trend
    trend_pct = calculate_trend(base_currency, quote_currency, days, df)

    return rate, trend_pct


def list_available_currencies(df: Optional[pd.DataFrame] = None) -> List[str]:
    """
    List all available currencies in the forex data.

    Args:
        df: DataFrame containing forex data (will be loaded if None)

    Returns:
        List of currency codes
    """
    if df is None:
        df = load_forex_data()

    if df.empty:
        logger.warning("Forex data is empty")
        return []

    currencies = set()

    # Extract currencies from column names
    for col in df.columns:
        if isinstance(col, str) and "=" in col:
            # For flattened columns like 'EURUSD=X_Close'
            symbol = col.split("_")[0]
            if len(symbol) >= 7 and symbol.endswith("=X"):
                base = symbol[:3]
                quote = symbol[3:6]
                currencies.add(base)
                currencies.add(quote)
        elif isinstance(col, tuple) and len(col) >= 2:
            # For MultiIndex columns
            symbol = col[0]
            if len(symbol) >= 7 and symbol.endswith("=X"):
                base = symbol[:3]
                quote = symbol[3:6]
                currencies.add(base)
                currencies.add(quote)

    return sorted(list(currencies))


def debug_forex_data(symbol: Optional[str] = None) -> Dict:
    """
    Debug helper to check forex data structure

    Args:
        symbol: Optional symbol to check specifically

    Returns:
        Dictionary with debug information
    """
    df = load_forex_data()

    if df.empty:
        return {"error": "Forex data is empty"}

    result = {
        "shape": df.shape,
        "columns_type": str(type(df.columns)),
        "index_type": str(type(df.index)),
        "available_currencies": list_available_currencies(df),
    }

    # Get sample of columns
    if isinstance(df.columns, pd.MultiIndex):
        result["column_sample"] = [str(c) for c in df.columns[:5]]
    else:
        result["column_sample"] = list(df.columns[:5])

    # Check for specific symbol
    if symbol:
        if isinstance(df.columns, pd.MultiIndex):
            has_symbol = symbol in df.columns.get_level_values(0)
        else:
            has_symbol = any(c.startswith(symbol) for c in df.columns)
        result["has_symbol"] = has_symbol

        if has_symbol:
            if isinstance(df.columns, pd.MultiIndex):
                symbol_cols = [c for c in df.columns if c[0] == symbol]
                result["symbol_columns"] = [str(c) for c in symbol_cols]
                if len(symbol_cols) > 0:
                    result["last_values"] = {
                        str(c): str(df[c].iloc[-1]) for c in symbol_cols
                    }
            else:
                symbol_cols = [c for c in df.columns if c.startswith(symbol)]
                result["symbol_columns"] = symbol_cols
                if len(symbol_cols) > 0:
                    result["last_values"] = {
                        c: str(df[c].iloc[-1]) for c in symbol_cols
                    }

    return result


if __name__ == "__main__":
    # Test the module
    print("Testing forex_calculator.py")
    # Test currency pairs
    test_pairs = [
        ("EUR", "USD"),
        ("USD", "JPY"),
        ("GBP", "EUR"),
        ("AUD", "NZD"),
        ("USD", "CAD"),
    ]

    for base, quote in test_pairs:
        rate, is_direct = calculate_cross_rate(base, quote)
        trend = calculate_trend(base, quote)
        source = "direct" if is_direct else "calculated via USD"
        print(f"{base}/{quote}: {rate:.4f} ({source}) - Trend: {trend:.2f}%")
