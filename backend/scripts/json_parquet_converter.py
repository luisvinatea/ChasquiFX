"""
JSON to Parquet Converter

This module provides utilities for converting JSON files to Parquet format,
including support for nested JSON structures and complex data types.

Functions:
    json_to_parquet: Convert a single JSON file to Parquet format
    batch_convert_directory: Convert all JSON files in a directory to Parquet
    resolve_path: Utility for resolving file paths
    flatten_json: Utility for flattening nested JSON structures
    get_mirror_parquet_path: Get the mirrored Parquet path for a JSON file
"""

import json
import os
import logging
import glob
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import traceback

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def resolve_path(path, base=None):
    """
    Resolve a possibly relative path against various base directories.

    Args:
        path (str): The path to resolve
        base (str, optional): Base directory to resolve against

    Returns:
        str: The absolute resolved path
    """
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


def flatten_json(nested_json, parent_key="", sep="_"):
    """
    Flatten a nested JSON structure to a single level dictionary.

    Args:
        nested_json (dict): Nested JSON object to flatten
        parent_key (str): Parent key for nested objects
        sep (str): Separator to use for key names

    Returns:
        dict: Flattened dictionary
    """
    items = {}
    for key, value in nested_json.items():
        new_key = parent_key + sep + key if parent_key else key
        if isinstance(value, dict):
            items.update(flatten_json(value, new_key, sep=sep))
        elif isinstance(value, list):
            # Handle lists by creating separate columns for each item
            # with index
            if value and all(isinstance(item, dict) for item in value):
                # Handle list of dictionaries (common case in these JSON files)
                for i, item in enumerate(value):
                    items.update(flatten_json(item, f"{new_key}_{i}", sep=sep))
            else:
                # For simple lists, store as JSON string to avoid array
                # length issues
                items[new_key] = json.dumps(value)
        else:
            items[new_key] = value
    return items


def json_to_parquet(json_file_path: str, parquet_file_path: str) -> bool:
    """
    Convert a JSON file to Parquet format.

    Args:
        json_file_path (str): Path to the input JSON file
        parquet_file_path (str): Path to save the output Parquet file

    Returns:
        bool: True if conversion was successful, False otherwise
    """
    try:
        # Read the JSON file with Python's built-in JSON parser first
        logger.info(f"Reading JSON from {json_file_path}")
        with open(json_file_path, "r") as file:
            data = json.load(file)

        # Handle different JSON structures
        if isinstance(data, dict):
            # Flatten the nested JSON structure
            logger.info("Flattening nested JSON structure")
            flattened_data = flatten_json(data)
            # Convert to pandas DataFrame
            df = pd.DataFrame([flattened_data])
        elif isinstance(data, list):
            # If the root is a list of dictionaries, flatten each one
            logger.info("Processing list of items in JSON")
            flattened_list = []
            for item in data:
                if isinstance(item, dict):
                    flattened_list.append(flatten_json(item))
                else:
                    flattened_list.append({"value": item})
            df = pd.DataFrame(flattened_list)
        else:
            # For simple types, create a single-cell DataFrame
            df = pd.DataFrame({"value": [data]})

        # Replace any problematic values
        logger.info("Cleaning data values")
        for col in df.columns:
            if df[col].dtype == "object":
                df[col] = df[col].replace("\\N", None)

        # Ensure all columns are properly typed
        logger.info("Optimizing data types")
        for col in df.columns:
            if df[col].dtype == "object":
                # Only try to convert if all values are numeric or None
                if (
                    df[col]
                    .dropna()
                    .apply(
                        lambda x: isinstance(x, (int, float))
                        or (
                            isinstance(x, str)
                            and x.replace(".", "", 1).isdigit()
                        )
                    )
                    .all()
                ):
                    try:
                        df[col] = pd.to_numeric(df[col], errors="coerce")
                    except Exception:
                        pass  # Keep as object if conversion fails
                else:
                    # Ensure strings are properly handled
                    df[col] = df[col].astype(str).replace("nan", None)

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
        logger.error(traceback.format_exc())
        return False


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
    pattern = (
        os.path.join(json_dir, "**", "*.json")
        if recursive
        else os.path.join(json_dir, "*.json")
    )
    json_files = glob.glob(pattern, recursive=recursive)

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
