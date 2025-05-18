"""
Forex data API endpoints for ChasquiFX - STUB FILE.

NOTE: All functionality has been migrated to the Node.js backend.
This stub remains only for backward compatibility with imports.
"""

import logging
from fastapi import APIRouter

# Set up logging
logger = logging.getLogger(__name__)

# Create router but don't register any endpoints
router = APIRouter(prefix="/api/forex", tags=["forex"])


# A note will be added to docs about the deprecated state
@router.get("/deprecated_notice")
async def deprecated_notice():
    """
    NOTICE: The forex API has been migrated to Node.js.

    This stub remains only for backward compatibility.
    Please refer to the Node.js API documentation for current endpoints.
    """
    return {
        "status": "deprecated",
        "message": "The forex API has been migrated to Node.js. Please refer to the Node.js API documentation.",
    }
