"""
Main API endpoints for the ChasquiFX application.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime
import sys
import os

# Set the path to the parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.api.models.schemas import RecommendationsResponse
from backend.api.services.recommendation_service import get_recommendations

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_destination_recommendations(
    departure_airport: str = Query(
        ..., description="IATA code of departure airport"
    ),
    base_currency: str = Query(
        "USD", description="Base currency code (e.g., USD)"
    ),
    limit: int = Query(
        10, description="Maximum number of recommendations to return"
    ),
    min_trend: float = Query(
        -1.0, description="Minimum trend value to include (-1 to 1)"
    ),
    include_fares: bool = Query(
        False, description="Whether to include flight fares"
    ),
    outbound_date: Optional[str] = Query(
        None, description="Departure date (YYYY-MM-DD)"
    ),
    return_date: Optional[str] = Query(
        None, description="Return date (YYYY-MM-DD)"
    ),
):
    """
    Get destination recommendations based on forex trends and available routes.

    This endpoint combines forex data with flight route information to recommend
    destinations where the exchange rate is favorable.
    """
    # Validate dates if provided
    if include_fares and (not outbound_date or not return_date):
        raise HTTPException(
            status_code=400,
            detail="Both outbound_date and return_date must be provided when include_fares=True",
        )

    if outbound_date and return_date:
        try:
            outbound = datetime.strptime(outbound_date, "%Y-%m-%d")
            return_d = datetime.strptime(return_date, "%Y-%m-%d")

            if outbound < datetime.now():
                raise HTTPException(
                    status_code=400,
                    detail="outbound_date cannot be in the past",
                )

            if return_d <= outbound:
                raise HTTPException(
                    status_code=400,
                    detail="return_date must be after outbound_date",
                )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD",
            )

    # Get recommendations
    recommendations = get_recommendations(
        departure_airport=departure_airport,
        base_currency=base_currency,
        limit=limit,
        min_trend=min_trend,
        include_fares=include_fares,
        outbound_date=outbound_date,
        return_date=return_date,
    )

    return recommendations
