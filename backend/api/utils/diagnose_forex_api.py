#!/usr/bin/env python3
"""
Diagnostic tool for testing Yahoo Finance API connectivity and fallback options
"""

import os
import sys
import logging
import requests
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("forex_api_diagnosis")

# Add parent directory to path
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
)

try:
    import yfinance as yf

    yfinance_available = True
except ImportError:
    logger.warning(
        "yfinance not installed. Please install with: pip install yfinance"
    )
    yfinance_available = False


def test_yahoo_direct_http():
    """Test direct HTTP request to Yahoo Finance API"""
    logger.info("Testing direct HTTP request to Yahoo Finance API...")

    try:
        url = "https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X"
        logger.info(f"Making HTTP request to: {url}")

        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            logger.info("✅ HTTP request successful")
            try:
                data = response.json()
                if "chart" in data and "result" in data["chart"]:
                    logger.info("✅ Valid JSON response received")
                    return True
                else:
                    logger.error("❌ Invalid JSON structure in response")
                    logger.info(f"Response preview: {response.text[:500]}...")
                    return False
            except ValueError:
                logger.error("❌ Invalid JSON in response")
                logger.info(f"Response preview: {response.text[:500]}...")
                return False
        else:
            logger.error(
                f"❌ HTTP request failed with status code {
                    response.status_code
                }"
            )
            logger.info(f"Error response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Exception during HTTP request: {e}")
        return False


def test_yfinance_api():
    """Test yfinance API functionality"""
    if not yfinance_available:
        return False

    logger.info("Testing yfinance API...")

    try:
        # Test single ticker
        logger.info("Testing single ticker download (EURUSD=X)")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        data = yf.download(
            "EURUSD=X", start=start_date, end=end_date, progress=False
        )

        if not data.empty:
            logger.info(
                f"✅ Successfully retrieved EURUSD=X data with {len(data)} rows"
            )
            logger.info(f"Data preview:\n{data.head(3)}")
            return True
        else:
            logger.error("❌ Empty data frame returned")
            return False
    except Exception as e:
        logger.error(f"❌ Exception during yfinance API call: {e}")
        return False


def test_alternative_ticker_formats():
    """Test alternative ticker formats for currency pairs"""
    if not yfinance_available:
        return False

    logger.info("Testing alternative ticker formats for currency pairs...")

    formats_to_test = [
        "EURUSD=X",  # Standard format
        "EUR=X",  # Single currency format
        "EURUSD",  # Without =X suffix
        "EUR/USD",  # Slash format
    ]

    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    results = {}

    for ticker_format in formats_to_test:
        logger.info(f"Testing ticker format: {ticker_format}")
        try:
            data = yf.download(
                ticker_format, start=start_date, end=end_date, progress=False
            )

            if not data.empty:
                logger.info(
                    f"✅ Format {ticker_format} works! Got {len(data)} rows"
                )
                logger.info(f"Data preview:\n{data.head(1)}")
                results[ticker_format] = True
            else:
                logger.info(f"❌ Format {ticker_format} returned empty data")
                results[ticker_format] = False
        except Exception as e:
            logger.error(f"❌ Format {ticker_format} failed with error: {e}")
            results[ticker_format] = False

    # Show summary
    logger.info("\nTicker format test summary:")
    for fmt, success in results.items():
        logger.info(f"{fmt}: {'✅ Works' if success else '❌ Failed'}")

    return any(results.values())


def suggest_next_steps():
    """Provide suggestions for fixing the issue"""
    logger.info("\n=== RECOMMENDATIONS ===")
    logger.info("Based on the diagnostics, here are some potential solutions:")

    logger.info("1. If HTTP requests work but yfinance doesn't:")
    logger.info("   - Update yfinance package: pip install --upgrade yfinance")
    logger.info("   - Check if Yahoo Finance changed their API format")

    logger.info("2. If a different ticker format works:")
    logger.info("   - Modify forex_service.py to use the working format")

    logger.info("3. If nothing works:")
    logger.info("   - Consider implementing an alternative data provider:")
    logger.info("     * Alpha Vantage (https://www.alphavantage.co/)")
    logger.info("     * ExchangeRate-API (https://www.exchangerate-api.com/)")
    logger.info("   - Or rely on the synthetic data generation")

    logger.info("\nTo use synthetic data permanently, add to backend/.env:")
    logger.info("USE_SYNTHETIC_DATA=true")


def main():
    logger.info("=== ChasquiFX Forex API Diagnostics ===")

    # Run tests
    http_test_result = test_yahoo_direct_http()
    yfinance_test_result = test_yfinance_api() if http_test_result else False
    format_test_result = (
        test_alternative_ticker_formats()
        if http_test_result and not yfinance_test_result
        else False
    )

    # Summary
    logger.info("\n=== DIAGNOSTIC SUMMARY ===")
    logger.info(
        (
            "Direct HTTP requests to Yahoo Finance: "
            f"{'✅ PASS' if http_test_result else '❌ FAIL'}"
        )
    )
    logger.info(
        f"yfinance API functionality: {
            '✅ PASS' if yfinance_test_result else '❌ FAIL'
        }"
    )
    logger.info(
        "Alternative ticker formats: "
        f"{
            '✅ Some formats work'
            if format_test_result
            else '❌ All failed/not tested'
        }"
    )

    # Suggestions
    suggest_next_steps()


if __name__ == "__main__":
    main()
