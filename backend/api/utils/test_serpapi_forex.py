#!/usr/bin/env python3
"""
Test script to verify SerpAPI Google Finance integration for forex data
"""

import os
import sys
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("test_serpapi_forex")

# Add parent directory to path
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
)

# Import our forex service module
try:
    from backend.api.services.forex_service import (
        update_forex_data,
        fetch_quick_forex_data,
    )

    logger.info("Successfully imported forex service functions")
except ImportError as e:
    logger.error(f"Failed to import forex service: {e}")
    sys.exit(1)


def test_quick_forex():
    """Test quick forex data fetching using SerpAPI"""
    logger.info("Testing quick forex data fetching...")

    try:
        # Fetch quick forex data
        rates = fetch_quick_forex_data()

        if rates:
            logger.info(f"✅ Successfully fetched {len(rates)} currency pairs")
            logger.info("Sample rates:")
            for pair, rate in list(rates.items())[:5]:
                logger.info(f"  {pair}: {rate}")
        else:
            logger.warning("❌ No forex data retrieved")

    except Exception as e:
        logger.error(f"❌ Error testing quick forex data: {e}")


def test_forex_update():
    """Test forex data updating using SerpAPI"""
    logger.info("Testing forex data updating...")

    try:
        # Only test with a few currencies to avoid too many API calls
        test_currencies = ["USD", "EUR", "GBP"]

        # Update forex data (with limited currencies for testing)
        success = update_forex_data(currencies=test_currencies, days=7)

        if success:
            logger.info("✅ Successfully updated forex data")
        else:
            logger.warning("❌ Failed to update forex data")

    except Exception as e:
        logger.error(f"❌ Error testing forex update: {e}")


def main():
    """Main function"""
    logger.info("=== Testing SerpAPI Google Finance Integration for Forex ===")

    # Check if SERPAPI_API_KEY is set
    if not os.getenv("SERPAPI_API_KEY"):
        logger.error("❌ SERPAPI_API_KEY environment variable is not set")
        logger.info(
            "Please set the SERPAPI_API_KEY environment variable and try again"
        )
        sys.exit(1)

    # Run tests
    test_quick_forex()
    test_forex_update()

    logger.info("=== Testing completed ===")


if __name__ == "__main__":
    main()
