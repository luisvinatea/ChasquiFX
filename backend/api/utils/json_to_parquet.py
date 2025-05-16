"""
json_to_parquet.py
utility to convert JSON files to Parquet format.
This script reads a JSON file, converts it to a Parquet file,
and saves it to the specified path.
"""

import json
import os
import argparse
import logging
import sys
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up argument parser
parser = argparse.ArgumentParser(description="Convert JSON to Parquet")
parser.add_argument(
    "--json_file_path",
    type=str,
    required=True,
    help="Path to the input JSON file",
)
parser.add_argument(
    "--parquet_file_path",
    type=str,
    required=True,
    help="Path to the output Parquet file",
)

# Add optional parameter for resolving paths from different base directories
parser.add_argument(
    "--base_dir",
    type=str,
    help=(
        "Base directory to resolve relative paths from "
        "(default: current working directory)"
    ),
    default="",
)

# Display usage example in the epilog
parser.epilog = (
    "Example usage:\n"
    "  python json_to_parquet.py --json_file_path "
    "../assets/data/geo/json/airports.json "
    "--parquet_file_path "
    "../assets/data/geo/enriched/airports.parquet"
)
parser.formatter_class = argparse.RawDescriptionHelpFormatter

args = parser.parse_args()

# Get the JSON file path and Parquet file path from command line arguments
json_file_path = args.json_file_path
parquet_file_path = args.parquet_file_path
base_dir = args.base_dir


# Resolve file paths
def resolve_path(path, base=None):
    """Resolve a possibly relative path against various base directories."""
    # First, check if it's an absolute path already
    if os.path.isabs(path):
        return path

    # Try resolving from provided base directory
    if base:
        resolved_path = os.path.join(base, path)
        if os.path.exists(resolved_path) or not os.path.exists(
            os.path.dirname(resolved_path)
        ):
            return os.path.abspath(resolved_path)

    # Try resolving from the backend directory (project root)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(
        os.path.dirname(current_dir)
    )  # This is the backend directory
    project_path = os.path.join(backend_dir, path)

    # For output files, we'll use the backend directory as base even if the
    # path doesn't exist yet
    if not os.path.exists(os.path.dirname(project_path)):
        os.makedirs(os.path.dirname(project_path), exist_ok=True)
    return os.path.abspath(project_path)


# Resolve the JSON file path
resolved_json_path = resolve_path(json_file_path, base_dir)

# For output files, always resolve from the backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir))
resolved_parquet_path = os.path.join(backend_dir, parquet_file_path)

# Add the parent directory to the system path
sys.path.append(backend_dir)

# Check if the JSON file exists
if not os.path.exists(resolved_json_path):
    logger.error(f"JSON file does not exist: {json_file_path}")
    logger.error(f"Tried to resolve as: {resolved_json_path}")
    logger.error(f"Current working directory: {os.getcwd()}")
    logger.error(f"Project root directory: {backend_dir}")
    sys.exit(1)

# Check if the JSON file is empty
if os.path.getsize(resolved_json_path) == 0:
    logger.error(f"JSON file is empty: {resolved_json_path}")
    sys.exit(1)

# Check if the JSON file is valid
try:
    with open(resolved_json_path, "r") as json_file:
        json.load(json_file)
except json.JSONDecodeError as e:
    logger.error(f"Invalid JSON file: {resolved_json_path}")
    logger.error(e)
    sys.exit(1)

# Ensure the output directory exists
os.makedirs(os.path.dirname(resolved_parquet_path), exist_ok=True)

# Check if the Parquet file already exists
if os.path.exists(resolved_parquet_path):
    logger.warning(
        (
            "Parquet file already exists and will be overwritten: "
            f"{resolved_parquet_path}"
        )
    )


def json_to_parquet(json_file_path: str, parquet_file_path: str) -> None:
    """
    Convert a JSON file to Parquet format.

    Args:
        json_file_path: Path to the input JSON file
        parquet_file_path: Path to save the output Parquet file
    """
    try:
        # Read the JSON file with Python's built-in JSON parser first
        logger.info(f"Reading JSON from {json_file_path}")
        with open(json_file_path, "r") as file:
            data = json.load(file)

        # Ensure data is a list of dictionaries
        if not isinstance(data, list):
            logger.warning(
                (
                    "JSON data is not a list. "
                    "Converting to a list with a single item."
                )
            )
            data = [data]

        # Identify all columns from the data to ensure we preserve all fields
        all_columns = set()
        for item in data:
            if isinstance(item, dict):
                all_columns.update(item.keys())

        logger.info(f"Found {len(all_columns)} unique columns in the data")

        # Replace "\\N" with None in the entire dataset
        def normalize_data(item):
            if isinstance(item, dict):
                return {
                    k: (None if v == "\\N" else normalize_data(v))
                    for k, v in item.items()
                }
            elif isinstance(item, list):
                return [normalize_data(i) for i in item]
            elif isinstance(item, str) and item == "\\N":
                return None
            else:
                return item

        # Normalize all data
        normalized_data = [normalize_data(item) for item in data]

        # Convert to pandas DataFrame with NA values properly handled
        logger.info("Converting data to pandas DataFrame")
        df = pd.DataFrame(normalized_data)

        # Ensure all columns from JSON are in DataFrame even if they're empty
        for column in all_columns:
            if column not in df.columns:
                df[column] = None

        # Explicitly set string columns to string dtype to preserve them
        string_columns = [
            "Name",
            "City",
            "Country",
            "IATA",
            "ICAO",
            "DST",
            "TzDatabaseTimezone",
            "Type",
            "Source",
        ]

        for col in string_columns:
            if col in df.columns:
                df[col] = df[col].astype("string")

        # Optimize numeric columns
        numeric_columns = [
            "AirportID",
            "Latitude",
            "Longitude",
            "Altitude",
            "Timezone",
        ]
        for col in numeric_columns:
            if col in df.columns:
                try:
                    df[col] = pd.to_numeric(df[col], errors="coerce")
                except Exception as e:
                    logger.warning(
                        f"Could not convert {col} to numeric: {str(e)}"
                    )

        # Log column data types before conversion
        logger.info("DataFrame column types before conversion to parquet:")
        for col, dtype in df.dtypes.items():
            logger.info(f"  {col}: {dtype}")

        # Convert pandas DataFrame to PyArrow Table
        logger.info("Converting to PyArrow Table")

        # Use PyArrow schema for better type control
        schema = pa.Schema.from_pandas(df)
        logger.info("PyArrow schema:")
        for field in schema:
            logger.info(f"  {field.name}: {field.type}")

        table = pa.Table.from_pandas(df, preserve_index=False)

        # Log table info for debugging
        logger.info(
            f"PyArrow table has {len(table.column_names)} columns: "
            f"{table.column_names}"
        )

        # Ensure the output directory exists
        os.makedirs(os.path.dirname(parquet_file_path), exist_ok=True)

        # Write PyArrow Table to Parquet file
        logger.info(f"Writing Parquet to {parquet_file_path}")
        pq.write_table(table, parquet_file_path)

        # Verify the parquet file was created correctly
        if os.path.exists(parquet_file_path):
            parquet_size = os.path.getsize(parquet_file_path)
            logger.info(
                (
                    f"Parquet file created successfully. "
                    f"Size: {parquet_size} bytes"
                )
            )

            # Read back the written parquet file to verify contents
            verify_table = pq.read_table(parquet_file_path)
            logger.info(
                (
                    f"Verification - Parquet file has "
                    f"{len(verify_table.column_names)} columns: "
                    f"{verify_table.column_names}"
                )
            )
        else:
            logger.error("Failed to create Parquet file!")

    except Exception as e:
        logger.error(f"Error converting JSON to Parquet: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        raise


if __name__ == "__main__":
    logger.info(f"Converting {resolved_json_path} to {resolved_parquet_path}")
    json_to_parquet(resolved_json_path, resolved_parquet_path)
    logger.info("Conversion completed successfully.")
