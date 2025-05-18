"""
Forex data service for ChasquiFX.
Manages fetching, processing, and analyzing forex data.
"""

import os
from typing import Dict, Optional, List, Union
import pandas as pd
import json
import logging
from datetime import datetime, timedelta
import sys
import time
from serpapi import GoogleSearch
from dotenv import load_dotenv

# Set the path to the parent directory
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
)

from backend.api.config import (  # noqa: E402
    DEFAULT_FOREX_DATA_PATH,
    DEFAULT_FOREX_MAPPINGS_PATH,
    DEFAULT_CURRENCY_CODES_PATH,
)

from backend.api.db.operations import (  # noqa: E402
    get_cached_forex_data,
    cache_forex_data,
    log_api_call,
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file in the parent directory
env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
)

# Only try to load .env if not in Vercel environment
if not os.getenv("VERCEL_DEPLOYMENT"):
    try:
        load_dotenv(env_path)
    except Exception as e:
        logger.warning(f"Could not load .env file: {e}")

# Get API key from environment variables
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")
if not SERPAPI_KEY:
    logger.warning(
        (
            "SERPAPI_API_KEY not found in environment variables. "
            "Forex data queries will use synthetic data."
        )
    )
else:
    logger.info("SERPAPI_API_KEY loaded successfully for forex data.")


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


def load_consolidated_forex_data() -> pd.DataFrame:
    """
    Load consolidated forex data from parquet file.
    This is the preferred method to load forex data as it contains all pairs
    in one file.

    Returns:
        DataFrame containing all forex data indexed by currency pair
    """
    file_path = os.path.join(
        os.path.dirname(DEFAULT_FOREX_DATA_PATH),
        "consolidated_forex_data.parquet",
    )

    if not os.path.exists(file_path):
        logger.warning(f"Consolidated forex data file not found: {file_path}")
        return pd.DataFrame()

    try:
        df = pd.read_parquet(file_path)
        logger.info(
            "Loaded consolidated forex data with "
            f"{len(df.index.unique())} currency pairs"
        )
        return df
    except Exception as e:
        logger.error(f"Error loading consolidated forex data: {e}")
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


def execute_serpapi_request(params, max_retries=3, initial_delay=2):
    """
    Execute a SerpAPI request with retry mechanism and exponential backoff

    Args:
        params: Parameters for the GoogleSearch request
        max_retries: Maximum number of retries
        initial_delay: Initial delay in seconds between retries

    Returns:
        Dictionary with API results or error information
    """
    delay = initial_delay
    quota_limit_reached = False

    for attempt in range(max_retries):
        try:
            search = GoogleSearch(params)
            results = search.get_dict()

            # Check for API rate limiting errors or quota limits
            if "error" in results:
                error_msg = results["error"].lower()

                # Check for quota limit messages
                if (
                    "quota" in error_msg
                    or "limit exceeded" in error_msg
                    or "credits" in error_msg
                ):
                    logger.error(
                        f"SerpAPI quota limit reached: {results['error']}"
                    )
                    quota_limit_reached = True
                    # Return error with specific flag for quota limits
                    return {
                        "error": results["error"],
                        "quota_exceeded": True,
                        "message": (
                            (
                                "API quota limit has been reached. "
                                "Please check your SerpAPI credits "
                                "or try again later."
                            )
                        ),
                    }

                # If rate limited and not the last attempt, retry
                if (
                    "rate" in error_msg
                    and "limit" in error_msg
                    and attempt < max_retries - 1
                ):
                    # Log the rate limiting
                    retry_msg = (
                        f"Rate limit exceeded. "
                        f"Retry {attempt + 1}/{max_retries} in {delay}s"
                    )
                    logger.warning(retry_msg)

                    # Wait with exponential backoff before retrying
                    time.sleep(delay)
                    delay = min(delay * 2, 60)  # Cap at 60 seconds
                    continue

            # Success or non-rate-limit error
            return results

        except Exception as e:
            if "quota" in str(e).lower() or "limit exceeded" in str(e).lower():
                logger.error(f"SerpAPI quota limit exception: {e}")
                return {
                    "error": str(e),
                    "quota_exceeded": True,
                    "message": (
                        "API quota limit has been reached. Please check your "
                        "SerpAPI credits or try again later."
                    ),
                }

            if attempt < max_retries - 1:
                # Log the error and retry
                logger.warning(
                    f"API request error: {e}. "
                    f"Retry {attempt + 1}/{max_retries} in {delay}s"
                )
                time.sleep(delay)
                delay = min(delay * 2, 60)  # Cap at 60 seconds
            else:
                # Final failure
                logger.error(
                    f"API request failed after {max_retries} attempts: {e}"
                )
                return {"error": str(e)}

    # This should never happen but just in case
    return {
        "error": "Maximum retries reached with no successful response",
        "quota_exceeded": quota_limit_reached,
    }


def update_forex_data(
    currencies: Optional[List[str]] = None, days: int = 30
) -> bool:
    """
    Update forex data by fetching from Google Finance via SerpAPI.

    Args:
        currencies: List of currency codes to fetch
            (if None, uses default list)
        days: Number of days of historical data to retrieve

    Returns:
        True if update was successful, False otherwise
    """
    try:
        # Check if SERPAPI_KEY is available
        if not SERPAPI_KEY:
            logger.warning(
                "No SERPAPI_API_KEY found. Cannot fetch forex data."
            )
            return False

        # Use a default list of major currencies if none provided
        if not currencies:
            currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"]

        logger.info("Fetching forex data using Google Finance via SerpAPI...")

        # Generate all currency pairs in Google Finance format
        # (currency1-currency2)
        pairs = []
        for base in currencies:
            for quote in currencies:
                if base != quote:
                    pairs.append(f"{base}-{quote}")

        # Prepare data structure for results
        processed_data = pd.DataFrame()

        # Split into smaller batches to avoid rate limiting
        batch_size = (
            1  # SerpAPI has stricter limits, process one pair at a time
        )

        for i in range(0, len(pairs), batch_size):
            batch_pairs = pairs[i: i + batch_size]
            current_pair = batch_pairs[0]
            logger.info(
                f"Processing forex pair {i + 1}/{len(pairs)}: {current_pair}"
            )

            try:
                # Query Google Finance via SerpAPI with robust retry mechanism
                params = {
                    "engine": "google_finance",
                    "q": current_pair,
                    "api_key": SERPAPI_KEY,
                }

                results = execute_serpapi_request(params)

                # Check if we got valid results
                if "error" in results:
                    logger.warning(
                        f"SerpAPI error for {current_pair}: {results['error']}"
                    )
                    continue

                # Extract current exchange rate from summary
                current_rate = None
                if (
                    "summary" in results
                    and "extracted_price" in results["summary"]
                ):
                    extracted_price = (
                        results["summary"]["extracted_price"]  # type: ignore
                    )
                    current_rate = float(extracted_price)

                # Create a dataframe with today's rate
                if current_rate:
                    today = datetime.now().strftime("%Y-%m-%d")
                    # Format symbol like Yahoo Finance for compatibility
                    symbol = f"{current_pair.replace('-', '')}=X"

                    df = pd.DataFrame(
                        {
                            "Date": [today],
                            "Open": [current_rate],
                            "High": [current_rate * 1.005],  # Estimate
                            "Low": [current_rate * 0.995],  # Estimate
                            "Close": [current_rate],
                            "Volume": [0],  # Not available
                            "Symbol": [symbol],
                            "ExchangeRate": [current_rate],
                        }
                    )

                    processed_data = pd.concat(
                        [processed_data, df], ignore_index=True
                    )
                    logger.info(
                        f"Got exchange rate for {symbol}: {current_rate}"
                    )

                # Sleep to avoid rate limiting
                time.sleep(2)
            except Exception as batch_err:
                logger.warning(f"Error processing {current_pair}: {batch_err}")
                continue

        # Set index for efficient lookups
        if not processed_data.empty:
            processed_data = processed_data.set_index(["Symbol", "Date"])

            # Save to parquet
            logger.info(f"Saving forex data to {DEFAULT_FOREX_DATA_PATH}")
            os.makedirs(
                os.path.dirname(DEFAULT_FOREX_DATA_PATH), exist_ok=True
            )
            processed_data.to_parquet(DEFAULT_FOREX_DATA_PATH)

            # Create consolidated format
            output_path = os.path.join(
                os.path.dirname(DEFAULT_FOREX_DATA_PATH),
                "consolidated_forex_data.parquet",
            )
            processed_data.to_parquet(output_path)
            logger.info(f"Saved consolidated forex data to {output_path}")

            return True
        else:
            logger.warning("No data to save after processing")
            return False

    except Exception as e:
        logger.error(f"Error updating forex data: {e}")
        return False


def ensure_fresh_forex_data() -> bool:
    """
    Ensures forex data is up-to-date
    by trying to update it from Google Finance.
    This function should be called before generating recommendations
    to make sure we're using real-time data.

    Returns:
        bool: True if data was successfully updated or is already fresh,
              False if we're using stale data
    """
    try:
        # Check if we need to update forex data based on freshness
        need_update = True

        # See if we have existing data and check its timestamp
        forex_path = os.path.join(
            os.path.dirname(DEFAULT_FOREX_DATA_PATH),
            "consolidated_forex_data.parquet",
        )

        if os.path.exists(forex_path):
            try:
                # Check file modification time
                mod_time = os.path.getmtime(forex_path)
                now = time.time()
                hours_old = (now - mod_time) / 3600  # Convert seconds to hours

                # If data is less than 3 hours old, we don't need to update
                if hours_old < 3:
                    logger.info(
                        f"Forex data is {hours_old:.1f} hours old, still fresh"
                    )
                    need_update = False
                else:
                    logger.info(
                        f"Forex data is {hours_old:.1f} hours old, "
                        f"needs refresh"
                    )
            except Exception as e:
                logger.warning(f"Error checking forex data age: {e}")

        # Update forex data if API key is available and update is needed
        if SERPAPI_KEY and need_update:
            logger.info(
                "Attempting to update forex data with real-time data..."
            )
            success = update_forex_data()
            if success:
                logger.info(
                    "Successfully updated forex data with real-time rates"
                )
                return True
            else:
                logger.warning(
                    "Failed to update forex data, using existing data"
                )
                return False
        elif SERPAPI_KEY and not need_update:
            # We have fresh data and an API key
            return True
        else:
            logger.warning(
                "No SERPAPI key available, using existing forex data"
            )
            return False
    except Exception as e:
        logger.error(f"Error ensuring fresh forex data: {e}")
        return False


async def fetch_quick_forex_data() -> Dict[str, float]:
    """
    Fetch current exchange rates for common currency pairs using
    Google Finance.

    Checks database cache first before making API calls.
    Logs API usage for analytics.

    Returns:
        Dictionary mapping currency pairs to rates
    """
    try:
        # Check if SERPAPI_KEY is available
        if not SERPAPI_KEY:
            logger.warning(
                "No SERPAPI_API_KEY found. Cannot fetch forex data."
            )
            return {}

        # Use a list of major currencies
        currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"]

        # Generate all currency pairs in Google Finance format
        pairs = []
        for base in currencies:
            for quote in currencies:
                if base != quote:
                    pairs.append((f"{base}-{quote}", f"{base}{quote}"))

        # Fetch exchange rates
        results = {}

        # Process each pair with cache awareness
        for google_pair, yahoo_pair in pairs:
            try:
                # First check cache
                cached_data = await get_cached_forex_data(yahoo_pair)
                if cached_data:
                    # Use cached data
                    rate = float(cached_data.get("rate", 0))
                    results[yahoo_pair] = rate
                    logger.info(f"Using cached rate for {yahoo_pair}: {rate}")
                    continue

                # Not in cache, query Google Finance via SerpAPI
                params = {
                    "engine": "google_finance",
                    "q": google_pair,
                    "api_key": SERPAPI_KEY,
                }

                # Log API call
                await log_api_call(
                    endpoint="serpapi/google_finance",
                    request_data={"query": google_pair},
                    response_status=200,
                )

                # Use our helper function for robust API calls
                search_results = execute_serpapi_request(params)

                # Check if we got valid results and extract rate
                if (
                    "summary" in search_results
                    and isinstance(search_results["summary"], dict)
                    and "extracted_price" in search_results["summary"]
                ):
                    summary_dict = search_results["summary"]
                    rate = float(summary_dict["extracted_price"])
                    results[yahoo_pair] = rate
                    logger.info(f"Got rate for {yahoo_pair}: {rate}")

                    # Cache the result
                    await cache_forex_data(
                        yahoo_pair,
                        {
                            "rate": rate,
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                        expiry_hours=3,  # Cache for 3 hours
                    )

                # Sleep to avoid rate limiting
                time.sleep(1)
            except Exception as e:
                logger.warning(f"Could not get data for {google_pair}: {e}")
                continue

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
