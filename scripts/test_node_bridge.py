#!/usr/bin/env python3
"""
Test script for the Node-Python bridge functions.

This script tests all the functions exposed by the node_adapter module.
Run this script from the project root directory.
"""

import os
import sys
import json

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import the adapter module
from backend.api.adapters.node_adapter import (  # noqa: E402
    get_exchange_rates,
    get_service_status,
    reset_quota_status,
    get_recommendations,
    retrieve_parquet_data,
    json_to_parquet,
)


def test_forex_functions():
    """Test forex service functions."""
    print("\n=== Testing Forex Functions ===\n")

    # Test get_exchange_rates
    print("Testing get_exchange_rates...")
    result = get_exchange_rates("USD", "EUR")
    print(json.dumps(result, indent=2))

    # Test get_service_status
    print("\nTesting get_service_status...")
    result = get_service_status()
    print(json.dumps(result, indent=2))

    # Test reset_quota_status
    print("\nTesting reset_quota_status...")
    result = reset_quota_status()
    print(json.dumps(result, indent=2))


def test_recommendation_functions():
    """Test recommendation service functions."""
    print("\n=== Testing Recommendation Functions ===\n")

    # Test get_recommendations with string params
    print("Testing get_recommendations with string params...")
    result = get_recommendations(
        "USD", "JFK", limit="5", min_trend="-0.5", include_fares="true"
    )
    print(f"Got {len(result)} recommendations")
    if result:
        print(json.dumps(result[0], indent=2))

    # Test get_recommendations with native types
    print("\nTesting get_recommendations with native types...")
    result = get_recommendations(
        "USD", "JFK", limit=5, min_trend=-0.5, include_fares=True
    )
    print(f"Got {len(result)} recommendations")
    if result:
        print(json.dumps(result[0], indent=2))


def test_data_processing_functions():
    """Test data processing functions."""
    print("\n=== Testing Data Processing Functions ===\n")

    # Create sample JSON data
    sample_data = [
        {"id": 1, "name": "Alice", "age": 30},
        {"id": 2, "name": "Bob", "age": 25},
        {"id": 3, "name": "Charlie", "age": 35},
    ]

    # Save to temp file
    temp_dir = os.path.join(os.path.dirname(__file__), "temp")
    os.makedirs(temp_dir, exist_ok=True)

    # Test json_to_parquet
    print("Testing json_to_parquet...")
    json_path = os.path.join(temp_dir, "test_data.json")
    parquet_path = os.path.join(temp_dir, "test_data.parquet")

    with open(json_path, "w") as f:
        json.dump(sample_data, f)

    result = json_to_parquet(json_path, parquet_path)
    print(json.dumps(result, indent=2))

    # Test direct conversion with dict
    print("\nTesting json_to_parquet with dict...")
    parquet_path2 = os.path.join(temp_dir, "test_data2.parquet")
    result = json_to_parquet(sample_data, parquet_path2)
    print(json.dumps(result, indent=2))

    # Test retrieve_parquet_data
    print("\nTesting retrieve_parquet_data...")
    if os.path.exists(parquet_path):
        result = retrieve_parquet_data(parquet_path)
        print(json.dumps(list(result)[:2], indent=2))

        # Test with filters
        print("\nTesting retrieve_parquet_data with filters...")
        result = retrieve_parquet_data(parquet_path, {"age": 30})
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    print("Testing Node-Python Bridge Functions")
    print("===================================")

    # Test all functions
    test_forex_functions()
    test_recommendation_functions()
    test_data_processing_functions()

    print("\nTests completed!")
