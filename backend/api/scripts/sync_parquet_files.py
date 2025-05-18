#!/usr/bin/env python
"""
Synchronize Parquet files with Supabase storage.

This script finds all Parquet files in the data directories and uploads them
to Supabase storage, registering their metadata in the database.

Usage:
  python -m backend.api.scripts.sync_parquet_files [--data-type TYPE]

Options:
  --data-type TYPE    Only process files of this data type (flight, forex, geo)
  --force             Force upload even if files are unchanged
"""

import os
import sys
import glob
import argparse
import asyncio
from typing import List, Optional

# Add parent directory to path so we can import our modules
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(parent_dir))

from db.parquet_storage import (  # noqa: E402
    upload_parquet_file,
    list_parquet_files,
    get_file_key,
)
from utils.logging_utils import setup_logger  # noqa: E402

# Setup logger
logger = setup_logger(__name__)


async def find_parquet_files(
    base_dir: str, data_type: Optional[str] = None
) -> List[str]:
    """
    Find all Parquet files in the data directories.

    Args:
        base_dir: Base directory to search from
        data_type: Optional data type filter

    Returns:
        List[str]: List of Parquet file paths
    """
    data_path = os.path.join(base_dir, "backend", "assets", "data")

    if not os.path.exists(data_path):
        logger.error(f"Data directory not found: {data_path}")
        return []

    parquet_files = []

    data_types = ["flights", "forex", "geo"] if not data_type else [data_type]

    for dt in data_types:
        dt_path = os.path.join(data_path, dt, "parquet")
        if not os.path.exists(dt_path):
            logger.warning(f"Parquet directory not found for {dt}: {dt_path}")
            continue

        # Find all parquet files in this directory
        pattern = os.path.join(dt_path, "**", "*.parquet")
        files = glob.glob(pattern, recursive=True)
        parquet_files.extend(files)

    logger.info(f"Found {len(parquet_files)} Parquet files")
    return parquet_files


async def sync_files(files: List[str], force: bool = False) -> int:
    """
    Synchronize files with Supabase storage.

    Args:
        files: List of file paths to sync
        force: Force upload even if files are unchanged

    Returns:
        int: Number of files successfully synced
    """
    if not files:
        logger.warning("No files to sync")
        return 0

    # Get existing files from database if not forcing upload
    existing_files = []
    if not force:
        existing_files = await list_parquet_files()
        existing_keys = {ef.file_key for ef in existing_files}
        logger.info(f"Found {len(existing_files)} existing files in database")

    success_count = 0

    for file_path in files:
        try:
            # Skip if file already exists and not forcing
            if not force:
                file_key = get_file_key(file_path)
                if file_key in existing_keys:
                    logger.info(f"Skipping existing file: {file_path}")
                    continue

            # Upload file
            logger.info(f"Uploading: {file_path}")
            result = await upload_parquet_file(file_path)

            if result:
                success_count += 1

        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")

    return success_count


async def main():
    parser = argparse.ArgumentParser(
        description="Synchronize Parquet files with Supabase storage"
    )
    parser.add_argument(
        "--data-type",
        choices=["flight", "flights", "forex", "geo"],
        help="Only process files of this data type",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force upload even if files are unchanged",
    )

    args = parser.parse_args()

    # Normalize data_type
    data_type = args.data_type
    if data_type == "flight":
        data_type = "flights"

    # Get project root directory
    project_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
    )

    # Find parquet files
    logger.info(f"Searching for Parquet files in {project_root}")
    files = await find_parquet_files(project_root, data_type)

    # Sync files
    success_count = await sync_files(files, args.force)

    logger.info(
        f"Successfully synchronized {success_count} of {len(files)} files"
    )


if __name__ == "__main__":
    asyncio.run(main())
