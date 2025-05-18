"""
Travel recommendations API endpoints - STUB FILE.

NOTE: All functionality has been migrated to the Node.js backend.
This stub remains only for backward compatibility with imports.
"""

import logging
from fastapi import APIRouter

# Set up logging
logger = logging.getLogger(__name__)

# Create router but don't register any active endpoints
router = APIRouter(prefix="/api", tags=["recommendations"])


@router.get("/deprecated_notice")
async def deprecated_notice():
    """
    Notice about API deprecation.
    """
    return {
        "status": "deprecated",
        "message": "The recommendations API has been migrated to Node.js.",
        "migration_docs": "/backend/MIGRATION_NOTES.md",
    }
