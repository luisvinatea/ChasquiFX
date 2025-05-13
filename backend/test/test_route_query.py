import unittest
import os
import pandas as pd
import tempfile
import shutil
from unittest.mock import patch
import sys
import json

# Add parent directory to path to import geo_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.geo_service import (
    find_routes,
    extract_data,
    build_route_index,
    find_direct_routes,
    find_one_stop_routes,
    find_two_stop_routes,
    transform_data,
    save_route_data,
    load_data,
)


class TestRouteQuery(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.test_data_dir = os.path.join(self.temp_dir, "test_data")
        os.makedirs(self.test_data_dir, exist_ok=True)

        # Create test routes data
        self.test_routes = [
            {
                "Airline-IATA": "LA",
                "Airline-Name": "LATAM",
                "Departure-IATA": "FLN",
                "Arrival-IATA": "LIM",
                "Route": "FLN-LIM",
            },
            {
                "Airline-IATA": "AV",
                "Airline-Name": "Avianca",
                "Departure-IATA": "FLN",
                "Arrival-IATA": "BOG",
                "Route": "FLN-BOG",
            },
            {
                "Airline-IATA": "AV",
                "Airline-Name": "Avianca",
                "Departure-IATA": "BOG",
                "Arrival-IATA": "LIM",
                "Route": "BOG-LIM",
            },
            {
                "Airline-IATA": "AA",
                "Airline-Name": "American",
                "Departure-IATA": "FLN",
                "Arrival-IATA": "MIA",
                "Route": "FLN-MIA",
            },
            {
                "Airline-IATA": "AA",
                "Airline-Name": "American",
                "Departure-IATA": "MIA",
                "Arrival-IATA": "JFK",
                "Route": "MIA-JFK",
            },
            {
                "Airline-IATA": "DL",
                "Airline-Name": "Delta",
                "Departure-IATA": "JFK",
                "Arrival-IATA": "LIM",
                "Route": "JFK-LIM",
            },
        ]

        # Save test data
        self.routes_file = os.path.join(self.test_data_dir, "routes.json")
        with open(self.routes_file, "w") as f:
            json.dump(self.test_routes, f)

        # Create dataframe
        self.df = pd.DataFrame(self.test_routes)

    def tearDown(self):
        """Tear down test fixtures"""
        shutil.rmtree(self.temp_dir)

    def test_extract_data_json(self):
        """Test extracting data from JSON file"""
        result = extract_data(self.routes_file)
        self.assertFalse(result.empty)
        self.assertEqual(len(result), 6)
        self.assertIn("Departure-IATA", result.columns)

    def test_extract_data_invalid_file(self):
        """Test extracting data from non-existent file"""
        result = extract_data("nonexistent_file.json")
        self.assertTrue(result.empty)

    def test_build_route_index(self):
        """Test building route index structures"""
        route_dict, airports_from, airports_to = build_route_index(self.df)

        # Check route dictionary
        self.assertIn(("FLN", "LIM"), route_dict)
        self.assertEqual(len(route_dict[("FLN", "LIM")]), 1)

        # Check departure airport connections
        self.assertIn("FLN", airports_from)
        self.assertIn("LIM", airports_from[("FLN")])

        # Check arrival airport connections
        self.assertIn("LIM", airports_to)
        self.assertIn("FLN", airports_to[("LIM")])

    def test_find_direct_routes(self):
        """Test finding direct routes"""
        route_dict, _, _ = build_route_index(self.df)
        direct = find_direct_routes(self.df, "FLN", "LIM", route_dict)

        self.assertFalse(direct.empty)
        self.assertEqual(len(direct), 1)
        self.assertEqual(direct.iloc[0]["Route"], "FLN-LIM")

    def test_find_one_stop_routes(self):
        """Test finding one-stop routes"""
        _, airports_from, airports_to = build_route_index(self.df)
        one_stop = find_one_stop_routes(
            self.df, "FLN", "LIM", airports_from, airports_to
        )

        self.assertFalse(one_stop.empty)
        self.assertEqual(len(one_stop), 1)
        self.assertEqual(one_stop.iloc[0]["Route_leg1"], "FLN-BOG")
        self.assertEqual(one_stop.iloc[0]["Route_leg2"], "BOG-LIM")

    def test_find_two_stop_routes(self):
        """Test finding two-stop routes"""
        _, airports_from, airports_to = build_route_index(self.df)
        two_stop = find_two_stop_routes(
            self.df, "FLN", "LIM", airports_from, airports_to
        )

        self.assertFalse(two_stop.empty)
        self.assertEqual(len(two_stop), 1)
        self.assertEqual(two_stop.iloc[0]["Route_leg1"], "FLN-MIA")
        self.assertEqual(two_stop.iloc[0]["Route_leg2"], "MIA-JFK")
        self.assertEqual(two_stop.iloc[0]["Route"], "JFK-LIM")

    def test_transform_data(self):
        """Test transforming data to find routes"""
        routes = transform_data(self.df, "FLN", "LIM")

        self.assertIn("direct", routes)
        self.assertIn("one_stop", routes)
        self.assertIn("two_stop", routes)

        self.assertEqual(len(routes["direct"]), 1)
        self.assertEqual(len(routes["one_stop"]), 1)
        self.assertEqual(len(routes["two_stop"]), 1)

    def test_save_route_data(self):
        """Test saving route data"""
        output_file = os.path.join(self.temp_dir, "test_output.parquet")
        save_route_data(
            self.df, output_file, ["Airline-IATA", "Airline-Name", "Route"]
        )

        self.assertTrue(os.path.exists(output_file))
        result = pd.read_parquet(output_file)
        self.assertEqual(len(result), 6)
        self.assertIn("Airline-IATA", result.columns)

    @patch("api.geo_service.save_route_data")
    def test_load_data(self, mock_save):
        """Test loading data with mocked save function"""
        routes = {
            "direct": pd.DataFrame(self.test_routes[0:1]),
            "one_stop": pd.DataFrame(),
            "two_stop": pd.DataFrame(),
        }

        load_data(routes, self.temp_dir)
        self.assertEqual(mock_save.call_count, 3)

    @patch("api.geo_service.extract_data")
    @patch("api.geo_service.transform_data")
    @patch("api.geo_service.load_data")
    def test_find_routes_pipeline(
        self, mock_load, mock_transform, mock_extract
    ):
        """Test the full ETL pipeline"""
        mock_extract.return_value = self.df
        mock_transform.return_value = {
            "direct": pd.DataFrame(self.test_routes[0:1]),
            "one_stop": pd.DataFrame(),
            "two_stop": pd.DataFrame(),
        }

        result = find_routes("FLN", "LIM", data_dir=self.test_data_dir)

        mock_extract.assert_called_once()
        mock_transform.assert_called_once()
        mock_load.assert_called_once()
        self.assertEqual(len(result["direct"]), 1)

    def test_find_routes_integration(self):
        """Test the full integration of find_routes"""
        output_dir = os.path.join(self.test_data_dir, "ready")
        os.makedirs(output_dir, exist_ok=True)

        result = find_routes(
            "FLN",
            "LIM",
            data_dir=self.test_data_dir,
            input_path="routes.json",
            output_dir="ready",
        )

        self.assertIn("direct", result)
        self.assertIn("one_stop", result)
        self.assertIn("two_stop", result)

        # Check output files were created
        direct_path = os.path.join(output_dir, "direct_flights.parquet")
        self.assertTrue(os.path.exists(direct_path))


if __name__ == "__main__":
    unittest.main()
