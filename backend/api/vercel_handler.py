"""
Vercel Handler for ChasquiFX API
This module provides a compatibility layer
for running the ChasquiFX API on Vercel
and facilitates communication with the Node.js API layer.
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
from typing import Dict, Any
from datetime import datetime

# Ensure the package structure is properly imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.routes import router  # noqa: E402
from backend.api.utils.logging_utils import get_api_logger  # noqa: E402

# Set up logging
logger = get_api_logger()

# Initialize FastAPI
app = FastAPI(
    title="ChasquiFX API",
    description="API for flight and forex recommendations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Include API routes
app.include_router(router)


# Add global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle global exceptions."""
    logger.error(f"Vercel environment error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# Add startup event
@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("ChasquiFX API starting up on Vercel")

    # Check for required environment variables
    required_vars = ["SERPAPI_API_KEY", "SUPABASE_URL", "SUPABASE_KEY"]
    for var in required_vars:
        if not os.getenv(var):
            logger.warning(f"Environment variable {var} not set!")


# Root endpoint for basic connectivity check
@app.get("/", tags=["root"])
async def root():
    """Root endpoint for basic connectivity checks."""
    return {"status": "ok", "message": "ChasquiFX API is running on Vercel"}


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """Health check endpoint to verify API status and environment variables"""
    # Check environment variables without exposing actual values
    env_status = {
        "SERPAPI_API_KEY": bool(os.environ.get("SERPAPI_API_KEY")),
        "SUPABASE_URL": bool(os.environ.get("SUPABASE_URL")),
        "SUPABASE_KEY": bool(os.environ.get("SUPABASE_KEY")),
        "AMADEUS_API_KEY": bool(os.environ.get("AMADEUS_API_KEY")),
        "AMADEUS_API_SECRET": bool(os.environ.get("AMADEUS_API_SECRET")),
    }

    # Format environment variable status
    env_formatted = {
        key: "configured" if value else "missing"
        for key, value in env_status.items()
    }

    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.1.0",
        "environment": env_formatted,
        "deployment": "vercel",
    }
