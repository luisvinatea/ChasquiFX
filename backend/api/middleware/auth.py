"""
Authentication middleware for ChasquiFX - STUB FILE.

NOTE: All functionality has been migrated to the Node.js backend.
This stub remains only for backward compatibility with imports.
"""

import logging
from typing import Optional, Dict, Any
from fastapi import Request

# Set up logging
logger = logging.getLogger(__name__)


async def get_api_key(request: Request) -> Optional[str]:
    """
    Stub method for backward compatibility.
    The real implementation is in Node.js.

    Returns:
        None, as this is just a stub.
    """
    logger.warning("Using deprecated auth middleware stub")
    return None
