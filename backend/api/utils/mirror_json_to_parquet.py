#!/usr/bin/env python

"""
mirror_json_to_parquet.py

Utility script to mirror JSON files to Parquet format,
maintaining directory structure.
This script automatically converts
all JSON files in a directory to Parquet files
in a corresponding directory structure.
"""

import os
import sys
import argparse
import logging
import glob

# Get the absolute path of the script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
# Add script directory to path for local imports
sys.path.append(script_dir)

# Import the json_to_parquet function
from json_to_parquet import json_to_parquet  # noqa: E402


# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_mirror_parquet_path(json_path):
    """
    Convert a JSON file path to its mirror Parquet file path.

    Args:
        json_path (str): Path to the JSON file

    Returns:
        str: Path to the mirrored Parquet file
    """
    # Get the absolute path
    abs_json_path = os.path.abspath(json_path)

    # Find the 'json' directory in the path and replace it with 'parquet'
    path_parts = abs_json_path.split(os.sep)

    if "json" in path_parts:
        json_index = path_parts.index("json")
        path_parts[json_index] = "parquet"

        # Replace extension
        path_parts[-1] = os.path.splitext(path_parts[-1])[0] + ".parquet"

        return os.sep.join(path_parts)

    # If 'json' not found in path, simply replace extension
    base_path = os.path.splitext(abs_json_path)[0]
    return base_path + ".parquet"


def batch_convert_directory(json_dir, recursive=True):
    """
    Convert all JSON files in a directory to Parquet format.

    Args:
        json_dir (str): Directory containing JSON files
        recursive (bool): Whether to process subdirectories

    Returns:
        tuple: (success_count, failure_count)
    """
    if not os.path.isdir(json_dir):
        logger.error(f"'{json_dir}' is not a directory")
        return 0, 0

    # Find all JSON files in the directory
    if recursive:
        pattern = os.path.join(json_dir, "**", "*.json")
        json_files = glob.glob(pattern, recursive=recursive)
    else:
        pattern = os.path.join(json_dir, "*.json")
        json_files = glob.glob(pattern)

    if not json_files:
        logger.warning(f"No JSON files found in '{json_dir}'")
        return 0, 0

    success_count = 0
    failure_count = 0

    for json_file in json_files:
        # Determine the output Parquet path
        parquet_file = get_mirror_parquet_path(json_file)

        # Ensure the output directory exists
        os.makedirs(os.path.dirname(parquet_file), exist_ok=True)

        logger.info(f"Converting {json_file} to {parquet_file}")

        if json_to_parquet(json_file, parquet_file):
            success_count += 1
        else:
            failure_count += 1

    return success_count, failure_count


def process_data_directory():
    """Process the entire data directory structure."""
    # Get the absolute path to the repository root directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # For this project, repository root is 3 levels up from the script location
    repo_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

    logger.info(f"Script directory: {current_dir}")
    logger.info(f"Repository root: {repo_root}")

    # Define the base data directory
    data_dir = os.path.join(repo_root, "backend", "assets", "data")
    logger.info(f"Data directory: {data_dir}")

    # Check if data directory exists
    if not os.path.exists(data_dir):
        logger.error(f"Data directory does not exist: {data_dir}")
        return 0, 0

    # List the contents of the data directory
    try:
        logger.info(f"Contents of {data_dir}:")
        for item in os.listdir(data_dir):
            logger.info(f"  - {item}")
    except Exception as e:
        logger.error(f"Error listing directory: {e}")

    # Process each subdirectory with a json folder
    subdirs = [
        os.path.join(data_dir, "flights", "json"),
        os.path.join(data_dir, "forex", "json"),
        os.path.join(data_dir, "geo", "json"),
    ]

    total_success = 0
    total_failure = 0

    for subdir in subdirs:
        if os.path.exists(subdir):
            logger.info(f"Processing directory: {subdir}")
            success, failure = batch_convert_directory(subdir, recursive=True)
            total_success += success
            total_failure += failure
        else:
            logger.warning(f"Directory does not exist: {subdir}")

    return total_success, total_failure


if __name__ == "__main__":
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description="Mirror JSON files to Parquet format"
    )

    parser.add_argument(
        "--dir",
        type=str,
        help=(
            "Process a specific directory instead of the entire "
            "data directory. If not provided, all data directories "
            "will be processed."
        ),
    )

    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Process subdirectories recursively",
        default=True,
    )

    # Display usage examples in the epilog
    parser.epilog = (
        "Example usage:\n"
        "  # Process all data directories:\n"
        "  python mirror_json_to_parquet.py\n\n"
        "  # Process a specific directory:\n"
        "  python mirror_json_to_parquet.py --dir "
        "../backend/assets/data/forex/json"
    )
    parser.formatter_class = argparse.RawDescriptionHelpFormatter

    args = parser.parse_args()

    if args.dir:
        # Process the specified directory
        json_dir = os.path.abspath(args.dir)
        logger.info(f"Processing directory: {json_dir}")
        success_count, failure_count = batch_convert_directory(
            json_dir, args.recursive
        )
    else:
        # Process the entire data directory structure
        logger.info("Processing all data directories")
        success_count, failure_count = process_data_directory()

    # Print summary
    logger.info(
        f"Conversion completed: {success_count} succeeded, "
        f"{failure_count} failed"
    )
    if failure_count > 0:
        sys.exit(1)
