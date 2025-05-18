"""
API routes initialization module.

NOTE: These routes are now stub files that maintain backward compatibility.
The actual implementation has been migrated to the Node.js backend.
See MIGRATION_NOTES.md for more information.
"""

from fastapi import APIRouter

from backend.api.routes.recommendations import router as recommendations_router
from backend.api.routes.forex import router as forex_router

# Create main router
router = APIRouter()

# Include all routers
router.include_router(recommendations_router)
router.include_router(forex_router)
