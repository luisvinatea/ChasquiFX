"""
Forex data API endpoints for ChasquiFX.
"""

from fastapi import APIRouter, Query, Header, Security, Depends, HTTPException
from fastapi.security import APIKeyHeader
from typing import List, Dict, Optional, Any
import sys
import os
import json
import logging
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

# Set the path to the parent directory
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
)


from backend.api.services.forex_service import (  # noqa: E402
    load_forex_data,
    get_exchange_rate,
    update_forex_data,
    DEFAULT_FOREX_DATA_PATH,
)
from backend.api.models.schemas import ExchangeRateResponse  # noqa: E402


router = APIRouter(prefix="/api/forex", tags=["forex"])
api_key_header = APIKeyHeader(name="X-Api-Key", auto_error=False)


# Function to validate API key for admin operations
async def get_api_key(api_key: str = Security(api_key_header)):
    """Verify the API key for administrative operations"""
    # Get the admin API key from environment
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key:
        return False
    return api_key == admin_key


@router.post("/refresh", status_code=200)
async def refresh_forex_data(
    x_serpapi_key: Optional[str] = Header(None, alias="X-Serpapi-Key"),
) -> Dict[str, Any]:
    """
    Force refresh of forex data using the SerpAPI key provided in the header.

    Args:
        x_serpapi_key: SerpAPI key provided in the X-Serpapi-Key header

    Returns:
        Dictionary indicating success or failure
    """
    if x_serpapi_key:
        # Set API key in environment
        os.environ["SERPAPI_API_KEY"] = x_serpapi_key

    # Try to update forex data
    result = update_forex_data()

    # Check if the result is a dict with quota_exceeded flag
    if isinstance(result, dict) and result.get("quota_exceeded", False):
        # Save quota status to a file for other endpoints to check
        try:
            quota_file = os.path.join(
                os.path.dirname(DEFAULT_FOREX_DATA_PATH),
                "serpapi_quota_status.json",
            )
            os.makedirs(os.path.dirname(quota_file), exist_ok=True)
            with open(quota_file, "w") as f:
                json.dump(
                    {
                        "quota_exceeded": True,
                        "message": result.get(
                            "message", "API quota limit exceeded"
                        ),
                        "timestamp": datetime.now().isoformat(),
                    },
                    f,
                )

            # Return a more specific error
            raise HTTPException(
                status_code=429,  # Too Many Requests
                detail=result.get("message", "API quota limit exceeded"),
            )
        except Exception as e:
            logger.error(f"Error saving quota status: {e}")
            # Fall through to the generic error

    if result is False:
        raise HTTPException(
            status_code=500,
            detail="Failed to update forex data. Check server logs for "
            "details.",
        )

    return {"success": True}


@router.get("/status")
async def get_forex_status() -> Dict[str, Any]:
    """
    Check if we have valid forex data and SerpAPI key.

    Returns:
        Dictionary with status information
    """
    has_api_key = bool(os.getenv("SERPAPI_API_KEY"))
    has_supabase = bool(
        os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY")
    )

    # Check if the data file exists
    data_file = DEFAULT_FOREX_DATA_PATH
    has_data = (
        os.path.exists(data_file)
        if not os.getenv("VERCEL_DEPLOYMENT")
        else True
    )

    # Check last API call status
    quota_exceeded = False
    quota_message = None
    try:
        # Try to read quota status from temporary file that may be created
        # when quota is exceeded (we'll create this file later)
        quota_file = os.path.join(
            os.path.dirname(DEFAULT_FOREX_DATA_PATH),
            "serpapi_quota_status.json",
        )
        if os.path.exists(quota_file):
            with open(quota_file, "r") as f:
                quota_data = json.load(f)
                quota_exceeded = quota_data.get("quota_exceeded", False)
                quota_message = quota_data.get("message", None)
    except Exception as e:
        logger.warning(f"Error checking quota status: {e}")

    return {
        "status": "healthy",
        "has_api_key": has_api_key,
        "can_use_real_time_data": has_api_key and not quota_exceeded,
        "has_supabase": has_supabase,
        "has_data": has_data,
        "env": os.getenv("VERCEL_DEPLOYMENT", "local"),
        "quota_exceeded": quota_exceeded,
        "quota_message": quota_message,
    }


@router.get("/exchange_rate", response_model=ExchangeRateResponse)
async def get_exchange_rate_endpoint(
    base_currency: str = Query(
        ..., description="Base currency code (e.g., USD)"
    ),
    quote_currency: str = Query(
        ..., description="Quote currency code (e.g., EUR)"
    ),
):
    """
    Get the current exchange rate between two currencies.
    """
    # Get exchange rate
    rate = get_exchange_rate(base_currency, quote_currency)

    if rate is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Exchange rate not found for {base_currency}/{quote_currency}"
            ),
        )

    # Get trend (simplified implementation)
    trend = 0.0
    forex_data = load_forex_data()
    if not forex_data.empty:
        currency_pair = f"{base_currency}{quote_currency}=X"
        inverse_pair = f"{quote_currency}{base_currency}=X"

        if currency_pair in forex_data.index:
            # In a real implementation, we would calculate the trend here
            # For now, we're using a simplified approach
            trend = 0.1  # Slightly positive trend
        elif inverse_pair in forex_data.index:
            trend = -0.1  # Slightly negative trend

    return ExchangeRateResponse(
        base_currency=base_currency,
        quote_currency=quote_currency,
        rate=rate,
        trend=trend,
    )


@router.get("/available_currencies", response_model=List[str])
async def get_available_currencies():
    """
    Get a list of available currency codes.
    """
    # Load forex data
    forex_data = load_forex_data()

    if forex_data.empty:
        return ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"]

    # Extract unique currency codes from forex data
    currencies = set()
    for pair in forex_data.index:
        if pair.endswith("=X") and len(pair) == 7:
            base = pair[:3]
            quote = pair[3:6]
            currencies.add(base)
            currencies.add(quote)

    return sorted(list(currencies))


@router.post("/reset_quota_status")
async def reset_quota_status(
    valid_key: bool = Depends(get_api_key),
) -> Dict[str, Any]:
    """
    Reset the SerpAPI quota exceeded status.
    Requires admin API key for authorization.

    Args:
        valid_key: Validated admin API key

    Returns:
        Dictionary indicating success or failure
    """
    if not valid_key:
        raise HTTPException(
            status_code=401, detail="Invalid or missing API key"
        )

    try:
        # Try to delete the quota status file
        quota_file = os.path.join(
            os.path.dirname(DEFAULT_FOREX_DATA_PATH),
            "serpapi_quota_status.json",
        )

        if os.path.exists(quota_file):
            os.remove(quota_file)
            logger.info("Quota status file removed successfully")
            return {
                "success": True,
                "message": "Quota status reset successfully",
            }
        else:
            logger.info("No quota status file found to reset")
            return {"success": True, "message": "No quota status was set"}
    except Exception as e:
        logger.error(f"Error resetting quota status: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to reset quota status: {e}"
        )
