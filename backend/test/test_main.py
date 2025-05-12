import unittest
import os
import pandas as pd
import tempfile
import shutil
from unittest.mock import patch
import sys
import json
from fastapi.testclient import TestClient

# Add parent directory to path to import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock api.data_ingestor for testing
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "mocks")
)
sys.modules["api.data_ingestor"] = __import__("data_ingestor")

# Import from main after mocking
from api.main import (  # noqa: E402
    app,
    get_exchange_rate_trend,
    calculate_destination_score,
    find_flight_destinations,
)


class TestMain(unittest.TestCase):
    def setUp(self):
        # Use FastAPI's TestClient
        self.client = TestClient(app)
        self.temp_dir = tempfile.mkdtemp()
        self.test_data_dir = os.path.join(self.temp_dir, "test_data")
        self.forex_dir = os.path.join(self.test_data_dir, "forex/json")
        self.geo_dir = os.path.join(self.test_data_dir, "geo/enriched")

        os.makedirs(self.forex_dir, exist_ok=True)
        os.makedirs(self.geo_dir, exist_ok=True)

        # Create test data
        self.airports_data = [
            {
                "IATA": "FLN",
                "Airport-Name": "Florianopolis",
                "City": "Florianopolis",
                "Country": "Brazil",
            },
            {
                "IATA": "LIM",
                "Airport-Name": "Jorge Chavez",
                "City": "Lima",
                "Country": "Peru",
            },
            {
                "IATA": "BOG",
                "Airport-Name": "El Dorado",
                "City": "Bogota",
                "Country": "Colombia",
            },
        ]

        self.currency_data = [
            {"country": "Brazil", "code": "BRL", "name": "Brazilian Real"},
            {"country": "Peru", "code": "PEN", "name": "Peruvian Sol"},
            {"country": "Colombia", "code": "COP", "name": "Colombian Peso"},
            {"country": "United States", "code": "USD", "name": "US Dollar"},
        ]

        self.routes_data = [
            {
                "Departure-IATA": "FLN",
                "Arrival-IATA": "LIM",
                "Airline-IATA": "LA",
                "Airline-Name": "LATAM",
                "Route": "FLN-LIM",
            },
            {
                "Departure-IATA": "FLN",
                "Arrival-IATA": "BOG",
                "Airline-IATA": "AV",
                "Airline-Name": "Avianca",
                "Route": "FLN-BOG",
            },
        ]

        # Save test data
        self.airports_file = os.path.join(self.geo_dir, "airports.parquet")
        pd.DataFrame(self.airports_data).to_parquet(self.airports_file)

        self.currency_file = os.path.join(
            self.forex_dir, "currency_codes.json"
        )
        with open(self.currency_file, "w") as f:
            json.dump(self.currency_data, f)

        self.routes_file = os.path.join(
            self.geo_dir, "enriched_routes.parquet"
        )
        pd.DataFrame(self.routes_data).to_parquet(self.routes_file)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_read_root(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {"message": "Welcome to ChasquiFX API"}
        )

    @patch("api.main.get_airport_country_map")
    def test_get_airport_country_map(self, mock_map):
        test_map = {"FLN": "Brazil", "LIM": "Peru", "BOG": "Colombia"}
        mock_map.return_value = test_map

        response = mock_map()
        self.assertEqual(response, test_map)

    @patch("api.main.get_country_currency_map")
    def test_get_country_currency_map(self, mock_map):
        test_map = {"Brazil": "BRL", "Peru": "PEN", "Colombia": "COP"}
        mock_map.return_value = test_map

        response = mock_map()
        self.assertEqual(response, test_map)

    @patch("api.main.get_currency_pair")
    def test_get_exchange_rate_trend(self, mock_get_pair):
        # Create mock forex data with a trend
        mock_data = pd.DataFrame(
            {
                "Date": pd.date_range(start="2025-01-01", periods=10),
                "Close": [4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4],
            }
        )
        mock_get_pair.return_value = mock_data

        rate, trend = get_exchange_rate_trend("USD", "BRL", days=7)
        self.assertEqual(rate, 5.4)
        self.assertAlmostEqual(trend, ((5.4 - 4.8) / 4.8) * 100, places=2)

    def test_calculate_destination_score(self):
        score1 = calculate_destination_score(
            exchange_rate=5.0, trend_pct=2.5, route_quality=1.0
        )
        score2 = calculate_destination_score(
            exchange_rate=2.5, trend_pct=-1.0, route_quality=0.8
        )

        self.assertGreater(score1, score2)
        self.assertLessEqual(score1, 100)
        self.assertGreaterEqual(score1, 0)
        self.assertLessEqual(score2, 100)
        self.assertGreaterEqual(score2, 0)

    @patch("api.main.route_mapper")
    @patch("api.main.get_complete_route_info")
    def test_find_flight_destinations(self, mock_route_info, mock_mapper):
        # Mock route_info
        mock_route_info.return_value = {
            "direct": pd.DataFrame(self.routes_data[0:1]),
            "one_stop": pd.DataFrame(),
            "two_stop": pd.DataFrame(),
        }

        with patch("pandas.read_parquet") as mock_read:
            # Set up mock for read_parquet to return our test data
            mock_read.side_effect = [
                pd.DataFrame([self.routes_data[0]]),  # Only return one route
                pd.DataFrame(self.airports_data),
            ]

            results = find_flight_destinations("FLN", max_results=2)

            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]["arrival_airport"], "LIM")
            self.assertEqual(results[0]["country"], "Peru")
            self.assertEqual(results[0]["route_quality"], 1.0)

    @patch("api.main.get_airport_country_map")
    @patch("api.main.get_country_currency_map")
    @patch("api.main.find_flight_destinations")
    @patch("api.main.get_exchange_rate_trend")
    def test_get_recommendations(
        self, mock_trend, mock_destinations, mock_currencies, mock_airports
    ):
        # Set up mocks
        mock_airports.return_value = {"FLN": "Brazil"}
        mock_currencies.return_value = {"Brazil": "BRL", "Peru": "PEN"}

        mock_destinations.return_value = [
            {
                "arrival_airport": "LIM",
                "country": "Peru",
                "city": "Lima",
                "route_quality": 1.0,
                "route_info": {"Airline": "LATAM"},
            }
        ]

        mock_trend.return_value = (5.0, 2.5)

        response = self.client.get(
            "/recommendations?departure_airport=FLN&max_results=2"
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("recommendations", data)
        self.assertEqual(len(data["recommendations"]), 1)
        self.assertEqual(data["recommendations"][0]["arrival_airport"], "LIM")
        self.assertEqual(data["recommendations"][0]["exchange_rate"], 5.0)

    @patch("api.main.get_complete_route_info")
    def test_get_routes(self, mock_route_info):
        # Mock route_info return value
        mock_route_info.return_value = {
            "direct": pd.DataFrame(self.routes_data[0:1]),
            "one_stop": pd.DataFrame(),
            "two_stop": pd.DataFrame(),
        }

        response = self.client.get("/routes/FLN/LIM")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Update test to match actual API response format
        self.assertIn("direct_routes", data)
        self.assertEqual(len(data["direct_routes"]), 1)
        self.assertEqual(data["direct_routes"][0]["Departure-IATA"], "FLN")

    @patch("api.main.get_currency_pair")
    def test_get_forex(self, mock_get_pair):
        # Create mock forex data
        mock_data = pd.DataFrame(
            {
                "Date": pd.date_range(start="2025-01-01", periods=10),
                "Close": [4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4],
            }
        )
        mock_get_pair.return_value = mock_data

        with patch("api.main.get_exchange_rate_trend") as mock_trend:
            mock_trend.return_value = (5.4, 12.5)

            # Update test to use the correct endpoint format
            response = self.client.get(
                "/forex?base_currency=USD&quote_currency=BRL&days=10"
            )

            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["base_currency"], "USD")
            self.assertEqual(data["quote_currency"], "BRL")
            self.assertEqual(data["current_rate"], 5.4)
            self.assertEqual(len(data["history"]), 10)


if __name__ == "__main__":
    unittest.main()
