"""
ChasquiFX API Server
Main entry point for the ChasquiFX FastAPI application.
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import sys
from typing import Dict, Any
from datetime import datetime

# Add parent directory to path to enable imports
sys.path.insert(
    0,
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ),
)
from backend.api.config import API_HOST, API_PORT  # noqa: E402
from backend.api.routes import router  # noqa: E402
from backend.api.utils import get_api_logger  # noqa: E402

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
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# Add startup event
@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("ChasquiFX API starting up")


# Add shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("ChasquiFX API shutting down")


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint to verify API status and environment variables
    """
    # Check environment variables without exposing actual values
    env_status = {
        "SERPAPI_API_KEY": bool(os.environ.get("SERPAPI_API_KEY")),
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
        "version": "1.0.0",
        "environment": env_formatted,
    }


# Root endpoint for basic connectivity check
@app.get("/", tags=["root"])
async def root():
    """Root endpoint for basic connectivity checks."""
    return {"status": "ok", "message": "ChasquiFX API is running"}


# Run the application when this file is executed directly
if __name__ == "__main__":
    logger.info(f"Starting ChasquiFX API server on {API_HOST}:{API_PORT}")
    uvicorn.run(
        "backend.api.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
    )
