import unittest
from unittest.mock import patch
import pandas as pd
import os
import tempfile
import sys
from pathlib import Path
from typing import Any

# Add parent directory to path to import data_ingestor
sys.path.append(str(Path(__file__).parent.parent))
from api.data_ingestor import (
    create_pairs,
    fetch_symbol_data,
    process_data,
    save_data_parquet,
    load_data_parquet,
    get_forex_data,
    get_currency_pair,
)


class TestDataIngestor(unittest.TestCase):
    def setUp(self):
        # Create temporary directory for test files
        self.temp_dir = tempfile.TemporaryDirectory()

        # Sample data for tests
        self.sample_currency_codes = {"USD": "USD", "EUR": "EUR", "JPY": "JPY"}
        sample_df = pd.DataFrame({
            "Date": pd.date_range(start="2023-01-01", periods=5),  # type: ignore
            "Close": [1.1, 1.2, 1.3, 1.4, 1.5],
            "Open": [1.0, 1.1, 1.2, 1.3, 1.4],
        })
        self.sample_df = sample_df.set_index("Date")  # type: ignore

        # Create MultiIndex DataFrame
        tuples = [("USDEUR=X", "Close"), ("USDEUR=X", "Open")]
        multi_cols = pd.MultiIndex.from_tuples(  # type: ignore
            tuples, names=["Symbol", "Price"]
        )  # type: ignore
        self.multi_df = pd.DataFrame(
            {
                ("USDEUR=X", "Close"): [1.1, 1.2, 1.3, 1.4, 1.5],
                ("USDEUR=X", "Open"): [1.0, 1.1, 1.2, 1.3, 1.4],
            },
            index=pd.date_range(start="2023-01-01", periods=5),  # type: ignore
        )
        self.multi_df.columns = multi_cols

    def tearDown(self):
        # Clean up temporary directory
        self.temp_dir.cleanup()

    def test_create_pairs(self):
        pairs = create_pairs(self.sample_currency_codes)
        self.assertEqual(len(pairs), 6)  # 3 currencies, 3*2 pairs
        self.assertIn("USDEUR=X", pairs)
        self.assertIn("USDJPY=X", pairs)
        self.assertIn("EURJPY=X", pairs)

    @patch("api.data_ingestor.yf.download")
    def test_fetch_symbol_data(self, mock_download: Any):
        # Mock yfinance download to return our sample data
        mock_download.return_value = self.sample_df

        symbol, df = fetch_symbol_data("USDEUR=X", "2023-01-01", "2023-01-05")

        self.assertEqual(symbol, "USDEUR=X")
        self.assertFalse(df.empty)
        self.assertEqual(len(df), 5)
        mock_download.assert_called_once()  # type: ignore

    def test_process_data(self):
        # Create a DataFrame with some NaN values
        df_with_nan = self.sample_df.copy()
        df_with_nan.iloc[2, 0] = None

        # Process the data
        processed_df = process_data(df_with_nan)

        # Check that NaN values have been filled
        self.assertFalse(processed_df.isna().any().any())

    def test_save_and_load_parquet(self):
        # Create file paths
        parquet_path = os.path.join(self.temp_dir.name, "test_data.parquet")
        mapping_path = os.path.join(self.temp_dir.name, "test_mappings.json")

        # Save DataFrame to parquet
        save_data_parquet(self.multi_df, parquet_path, mapping_path)

        # Verify files were created
        self.assertTrue(os.path.exists(parquet_path))
        self.assertTrue(os.path.exists(mapping_path))

        # Load data back
        loaded_df, mappings = load_data_parquet(parquet_path, mapping_path)

        # Check data was loaded correctly
        self.assertFalse(loaded_df.empty)
        self.assertIn("USDEUR=X", mappings)
        self.assertEqual(mappings["USDEUR=X"]["base_currency"], "USD")
        self.assertEqual(mappings["USDEUR=X"]["quote_currency"], "EUR")

    @patch("api.data_ingestor.fetch_data_parallel")
    def test_get_forex_data(self, mock_fetch_data: Any):
        # Mock fetch_data_parallel to return sample DataFrame
        mock_fetch_data.return_value = self.multi_df

        # Create file paths
        parquet_path = os.path.join(self.temp_dir.name, "forex_data.parquet")
        mapping_path = os.path.join(self.temp_dir.name, "forex_mappings.json")

        # Call get_forex_data
        result_df = get_forex_data(
            symbols=["USDEUR=X"],
            start_date="2023-01-01",
            end_date="2023-01-05",
            parquet_file=parquet_path,
            mapping_file=mapping_path,
        )

        # Verify result
        self.assertFalse(result_df.empty)
        self.assertTrue(os.path.exists(parquet_path))
        self.assertTrue(os.path.exists(mapping_path))

    def test_get_currency_pair(self):
        # Create file paths and save sample data first
        parquet_path = os.path.join(self.temp_dir.name, "forex_data.parquet")
        mapping_path = os.path.join(self.temp_dir.name, "forex_mappings.json")

        save_data_parquet(self.multi_df, parquet_path, mapping_path)

        # Get currency pair data
        pair_df = get_currency_pair("USD", "EUR", parquet_path, mapping_path)

        # Verify result
        self.assertFalse(pair_df.empty)
        self.assertIn("Close", pair_df.columns)
        self.assertEqual(len(pair_df), 5)


if __name__ == "__main__":
    unittest.main()
