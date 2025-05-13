"""
Forex data API endpoints for ChasquiFX.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Optional, List
import pandas as pd

from backend.api.services.forex_service import (
    load_forex_data,
    get_exchange_rate,
)
from backend.api.models.schemas import ExchangeRateResponse, ForexPairRequest

router = APIRouter(prefix="/api/forex", tags=["forex"])


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
            detail=f"Exchange rate not found for {base_currency}/{quote_currency}",
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
