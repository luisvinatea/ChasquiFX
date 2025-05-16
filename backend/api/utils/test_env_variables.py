#!/usr/bin/env python3
"""
Test script to verify that both forex_service and flight_service
can access the SERPAPI_API_KEY environment variable
"""

import os
import sys
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("env_test")

# Add parent directory to path
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
)


def test_environment_variables():
    """Test environment variables loading in both services"""
    try:
        # Test flight_service
        from backend.api.services.flight_service import (
            SERPAPI_KEY as flight_key,
        )

        logger.info(
            f"Flight service SERPAPI_KEY loaded: {
                '✅ YES' if flight_key else '❌ NO'}"
        )
        if flight_key:
            # Show only first few characters for security
            masked_key = flight_key[:4] + "..." + flight_key[-4:]
            logger.info(f"Flight service key: {masked_key}")

        # Test forex_service
        from backend.api.services.forex_service import SERPAPI_KEY as forex_key

        logger.info(
            f"Forex service SERPAPI_KEY loaded: {
                '✅ YES' if forex_key else '❌ NO'}"
        )
        if forex_key:
            masked_key = forex_key[:4] + "..." + forex_key[-4:]
            logger.info(f"Forex service key: {masked_key}")

        # Verify they match
        if flight_key and forex_key:
            if flight_key == forex_key:
                logger.info("✅ Keys match between services")
            else:
                logger.warning("❌ Keys DO NOT match between services!")

        # Check direct environment variable
        env_key = os.getenv("SERPAPI_API_KEY")
        logger.info(
            f"Direct environment SERPAPI_KEY loaded: {
                '✅ YES' if env_key else '❌ NO'}"
        )

        # Print .env file path
        env_path = os.path.abspath(
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                ".env",
            )
        )
        logger.info(f".env file path: {env_path}")
        logger.info(
            f".env file exists: {
                '✅ YES' if os.path.isfile(env_path) else '❌ NO'}"
        )

        # Final status
        if flight_key and forex_key and flight_key == forex_key:
            logger.info("✅ Environment variables test PASSED")
            return True
        else:
            logger.warning("❌ Environment variables test FAILED")
            return False

    except ImportError as e:
        logger.error(f"Failed to import services: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False


if __name__ == "__main__":
    logger.info("=== Testing Environment Variables Loading ===")
    test_environment_variables()
