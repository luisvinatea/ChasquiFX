"""
Database models for ChasquiFX.
This module defines the models for the database tables.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Dict, Optional


# Model for API usage logs
class ApiUsageLog(BaseModel):
    id: Optional[int] = None
    user_id: Optional[str] = None
    endpoint: str
    request_data: Dict
    response_status: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True


# Model for cached forex data
class ForexCacheEntry(BaseModel):
    id: Optional[int] = None
    currency_pair: str
    data: Dict
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    expiry: datetime

    class Config:
        orm_mode = True


# Model for cached flight data
class FlightCacheEntry(BaseModel):
    id: Optional[int] = None
    origin: str
    destination: str
    data: Dict
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    expiry: datetime

    class Config:
        orm_mode = True


# Model for user API keys
class UserApiKey(BaseModel):
    id: Optional[int] = None
    user_id: str
    serpapi_key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True


# Model for Parquet file storage in Supabase
class ParquetFileStorage(BaseModel):
    id: Optional[int] = None
    file_key: str  # Unique identifier for the file
    file_path: str  # Path in Supabase Storage
    original_path: str  # Original local file path
    file_size: int  # Size in bytes
    etag: Optional[str] = None  # For versioning
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True  # Flag for current active version

    class Config:
        orm_mode = True


# Model for user activity/recommendations
class UserRecommendation(BaseModel):
    id: Optional[int] = None
    user_id: Optional[str] = None
    origin_currency: str
    destination_currency: str
    amount: float
    recommended_destination: str
    exchange_rate: float
    savings_percentage: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        orm_mode = True
