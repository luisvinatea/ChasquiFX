"""
Unit tests for data processing functionality

This module tests the data processing utilities
from backend.api.data_processing.
"""

import os
import json
import shutil
import unittest
import tempfile

from backend.api.data_processing import (
    json_to_parquet,
    rename_directory_files,
    get_flight_renaming_config,
    get_forex_renaming_config,
    flatten_json,
)


class TestJsonToParquet(unittest.TestCase):
    """Test JSON to Parquet conversion functionality"""

    def setUp(self):
        # Create a temporary directory for test data
        self.test_dir = tempfile.mkdtemp()

        # Create test JSON data
        self.json_file = os.path.join(self.test_dir, "test.json")
        self.parquet_file = os.path.join(self.test_dir, "test.parquet")

        # Simple test data
        self.test_data = {
            "search_metadata": {
                "id": "test123",
                "created_at": "2025-05-18 10:00:00 UTC",
                "total_time_taken": 0.75,
            },
            "search_parameters": {"q": "EUR-USD", "hl": "en"},
            "nested": {"deeply": {"nested": {"value": "test"}}},
            "array": [1, 2, 3, 4, 5],
            "objects": [
                {"id": 1, "name": "Item 1"},
                {"id": 2, "name": "Item 2"},
            ],
        }

        # Write test data to JSON file
        with open(self.json_file, "w") as f:
            json.dump(self.test_data, f)

    def tearDown(self):
        # Remove temporary directory and its contents
        shutil.rmtree(self.test_dir)

    def test_json_to_parquet_conversion(self):
        """Test basic JSON to Parquet conversion"""
        # Convert JSON to Parquet
        result = json_to_parquet(self.json_file, self.parquet_file)

        # Check that conversion was successful
        self.assertTrue(result, "JSON to Parquet conversion should succeed")

        # Check that Parquet file was created
        self.assertTrue(
            os.path.exists(self.parquet_file),
            "Parquet file should exist after conversion",
        )

    def test_flatten_json(self):
        """Test flattening of nested JSON structures"""
        # Flatten the test data
        flattened = flatten_json(self.test_data)

        # Check that nested values are properly flattened
        self.assertIn("nested_deeply_nested_value", flattened)
        self.assertEqual(flattened["nested_deeply_nested_value"], "test")

        # Check that search metadata is properly flattened
        self.assertEqual(flattened["search_metadata_id"], "test123")
        self.assertEqual(flattened["search_parameters_q"], "EUR-USD")

        # Check that numeric values are preserved
        self.assertEqual(flattened["search_metadata_total_time_taken"], 0.75)


class TestFileRenaming(unittest.TestCase):
    """Test file renaming functionality"""

    def setUp(self):
        # Create a temporary directory for test data
        self.test_dir = tempfile.mkdtemp()

        # Create test flight data
        self.flight_dir = os.path.join(self.test_dir, "flights")
        os.makedirs(self.flight_dir)

        # Create test forex data
        self.forex_dir = os.path.join(self.test_dir, "forex")
        os.makedirs(self.forex_dir)

        # Create test flight JSON file
        self.flight_file = os.path.join(self.flight_dir, "flight_test.json")
        flight_data = {
            "search_metadata": {
                "id": "test123",
                "created_at": "2025-05-18 10:00:00 UTC",
            },
            "search_parameters": {
                "departure_id": "JFK",
                "arrival_id": "LHR",
                "outbound_date": "2025-06-15",
                "return_date": "2025-06-22",
            },
        }

        with open(self.flight_file, "w") as f:
            json.dump(flight_data, f)

        # Create test forex JSON file
        self.forex_file = os.path.join(self.forex_dir, "forex_test.json")
        forex_data = {
            "search_metadata": {
                "id": "test456",
                "created_at": "2025-05-18 10:00:00 UTC",
            },
            "search_parameters": {"q": "EUR-USD", "hl": "en"},
        }

        with open(self.forex_file, "w") as f:
            json.dump(forex_data, f)

    def tearDown(self):
        # Remove temporary directory and its contents
        shutil.rmtree(self.test_dir)

    def test_flight_file_renaming(self):
        """Test flight file renaming"""
        # Get flight renaming configuration
        config = get_flight_renaming_config()

        # Rename flight files
        success, failed, skipped = rename_directory_files(
            self.flight_dir, config["metadata_keys"], config["template"]
        )

        # Check that renaming was successful
        self.assertEqual(success, 1, "One file should be renamed")
        self.assertEqual(failed, 0, "No files should fail")

        # Check that the new file exists with expected name
        expected_name = "JFK_LHR_2025-06-15_2025-06-22.json"
        self.assertTrue(
            os.path.exists(os.path.join(self.flight_dir, expected_name)),
            f"Renamed file {expected_name} should exist",
        )

    def test_forex_file_renaming(self):
        """Test forex file renaming"""
        # Get forex renaming configuration
        config = get_forex_renaming_config()

        # Rename forex files
        success, failed, skipped = rename_directory_files(
            self.forex_dir, config["metadata_keys"], config["template"]
        )

        # Check that renaming was successful
        self.assertEqual(success, 1, "One file should be renamed")
        self.assertEqual(failed, 0, "No files should fail")

        # Check that the new file exists with expected name
        expected_name = "EUR-USD_2025-05-18 10:00:00 UTC.json"
        self.assertTrue(
            os.path.exists(os.path.join(self.forex_dir, expected_name)),
            f"Renamed file {expected_name} should exist",
        )


if __name__ == "__main__":
    unittest.main()
