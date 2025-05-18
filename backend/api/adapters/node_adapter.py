"""
Python adapter module for Node.js integration.

This module provides
entry points for the Node.js
backend to call Python data processing functions.
"""

import json
import logging
from typing import Dict, List, Any, Optional, Union

from backend.api.services import (
    forex_service,
    recommendation_service,
)
from backend.api.data_processing import retrieval, json_parquet_converter

# Set up logging
logger = logging.getLogger(__name__)


def get_exchange_rates(
    from_currency: str, to_currency: str, api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get exchange rates using Python forex_service.

    Args:
        from_currency: Base currency code
        to_currency: Target currency code
        api_key: Optional API key

    Returns:
        Dict containing exchange rate data
    """
    try:
        logger.info(
            f"Python adapter: Getting exchange rates "
            f"{from_currency} to {to_currency}"
        )
        result = forex_service.get_exchange_rates(
            from_currency, to_currency, api_key
        )
        return result
    except Exception as e:
        logger.error(f"Error in get_exchange_rates: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}


def get_service_status() -> Dict[str, Any]:
    """
    Get the status of the Python forex service.

    Returns:
        Dict containing service status
    """
    try:
        logger.info("Python adapter: Getting service status")
        status = forex_service.get_service_status()
        return status
    except Exception as e:
        logger.error(f"Error in get_service_status: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}


def reset_quota_status() -> Dict[str, Any]:
    """
    Reset the quota status for SerpAPI.

    Returns:
        Dict containing status message
    """
    try:
        logger.info("Python adapter: Resetting quota status")
        result = forex_service.reset_quota_status()
        return result
    except Exception as e:
        logger.error(f"Error in reset_quota_status: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}


def get_recommendations(
    base_currency: str,
    departure_airport: str,
    outbound_date: Optional[str] = None,
    return_date: Optional[str] = None,
    api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Get travel recommendations using Python recommendation_service.

    Args:
        base_currency: Base currency code
        departure_airport: Departure airport code
        outbound_date: Optional outbound date
        return_date: Optional return date
        api_key: Optional API key

    Returns:
        List of recommendation data
    """
    try:
        logger.info(
            f"Python adapter: Getting recommendations for {departure_airport} "
            f"with base currency {base_currency}"
        )
        recommendations = recommendation_service.get_recommendations(
            base_currency,
            departure_airport,
            outbound_date,
            return_date,
            api_key,
        )
        return recommendations
    except Exception as e:
        logger.error(f"Error in get_recommendations: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}


def retrieve_parquet_data(
    file_key: str, filters: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Retrieve data from a Parquet file.

    Args:
        file_key: The key of the Parquet file to retrieve
        filters: Optional filters to apply to the data

    Returns:
        Dict containing the retrieved data
    """
    try:
        logger.info(f"Python adapter: Retrieving parquet data for {file_key}")
        data = retrieval.retrieve_data(file_key, filters)
        return data
    except Exception as e:
        logger.error(f"Error in retrieve_parquet_data: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}


def json_to_parquet(
    json_data: Union[str, Dict, List], output_path: str
) -> Dict[str, Any]:
    """
    Convert JSON data to Parquet format.

    Args:
        json_data: JSON data as a string, dict, or list
        output_path: Path to save the Parquet file

    Returns:
        Dict containing status message
    """
    try:
        logger.info(
            f"Python adapter: Converting JSON to Parquet at {output_path}"
        )
        result = json_parquet_converter.convert_json_to_parquet(
            json_data, output_path
        )
        return {
            "success": True,
            "message": "JSON converted to Parquet",
            "path": output_path,
        }
    except Exception as e:
        logger.error(f"Error in json_to_parquet: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}


# Add more adapter functions as needed
