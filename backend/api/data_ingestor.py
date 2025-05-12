"""
data_ingestor.py
Module for fetching and processing forex data from Yahoo Finance.
Uses functional programming approach for maintainability.
"""

import os
import json
import time
import logging
from typing import Dict, List, Tuple, Any, Optional, Set
from functools import partial
import multiprocessing as mp
import pandas as pd
from pandas import DataFrame
import requests
import yfinance as yf

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Define constants
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "assets/data")
FOREX_DIR = os.path.join(DATA_DIR, "forex")
JSON_DIR = os.path.join(FOREX_DIR, "json")
PARQUET_DIR = os.path.join(FOREX_DIR, "parquet")

# Ensure directories exist
os.makedirs(JSON_DIR, exist_ok=True)
os.makedirs(PARQUET_DIR, exist_ok=True)

# Default file paths
CURRENCY_CODES_FILE = os.path.join(JSON_DIR, "currency_codes.json")
FOREX_MAPPINGS_FILE = os.path.join(JSON_DIR, "forex_mappings.json")
FOREX_DATA_FILE = os.path.join(PARQUET_DIR, "yahoo_finance_forex_data.parquet")

# Load currency codes if file exists
CURRENCY_CODES = {}
if os.path.exists(CURRENCY_CODES_FILE):
    with open(CURRENCY_CODES_FILE, "r") as f:
        currency_data = json.load(f)
        # Convert country-to-code mapping to code-to-code mapping
        CURRENCY_CODES = {
            code: code for country, code in currency_data.items()
        }
else:
    # Fallback minimal currency list
    CURRENCY_CODES = {"USD": "USD", "EUR": "EUR", "GBP": "GBP", "JPY": "JPY"}


# Functional approach to create forex pairs
def create_pairs(codes: Dict[str, str]) -> List[str]:
    """Create forex pairs from currency codes values."""
    return [
        f"{base}{quote}=X"
        for base in codes.values()
        for quote in codes.values()
        if base != quote
    ]


def create_forward_backward_pairs(codes: Dict[str, str]) -> List[str]:
    """Create forward and backward forex pairs."""
    return [
        f"{base}{quote}=X"
        for base in codes.values()
        for quote in codes.values()
        if base != quote
    ] + [
        f"{quote}{base}=X"
        for base in codes.values()
        for quote in codes.values()
        if base != quote
    ]


# Create forex pairs
forex_pairs_list = create_forward_backward_pairs(CURRENCY_CODES)


# Function to fetch data for a single symbol with retry logic
def fetch_symbol_data(
    symbol: str,
    start_date: str,
    end_date: str,
    retries: int = 3,
    delay: float = 1.0,
) -> Tuple[str, pd.DataFrame]:
    """
    Fetch data for a single symbol
    from Yahoo Finance with retry on transient errors.

    Args:
        symbol: Forex symbol to fetch.
        start_date: Start date for data fetching.
        end_date: End date for data fetching.
        retries: Number of retry attempts.
        delay: Delay between retries in seconds.

    Returns:
        Tuple of symbol and DataFrame with fetched data.
    """
    for attempt in range(retries):
        try:
            df = yf.download(  # type: ignore
                symbol,
                start=start_date,
                end=end_date,
                threads=False,
                progress=False,
                auto_adjust=False,
            )
            if df is None or df.empty or df.columns.empty:
                return symbol, pd.DataFrame()
            return symbol, df
        except (ConnectionError, requests.exceptions.RequestException):
            if attempt < retries - 1:
                time.sleep(delay * (2**attempt))  # Exponential backoff
                continue
            return symbol, pd.DataFrame()
    # Add fallback return to ensure we always return a value
    return symbol, pd.DataFrame()


# Function to fetch data for multiple symbols using multiprocessing
def fetch_data_parallel(
    symbols: List[str],
    start_date: str,
    end_date: str,
    max_workers: Optional[int] = None,
) -> pd.DataFrame:
    """
    Fetch data for multiple symbols in parallel.

    Args:
        symbols: List of forex symbols to fetch.
        start_date: Start date for data fetching.
        end_date: End date for data fetching.
        max_workers: Number of worker processes (default is CPU count).

    Raises:
        ValueError: If no data is fetched for any symbol.

    Returns:
        DataFrame containing the fetched data for all symbols.
    """

    fetch_func = partial(
        fetch_symbol_data, start_date=start_date, end_date=end_date
    )

    num_workers = (
        max_workers if max_workers else min(mp.cpu_count(), len(symbols))
    )

    with mp.Pool(processes=num_workers) as pool:
        results = pool.map(fetch_func, symbols)

    data_dict = {symbol: df for symbol, df in results if not df.empty}

    if not data_dict:
        raise ValueError("No data fetched for any symbol.")

    data_frames: List[DataFrame] = []
    for symbol, df in data_dict.items():
        existing_cols = df.columns
        new_cols = [(symbol, col) for col in existing_cols]
        df.columns = pd.MultiIndex.from_tuples(  # type: ignore
            new_cols, names=["Symbol", "Price"]
        )
        data_frames.append(df)  # type: ignore

    return pd.concat(data_frames, axis=1)  # type: ignore


# Functions for data processing and storage
def process_data(df: pd.DataFrame) -> pd.DataFrame:
    """Process the data by filling missing values with forward fill then zero."""
    df.ffill(inplace=True)  # In-place to reduce memory usage
    # Explicitly cast to DataFrame to resolve type issue
    result_df: pd.DataFrame = df.fillna(0, inplace=True) or df  # type: ignore
    return result_df


def save_data_parquet(
    df: pd.DataFrame, file_path: str, mapping_path: str
) -> None:
    """Save data to parquet file with currency mappings."""
    # Flatten MultiIndex columns before saving to parquet
    if isinstance(df.columns, pd.MultiIndex):
        # Create a copy to avoid modifying the original dataframe
        df_to_save = df.copy()
        # Convert MultiIndex columns to string representation
        df_to_save.columns = [f"{a}_{b}" if b else a for a, b in df.columns]
    else:
        df_to_save = df

    # Save with flattened column names
    df_to_save.to_parquet(file_path, compression="snappy")

    symbol_mappings: Dict[str, Dict[str, str]] = {}
    if isinstance(df.columns, pd.MultiIndex):
        try:
            all_symbols: List[str] = []
            for col in df.columns:
                if isinstance(col, tuple):
                    try:
                        if col and isinstance(col[0], (str, int, float)):
                            symbol_str = str(col[0])
                            all_symbols.append(symbol_str)
                    except (IndexError, TypeError):
                        continue

            unique_symbols: List[str] = []
            seen: Set[str] = set()
            for s in all_symbols:
                if s not in seen:
                    seen.add(s)
                    unique_symbols.append(s)

            for symbol_str in unique_symbols:
                if symbol_str.endswith("=X"):
                    base_currency_str: str = symbol_str[0:3]
                    quote_currency_str: str = symbol_str[3:6]
                    symbol_mappings[symbol_str] = {
                        "base_currency": base_currency_str,
                        "quote_currency": quote_currency_str,
                    }
        except Exception:
            pass

    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(symbol_mappings, f, indent=2)


def load_data_parquet(
    file_path: str, mapping_path: str
) -> Tuple[pd.DataFrame, Dict[str, Dict[str, str]]]:
    """Load data from parquet file with currency mappings."""
    if os.path.exists(file_path):
        df = pd.read_parquet(file_path)

        # Try to reconstruct MultiIndex from flattened column names
        if all("_" in str(col) for col in df.columns if str(col) != "Date"):
            new_columns: List[Tuple[Any, Any]] = []
            for col in df.columns:
                if "_" in str(col):
                    parts = str(col).split("_", 1)
                    new_columns.append((parts[0], parts[1]))
                else:
                    new_columns.append((str(col), ""))

            # Silence the type checker completely for this line
            df.columns = pd.MultiIndex.from_tuples(  # type: ignore
                new_columns, names=["Symbol", "Price"]
            )
    else:
        df = pd.DataFrame()

    mappings: Dict[str, Dict[str, str]] = {}
    if os.path.exists(mapping_path):
        with open(mapping_path, "r", encoding="utf-8") as f:
            mappings = json.load(f)

    return df, mappings


# Main pipeline function
def get_forex_data(
    symbols: Optional[List[str]] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    parquet_file: str = FOREX_DATA_FILE,
    mapping_file: str = FOREX_MAPPINGS_FILE,
    max_workers: Optional[int] = None,
) -> pd.DataFrame:
    """
    ETL pipeline to fetch, process, and save forex data once per task.

    Args:
        symbols: List of forex symbols (defaults to all pairs).
        start_date: Start date (defaults to one month ago).
        end_date: End date (defaults to today).
        parquet_file: Path for Parquet output.
        mapping_file: Path for JSON mappings.
        max_workers: Number of worker processes.

    Returns:
        Processed DataFrame.
    """
    # Calculate one month ago from today
    if end_date is None:
        end_date = pd.Timestamp.today().strftime("%Y-%m-%d")
    if start_date is None:
        start_date = (pd.Timestamp.today() - pd.DateOffset(months=1)).strftime(
            "%Y-%m-%d"
        )

    symbols_to_fetch = symbols if symbols is not None else forex_pairs_list
    raw_df = fetch_data_parallel(
        symbols_to_fetch, start_date, end_date, max_workers
    )

    processed_df = process_data(raw_df)
    save_data_parquet(processed_df, parquet_file, mapping_file)

    return processed_df


def get_currency_pair(
    base_currency: str, quote_currency: str, file_path: str, mapping_path: str
) -> pd.DataFrame:
    """
    Get specific currency pair data from the stored parquet file.

    Args:
        base_currency: Base currency code (e.g., 'USD')
        quote_currency: Quote currency code (e.g., 'EUR')
        file_path: Path to the parquet file
        mapping_path: Path to the mapping file

    Returns:
        DataFrame containing the requested currency pair data
    """
    symbol = f"{base_currency}{quote_currency}=X"
    df, mappings = load_data_parquet(file_path, mapping_path)

    if symbol not in mappings:
        return pd.DataFrame()

    if isinstance(df.columns, pd.MultiIndex):
        # Get all columns for the symbol using cross-section instead of to_frame
        if symbol in df.columns.get_level_values(0):  # type: ignore
            return df.xs(symbol, axis=1, level=0)  # type: ignore

    return pd.DataFrame()  # type: ignore


def get_currency_pair_by_name(
    currency_name: str, file_path: str, mapping_path: str
) -> pd.DataFrame:
    """
    Get specific currency pair data based on currency name.

    Args:
        currency_name: Name of the currency (e.g., 'US Dollar')
        file_path: Path to the parquet file
        mapping_path: Path to the mapping file

    Returns:
        DataFrame containing the requested currency pair data
    """
    # Load currency code mapping
    if os.path.exists(CURRENCY_CODES_FILE):
        with open(CURRENCY_CODES_FILE, "r") as f:
            currency_data = json.load(f)
            name_to_code = {
                item["name"]: item["code"] for item in currency_data
            }
    else:
        return pd.DataFrame()

    if currency_name not in name_to_code:
        return pd.DataFrame()

    # Use code to get data
    return get_currency_pair(
        "USD", name_to_code[currency_name], file_path, mapping_path
    )


def update_forex_data(
    days: int = 30,
    parquet_file: str = FOREX_DATA_FILE,
    mapping_file: str = FOREX_MAPPINGS_FILE,
) -> pd.DataFrame:
    """
    Update forex data with the latest days.

    Args:
        days: Number of days to fetch
        parquet_file: Path for Parquet output
        mapping_file: Path for JSON mappings

    Returns:
        Updated DataFrame
    """
    end_date = pd.Timestamp.today().strftime("%Y-%m-%d")
    start_date = (pd.Timestamp.today() - pd.DateOffset(days=days)).strftime(
        "%Y-%m-%d"
    )

    return get_forex_data(
        symbols=forex_pairs_list,
        start_date=start_date,
        end_date=end_date,
        parquet_file=parquet_file,
        mapping_file=mapping_file,
    )


if __name__ == "__main__":
    test_pairs = forex_pairs_list[:10]
    data = get_forex_data(
        symbols=test_pairs,
        max_workers=4,
    )
    print(data.head())
