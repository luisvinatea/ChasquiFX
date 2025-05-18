"""
API authentication middleware for ChasquiFX.
Handles user authentication and API key validation.

NOTE: DEPRECATED - This authentication middleware has been migrated to the Node.js backend.
This file is kept for backward compatibility but will be removed in a future version.
Please use the Node.js authentication middleware instead.
"""

import os
from typing import Optional
from fastapi import Depends, HTTPException, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..db.operations import get_user_api_key
from ..utils.logging_utils import setup_logger

# Setup logger
logger = setup_logger(__name__)

# Security scheme for bearer token
security = HTTPBearer(auto_error=False)

# Environment variable for default API key (for test/development)
DEFAULT_SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")


async def get_api_key(
    request: Request,
    authorization: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None),
) -> str:
    """
    DEPRECATED: Use Node.js authentication middleware instead.

    Extract and validate API key from request.

    Args:
        request: FastAPI Request object
        authorization: Bearer token if present
        x_api_key: API key from header if present

    Returns:
        Validated SerpAPI key

    Raises:
        HTTPException: If no valid API key is provided
    """
    api_key = None
    user_id = None

    # Check for user ID in request state (set by frontend auth)
    if hasattr(request.state, "user_id"):
        user_id = request.state.user_id

        # Try to get API key from database for this user
        if user_id:
            api_key = await get_user_api_key(user_id)
            if api_key:
                return api_key

    # Check for API key in authorization header
    if authorization:
        api_key = authorization.credentials

    # Check for API key in custom header
    if not api_key and x_api_key:
        api_key = x_api_key

    # Check for API key in query parameters
    if not api_key and request.query_params.get("api_key"):
        api_key = request.query_params.get("api_key")

    # Fall back to environment variable
    if not api_key:
        api_key = DEFAULT_SERPAPI_KEY

    if not api_key:
        logger.warning("API request without valid API key")
        raise HTTPException(
            status_code=401,
            detail="API key is required. Please provide a valid SerpAPI key.",
        )

    return api_key
