"""
Parquet storage operations for ChasquiFX.

This module provides functions for uploading, managing, and retrieving
Parquet files stored in Supabase Storage.
"""

import os
import io
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any
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

# Cache for loaded data frames to reduce repeated downloads
_dataframe_cache = {}
_cache_metadata = {}  # Stores etags and last access time

# Constants for cache management
MAX_CACHE_SIZE = 20  # Maximum number of dataframes in cache
CACHE_TTL = 3600  # Default TTL in seconds (1 hour)

# Data type constants
DATA_TYPE_FLIGHT = "flight"
DATA_TYPE_FOREX = "forex"
DATA_TYPE_GEO = "geo"


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
                file_options={"upsert": True},  # type: ignore
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


async def load_parquet_to_dataframe(
    file_key: str, use_cache: bool = True, cache_ttl: int = CACHE_TTL
) -> Optional[pd.DataFrame]:
    """
    Load a Parquet file from Supabase Storage into a pandas DataFrame.

    Args:
        file_key: Unique identifier for the file
        use_cache: Whether to use cached data if available
        cache_ttl: Time-to-live for cached data in seconds

    Returns:
        Optional[pd.DataFrame]: DataFrame or None if loading failed
    """
    now = datetime.utcnow().timestamp()

    # Check cache first if enabled
    if use_cache and file_key in _dataframe_cache:
        cache_data = _cache_metadata.get(file_key)
        if cache_data and (now - cache_data["accessed_at"] < cache_ttl):
            # Update last access time
            _cache_metadata[file_key]["accessed_at"] = now
            logger.info(f"Using cached DataFrame for {file_key}")
            return _dataframe_cache[file_key]

    try:
        # Get file content
        content = await download_parquet_file(file_key)
        if not content:
            return None

        # Convert to DataFrame
        file_like = io.BytesIO(content)
        table = pq.read_table(file_like)
        df = table.to_pandas()

        # Store in cache if enabled
        if use_cache:
            # If cache is full, remove least recently used item
            if len(_dataframe_cache) >= MAX_CACHE_SIZE:
                _clean_cache()

            _dataframe_cache[file_key] = df
            _cache_metadata[file_key] = {"accessed_at": now, "created_at": now}

            logger.info(f"Added DataFrame to cache: {file_key}")

        return df

    except Exception as e:
        logger.error(
            f"Error loading Parquet file to DataFrame {file_key}: {e}"
        )
        return None


def _clean_cache() -> None:
    """
    Clean the DataFrame cache by removing least recently used items.
    """
    if not _cache_metadata:
        return

    # Find the least recently accessed item
    oldest_key = min(
        _cache_metadata.items(), key=lambda x: x[1]["accessed_at"]
    )[0]

    # Remove it from cache
    if oldest_key in _dataframe_cache:
        del _dataframe_cache[oldest_key]
        del _cache_metadata[oldest_key]
        logger.debug(f"Removed item from cache: {oldest_key}")


async def clear_cache(file_key: Optional[str] = None) -> None:
    """
    Clear the DataFrame cache.

    Args:
        file_key: If provided, clear only this specific item from cache
    """
    if file_key:
        if file_key in _dataframe_cache:
            del _dataframe_cache[file_key]
        if file_key in _cache_metadata:
            del _cache_metadata[file_key]
        logger.debug(f"Cleared cache for: {file_key}")
    else:
        _dataframe_cache.clear()
        _cache_metadata.clear()
        logger.debug("Cleared entire DataFrame cache")


async def load_data_by_type(
    data_type: str, use_cache: bool = True, cache_ttl: int = CACHE_TTL
) -> Dict[str, pd.DataFrame]:
    """
    Load all Parquet files of a specific data type into DataFrames.

    Args:
        data_type: Type of data to load ('flight', 'forex', 'geo')
        use_cache: Whether to use cached data if available
        cache_ttl: Time-to-live for cached data in seconds

    Returns:
        Dict[str, pd.DataFrame]: Dictionary of file keys to DataFrames
    """
    result = {}

    # Normalize data type
    if data_type == "flights":
        data_type = "flight"

    # List all files of this type
    files = await list_parquet_files(data_type)

    if not files:
        logger.warning(f"No {data_type} files found in Supabase storage")
        return {}

    # Load each file
    for file in files:
        df = await load_parquet_to_dataframe(
            file.file_key, use_cache, cache_ttl
        )
        if df is not None:
            result[file.file_key] = df

    logger.info(
        f"Loaded {len(result)} {data_type} files from Supabase storage"
    )
    return result


async def query_parquet_data(
    file_key: str,
    filters: Optional[Dict[str, Any]] = None,
    columns: Optional[List[str]] = None
) -> Optional[pd.DataFrame]:
    """
    Query a Parquet file with optional filters and column selection.

    Args:
        file_key: Unique identifier for the file
        filters: Dictionary of column names to values to filter by
        columns: List of column names to select (returns all if None)

    Returns:
        Optional[pd.DataFrame]: Filtered DataFrame or None if loading failed
    """
    df = await load_parquet_to_dataframe(file_key)

    if df is None:
        return None

    # Apply column selection if specified
    if columns:
        # Filter to only include columns that exist in the dataframe
        valid_columns = [col for col in columns if col in df.columns]
        if not valid_columns:
            logger.warning(
                f"None of the requested columns exist in {file_key}"
            )
            return df  # Return unfiltered dataframe
        df = df[valid_columns]

    # Apply filters if specified
    if filters:
        for column, value in filters.items():
            if column in df.columns:
                if isinstance(value, list):
                    df = df[df[column].isin(value)]
                else:
                    df = df[df[column] == value]
            else:
                logger.warning(f"Column {column} not found in {file_key}")

    return df


async def get_data_schema(file_key: str) -> Optional[Dict[str, str]]:
    """
    Get the schema (column names and types) of a Parquet file.

    Args:
        file_key: Unique identifier for the file

    Returns:
        Optional[Dict[str, str]]: Dictionary mapping column names to data types
    """
    try:
        # Get file content
        content = await download_parquet_file(file_key)
        if not content:
            return None

        # Read schema without loading all data
        file_like = io.BytesIO(content)
        parquet_file = pq.ParquetFile(file_like)
        schema = parquet_file.schema_arrow

        # Convert schema to dictionary
        schema_dict = {field.name: str(field.type) for field in schema}
        return schema_dict

    except Exception as e:
        logger.error(f"Error getting schema for {file_key}: {e}")
        return None


async def get_row_count(file_key: str) -> Optional[int]:
    """
    Get the number of rows in a Parquet file.

    Args:
        file_key: Unique identifier for the file

    Returns:
        Optional[int]: Number of rows or None if loading failed
    """
    try:
        # Get file content
        content = await download_parquet_file(file_key)
        if not content:
            return None

        # Get row count without loading all data
        file_like = io.BytesIO(content)
        parquet_file = pq.ParquetFile(file_like)
        return parquet_file.metadata.num_rows

    except Exception as e:
        logger.error(f"Error getting row count for {file_key}: {e}")
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
