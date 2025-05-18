"""
Forex data API endpoints for ChasquiFX.
"""

from fastapi import APIRouter, Query, HTTPException, Header
from typing import List, Dict, Optional, Any
import sys
import os

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


@router.post("/refresh", status_code=200)
async def refresh_forex_data(
    x_serpapi_key: Optional[str] = Header(None, alias="X-Serpapi-Key"),
) -> Dict[str, bool]:
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
    success = update_forex_data()

    if not success:
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

    return {
        "status": "healthy",
        "has_api_key": has_api_key,
        "can_use_real_time_data": has_api_key,
        "has_supabase": has_supabase,
        "has_data": has_data,
        "env": os.getenv("VERCEL_DEPLOYMENT", "local"),
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
