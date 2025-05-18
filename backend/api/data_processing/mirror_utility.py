"""
Directory Mirroring Utility

This module provides functionality to mirror a directory structure,
applying transformations to files in the process.
"""

import os
import logging
import glob
from typing import Callable, Tuple, List

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def mirror_directory(
    source_dir: str,
    destination_dir: str,
    file_processor: Callable[[str, str], bool],
    file_pattern: str = "*",
    recursive: bool = True,
) -> Tuple[int, int]:
    """
    Mirror a directory structure, applying a processor function to each file.

    Args:
        source_dir (str): Source directory to mirror
        destination_dir (str): Destination directory to create
        file_processor (Callable): Function to process each file (takes source
            and destination paths)
        file_pattern (str): Pattern to match files (e.g. "*.json")
        recursive (bool): Whether to process subdirectories recursively

    Returns:
        Tuple[int, int]: (success_count, failure_count)
    """
    if not os.path.isdir(source_dir):
        logger.error(f"Source directory does not exist: {source_dir}")
        return 0, 0

    # Ensure destination directory exists
    os.makedirs(destination_dir, exist_ok=True)

    # Find all matching files in the source directory
    pattern = (
        os.path.join(source_dir, "**", file_pattern)
        if recursive
        else os.path.join(source_dir, file_pattern)
    )
    source_files = glob.glob(pattern, recursive=recursive)

    if not source_files:
        logger.warning(
            f"No files found matching pattern '{file_pattern}' "
            f"in '{source_dir}'"
        )
        return 0, 0

    success_count = 0
    failure_count = 0

    for source_file in source_files:
        # Compute destination file path
        rel_path = os.path.relpath(source_file, source_dir)
        dest_file = os.path.join(destination_dir, rel_path)

        # Ensure destination directory exists
        os.makedirs(os.path.dirname(dest_file), exist_ok=True)

        # Process the file
        logger.info(f"Processing: {source_file} -> {dest_file}")
        if file_processor(source_file, dest_file):
            success_count += 1
        else:
            failure_count += 1

    return success_count, failure_count


def find_files(
    directory: str, file_pattern: str = "*", recursive: bool = True
) -> List[str]:
    """
    Find files in a directory matching a pattern.

    Args:
        directory (str): Directory to search
        file_pattern (str): Pattern to match files (e.g. "*.json")
        recursive (bool): Whether to search subdirectories recursively

    Returns:
        List[str]: List of matching file paths
    """
    if not os.path.isdir(directory):
        logger.error(f"Directory does not exist: {directory}")
        return []

    pattern = (
        os.path.join(directory, "**", file_pattern)
        if recursive
        else os.path.join(directory, file_pattern)
    )
    return glob.glob(pattern, recursive=recursive)


def process_data_directory(
    data_root: str,
    processor_func: Callable[[str, str], bool],
    source_subdir: str = "json",
    dest_subdir: str = "parquet",
    file_pattern: str = "*.json",
) -> Tuple[int, int]:
    """
    Process all data directories under a data root directory.

    This function looks for a specific pattern of directories:
    data_root/
      category1/
        source_subdir/
          files...
        dest_subdir/
      category2/
        source_subdir/
          files...
        dest_subdir/

    Args:
        data_root (str): Root data directory containing category subdirectories
        processor_func (Callable): Function to process each file
        source_subdir (str): Name of source subdirectory (e.g. "json")
        dest_subdir (str): Name of destination subdirectory (e.g. "parquet")
        file_pattern (str): Pattern to match files (e.g. "*.json")

    Returns:
        Tuple[int, int]: (total_success_count, total_failure_count)
    """
    if not os.path.isdir(data_root):
        logger.error(f"Data root directory does not exist: {data_root}")
        return 0, 0

    # Find all category directories (immediate subdirectories)
    try:
        categories = [
            d
            for d in os.listdir(data_root)
            if os.path.isdir(os.path.join(data_root, d))
        ]
    except Exception as e:
        logger.error(f"Error listing directory {data_root}: {e}")
        return 0, 0

    if not categories:
        logger.warning(f"No category directories found in {data_root}")
        return 0, 0

    total_success = 0
    total_failure = 0

    # Process each category
    for category in categories:
        source_dir = os.path.join(data_root, category, source_subdir)
        dest_dir = os.path.join(data_root, category, dest_subdir)

        if os.path.isdir(source_dir):
            logger.info(f"Processing category: {category}")
            success, failure = mirror_directory(
                source_dir, dest_dir, processor_func, file_pattern=file_pattern
            )
            total_success += success
            total_failure += failure
        else:
            logger.warning(
                f"Source directory not found for category {category}: "
                f"{source_dir}"
            )

    return total_success, total_failure
