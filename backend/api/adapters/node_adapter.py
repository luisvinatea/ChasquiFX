"""
Python adapter module for Node.js integration.

This module provides
entry points for the Node.js
backend to call Python data processing functions.
"""

import logging
from typing import Dict, List, Any, Optional, Union, cast

from backend.api.services import (
    forex_service,
    recommendation_service,
)
from backend.api.data_processing import json_parquet_converter
from backend.api.data_processing.data_retriever import (
    retrieve_data_frame_sync as retrieve_data,
)
from backend.api.models.schemas import RecommendationsResponse

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
    limit: Optional[Union[str, int]] = 10,
    min_trend: Optional[Union[str, float]] = -1.0,
    include_fares: Optional[Union[str, bool]] = False,
) -> List[Dict[str, Any]]:
    """
    Get travel recommendations using Python recommendation_service.

    Args:
        base_currency: Base currency code
        departure_airport: Departure airport code
        outbound_date: Optional outbound date
        return_date: Optional return date
        api_key: Optional API key
        limit: Maximum number of recommendations (default: 10)
        min_trend: Minimum trend value (default: -1.0)
        include_fares: Whether to include fares (default: False)

    Returns:
        List of recommendation data
    """
    try:
        logger.info(
            f"Getting recommendations for {departure_airport} "
            f"with base currency {base_currency}"
        )

        # Convert parameters to appropriate types
        limit_int = int(limit) if limit is not None else 10
        min_trend_float = float(min_trend) if min_trend is not None else -1.0
        include_fares_bool = False
        if include_fares is not None:
            if isinstance(include_fares, str):
                include_fares_bool = include_fares.lower() == "true"
            else:
                include_fares_bool = bool(include_fares)

        # Call the service with properly typed parameters
        result = recommendation_service.get_recommendations(
            departure_airport,
            base_currency,
            limit=limit_int,
            min_trend=min_trend_float,
            include_fares=include_fares_bool,
            outbound_date=outbound_date,
            return_date=return_date,
        )

        # Convert response to list of dicts
        if isinstance(result, RecommendationsResponse) and hasattr(
            result, "recommendations"
        ):
            # Return list of dictionaries that can be JSON serialized
            recommendations = []
            for rec in result.recommendations:
                rec_dict = {
                    "destination": "Unknown",
                    "country": "Unknown",
                    "trend": 0.0,
                    "currency": "Unknown",
                    "base_currency": base_currency,
                    "exchange_rate": 1.0,
                    "fare": None,
                }

                # Safely get attributes using getattr with default values
                for attr_name in [
                    "destination",
                    "destination_code",
                    "country",
                    "country_code",
                    "trend",
                    "exchange_trend",
                    "currency",
                    "currency_code",
                    "base_currency",
                    "base_currency_code",
                    "exchange_rate",
                    "current_rate",
                    "fare",
                    "fare_amount",
                ]:
                    if hasattr(rec, attr_name):
                        value = getattr(rec, attr_name)

                        # Map attribute names to our standardized keys
                        if attr_name in ["destination", "destination_code"]:
                            rec_dict["destination"] = value
                        elif attr_name in ["country", "country_code"]:
                            rec_dict["country"] = value
                        elif attr_name in ["trend", "exchange_trend"]:
                            rec_dict["trend"] = value
                        elif attr_name in ["currency", "currency_code"]:
                            rec_dict["currency"] = value
                        elif attr_name in [
                            "base_currency",
                            "base_currency_code",
                        ]:
                            rec_dict["base_currency"] = value
                        elif attr_name in ["exchange_rate", "current_rate"]:
                            rec_dict["exchange_rate"] = value
                        elif attr_name in ["fare", "fare_amount"]:
                            rec_dict["fare"] = value

                recommendations.append(rec_dict)

            return recommendations

        # Return empty list if no recommendations
        return []
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return [{"error": str(e), "type": type(e).__name__}]


def retrieve_parquet_data(
    file_key: str, filters: Optional[Dict] = None
) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Retrieve data from a Parquet file.

    Args:
        file_key: The key of the Parquet file to retrieve
        filters: Optional filters to apply to the data

    Returns:
        List of dicts containing the retrieved data or error dict
    """
    try:
        logger.info(f"Retrieving parquet data for {file_key}")
        df = retrieve_data(file_key)

        if df is not None:
            # Apply filters if provided
            if filters:
                for column, value in filters.items():
                    if column in df.columns:
                        df = df[df[column] == value]

            # Convert to list of dictionaries
            records = df.to_dict(orient="records")
            # Cast to the expected return type
            return cast(List[Dict[str, Any]], records)

        # Return error if retrieval failed
        return {
            "error": "Failed to retrieve data",
            "type": "DataRetrievalError",
        }
    except Exception as e:
        logger.error(f"Error retrieving parquet data: {str(e)}")
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
        logger.info(f"Converting JSON to Parquet at {output_path}")

        # In the dual backend, handle different input types
        if isinstance(json_data, str):
            # If json_data is a file path string
            success = json_parquet_converter.json_to_parquet(
                json_data, output_path
            )
        else:
            # If json_data is already parsed, convert to string
            import json
            import tempfile
            import os

            json_str = json.dumps(json_data)
            # Create a temporary file
            with tempfile.NamedTemporaryFile(
                suffix=".json", delete=False
            ) as f:
                f.write(json_str.encode("utf-8"))
                temp_json_path = f.name

            # Call the function with the temp file path
            success = json_parquet_converter.json_to_parquet(
                temp_json_path, output_path
            )

            # Clean up
            os.unlink(temp_json_path)

        if success:
            return {
                "success": True,
                "message": "JSON converted to Parquet",
                "path": output_path,
            }
        return {
            "success": False,
            "message": "Failed to convert JSON to Parquet",
        }
    except Exception as e:
        logger.error(f"Error in json_to_parquet: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}


# Add more adapter functions as needed
