"""
Parquet file integration with Supabase storage.

This module provides utilities for integrating Parquet files with
Supabase storage, allowing automatic mirroring of converted
files to the cloud.
"""

import logging
from typing import Optional, Tuple
import asyncio

from db.parquet_storage import upload_parquet_file, get_file_key
from json_parquet_converter import json_to_parquet

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def convert_and_upload(
    json_file_path: str,
    parquet_file_path: str,
) -> Tuple[bool, Optional[str]]:
    """
    Convert a JSON file to Parquet and upload it to Supabase storage.

    Args:
        json_file_path: Path to the input JSON file
        parquet_file_path: Path to save the output Parquet file

    Returns:
        Tuple[bool, Optional[str]]: (success, file_key)
    """
    # First convert the file
    conversion_success = json_to_parquet(json_file_path, parquet_file_path)

    if not conversion_success:
        logger.error(f"Failed to convert {json_file_path} to Parquet")
        return False, None

    # Upload to Supabase
    try:
        file_metadata = await upload_parquet_file(parquet_file_path)

        if file_metadata:
            logger.info(
                f"Successfully uploaded {parquet_file_path} "
                f"to Supabase storage"
            )
            return True, file_metadata.file_key
        else:
            logger.warning(
                f"Upload completed but no metadata returned for "
                f"{parquet_file_path}"
            )
            # Still return True since the local conversion was successful
            return True, get_file_key(parquet_file_path)

    except Exception as e:
        logger.error(f"Error uploading {parquet_file_path} to Supabase: {e}")
        # Still return True since the local conversion was successful
        return True, None


def convert_and_upload_sync(
    json_file_path: str,
    parquet_file_path: str,
) -> Tuple[bool, Optional[str]]:
    """
    Synchronous wrapper for convert_and_upload.

    Args:
        json_file_path: Path to the input JSON file
        parquet_file_path: Path to save the output Parquet file

    Returns:
        Tuple[bool, Optional[str]]: (success, file_key)
    """
    return asyncio.run(convert_and_upload(json_file_path, parquet_file_path))
