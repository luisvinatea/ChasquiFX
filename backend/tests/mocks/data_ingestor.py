"""Mock data_ingestor module for testing"""

import pandas as pd


def get_forex_data(symbols=None, start_date=None, end_date=None):
    """Mock function for getting forex data"""
    return {"success": True}


def get_currency_pair(
    base_currency, quote_currency, forex_file=None, mapping_file=None
):
    """Mock function for getting currency pair data"""
    # Return a DataFrame with mock forex data
    return pd.DataFrame(
        {
            "Date": pd.date_range(start="2025-01-01", periods=10),
            "Close": [4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4],
        }
    )
