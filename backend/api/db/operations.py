"""
Database operations for ChasquiFX.
This module provides functions for database CRUD operations.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import os
import tempfile

from ..utils.logging_utils import setup_logger
from .supabase_client import supabase
from .models import (
    ApiUsageLog,
)

# Setup logger
logger = setup_logger(__name__)


# API Usage Logging Functions
async def log_api_call(
    endpoint: str,
    request_data: Dict,
    response_status: int,
    user_id: Optional[str] = None,
):
    """
    Log an API call to the database.

    Args:
        endpoint: The API endpoint that was called
        request_data: The request data
        response_status: The HTTP status code of the response
        user_id: Optional user ID
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Skipping API call logging."
        )
        return

    try:
        log_entry = ApiUsageLog(
            user_id=user_id,
            endpoint=endpoint,
            request_data=request_data,
            response_status=response_status,
        )

        data = {
            "user_id": log_entry.user_id,
            "endpoint": log_entry.endpoint,
            "request_data": json.dumps(log_entry.request_data),
            "response_status": log_entry.response_status,
            "timestamp": log_entry.timestamp.isoformat(),
        }

        supabase.table("api_usage_logs").insert(data).execute()
        logger.debug(f"API call logged: {endpoint}")
    except Exception as e:
        logger.error(f"Failed to log API call: {str(e)}")


# Forex Data Cache Functions
async def get_cached_forex_data(currency_pair: str) -> Optional[Dict]:
    """
    Get cached forex data for a currency pair.

    Args:
        currency_pair: Currency pair (e.g., 'USD_EUR')

    Returns:
        Cached forex data or None if not found or expired
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot retrieve cached forex data."
        )
        return None

    try:
        now = datetime.utcnow().isoformat()
        result = (
            supabase.table("forex_cache")
            .select("*")
            .eq("currency_pair", currency_pair)
            .gte("expiry", now)
            .execute()
        )

        if result.data and len(result.data) > 0:
            logger.info(f"Found cached forex data for {currency_pair}")
            return result.data[0]["data"]
        return None
    except Exception as e:
        logger.error(f"Error retrieving cached forex data: {str(e)}")
        return None


async def cache_forex_data(
    currency_pair: str, data: Dict, expiry_hours: int = 24
):
    """
    Cache forex data for a currency pair.

    Args:
        currency_pair: Currency pair (e.g., 'USD_EUR')
        data: Forex data to cache
        expiry_hours: Hours until expiry (default: 24)
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot cache forex data."
        )
        return

    try:
        expiry = datetime.utcnow() + timedelta(hours=expiry_hours)
        cache_entry = {
            "currency_pair": currency_pair,
            "data": json.dumps(data),
            "last_updated": datetime.utcnow().isoformat(),
            "expiry": expiry.isoformat(),
        }

        # Check if entry exists
        result = (
            supabase.table("forex_cache")
            .select("id")
            .eq("currency_pair", currency_pair)
            .execute()
        )

        if result.data and len(result.data) > 0:
            # Update existing entry
            supabase.table("forex_cache").update(cache_entry).eq(
                "id", result.data[0]["id"]
            ).execute()
            logger.debug(f"Updated cached forex data for {currency_pair}")
        else:
            # Insert new entry
            supabase.table("forex_cache").insert(cache_entry).execute()
            logger.debug(f"Cached new forex data for {currency_pair}")
    except Exception as e:
        logger.error(f"Error caching forex data: {str(e)}")


# Flight Data Cache Functions
async def get_cached_flight_data(
    origin: str, destination: str
) -> Optional[Dict]:
    """
    Get cached flight data for a route.

    Args:
        origin: Origin airport code
        destination: Destination airport code

    Returns:
        Cached flight data or None if not found or expired
    """
    if not supabase:
        logger.warning(
            "Supabase client not available."
            " Cannot retrieve cached flight data."
        )
        return None

    try:
        now = datetime.utcnow().isoformat()
        result = (
            supabase.table("flight_cache")
            .select("*")
            .eq("origin", origin)
            .eq("destination", destination)
            .gte("expiry", now)
            .execute()
        )

        if result.data and len(result.data) > 0:
            logger.info(f"Found cached flight data for {origin}-{destination}")
            return result.data[0]["data"]
        return None
    except Exception as e:
        logger.error(f"Error retrieving cached flight data: {str(e)}")
        return None


async def cache_flight_data(
    origin: str, destination: str, data: Dict, expiry_hours: int = 72
):
    """
    Cache flight data for a route.

    Args:
        origin: Origin airport code
        destination: Destination airport code
        data: Flight data to cache
        expiry_hours: Hours until expiry (default: 72)
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot cache flight data."
        )
        return

    try:
        expiry = datetime.utcnow() + timedelta(hours=expiry_hours)
        cache_entry = {
            "origin": origin,
            "destination": destination,
            "data": json.dumps(data),
            "last_updated": datetime.utcnow().isoformat(),
            "expiry": expiry.isoformat(),
        }

        # Check if entry exists
        result = (
            supabase.table("flight_cache")
            .select("id")
            .eq("origin", origin)
            .eq("destination", destination)
            .execute()
        )

        if result.data and len(result.data) > 0:
            # Update existing entry
            supabase.table("flight_cache").update(cache_entry).eq(
                "id", result.data[0]["id"]
            ).execute()
            logger.debug(
                f"Updated cached flight data for {origin}-{destination}"
            )
        else:
            # Insert new entry
            supabase.table("flight_cache").insert(cache_entry).execute()
            logger.debug(f"Cached new flight data for {origin}-{destination}")
    except Exception as e:
        logger.error(f"Error caching flight data: {str(e)}")


# User API Key Management Functions
async def store_user_api_key(user_id: str, serpapi_key: str):
    """
    Store a user's API key.

    Args:
        user_id: User ID
        serpapi_key: SerpAPI key
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot store user API key."
        )
        return

    try:
        # Check if key exists
        result = (
            supabase.table("user_api_keys")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )

        entry = {
            "user_id": user_id,
            "serpapi_key": serpapi_key,
            "created_at": datetime.utcnow().isoformat(),
        }

        if result.data and len(result.data) > 0:
            # Update existing key
            supabase.table("user_api_keys").update(entry).eq(
                "id", result.data[0]["id"]
            ).execute()
            logger.info(f"Updated API key for user {user_id}")
        else:
            # Insert new key
            supabase.table("user_api_keys").insert(entry).execute()
            logger.info(f"Stored new API key for user {user_id}")
    except Exception as e:
        logger.error(f"Error storing user API key: {str(e)}")


async def get_user_api_key(user_id: str) -> Optional[str]:
    """
    Get a user's API key.

    Args:
        user_id: User ID

    Returns:
        API key or None if not found
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot retrieve user API key."
        )
        return None

    try:
        result = (
            supabase.table("user_api_keys")
            .select("serpapi_key")
            .eq("user_id", user_id)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return result.data[0]["serpapi_key"]
        return None
    except Exception as e:
        logger.error(f"Error retrieving user API key: {str(e)}")
        return None


# Recommendation Logging Functions
async def log_recommendation(
    origin_currency: str,
    destination_currency: str,
    amount: float,
    recommended_destination: str,
    exchange_rate: float,
    savings_percentage: float,
    user_id: Optional[str] = None,
):
    """
    Log a recommendation for analytics.

    Args:
        origin_currency: Origin currency code
        destination_currency: Destination currency code
        amount: Amount to exchange
        recommended_destination: Recommended destination
        exchange_rate: Exchange rate
        savings_percentage: Savings percentage
        user_id: Optional user ID
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot log recommendation."
        )
        return

    try:
        recommendation = {
            "user_id": user_id,
            "origin_currency": origin_currency,
            "destination_currency": destination_currency,
            "amount": amount,
            "recommended_destination": recommended_destination,
            "exchange_rate": exchange_rate,
            "savings_percentage": savings_percentage,
            "timestamp": datetime.utcnow().isoformat(),
        }

        supabase.table("user_recommendations").insert(recommendation).execute()
        logger.debug(
            f"Logged recommendation for {origin_currency} "
            f"to {destination_currency}"
        )
    except Exception as e:
        logger.error(f"Error logging recommendation: {str(e)}")


async def get_user_recommendations(
    user_id: str, limit: int = 10
) -> List[Dict]:
    """
    Get a user's most recent recommendations.

    Args:
        user_id: User ID
        limit: Maximum number of recommendations to return

    Returns:
        List of recommendations
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. "
            "Cannot retrieve user recommendations."
        )
        return []

    try:
        result = (
            supabase.table("user_recommendations")
            .select("*")
            .eq("user_id", user_id)
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )

        return result.data if result.data else []
    except Exception as e:
        logger.error(f"Error retrieving user recommendations: {str(e)}")
        return []


# Parquet Storage Functions - Supabase Storage for Parquet Files


def upload_parquet_to_supabase(
    local_file_path: str,
    storage_bucket: str = "parquet",
    file_key: Optional[str] = None,
) -> Optional[Dict]:
    """
    Upload a Parquet file to Supabase storage.

    Args:
        local_file_path: Path to the local Parquet file
        storage_bucket: Supabase storage bucket name (default: "parquet")
        file_key: Optional custom key for the file
            (default: derived from filename)

    Returns:
        Dict with storage metadata if successful, None otherwise
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot upload Parquet file."
        )
        return None

    if not os.path.exists(local_file_path):
        logger.error(f"Parquet file not found: {local_file_path}")
        return None

    try:
        # Generate file key if not provided
        if not file_key:
            # Extract category from path (e.g., 'flights', 'forex', 'geo')
            path_parts = local_file_path.split(os.sep)
            if "flights" in path_parts:
                category = "flights"
            elif "forex" in path_parts:
                category = "forex"
            elif "geo" in path_parts:
                category = "geo"
            else:
                category = "other"

            # Use filename without extension as key
            filename = os.path.basename(local_file_path)
            base_filename = os.path.splitext(filename)[0]
            file_key = f"{category}/{base_filename}"

        # Storage path within the bucket
        storage_path = f"{file_key}.parquet"

        # Get file size
        file_size = os.path.getsize(local_file_path)

        # Read file contents
        with open(local_file_path, "rb") as f:
            file_contents = f.read()

        # Upload to Supabase storage
        try:
            # Upload file to storage
            supabase.storage.from_(storage_bucket).upload(
                path=storage_path,
                file=file_contents,
                file_options={"content-type": "application/octet-stream"},
            )

            # Get file metadata and public URL
            file_info = supabase.storage.from_(storage_bucket).get_public_url(
                path=storage_path
            )

            # Create database record
            parquet_entry = {
                "file_key": file_key,
                "file_path": storage_path,
                "original_path": local_file_path,
                "file_size": file_size,
                "etag": str(hash(file_contents)),  # Simple hash as etag
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "is_active": True,
                "metadata": json.dumps(
                    {
                        "content_type": "application/octet-stream",
                        "storage_bucket": storage_bucket,
                        "public_url": file_info,
                    }
                ),
            }

            # Mark any previous versions as inactive
            supabase.table("parquet_storage").update({"is_active": False}).eq(
                "file_key", file_key
            ).neq("file_path", storage_path).execute()

            # Insert new record
            db_result = (
                supabase.table("parquet_storage")
                .insert(parquet_entry)
                .execute()
            )

            if db_result.data:
                logger.info(
                    f"Successfully uploaded Parquet file {file_key} "
                    f"to Supabase storage"
                )
                return db_result.data[0]
            else:
                logger.error(
                    "Failed to create database record for Parquet file"
                )
                return None
        except Exception as se:
            logger.error(
                f"Failed to upload Parquet file to Supabase storage: {str(se)}"
            )
            return None

    except Exception as e:
        logger.error(f"Error uploading Parquet file to Supabase: {str(e)}")
        return None


async def download_parquet_from_supabase(
    file_key: str,
    local_path: Optional[str] = None,
    storage_bucket: str = "parquet",
) -> Optional[str]:
    """
    Download a Parquet file from Supabase storage.

    Args:
        file_key: Unique identifier for the file
        local_path: Optional path to save the file locally
        storage_bucket: Supabase storage bucket name (default: "parquet")

    Returns:
        Path to the downloaded file if successful, None otherwise
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot download Parquet file."
        )
        return None

    try:
        # Get the storage record for the file
        result = (
            supabase.table("parquet_storage")
            .select("*")
            .eq("file_key", file_key)
            .eq("is_active", True)
            .execute()
        )

        if not result.data or len(result.data) == 0:
            logger.error(f"No active Parquet file found for key: {file_key}")
            return None

        storage_record = result.data[0]
        storage_path = storage_record["file_path"]

        # If local path not provided, use temp directory
        if not local_path:
            temp_dir = os.path.join(
                tempfile.gettempdir(), "chasquifx_parquet_cache"
            )
            os.makedirs(temp_dir, exist_ok=True)
            local_path = os.path.join(temp_dir, os.path.basename(storage_path))

        # Download the file
        data = supabase.storage.from_(storage_bucket).download(storage_path)

        # Save to local path
        with open(local_path, "wb") as f:
            f.write(data)

        logger.info(
            f"Successfully downloaded Parquet file {file_key} to {local_path}"
        )
        return local_path

    except Exception as e:
        logger.error(f"Error downloading Parquet file from Supabase: {str(e)}")
        return None


async def get_parquet_file_info(file_key: str) -> Optional[Dict]:
    """
    Get information about a Parquet file in Supabase storage.

    Args:
        file_key: Unique identifier for the file

    Returns:
        Dict with file information if found, None otherwise
    """
    if not supabase:
        logger.warning(
            "Supabase client not available. Cannot get Parquet file info."
        )
        return None

    try:
        result = (
            supabase.table("parquet_storage")
            .select("*")
            .eq("file_key", file_key)
            .eq("is_active", True)
            .execute()
        )

        if result.data and len(result.data) > 0:
            return result.data[0]
        return None

    except Exception as e:
        logger.error(
            f"Error retrieving Parquet file info from Supabase: {str(e)}"
        )
        return None
