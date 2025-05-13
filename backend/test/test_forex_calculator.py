import unittest
import os
import sys
import pandas as pd

# Add parent directory to path to enable imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.recommendation_service import (
    calculate_cross_rate,
    load_forex_data,
    get_latest_rate,
)


class TestForexCalculator(unittest.TestCase):
    def test_calculate_cross_rate_same_currency(self):
        """Test calculating cross rate for the same currency."""
        rate, is_direct = calculate_cross_rate("USD", "USD")
        self.assertEqual(rate, 1.0)
        self.assertTrue(is_direct)

    def test_get_latest_rate_empty_df(self):
        """Test getting latest rate from empty dataframe."""
        df = pd.DataFrame()
        rate = get_latest_rate(df, "EURUSD=X")
        self.assertEqual(rate, 0.0)

    def test_load_forex_data_nonexistent(self):
        """Test loading forex data from nonexistent file."""
        df = load_forex_data("/path/does/not/exist.parquet")
        self.assertTrue(df.empty)


if __name__ == "__main__":
    unittest.main()
