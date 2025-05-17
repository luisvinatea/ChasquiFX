"""
Supabase client for ChasquiFX.
This module initializes the Supabase client for database operations.
"""

import os
from supabase import create_client
from ..utils.logging_utils import setup_logger

# Setup logger
logger = setup_logger(__name__)

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


def get_supabase_client():
    """
    Initialize and return a Supabase client.
    Falls back gracefully if credentials are not available.

    Returns:
        Supabase client or None if credentials are missing
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning(
            "Supabase credentials not found in environment variables. "
            "Database logging disabled."
        )
        return None

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully")
        return supabase
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        return None


# Initialize client
supabase = get_supabase_client()
