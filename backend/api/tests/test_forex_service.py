#!/usr/bin/env python3
"""
Unit tests for forex service functionality
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import pandas as pd
from datetime import datetime

# Set up path to include parent directory
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
)

# Import the forex service module
from backend.api.services.forex_service import (  # noqa: E402
    load_forex_data,
    fetch_quick_forex_data,
    execute_serpapi_request,
)


class TestForexService(unittest.TestCase):
    """Test cases for forex service functions"""

    def setUp(self):
        """Set up test fixtures"""
        # Create mock data for testing
        self.test_data = pd.DataFrame(
            {
                "Open": [1.0, 1.1],
                "High": [1.05, 1.15],
                "Low": [0.95, 1.05],
                "Close": [1.02, 1.12],
                "Volume": [0, 0],
                "Symbol": ["USDEUR=X", "USDJPY=X"],
                "Date": [
                    datetime.now().strftime("%Y-%m-%d"),
                    datetime.now().strftime("%Y-%m-%d"),
                ],
                "ExchangeRate": [1.02, 110.0],
            }
        )
        self.test_data.set_index(["Symbol", "Date"], inplace=True)

        # Mock SerpAPI response
        self.mock_serp_response = {
            "search_metadata": {
                "id": "12345",
                "status": "Success",
                "created_at": "2023-05-01T10:00:00Z",
            },
            "search_parameters": {
                "engine": "google_finance",
                "q": "USD-EUR",
            },
            "summary": {
                "title": "USD to EUR exchange rate",
                "extracted_price": "0.92",
                "currency": "EUR",
            },
        }

    @patch("backend.api.services.forex_service.pd.read_parquet")
    @patch("backend.api.services.forex_service.os.path.exists")
    def test_load_forex_data(self, mock_exists, mock_read_parquet):
        """Test loading forex data from parquet file"""
        # Mock file existence and data loading
        mock_exists.return_value = True
        mock_read_parquet.return_value = self.test_data

        # Call the function
        result = load_forex_data()

        # Verify result
        self.assertFalse(result.empty)
        self.assertEqual(len(result), 2)
        mock_exists.assert_called_once()
        mock_read_parquet.assert_called_once()

    @patch("backend.api.services.forex_service.GoogleSearch.get_dict")
    @patch("backend.api.services.forex_service.GoogleSearch")
    def test_execute_serpapi_request(self, mock_google_search, mock_get_dict):
        """Test the retry mechanism in execute_serpapi_request"""
        # Set up mock for successful request
        mock_get_dict.return_value = self.mock_serp_response
        mock_google_search.return_value = MagicMock()

        # Call function with test parameters
        params = {"engine": "google_finance", "q": "USD-EUR"}
        result = execute_serpapi_request(params)

        # Verify successful result
        self.assertEqual(
            result["summary"]["extracted_price"], "0.92"  # type: ignore
        )
        mock_google_search.assert_called_once()

        # Test retry on rate limit error
        mock_get_dict.side_effect = [
            {"error": "Rate limit exceeded"},  # First call fails
            self.mock_serp_response,  # Second call succeeds
        ]

        # Reset mock
        mock_google_search.reset_mock()

        # Call with rate limit simulation
        result = execute_serpapi_request(
            params, max_retries=2, initial_delay=1
        )

        # Verify successful retry
        self.assertEqual(
            result["summary"]["extracted_price"], "0.92")  # type: ignore
        self.assertEqual(mock_google_search.call_count, 2)

    @patch("backend.api.services.forex_service.execute_serpapi_request")
    def test_fetch_quick_forex_data(self, mock_execute_request):
        """Test fetching quick forex data with mocked API responses"""
        # Set up mock responses for different currency pairs
        mock_execute_request.side_effect = [
            {
                "summary": {
                    "extracted_price": "0.92",
                }
            },
            {
                "summary": {
                    "extracted_price": "1.08",
                }
            },
            {
                "error": "API error",  # Test error handling
            },
            {
                "summary": {
                    "extracted_price": "110.5",
                }
            },
            {
                "summary": {
                    "extracted_price": "0.75",
                }
            },
        ]

        # Mock environment variable
        with patch.dict(os.environ, {"SERPAPI_API_KEY": "test_key"}):
            with patch(
                "backend.api.services.forex_service.time.sleep"
            ):  # Skip sleeps
                # Call the function with limited currencies for testing
                with patch(
                    "backend.api.services.forex_service.SERPAPI_KEY",
                    "test_key",
                ):
                    # Use only 2 currencies to limit test pairs
                    from backend.api.services import forex_service
                    with patch.object(
                        forex_service,
                        "currencies",
                        ["USD", "EUR", "JPY"],
                    ):
                        results = fetch_quick_forex_data()

        # Verify results
        self.assertIn("USDEUR", results)
        self.assertIn("EURUSD", results)
        self.assertIn("USDJPY", results)
        self.assertEqual(results["USDEUR"], 0.92)
        self.assertEqual(results["EURUSD"], 1.08)
        self.assertEqual(results["USDJPY"], 110.5)


if __name__ == "__main__":
    unittest.main()
