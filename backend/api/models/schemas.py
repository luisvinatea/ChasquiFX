"""
Data models for the ChasquiFX application.
Contains Pydantic models for API request/response validation.
"""

from pydantic import BaseModel
from typing import Dict, List, Any, Optional


# Flight-related models
class FlightFare(BaseModel):
    """Model for flight fares."""

    price: float
    currency: str
    airlines: List[str] = []
    duration: str = ""
    outbound_date: str
    return_date: str


class DestinationRecommendation(BaseModel):
    """Model for destination recommendations."""

    departure_airport: str
    arrival_airport: str
    city: str
    country: str
    exchange_rate: float
    exchange_rate_trend: float
    flight_route: Dict[str, Any]
    score: float
    fare: Optional[FlightFare] = None


class RecommendationsResponse(BaseModel):
    """Model for recommendations response."""

    recommendations: List[DestinationRecommendation]
    base_currency: str


# Forex-related models
class ForexData(BaseModel):
    """Model for forex data."""

    currency_pair: str
    rate: float
    date: str
    source: str


class ForexPairRequest(BaseModel):
    """Model for requesting forex pair data."""

    base_currency: str
    quote_currency: str
    days: int = 30


class ExchangeRateResponse(BaseModel):
    """Model for exchange rate response."""

    base_currency: str
    quote_currency: str
    rate: float
    trend: float
