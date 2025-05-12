import sys
import os
import unittest
from unittest.mock import patch, MagicMock  # Removed unused Mock import

# Add the project root to path for imports
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

# Import the functions to test from ChasquiFX
from ChasquiFX import (
    is_api_running,
    get_recommendations,
    get_routes,
    save_favorite,
    remove_favorite,
)


class TestChasquiFX(unittest.TestCase):
    """
    Test cases for the ChasquiFX Streamlit application's core functions.
    """

    def setUp(self):
        """
        Setup test environment before each test
        """
        # Create a mock for streamlit functions to avoid runtime errors
        self.streamlit_mock = patch("ChasquiFX.st")
        self.mock_st = self.streamlit_mock.start()

        # Set up mock session_state as a MagicMock object instead of a dictionary
        # This allows setting arbitrary attributes without type errors
        self.mock_st.session_state = MagicMock()
        self.mock_st.session_state.favorites = []

        # Clear the cache to avoid cached values affecting tests
        if hasattr(sys.modules["ChasquiFX"], "is_api_running"):
            # Clear the cache_data decorator's cache
            if hasattr(sys.modules["ChasquiFX"].is_api_running, "clear"):
                sys.modules["ChasquiFX"].is_api_running.clear()

    def tearDown(self):
        """
        Clean up after each test
        """
        self.streamlit_mock.stop()

    @patch("ChasquiFX.requests.get")
    def test_is_api_running_success(self, mock_get):
        """Test API running check when API is available"""
        # Configure the mock to return a successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        # Disable cache for test
        with patch("ChasquiFX.st.cache_data", lambda ttl: lambda func: func):
            # Call the function and check result
            result = is_api_running()

            # Assertions
            self.assertTrue(result)
            mock_get.assert_called_once_with(
                "http://localhost:8000/", timeout=2
            )

    @patch("ChasquiFX.requests.get")
    def test_is_api_running_failure_status(self, mock_get):
        """Test API running check when API returns non-200 status"""
        # Configure the mock to return a failure response
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response

        # Disable cache for test
        with patch("ChasquiFX.st.cache_data", lambda ttl: lambda func: func):
            # Call the function and check result
            result = is_api_running()

            # Assertions
            self.assertFalse(result)
            mock_get.assert_called_once_with(
                "http://localhost:8000/", timeout=2
            )

    @patch("ChasquiFX.requests.get")
    def test_is_api_running_exception(self, mock_get):
        """Test API running check when API connection throws exception"""
        # Configure the mock to raise an exception
        mock_get.side_effect = Exception("Connection error")

        # Disable cache for test
        with patch("ChasquiFX.st.cache_data", lambda ttl: lambda func: func):
            # Call the function and check result
            result = is_api_running()

            # Assertions
            self.assertFalse(result)
            mock_get.assert_called_once_with(
                "http://localhost:8000/", timeout=2
            )

    @patch("ChasquiFX.requests.get")
    @patch("ChasquiFX.st")
    def test_get_recommendations_success(self, mock_st, mock_get):
        """Test successful recommendations fetching"""
        # Sample response data
        sample_data = {
            "base_currency": "USD",
            "recommendations": [
                {
                    "arrival_airport": "MEX",
                    "city": "Mexico City",
                    "country": "Mexico",
                    "exchange_rate": 17.5,
                    "exchange_rate_trend": 2.5,
                    "score": 85.5,
                    "flight_route": {"Airlines": "Delta", "Stops": "0"},
                    "fare": {
                        "price": "350",
                        "currency": "USD",
                        "airlines": ["Delta"],
                        "outbound_date": "2023-10-15",
                        "return_date": "2023-10-22",
                        "duration": "4h 30m",
                    },
                }
            ],
        }

        # Configure mocks
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_data
        mock_get.return_value = mock_response

        # Create spinner mock
        mock_spinner = MagicMock()
        mock_st.spinner.return_value.__enter__.return_value = mock_spinner

        # Call the function
        result = get_recommendations(
            "JFK",
            max_results=1,
            direct_only=True,
            include_fares=True,
            use_realtime_data=True,
        )

        # Assertions
        self.assertEqual(result, sample_data)
        mock_get.assert_called()
        self.assertIsNotNone(result)
        if result:
            self.assertEqual(
                result["recommendations"][0]["city"], "Mexico City"
            )

    @patch("ChasquiFX.requests.get")
    @patch("ChasquiFX.st")
    def test_get_recommendations_with_dates(self, mock_st, mock_get):
        """Test recommendations with date parameters"""
        # Configure mocks
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"recommendations": []}
        mock_get.return_value = mock_response

        # Create spinner mock
        mock_spinner = MagicMock()
        mock_st.spinner.return_value.__enter__.return_value = mock_spinner

        # Call the function with dates
        get_recommendations(
            "JFK", outbound_date="2023-12-01", return_date="2023-12-08"
        )

        # Check that dates were passed correctly
        args, kwargs = mock_get.call_args
        self.assertEqual(kwargs["params"]["outbound_date"], "2023-12-01")
        self.assertEqual(kwargs["params"]["return_date"], "2023-12-08")

    @patch("ChasquiFX.requests.get")
    @patch("ChasquiFX.st")
    def test_get_recommendations_api_error(self, mock_st, mock_get):
        """Test handling of API error responses"""
        # Configure mocks for error response
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_get.return_value = mock_response

        # Create spinner mock
        mock_spinner = MagicMock()
        mock_st.spinner.return_value.__enter__.return_value = mock_spinner

        # Call the function
        result = get_recommendations("JFK")

        # Assertions
        self.assertIsNone(result)
        mock_st.error.assert_called_with(
            "API Error: 500 - Internal Server Error"
        )

    @patch("ChasquiFX.requests.get")
    def test_get_routes_success(self, mock_get):
        """Test successful route information retrieval"""
        # Sample route data
        route_data = {
            "direct_routes": [{"airline": "AA", "flight": "AA123"}],
            "one_stop_routes": [{"segments": ["AA123", "AA456"]}],
        }

        # Configure mock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = route_data
        mock_get.return_value = mock_response

        # Call function
        result = get_routes("JFK", "LAX")

        # Assertions
        self.assertEqual(result, route_data)
        mock_get.assert_called_with(
            "http://localhost:8000/routes/JFK/LAX", timeout=10
        )

    @patch("ChasquiFX.requests.get")
    def test_get_routes_failure(self, mock_get):
        """Test route information retrieval failure"""
        # Configure mock for error
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        # Call function
        result = get_routes("JFK", "XYZ")  # XYZ is an invalid airport code

        # Assertions
        self.assertIsNone(result)
        mock_get.assert_called_with(
            "http://localhost:8000/routes/JFK/XYZ", timeout=10
        )

    def test_save_and_remove_favorite(self):
        """Test saving and removing favorites"""

        # Create a dictionary-like object for session_state that works with both
        # attribute access (st.session_state.favorites) and
        # dictionary access (st.session_state["favorites"])
        class DictWithAttrs(dict):
            def __getattr__(self, key):
                return self[key] if key in self else None

            def __setattr__(self, key, value):
                self[key] = value

        # Replace the mock_st.session_state with our custom dictionary
        self.mock_st.session_state = DictWithAttrs()

        # Test saving a favorite
        destination = "MEX-Mexico"
        save_result = save_favorite(destination)

        # Verify the result and the session state
        self.assertTrue(save_result)
        self.assertIn("favorites", self.mock_st.session_state)
        self.assertIn(destination, self.mock_st.session_state["favorites"])

        # Test saving the same favorite again (should return False)
        save_again_result = save_favorite(destination)
        self.assertFalse(save_again_result)

        # Test removing a favorite
        remove_result = remove_favorite(destination)
        self.assertTrue(remove_result)
        self.assertNotIn(destination, self.mock_st.session_state["favorites"])

        # Test removing a non-existent favorite
        remove_nonexistent = remove_favorite("Nonexistent")
        self.assertFalse(remove_nonexistent)


if __name__ == "__main__":
    unittest.main()
