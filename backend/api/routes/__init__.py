"""
API routes initialization module.

NOTE: The API functionality has been fully migrated to the Node.js backend.
This file exists only for backward compatibility
 with the Python application structure.
See MIGRATION_NOTES.md for more information.
"""

from fastapi import APIRouter

# Create main router with no routes
router = APIRouter()

# Note: Previously imported routes have been fully migrated to Node.js
# and are no longer available in the Python backend
