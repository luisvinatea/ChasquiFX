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


# Resolve file paths function - accessible when imported as a module
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

    # Try resolving from current working directory
    cwd_path = os.path.join(os.getcwd(), path)
    if os.path.exists(cwd_path):
        return os.path.abspath(cwd_path)

    # Try resolving from the backend directory (project root)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    project_path = os.path.join(project_root, path)

    # For output files, we'll use project root as base
    # even if path doesn't exist
    if not os.path.exists(os.path.dirname(project_path)):
        os.makedirs(os.path.dirname(project_path), exist_ok=True)
    return os.path.abspath(project_path)


def json_to_parquet(json_file_path: str, parquet_file_path: str) -> bool:
    """
    Convert a JSON file to Parquet format.

    Args:
        json_file_path: Path to the input JSON file
        parquet_file_path: Path to save the output Parquet file

    Returns:
        bool: True if conversion was successful, False otherwise
    """
    try:
        # Read the JSON file with Python's built-in JSON parser first
        logger.info(f"Reading JSON from {json_file_path}")
        with open(json_file_path, "r") as file:
            data = json.load(file)

        # Preprocess data to handle special values
        def clean_data(data):
            if isinstance(data, list):
                return [clean_data(item) for item in data]
            elif isinstance(data, dict):
                return {k: clean_data(v) for k, v in data.items()}
            elif isinstance(data, str) and data == "\\N":
                return None  # Convert \N to None/null
            else:
                return data

        # Clean the data to handle \N and other special values
        cleaned_data = clean_data(data)

        # Convert to pandas DataFrame with NA values properly handled
        logger.info("Converting data to pandas DataFrame")
        df = pd.DataFrame(cleaned_data)

        # Replace any remaining problematic values
        for col in df.columns:
            if df[col].dtype == "object":
                df[col] = df[col].replace("\\N", None)

        # Ensure all columns are properly typed
        logger.info("Optimizing data types")
        for col in df.columns:
            # Try to convert numeric columns
            if df[col].dtype == "object":
                try:
                    df[col] = pd.to_numeric(df[col], errors="coerce")
                except Exception:
                    pass  # Keep as object if conversion fails

        # Convert pandas DataFrame to PyArrow Table with safe=True
        logger.info("Converting to PyArrow Table")
        table = pa.Table.from_pandas(df, preserve_index=False)

        # Ensure the output directory exists
        os.makedirs(os.path.dirname(parquet_file_path), exist_ok=True)

        # Write PyArrow Table to Parquet file
        logger.info(f"Writing Parquet to {parquet_file_path}")
        pq.write_table(table, parquet_file_path)

        return True

    except Exception as e:
        logger.error(f"Error converting JSON to Parquet: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        return False


if __name__ == "__main__":
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

    # Add optional parameter for resolving paths from different base
    # directories
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
        "  python json_to_parquet.py "
        "--json_file_path ../assets/data/geo/json/airports.json "
        "--parquet_file_path ../assets/data/geo/enriched/airports.parquet"
    )
    parser.formatter_class = argparse.RawDescriptionHelpFormatter

    args = parser.parse_args()

    # Get the JSON file path and Parquet file path from command line arguments
    json_file_path = args.json_file_path
    parquet_file_path = args.parquet_file_path
    base_dir = args.base_dir

    # Add the parent directory to the system path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    grandparent_dir = os.path.dirname(os.path.dirname(current_dir))
    sys.path.append(grandparent_dir)

    # Resolve the JSON file path
    resolved_json_path = resolve_path(json_file_path, base_dir)

    # For output files, always resolve from the backend directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_dir))
    resolved_parquet_path = os.path.join(backend_dir, parquet_file_path)

    # Check if the JSON file exists
    if not os.path.exists(resolved_json_path):
        logger.error(f"JSON file does not exist: {json_file_path}")
        logger.error(f"Tried to resolve as: {resolved_json_path}")
        logger.error(f"Current working directory: {os.getcwd()}")
        logger.error(f"Project root directory: {grandparent_dir}")
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
            f"Parquet file already exists and will be overwritten: "
            f"{resolved_parquet_path}"
        )

    logger.info(f"Converting {resolved_json_path} to {resolved_parquet_path}")
    success = json_to_parquet(resolved_json_path, resolved_parquet_path)

    if success:
        logger.info("Conversion completed successfully.")
    else:
        logger.error("Conversion failed.")
        sys.exit(1)
