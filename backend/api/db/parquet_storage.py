"""
Parquet storage operations for ChasquiFX.

This module provides functions for uploading, managing, and retrieving
Parquet files stored in Supabase Storage.
"""

import os
import io
import hashlib
from datetime import datetime
from typing import List, Optional
import pyarrow.parquet as pq
import pandas as pd

from ..utils.logging_utils import setup_logger
from .supabase_client import supabase
from .models import ParquetFileStorage

# Setup logger
logger = setup_logger(__name__)

# Define storage bucket name for parquet files
PARQUET_BUCKET_NAME = "parquet-files"

# Max file size for Supabase storage (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


def get_file_key(file_path: str) -> str:
    """
    Generate a unique file key based on the file path.

    Args:
        file_path: Path to the Parquet file

    Returns:
        str: Unique file key for identifying the file
    """
    base_name = os.path.basename(file_path)
    # Remove extension if it exists
    file_name = os.path.splitext(base_name)[0]

    # Extract data type from path (flights, forex, geo)
    path_parts = file_path.split(os.sep)
    data_type = None
    for part in ["flights", "forex", "geo"]:
        if part in path_parts:
            data_type = part
            break

    if not data_type:
        data_type = "other"

    # Format as data_type/file_name
    return f"{data_type}/{file_name}"


def get_data_type_from_path(file_path: str) -> str:
    """
    Extract the data type from the file path.

    Args:
        file_path: Path to the Parquet file

    Returns:
        str: Data type ('flight', 'forex', 'geo', or 'other')
    """
    path_parts = file_path.split(os.sep)

    if "flights" in path_parts:
        return "flight"
    elif "forex" in path_parts:
        return "forex"
    elif "geo" in path_parts:
        return "geo"
    else:
        return "other"


def calculate_etag(file_path: str) -> str:
    """
    Calculate an ETag (Entity Tag) hash for a file.

    Args:
        file_path: Path to the file

    Returns:
        str: ETag hash
    """
    try:
        # Use 8KB chunks for hash calculation
        chunk_size = 8192
        h = hashlib.md5()

        with open(file_path, "rb") as f:
            chunk = f.read(chunk_size)
            while chunk:
                h.update(chunk)
                chunk = f.read(chunk_size)

        return h.hexdigest()
    except Exception as e:
        logger.error(f"Error calculating ETag for {file_path}: {e}")
        return datetime.utcnow().isoformat()  # Fallback to timestamp


async def upload_parquet_file(file_path: str) -> Optional[ParquetFileStorage]:
    """
    Upload a Parquet file to Supabase Storage and register metadata.

    Args:
        file_path: Path to the Parquet file

    Returns:
        Optional[ParquetFileStorage]: Metadata record for the uploaded file
                                      or None if upload failed
    """
    if not supabase:
        logger.warning("Supabase client not available. Cannot upload file.")
        return None

    # Check if file exists
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return None

    try:
        # Generate a file key
        file_key = get_file_key(file_path)
        file_size = os.path.getsize(file_path)
        data_type = get_data_type_from_path(file_path)
        etag = calculate_etag(file_path)

        # Check file size
        if file_size > MAX_FILE_SIZE:
            logger.error(f"File exceeds maximum size (10MB): {file_path}")
            return None

        # Check if file already exists with the same ETag
        existing_file = await get_parquet_file_metadata(file_key)
        if existing_file and existing_file.etag == etag:
            logger.info(f"File already exists with same ETag: {file_key}")
            return existing_file

        # Set old versions to inactive if they exist
        if existing_file:
            await mark_file_inactive(file_key)

        # Define the storage path
        storage_path = f"{data_type}/{os.path.basename(file_path)}"

        # Upload file to storage
        with open(file_path, "rb") as f:
            supabase.storage.from_(PARQUET_BUCKET_NAME).upload(
                path=storage_path,
                file=f.read(),
                file_options={"upsert": True}  # type: ignore
            )
        # Create metadata record
        metadata = {
            "file_key": file_key,
            "file_path": storage_path,
            "original_path": file_path,
            "data_type": data_type,
            "file_size": file_size,
            "etag": etag,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_active": True,
        }

        # Insert metadata into database
        result = (
            supabase.table("parquet_file_storage").insert(metadata).execute()
        )

        if result.data:
            logger.info(f"Successfully uploaded and registered: {file_key}")
            return ParquetFileStorage(**result.data[0])
        else:
            logger.error(f"Failed to register metadata for: {file_key}")
            return None

    except Exception as e:
        logger.error(f"Error uploading Parquet file {file_path}: {e}")
        return None


async def download_parquet_file(file_key: str) -> Optional[bytes]:
    """
    Download a Parquet file from Supabase Storage.

    Args:
        file_key: Unique identifier for the file

    Returns:
        Optional[bytes]: File content as bytes or None if download failed
    """
    if not supabase:
        logger.warning("Supabase client not available. Cannot download file.")
        return None

    try:
        # Get metadata
        metadata = await get_parquet_file_metadata(file_key)
        if not metadata:
            logger.error(f"No metadata found for file key: {file_key}")
            return None

        # Download the file
        response = supabase.storage.from_(PARQUET_BUCKET_NAME).download(
            metadata.file_path
        )

        return response

    except Exception as e:
        logger.error(f"Error downloading Parquet file {file_key}: {e}")
        return None


async def get_parquet_file_metadata(
    file_key: str,
) -> Optional[ParquetFileStorage]:
    """
    Get metadata for a Parquet file.

    Args:
        file_key: Unique identifier for the file

    Returns:
        Optional[ParquetFileStorage]: Metadata record or None if not found
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot get file metadata."
        )
        return None

    try:
        result = (
            supabase.table("parquet_file_storage")
            .select("*")
            .eq("file_key", file_key)
            .eq("is_active", True)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return ParquetFileStorage(**result.data[0])
        return None

    except Exception as e:
        logger.error(f"Error getting metadata for {file_key}: {e}")
        return None


async def mark_file_inactive(file_key: str) -> bool:
    """
    Mark a file as inactive.

    Args:
        file_key: Unique identifier for the file

    Returns:
        bool: True if successful, False otherwise
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot update file status."
        )
        return False

    try:
        result = (
            supabase.table("parquet_file_storage")
            .update(
                {
                    "is_active": False,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .eq("file_key", file_key)
            .execute()
        )

        if result.data and len(result.data) > 0:
            logger.info(f"Marked file as inactive: {file_key}")
            return True
        else:
            logger.warning(f"No file found to mark inactive: {file_key}")
            return False

    except Exception as e:
        logger.error(f"Error marking file inactive {file_key}: {e}")
        return False


async def list_parquet_files(
    data_type: Optional[str] = None,
) -> List[ParquetFileStorage]:
    """
    List all active Parquet files in the storage.

    Args:
        data_type: Optional filter by data type ('flight', 'forex', 'geo')

    Returns:
        List[ParquetFileStorage]: List of metadata records
    """
    if not supabase:
        logger.warning("Supabase client not available. Cannot list files.")
        return []

    try:
        query = (
            supabase.table("parquet_file_storage")
            .select("*")
            .eq("is_active", True)
        )

        if data_type:
            query = query.eq("data_type", data_type)

        result = query.execute()

        if result.data:
            return [ParquetFileStorage(**item) for item in result.data]
        return []

    except Exception as e:
        logger.error(f"Error listing Parquet files: {e}")
        return []


async def load_parquet_to_dataframe(file_key: str) -> Optional[pd.DataFrame]:
    """
    Load a Parquet file from Supabase Storage into a pandas DataFrame.

    Args:
        file_key: Unique identifier for the file

    Returns:
        Optional[pd.DataFrame]: DataFrame or None if loading failed
    """
    try:
        # Get file content
        content = await download_parquet_file(file_key)
        if not content:
            return None

        # Convert to DataFrame
        file_like = io.BytesIO(content)
        table = pq.read_table(file_like)
        df = table.to_pandas()

        return df

    except Exception as e:
        logger.error(
            f"Error loading Parquet file to DataFrame {file_key}: {e}"
        )
        return None


async def register_data_dependency(
    service_name: str,
    data_type: str,
    resource_id: str,
    is_required: bool = True,
) -> bool:
    """
    Register a dependency of a service on a data file.

    Args:
        service_name: Name of the service requiring the data
        data_type: Type of data needed ('flight', 'forex', 'geo')
        resource_id: File key or resource identifier
        is_required: Whether the dependency is required

    Returns:
        bool: True if successful, False otherwise
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot register dependency."
        )
        return False

    try:
        dependency = {
            "service_name": service_name,
            "data_type": data_type,
            "resource_id": resource_id,
            "is_required": is_required,
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Check if dependency already exists
        query = (
            supabase.table("data_dependencies")
            .select("id")
            .eq("service_name", service_name)
            .eq("data_type", data_type)
            .eq("resource_id", resource_id)
            .execute()
        )

        if query.data and len(query.data) > 0:
            # Update existing
            result = (
                supabase.table("data_dependencies")
                .update(dependency)
                .eq("id", query.data[0]["id"])
                .execute()
            )
        else:
            # Insert new
            result = (
                supabase.table("data_dependencies")
                .insert(dependency)
                .execute()
            )

        if result.data and len(result.data) > 0:
            logger.info(
                f"Registered dependency: {service_name} -> "
                f"{data_type}/{resource_id}"
            )
            return True
        else:
            logger.warning(
                f"Failed to register dependency: {service_name} -> "
                f"{data_type}/{resource_id}"
            )
            return False

    except Exception as e:
        logger.error(f"Error registering dependency: {e}")
        return False
