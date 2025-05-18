#!/usr/bin/env python
"""
Example script demonstrating how to use Parquet data retrieval from Supabase.

This script provides practical examples of retrieving and working with
Parquet data stored in Supabase.

Usage:
  python -m backend.api.scripts.parquet_data_example [--data-type TYPE]
"""

import os
import sys
import asyncio
import argparse
import pandas as pd


# Add parent directory to path so we can import our modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(parent_dir))


async def example_retrieve_single_file(file_key: str) -> None:
    """
    Example of retrieving a single file by key.

    Args:
        file_key: Key of the file to retrieve
    """
    from data_processing.retrieval import retrieve_data_frame, get_metadata

    print(f"Retrieving file: {file_key}")
    print("-" * 40)

    # Get metadata first
    metadata = await get_metadata(file_key)
    print("File metadata:")
    print(f"  Size: {metadata.get('file_size', 'Unknown')} bytes")
    print(f"  Rows: {metadata.get('row_count', 'Unknown')}")
    print(f"  Columns: {metadata.get('column_count', 'Unknown')}")

    # Retrieve the data
    df = await retrieve_data_frame(file_key)

    if df is not None:
        print("\nDataFrame summary:")
        print(f"  Shape: {df.shape}")
        print(f"  Columns: {', '.join(df.columns)}")
        print("\nSample data:")
        print(df.head(5))
    else:
        print("Failed to retrieve data.")


async def example_query_with_filters(file_key: str) -> None:
    """
    Example of querying data with filters.

    Args:
        file_key: Key of the file to query
    """
    from data_processing.retrieval import query_data, get_metadata

    print(f"\nQuerying file with filters: {file_key}")
    print("-" * 40)

    # Get schema to understand the data
    metadata = await get_metadata(file_key)
    schema = metadata.get("schema", {})
    if schema:
        print("File schema:")
        for col, type_str in schema.items():
            print(f"  {col}: {type_str}")

    # Choose some columns and a filter based on the data type
    if "forex" in file_key.lower():
        # For forex data
        columns = [
            "base_currency",
            "target_currency",
            "exchange_rate",
            "timestamp",
        ]
        filters = {"base_currency": "USD"}
    elif "flight" in file_key.lower():
        # For flight data
        columns = [
            "flight_number",
            "origin",
            "destination",
            "price",
            "departure_date",
        ]
        filters = {"origin": "JFK"}
    else:
        # Default
        columns = None
        filters = {}

    # Query the data
    df = await query_data(file_key, filters, columns)

    if df is not None:
        print("\nFiltered data:")
        print(f"  Applied filter: {filters}")
        print(f"  Result shape: {df.shape}")
        print("\nSample filtered data:")
        print(df.head(5))
    else:
        print("Failed to retrieve filtered data.")


async def example_retrieve_by_type(data_type: str) -> None:
    """
    Example of retrieving all files of a specific type.

    Args:
        data_type: Type of data to retrieve ('flight', 'forex', 'geo')
    """
    from data_processing.retrieval import retrieve_data_by_type

    print(f"\nRetrieving all {data_type} data")
    print("-" * 40)

    # Get all data of this type
    data_dict = await retrieve_data_by_type(data_type)

    if data_dict:
        print(f"Found {len(data_dict)} files of type {data_type}")

        # Print summary of each file
        for key, df in data_dict.items():
            print(f"\nFile: {key}")
            print(f"  Shape: {df.shape}")
            memory_mb = df.memory_usage(deep=True).sum() / 1024**2
            print(f"  Memory usage: {memory_mb:.2f} MB")

        # Combine all dataframes if they have compatible schemas
        try:
            combined_df = pd.concat(list(data_dict.values()))
            print("\nCombined DataFrame:")
            print(f"  Total rows: {len(combined_df)}")
            memory_mb = combined_df.memory_usage(deep=True).sum() / 1024**2
            print(f"  Total memory: {memory_mb:.2f} MB")

            # Do some analysis on the combined data
            if "forex" in data_type.lower():
                # For forex data
                print("\nExchange rate summary:")
                if "exchange_rate" in combined_df.columns:
                    print(combined_df["exchange_rate"].describe())
            elif "flight" in data_type.lower():
                # For flight data
                print("\nFlight price summary:")
                if "price" in combined_df.columns:
                    print(combined_df["price"].describe())

        except Exception as e:
            print(f"Could not combine dataframes: {e}")

    else:
        print(f"No {data_type} data found.")


async def run_examples(args: argparse.Namespace) -> None:
    """
    Run the examples based on command line args.

    Args:
        args: Command line arguments
    """
    # Example 1: Retrieve a single file
    if args.file_key:
        await example_retrieve_single_file(args.file_key)

        # If we have a file key, also show querying example
        await example_query_with_filters(args.file_key)

    # Example 2: Retrieve by data type
    if args.data_type:
        await example_retrieve_by_type(args.data_type)


def main() -> None:
    """
    Main entry point for the example script.
    """
    parser = argparse.ArgumentParser(
        description="Example script for Parquet data retrieval from Supabase"
    )
    parser.add_argument("--file-key", help="Specific file key to retrieve")
    parser.add_argument(
        "--data-type",
        choices=["flight", "flights", "forex", "geo"],
        help="Data type to retrieve",
    )

    args = parser.parse_args()

    if not args.file_key and not args.data_type:
        parser.print_help()
        sys.exit(0)

    asyncio.run(run_examples(args))


if __name__ == "__main__":
    main()
