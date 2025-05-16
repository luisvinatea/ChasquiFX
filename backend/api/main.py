"""
ChasquiFX API Server
Main entry point for the ChasquiFX FastAPI application.
"""

import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Add parent directory to path to enable imports
sys.path.insert(
    0,
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ),
)

# Import from modular components
from backend.api.config import API_HOST, API_PORT
from backend.api.routes import router
from backend.api.utils import get_api_logger

# Set up logging
logger = get_api_logger()

# Initialize FastAPI
app = FastAPI(
    title="ChasquiFX API",
    description="API for flight and forex recommendations",
    version="1.0.0",
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
        content={"detail": "Internal server error"},
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
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


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
