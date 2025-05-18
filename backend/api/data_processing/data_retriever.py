"""
Data retrieval module for ChasquiFX.

This module provides utilities for retrieving and processing data from Supabase
storage in various formats, focused on Parquet files.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
import pandas as pd
import pyarrow.parquet as pq

from ..db.parquet_storage import (
    load_parquet_to_dataframe,
    get_parquet_file_metadata,
    download_parquet_file,
    list_parquet_files,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache for loaded data frames to reduce repeated downloads
_dataframe_cache = {}
_cache_metadata = {}  # Stores etags and last access time

# Constants for cache management
MAX_CACHE_SIZE = 20  # Maximum number of dataframes in cache
CACHE_TTL = 3600  # Default TTL in seconds (1 hour)


async def retrieve_data_frame(
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
    return await load_parquet_to_dataframe(file_key)


async def retrieve_data_by_type(
    data_type: str, use_cache: bool = True
) -> Dict[str, pd.DataFrame]:
    """
    Load all Parquet files of a specific data type into DataFrames.

    Args:
        data_type: Type of data to load ('flight', 'forex', 'geo')
        use_cache: Whether to use cached data if available

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
        df = await load_parquet_to_dataframe(file.file_key)
        if df is not None:
            result[file.file_key] = df

    logger.info(f"Loaded {len(result)} {data_type} files")
    return result


async def query_data(
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


async def get_schema(file_key: str) -> Optional[Dict[str, str]]:
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
        import io

        file_like = io.BytesIO(content)
        parquet_file = pq.ParquetFile(file_like)
        schema = parquet_file.schema_arrow

        # Convert schema to dictionary
        schema_dict = {field.name: str(field.type) for field in schema}
        return schema_dict

    except Exception as e:
        logger.error(f"Error getting schema for {file_key}: {e}")
        return None


async def get_metadata(file_key: str) -> dict:
    """
    Get metadata about a Parquet file including row count and schema.

    Args:
        file_key: Unique identifier for the file

    Returns:
        dict: Dictionary with metadata information
    """
    try:
        # Get database metadata
        db_metadata = await get_parquet_file_metadata(file_key)
        if not db_metadata:
            return {"error": "File not found"}

        # Get file content
        content = await download_parquet_file(file_key)
        if not content:
            return {
                "file_key": file_key,
                "error": "Could not download file content",
            }

        # Read file metadata
        import io

        file_like = io.BytesIO(content)
        parquet_file = pq.ParquetFile(file_like)

        # Create result dictionary
        result = {
            "file_key": file_key,
            "file_path": db_metadata.file_path,
            "original_path": db_metadata.original_path,
            "file_size": db_metadata.file_size,
            "etag": db_metadata.etag,
            "created_at": db_metadata.created_at.isoformat()
            if hasattr(db_metadata.created_at, "isoformat")
            else db_metadata.created_at,
            "updated_at": db_metadata.updated_at.isoformat()
            if hasattr(db_metadata.updated_at, "isoformat")
            else db_metadata.updated_at,
            "row_count": parquet_file.metadata.num_rows,
            "column_count": len(parquet_file.schema_arrow),
            "schema": {
                field.name: str(field.type)
                for field in parquet_file.schema_arrow
            },
        }

        return result

    except Exception as e:
        logger.error(f"Error getting metadata for {file_key}: {e}")
        return {"file_key": file_key, "error": str(e)}


def retrieve_data_frame_sync(file_key: str) -> Optional[pd.DataFrame]:
    """
    Synchronous wrapper for retrieve_data_frame.

    Args:
        file_key: Unique identifier for the file

    Returns:
        Optional[pd.DataFrame]: DataFrame or None if loading failed
    """
    return asyncio.run(retrieve_data_frame(file_key))


def query_data_sync(
    file_key: str,
    filters: Optional[Dict[str, Any]] = None,
    columns: Optional[List[str]] = None
) -> Optional[pd.DataFrame]:
    """
    Synchronous wrapper for query_data.

    Args:
        file_key: Unique identifier for the file
        filters: Dictionary of column names to values to filter by
        columns: List of column names to select

    Returns:
        Optional[pd.DataFrame]: Filtered DataFrame or None if loading failed
    """
    return asyncio.run(query_data(file_key, filters, columns))
