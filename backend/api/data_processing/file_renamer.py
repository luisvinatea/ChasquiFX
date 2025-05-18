"""
File Renaming Utility

This module provides utilities for standardizing and renaming data files
based on their content and metadata.
"""

import os
import json
import logging
import glob
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_json_metadata(
    json_file_path: str, keys: List[str]
) -> Dict[str, Any]:
    """
    Extract specific metadata from a JSON file.

    Args:
        json_file_path (str): Path to the JSON file
        keys (List[str]): List of keys to extract (can use dot notation for
            nested keys)

    Returns:
        Dict[str, Any]: Dictionary of extracted key-value pairs
    """
    try:
        with open(json_file_path, "r") as f:
            data = json.load(f)

        result = {}
        for key in keys:
            # Handle nested keys with dot notation
            parts = key.split(".")
            value = data
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    value = None
                    break

            result[key] = value

        return result

    except Exception as e:
        logger.error(f"Error extracting metadata from {json_file_path}: {e}")
        return {}


def standardize_filename(
    original_file: str,
    metadata_keys: List[str],
    template: str,
    delimiter: str = "_",
) -> Optional[str]:
    """
    Generate a standardized filename based on file metadata.

    Args:
        original_file (str): Path to the original file
        metadata_keys (List[str]): Keys to extract from JSON for filename
        template (str): Template string for filename (e.g., "{key1}_{key2}")
        delimiter (str): Delimiter to use between parts of the filename

    Returns:
        Optional[str]: Standardized filename or None if metadata extraction
            failed
    """
    try:
        # Extract metadata
        metadata = extract_json_metadata(original_file, metadata_keys)
        if not metadata or any(metadata[k] is None for k in metadata_keys):
            logger.warning(
                f"Could not extract required metadata from {original_file}"
            )
            return None

        # Format the filename according to template
        # We'll use the leaf part of the key (after the last dot)
        # as the format variable
        format_vars = {}
        for key in metadata_keys:
            leaf_name = key.split(".")[-1]
            format_vars[leaf_name] = metadata[key]

        new_basename = template.format(**format_vars)

        # Add file extension
        _, ext = os.path.splitext(original_file)
        return f"{new_basename}{ext}"

    except Exception as e:
        logger.error(f"Error standardizing filename for {original_file}: {e}")
        return None


def rename_files_in_directory(
    directory: str,
    metadata_keys: List[str],
    filename_template: str,
    file_pattern: str = "*.json",
    recursive: bool = False,
    simulate: bool = False,
) -> Tuple[int, int, List[Tuple[str, str]]]:
    """
    Rename all files in a directory according to a standardized format.

    Args:
        directory (str): Directory containing files to rename
        metadata_keys (List[str]): JSON keys to extract for filenames
        filename_template (str): Template for the new filenames
        file_pattern (str): Pattern to match files (e.g. "*.json")
        recursive (bool): Whether to process subdirectories
        simulate (bool): If True, don't actually rename files, just return
            what would happen

    Returns:
        Tuple[int, int, List[Tuple[str, str]]]:
            (success_count, failure_count, list of (old, new) filenames)
    """
    if not os.path.isdir(directory):
        logger.error(f"Directory does not exist: {directory}")
        return 0, 0, []

    # Find all matching files
    pattern = (
        os.path.join(directory, "**", file_pattern)
        if recursive
        else os.path.join(directory, file_pattern)
    )
    files = glob.glob(pattern, recursive=recursive)

    if not files:
        logger.warning(
            f"No files found matching pattern '{file_pattern}' "
            f"in '{directory}'"
        )
        return 0, 0, []

    success_count = 0
    failure_count = 0
    rename_operations = []

    for file_path in files:
        dir_path = os.path.dirname(file_path)

        # Generate standardized filename
        new_filename = standardize_filename(
            file_path, metadata_keys, filename_template
        )

        if not new_filename:
            logger.error(
                f"Failed to generate standardized filename for {file_path}"
            )
            failure_count += 1
            continue

        new_path = os.path.join(dir_path, new_filename)

        # Check if file already follows the naming convention
        if os.path.normpath(file_path) == os.path.normpath(new_path):
            logger.info(f"File already follows naming convention: {file_path}")
            success_count += 1
            continue

        # Check if destination file already exists
        if os.path.exists(new_path):
            logger.warning(
                f"Destination file already exists, skipping: {new_path}"
            )
            failure_count += 1
            continue

        rename_operations.append((file_path, new_path))

        # Perform the rename if not simulating
        if not simulate:
            try:
                os.rename(file_path, new_path)
                logger.info(f"Renamed: {file_path} -> {new_path}")
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to rename {file_path}: {e}")
                failure_count += 1
        else:
            logger.info(f"Would rename: {file_path} -> {new_path}")
            success_count += 1

    return success_count, failure_count, rename_operations


def standardize_flight_filenames(
    directory: str, recursive: bool = False, simulate: bool = False
) -> Tuple[int, int, List[Tuple[str, str]]]:
    """
    Standardize flight data filenames to follow the pattern:
    (departure_id)_(arrival_id)_(outbound_date)_(return_date).json

    Args:
        directory (str): Directory containing flight JSON files
        recursive (bool): Whether to process subdirectories
        simulate (bool): If True, don't actually rename files, just return
            what would happen

    Returns:
        Tuple[int, int, List[Tuple[str, str]]]:
            (success_count, failure_count, list of (old, new) filenames)
    """
    return rename_files_in_directory(
        directory,
        [
            "search_parameters.departure_id",
            "search_parameters.arrival_id",
            "search_parameters.outbound_date",
            "search_parameters.return_date",
        ],
        "{departure_id}_{arrival_id}_{outbound_date}_{return_date}",
        file_pattern="*.json",
        recursive=recursive,
        simulate=simulate,
    )


def standardize_forex_filenames(
    directory: str, recursive: bool = False, simulate: bool = False
) -> Tuple[int, int, List[Tuple[str, str]]]:
    """
    Standardize forex data filenames to follow the pattern:
    (q)_(created_at).json

    Args:
        directory (str): Directory containing forex JSON files
        recursive (bool): Whether to process subdirectories
        simulate (bool): If True, don't actually rename files, just return
            what would happen

    Returns:
        Tuple[int, int, List[Tuple[str, str]]]:
            (success_count, failure_count, list of (old, new) filenames)
    """

    # First, standardize timestamps in the created_at field
    def standardize_timestamp(timestamp_str):
        if not timestamp_str:
            return datetime.now().strftime("%Y-%m-%d-%H-%M-%S")

        # Remove spaces and replace with dashes
        return re.sub(r"[\s:]", "-", timestamp_str)

    # Custom standardization function that processes the extracted metadata
    def custom_standardize(file_path):
        metadata = extract_json_metadata(
            file_path, ["search_parameters.q", "search_metadata.created_at"]
        )

        if not metadata:
            return None

        q = metadata.get("search_parameters.q")
        created_at = metadata.get("search_metadata.created_at")

        if not q:
            return None

        # Standardize the timestamp
        std_timestamp = standardize_timestamp(created_at)

        # Use the currency pair as q
        _, ext = os.path.splitext(file_path)
        return f"{q}_{std_timestamp}{ext}"

    # Process each file in the directory
    if not os.path.isdir(directory):
        logger.error(f"Directory does not exist: {directory}")
        return 0, 0, []

    # Find all matching files
    pattern = (
        os.path.join(directory, "**", "*.json")
        if recursive
        else os.path.join(directory, "*.json")
    )
    files = glob.glob(pattern, recursive=recursive)

    success_count = 0
    failure_count = 0
    rename_operations = []

    for file_path in files:
        dir_path = os.path.dirname(file_path)

        # Generate standardized filename
        new_filename = custom_standardize(file_path)

        if not new_filename:
            logger.error(
                f"Failed to generate standardized filename for {file_path}"
            )
            failure_count += 1
            continue

        new_path = os.path.join(dir_path, new_filename)

        # Skip if already correctly named
        if os.path.normpath(file_path) == os.path.normpath(new_path):
            logger.info(f"File already follows naming convention: {file_path}")
            success_count += 1
            continue

        # Check if destination file already exists
        if os.path.exists(new_path):
            logger.warning(
                f"Destination file already exists, skipping: {new_path}"
            )
            failure_count += 1
            continue

        rename_operations.append((file_path, new_path))

        # Perform the rename if not simulating
        if not simulate:
            try:
                os.rename(file_path, new_path)
                logger.info(f"Renamed: {file_path} -> {new_path}")
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to rename {file_path}: {e}")
                failure_count += 1
        else:
            logger.info(f"Would rename: {file_path} -> {new_path}")
            success_count += 1

    return success_count, failure_count, rename_operations
